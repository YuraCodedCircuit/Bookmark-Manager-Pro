import { z } from 'zod';
import {
  planSynchronization,
  syncConnectionSchema,
  syncNodeEqual,
  syncSubtree,
  type SyncConnection,
  type SyncPlan,
  type SyncOperation,
} from '../../domain/synchronization';
import { syncNodeSchema, type SyncNode } from '../../domain/sync-preview';
import {
  syncRequestSchema,
  type SyncResponse,
} from '../../messaging/sync-protocol';
import type { SyncRepository } from '../../storage/sync-repository';
import type { ContentChangeInput } from '../../messaging/content-change-protocol';

export interface SyncNativePort {
  hasPermission(): Promise<boolean>;
  readTree(): Promise<SyncNode[]>;
  create(node: SyncNode): Promise<string>;
  write(node: SyncNode): Promise<void>;
  remove(id: string): Promise<void>;
}
const savedPreviewSchema = z.object({
  token: z.string(),
  connection: syncConnectionSchema,
  extension: z.array(syncNodeSchema),
  browser: z.array(syncNodeSchema),
  setup: syncRequestSchema.shape.setup.unwrap(),
});
export type SyncEvent =
  | 'enabled'
  | 'paused'
  | 'resumed'
  | 'disconnected'
  | 'completed'
  | 'conflict'
  | 'skipped'
  | 'failed'
  | 'permission'
  | 'missing-root';
const treeSignature = (nodes: SyncNode[]) =>
  JSON.stringify(
    [...nodes]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((node) => [
        node.id,
        node.parentId,
        node.title,
        node.url ?? null,
        node.index,
      ]),
  );

