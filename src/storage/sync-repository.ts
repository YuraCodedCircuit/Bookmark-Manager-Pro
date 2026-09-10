import { z } from 'zod';
import { liveQuery } from 'dexie';
import { bookmarkSchema } from '../domain/bookmark';
import { folderSchema } from '../domain/folder';
import {
  syncConnectionSchema,
  syncNodeEqual,
  type SyncConnection,
  type SyncOperation,
} from '../domain/synchronization';
import { validateSyncTree } from '../domain/sync-preview';
import type { BookmarkManagerDatabase } from './database';

/** Connection records use a versioned namespace in the existing metadata store. */
export class SyncRepository {
  constructor(readonly database: BookmarkManagerDatabase) {}
  async activeProfileOrNull() {
    const record = await this.database.metadata.get('activeProfileId');
    return record ? z.uuid().parse(record.value) : null;
  }
  async activeProfile() {
    return z
      .uuid()
      .parse((await this.database.metadata.get('activeProfileId'))?.value);
  }
  async get(profileId: string): Promise<SyncConnection | null> {
    const entry = await this.database.metadata.get(`sync:v1:${profileId}`);
    return entry ? syncConnectionSchema.parse(entry.value) : null;
  }
  async all() {
    return (
      await this.database.metadata.where('key').startsWith('sync:v1:').toArray()
    ).map((e) => syncConnectionSchema.parse(e.value));
  }
  async save(connection: SyncConnection) {
    await this.database.metadata.put({
      key: `sync:v1:${connection.profileId}`,
      value: syncConnectionSchema.parse(connection),
    });
  }
  async disconnect(profileId: string) {
    await this.database.metadata.bulkDelete([
      `sync:v1:${profileId}`,
      `sync-preview:${profileId}`,
    ]);
  }
  async readPreview(profileId: string): Promise<unknown> {
    return (await this.database.metadata.get(`sync-preview:${profileId}`))
      ?.value;
  }
  async savePreview(profileId: string, value: unknown) {
    await this.database.metadata.put({
      key: `sync-preview:${profileId}`,
      value,
    });
  }
  async clearPreview(profileId: string) {
    await this.database.metadata.delete(`sync-preview:${profileId}`);
  }
  async publishFeedback(profileId: string, event: string) {
    await this.database.metadata.put({
      key: `sync-feedback:${profileId}`,
      value: event,
    });
  }
  observeFeedback(profileId: string, receive: (event: string) => void) {
    const key = `sync-feedback:${profileId}`;
    return liveQuery(() => this.database.metadata.get(key)).subscribe({
      next: (entry) => {
        if (!entry) return;
        void this.database
          .transaction('rw', this.database.metadata, async () => {
            const current = await this.database.metadata.get(key);
            if (!current) return;
            const event = z
              .enum([
                'enabled',
                'paused',
                'resumed',
                'disconnected',
                'conflict',
                'skipped',
                'failed',
                'permission',
                'missing-root',
              ])
              .parse(current.value);
            await this.database.metadata.delete(key);
            return event;
          })
          .then((event) => {
            if (event) receive(event);
          })
          .catch(() => console.error('sync-notification-delivery-failed'));
      },
      error: () => console.error('sync-notification-read-failed'),
    });
  }
  async tree(profileId: string) {
    return this.database.transaction(
      'r',
      this.database.folders,
      this.database.bookmarks,
      async () =>
        validateSyncTree([
          ...(
            await this.database.folders
              .where('profileId')
              .equals(profileId)
              .toArray()
          ).map((n) => folderSchema.parse(n)),
          ...(
            await this.database.bookmarks
              .where('profileId')
              .equals(profileId)
              .toArray()
          ).map((n) => bookmarkSchema.parse(n)),
        ]),
    );
  }
  /** Writes incoming fields without replacing local appearance, notes, tags, or undo history. */
  async apply(
    profileId: string,
    op: SyncOperation,
    connection: SyncConnection,
  ) {
    await this.database.transaction(
      'rw',
      [
        this.database.folders,
        this.database.bookmarks,
        this.database.favoriteItems,
        this.database.metadata,
      ],
      async () => {
        if ((await this.activeProfile()) !== profileId)
          throw new Error('inactive');
        const bookmark = await this.database.bookmarks.get(op.id),
          folder = await this.database.folders.get(op.id);
        const old = bookmark ?? folder;
        if (old && old.profileId !== profileId)
          throw new Error('sync-profile-mismatch');
        if (
          !syncNodeEqual(
            old ? { ...old, index: op.before?.index ?? old.index } : null,
            op.before,
          )
        )
          throw new Error('sync-target-changed');
        if (folder?.isRoot) throw new Error('sync-root-protected');
        if (op.kind === 'delete') {
          if (
            (await this.database.folders
              .where('parentId')
              .equals(op.id)
              .count()) ||
            (await this.database.bookmarks
              .where('parentId')
              .equals(op.id)
              .count())
          )
            throw new Error('sync-folder-not-empty');
          await this.database.bookmarks.delete(op.id);
          await this.database.folders.delete(op.id);
          await this.database.favoriteItems.delete([profileId, op.id]);
        } else {
          const node = op.after;
          if (!node?.parentId) throw new Error('sync-parent-required');
          const parent = await this.database.folders.get(node.parentId);
          if (!parent || parent.profileId !== profileId)
            throw new Error('sync-parent-unavailable');
          let ancestor: typeof parent | undefined = parent;
          const ancestors = new Set<string>();
          while (ancestor) {
            if (ancestor.id === op.id || ancestors.has(ancestor.id))
              throw new Error('sync-cycle');
            ancestors.add(ancestor.id);
            ancestor = ancestor.parentId
              ? await this.database.folders.get(ancestor.parentId)
              : undefined;
          }
          const now = Date.now();
          const value = {
            tags: [],
            note: '',
            cardAppearance: { kind: 'color', value: '#2f80c9' },
            createdAt: now,
            ...old,
            ...node,
            profileId,
            updatedAt: now,
          };
          const siblings = [
            ...(await this.database.folders
              .where('[profileId+parentId]')
              .equals([profileId, node.parentId])
              .toArray()),
            ...(await this.database.bookmarks
              .where('[profileId+parentId]')
              .equals([profileId, node.parentId])
              .toArray()),
          ]
            .filter((item) => item.id !== op.id)
            .sort((a, b) => a.index - b.index || a.id.localeCompare(b.id));
          const position = Math.min(node.index, siblings.length);
          value.index = position;
          for (let index = 0; index < siblings.length; index++) {
            const sibling = siblings[index]!,
              nextIndex = index >= position ? index + 1 : index;
            if (sibling.index !== nextIndex) {
              if ('url' in sibling)
                await this.database.bookmarks.update(sibling.id, {
                  index: nextIndex,
                });
              else
                await this.database.folders.update(sibling.id, {
                  index: nextIndex,
                });
            }
          }
          if (node.url === undefined)
            await this.database.folders.put(
              folderSchema.parse({
                backgroundAppearance: {
                  kind: 'gradient',
                  colors: ['#2f80c9', '#185a82', '#0b1f3a'],
                  direction: 135,
                },
                includeNavigationBackground: true,
                navigationTransparency: 70,
                isRoot: false,
                ...value,
              }),
            );
          else await this.database.bookmarks.put(bookmarkSchema.parse(value));
        }
        // The mutation and durable checkpoint commit together.
        await this.save(connection);
      },
    );
  }
}
