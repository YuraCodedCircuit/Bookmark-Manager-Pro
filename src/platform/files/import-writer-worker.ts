import { z } from 'zod';
import type {
  ImportRequest,
  ImportSavePlan,
} from '../../application/import/import-writer';
import { DexieImportWriter } from '../../storage/dexie-import-writer';
import { runWithBrowserLock } from '../../platform/concurrency/run-with-browser-session-lock';

z.config({ jitless: true });
const commandSchema = z.object({
  version: z.literal(1),
  id: z.number().int(),
  type: z.enum(['prepare', 'commit', 'abort']),
  input: z.unknown().optional(),
});
// Full records are validated by DexieImportWriter at the authoritative persistence boundary.
const requestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('native'),
    payload: z.record(z.string(), z.unknown()),
    selected: z.array(z.string()).min(1).max(1000),
    originProfileId: z.uuid(),
  }),
  z.object({
    kind: z.literal('portable'),
    items: z.array(z.unknown()).min(1).max(1_000_000),
    profileId: z.uuid(),
    folderId: z.string().min(1).max(100),
    originProfileId: z.uuid(),
  }),
]);
const storage = new DexieImportWriter();
let plan: ImportSavePlan | undefined;
let prepared: AbortController | undefined;
let active: { id: number; controller: AbortController } | undefined;
let preparedId: number | undefined;
addEventListener('message', (event: MessageEvent<unknown>) => {
  const parsed = commandSchema.safeParse(event.data);
  if (!parsed.success) return;
  const command = parsed.data;
  if (command.type === 'abort') {
    if (active && (command.id === 0 || active.id === command.id))
      active.controller.abort();
    if (command.id === 0 || preparedId === command.id) {
      prepared?.abort();
      plan = undefined;
    }
    return;
  }
  const { id, type } = command;
  if (active) {
    postMessage({ version: 1, id, type: 'failed' });
    return;
  }
  const controller = new AbortController();
  active = { id, controller };
  void (async () => {
    try {
      if (type === 'prepare') {
        prepared?.abort();
        plan = undefined;
        prepared = controller;
        preparedId = id;
        plan = await storage.prepare(
          requestSchema.parse(command.input) as ImportRequest,
          controller.signal,
        );
        const summary = {
          bookmarks: plan.bookmarks,
          folders: plan.folders,
          profiles: plan.profiles,
          duplicates: plan.duplicates,
          excluded: plan.excluded,
          duplicatePolicy: plan.duplicatePolicy,
          snapshotMode: plan.snapshotMode,
          synchronizationPaused: plan.synchronizationPaused,
          activityHistoryExcluded: plan.activityHistoryExcluded,
        };
        postMessage({ version: 1, id, type: 'result', value: summary });
      } else {
        if (!plan || !prepared) throw new Error('import-plan-missing');
        const current = plan;
        plan = undefined;
        const value = await runWithBrowserLock(
          'bookmark-synchronization-v1',
          () => current.commit(controller.signal),
          controller.signal,
        );
        postMessage({ version: 1, id, type: 'result', value });
        prepared = undefined;
        preparedId = undefined;
      }
    } catch (cause) {
      postMessage({
        version: 1,
        id,
        type: 'failed',
        changed:
          cause instanceof Error &&
          cause.message === 'import-destination-changed',
      });
    } finally {
      active = undefined;
    }
  })();
});