/** The background owns this service. A browser-wide Web Lock serializes commands and event wakes. */
export class SyncService {
  constructor(
    private readonly repository: SyncRepository,
    private readonly native: SyncNativePort,
    private readonly report: (
      profileId: string,
      event: SyncEvent,
    ) => Promise<void>,
    private readonly publishContentChange: (
      change: ContentChangeInput,
    ) => Promise<unknown> = async () => undefined,
  ) {}
  private async feedback(profileId: string, event: SyncEvent) {
    try {
      await this.report(profileId, event);
    } catch {
      console.error('sync-feedback-failed');
    }
  }
  async command(input: unknown): Promise<SyncResponse> {
    const request = syncRequestSchema.parse(input),
      { profileId, command } = request;
    const response: SyncResponse = {
      protocolVersion: 1,
      type: 'sync.result',
      connection: null,
    };
    try {
      if ((await this.repository.activeProfile()) !== profileId)
        throw new Error('inactive');
      let connection = await this.repository.get(profileId);
      if (command === 'status') return { ...response, connection };
      if (command === 'disconnect') {
        await this.repository.disconnect(profileId);
        await this.feedback(profileId, 'disconnected');
        return response;
      }
      if (command === 'pause') {
        if (connection) {
          connection.status = 'paused';
          await this.repository.save(connection);
          await this.feedback(profileId, 'paused');
        }
        return { ...response, connection };
      }
      if (!(await this.native.hasPermission())) throw new Error('permission');
      if (command === 'preview') {
        if (!request.setup) throw new Error('failed');
        if (
          connection &&
          (connection.extensionRoot !== request.setup.extensionRoot ||
            connection.browserRoot !== request.setup.browserRoot ||
            connection.direction !== request.setup.direction)
        )
          throw new Error('failed');
        connection ??= {
          version: 1,
          profileId,
          ...request.setup,
          status: 'connected',
          links: [],
          plannedLinks: [],
          operations: [],
          lastSuccess: null,
          issue: '',
        };
        if (connection.operations.length) throw new Error('failed');
        const [extension, browser] = await Promise.all([
          this.repository.tree(profileId),
          this.native.readTree(),
        ]);
        await this.checkOverlap(connection, browser);
        const plan = planSynchronization(
          connection,
          extension,
          browser,
          request.setup.choices,
        );
        const token = crypto.randomUUID();
        await this.repository.savePreview(
          profileId,
          savedPreviewSchema.parse({
            token,
            connection,
            extension,
            browser,
            setup: request.setup,
          }),
        );
        return {
          ...response,
          connection: await this.repository.get(profileId),
          token,
          preview: plan.preview,
          conflicts: plan.conflicts,
        };
      }
      if (command === 'enable') {
        const preview = savedPreviewSchema.parse(
          await this.repository.readPreview(profileId),
        );
        if (preview.token !== request.token) throw new Error('stale');
        const [extension, browser] = await Promise.all([
          this.repository.tree(profileId),
          this.native.readTree(),
        ]);
        if (
          treeSignature(extension) !== treeSignature(preview.extension) ||
          treeSignature(browser) !== treeSignature(preview.browser)
        )
          throw new Error('stale');
        connection = preview.connection;
        await this.checkOverlap(connection, browser);
        const plan = planSynchronization(
          connection,
          extension,
          browser,
          preview.setup.choices,
        );
        if (plan.conflicts.length) throw new Error('failed');
        this.prepare(connection, plan, extension);
        connection.status = 'connected';
        connection.issue = '';
        await this.repository.save(connection);
        await this.repository.clearPreview(profileId);
        await this.feedback(profileId, 'enabled');
      } else if (connection) {
        connection.status = 'connected';
        connection.issue = '';
        await this.repository.save(connection);
        await this.feedback(profileId, 'resumed');
      }
      if (connection) await this.run(connection);
      return { ...response, connection: await this.repository.get(profileId) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'failed';
      const code =
        (
          [
            'permission',
            'stale',
            'overlap',
            'inactive',
            'missing-root',
          ] as const
        ).find((c) => c === message) ?? 'failed';
      await this.feedback(
        profileId,
        code === 'permission' ? 'permission' : 'failed',
      );
      return {
        ...response,
        connection: await this.repository.get(profileId),
        error: code,
      };
    }
  }
  private async checkOverlap(connection: SyncConnection, nodes: SyncNode[]) {
    const own = new Set(
      syncSubtree(nodes, connection.browserRoot).map((n) => n.id),
    );
    for (const other of await this.repository.all()) {
      if (other.profileId === connection.profileId) continue;
      if (own.has(other.browserRoot)) throw new Error('overlap');
      if (
        nodes.some((n) => n.id === other.browserRoot) &&
        syncSubtree(nodes, other.browserRoot).some(
          (n) => n.id === connection.browserRoot,
        )
      )
        throw new Error('overlap');
    }
  }
  /** Event/alarms recovery reads durable active-profile state, never cached tab state. */
  async wake() {
    try {
      const profileId = await this.repository.activeProfileOrNull();
      if (!profileId) return;
      const connection = await this.repository.get(profileId);
      if (connection?.status === 'connected') await this.run(connection);
    } catch {
      console.error('sync-wake-failed');
    }
  }
  private async run(connection: SyncConnection) {
    const { profileId } = connection;
    try {
      if ((await this.repository.activeProfile()) !== profileId) return;
      if (!(await this.native.hasPermission())) throw new Error('permission');
      if (!connection.operations.length)
        await this.flushPendingContentChange(connection);
      if (!connection.operations.length) {
        const [e, b] = await Promise.all([
          this.repository.tree(profileId),
          this.native.readTree(),
        ]);
        const plan = planSynchronization(connection, e, b);
        if (plan.conflicts.length) {
          connection.status = 'conflict';
          await this.repository.save(connection);
          await this.feedback(profileId, 'conflict');
          return;
        }
        if (plan.preview.skipped && connection.issue !== 'skipped')
          await this.feedback(profileId, 'skipped');
        connection.issue = plan.preview.skipped ? 'skipped' : '';
        this.prepare(connection, plan, e);
        await this.repository.save(connection);
      }
      const hadOperations = connection.operations.length > 0;
      // Bound a wake; the periodic alarm resumes any remaining durable operations.
      for (
        let count = 0;
        connection.operations.length && count < 100;
        count++
      ) {
        if ((await this.repository.activeProfile()) !== profileId) return;
        if (!(await this.native.hasPermission())) throw new Error('permission');
        const op = connection.operations[0]!;
        const [extension, browser] = await Promise.all([
          this.repository.tree(profileId),
          this.native.readTree(),
        ]);
        const scopedExtension = syncSubtree(
            extension,
            connection.extensionRoot,
          ),
          scopedBrowser = syncSubtree(browser, connection.browserRoot);
        const source = (
          op.side === 'extension' ? scopedBrowser : scopedExtension
        ).find((node) => node.id === op.sourceId);
        const sourceChanged =
          op.sourceId &&
          !syncNodeEqual(
            source
              ? { ...source, index: op.source?.index ?? source.index }
              : null,
            op.source,
          );
        const nodes = op.side === 'extension' ? extension : browser;
        const current = nodes.find((n) => n.id === op.id);
        if (op.kind === 'create' && op.side === 'browser') {
          if (!op.after) throw new Error('failed');
          if (!op.started) {
            if (sourceChanged) throw new Error('sync-source-changed');
            op.started = true;
            op.existingIds = nodes
              .filter((n) => n.parentId === op.after!.parentId)
              .map((n) => n.id);
            await this.repository.save(connection);
          } else {
            const candidates = nodes.filter(
              (n) =>
                n.parentId === op.after!.parentId &&
                !op.existingIds?.includes(n.id),
            );
            if (candidates.length) {
              if (
                candidates.length !== 1 ||
                !syncNodeEqual(
                  { ...candidates[0]!, index: op.after.index },
                  op.after,
                )
              )
                throw new Error('sync-create-uncertain');
              this.replaceId(connection, op.id, candidates[0]!.id);
              this.checkpoint(connection, op);
              await this.repository.save(connection);
              continue;
            }
          }
          if (sourceChanged) throw new Error('sync-create-uncertain');
          const id = await this.native.create(op.after);
          this.replaceId(connection, op.id, id);
          this.checkpoint(connection, op);
          await this.repository.save(connection);
          continue;
        }
        if (sourceChanged) throw new Error('sync-source-changed');
        if (
          (op.kind === 'delete' && !current) ||
          (op.after && syncNodeEqual(current, op.after))
        ) {
          this.checkpoint(connection, op);
          await this.repository.save(connection);
          continue;
        }
        // Index shifts caused by earlier sibling operations do not imply an external content edit.
        const unchanged = syncNodeEqual(
          current
            ? { ...current, index: op.before?.index ?? current.index }
            : null,
          op.before,
        );
        const partialWrite =
          op.started &&
          current &&
          op.after &&
          op.before &&
          current.title === op.after.title &&
          current.url === op.after.url &&
          [op.before.parentId, op.after.parentId].includes(current.parentId);
        if (!unchanged && !partialWrite) throw new Error('sync-target-changed');
        if (op.kind === 'delete' && nodes.some((n) => n.parentId === op.id))
          throw new Error('sync-folder-not-empty');
        if (op.side === 'extension') {
          this.checkpoint(connection, op);
          await this.repository.apply(profileId, op, connection);
        } else {
          op.started = true;
          await this.repository.save(connection);
          if (op.kind === 'delete') await this.native.remove(op.id);
          else if (op.after) await this.native.write(op.after);
          this.checkpoint(connection, op);
          await this.repository.save(connection);
        }
      }
      if (!connection.operations.length) {
        connection.plannedLinks = [];
        connection.lastSuccess = Date.now();
        await this.repository.save(connection);
        if (hadOperations) {
          await this.flushPendingContentChange(connection);
          await this.feedback(profileId, 'completed');
        }
      }
    } catch (error) {
      // Reload the last committed checkpoint: an aborted local transaction must not lose its operation.
      const saved = await this.repository.get(profileId);
      if (!saved) return;
      const reason = error instanceof Error ? error.message : 'failed';
      saved.status =
        reason === 'permission' || reason === 'missing-root' ? reason : 'error';
      saved.issue = reason === 'sync-create-uncertain' ? 'uncertain' : 'failed';
      if (
        [
          'sync-source-changed',
          'sync-target-changed',
          'sync-folder-not-empty',
        ].includes(reason)
      ) {
        saved.operations = [];
        saved.plannedLinks = [];
        saved.status = 'conflict';
      }
      await this.repository.save(saved);
      await this.feedback(
        profileId,
        saved.status === 'error' ? 'failed' : saved.status,
      );
    }
  }
  private replaceId(
    connection: SyncConnection,
    previous: string,
    next: string,
  ) {
    for (const link of [...connection.links, ...connection.plannedLinks]) {
      if (link.browser === previous) link.browser = next;
      if (link.b?.id === previous) link.b.id = next;
      if (link.b?.parentId === previous) link.b.parentId = next;
    }
    for (const op of connection.operations) {
      if (op.side === 'extension' && op.source) {
        if (op.source.id === previous) {
          op.source.id = next;
          op.sourceId = next;
        }
        if (op.source.parentId === previous) op.source.parentId = next;
      }
      if (op.side !== 'browser') continue;
      if (op.id === previous) op.id = next;
      for (const node of [op.before, op.after])
        if (node) {
          if (node.id === previous) node.id = next;
          if (node.parentId === previous) node.parentId = next;
        }
    }
  }
  private prepare(
    connection: SyncConnection,
    plan: SyncPlan,
    extensionTree: readonly SyncNode[],
  ) {
    connection.plannedLinks = plan.links;
    connection.operations = plan.operations;
    const extensionOperations = plan.operations.filter(
      (operation) => operation.side === 'extension',
    );
    const affectedParentIds = new Set<string>();
    const changedFolderIds = new Set<string>();
    const byId = new Map(extensionTree.map((node) => [node.id, node]));
    const deletedFolderPaths: Array<{
      folderId: string;
      ancestorIds: string[];
    }> = [];
    for (const operation of extensionOperations) {
      if (operation.before?.parentId)
        affectedParentIds.add(operation.before.parentId);
      if (operation.after?.parentId)
        affectedParentIds.add(operation.after.parentId);
      const folderNode =
        operation.after?.url === undefined
          ? operation.after
          : operation.before?.url === undefined
            ? operation.before
            : undefined;
      if (!folderNode) continue;
      changedFolderIds.add(folderNode.id);
      if (operation.kind !== 'delete') continue;
      const ancestorIds: string[] = [];
      let parentId = folderNode.parentId;
      const visited = new Set<string>();
      while (parentId && !visited.has(parentId)) {
        visited.add(parentId);
        ancestorIds.push(parentId);
        parentId = byId.get(parentId)?.parentId ?? null;
      }
      deletedFolderPaths.push({ ancestorIds, folderId: folderNode.id });
    }
    if (extensionOperations.length)
      connection.pendingContentChange = {
        affectedParentIds: [...affectedParentIds],
        changedFolderIds: [...changedFolderIds],
        deletedFolderPaths,
      };
    else if (!connection.pendingContentChange)
      delete connection.pendingContentChange;
    const touchedE = new Set(
        plan.operations.filter((o) => o.side === 'extension').map((o) => o.id),
      ),
      touchedB = new Set(
        plan.operations.filter((o) => o.side === 'browser').map((o) => o.id),
      );
    const retained = new Set(plan.links.map((link) => link.extension));
    connection.links = connection.links.filter(
      (link) =>
        retained.has(link.extension) ||
        touchedE.has(link.extension) ||
        touchedB.has(link.browser),
    );
    for (const link of plan.links)
      if (!touchedE.has(link.extension) && !touchedB.has(link.browser)) {
        connection.links = connection.links.filter(
          (old) => old.extension !== link.extension,
        );
        connection.links.push(structuredClone(link));
      }
  }
  private checkpoint(connection: SyncConnection, op: SyncOperation) {
    const link = connection.plannedLinks.find(
      (candidate) => candidate[op.side] === op.id,
    );
    connection.links = connection.links.filter(
      (candidate) => candidate[op.side] !== op.id,
    );
    if (link) connection.links.push(structuredClone(link));
    connection.operations.shift();
  }

  private async flushPendingContentChange(connection: SyncConnection) {
    const pending = connection.pendingContentChange;
    if (!pending) return;
    try {
      await this.publishContentChange({
        ...pending,
        fullRefresh: false,
        navigationChanged: true,
        profileId: connection.profileId,
      });
      delete connection.pendingContentChange;
      await this.repository.save(connection);
    } catch {
      console.error('sync-content-change-publish-failed');
    }
  }
}
