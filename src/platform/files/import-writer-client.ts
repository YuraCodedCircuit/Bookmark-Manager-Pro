import { z } from 'zod';
import type {
  ImportWriter,
  ImportSavePlan,
} from '../../application/import/import-writer';
import { createFileJobClient } from './file-job-client';

const count = z.number().int().nonnegative();
const planSchema = z.object({
  bookmarks: count,
  folders: count,
  profiles: count,
  duplicates: count,
  excluded: count,
  duplicatePolicy: z.enum(['allow', 'warn', 'prevent']),
  snapshotMode: z.enum([
    'enabled',
    'disabled',
    'automatic-disabled',
    'not-needed',
    'no-changes',
  ]),
  synchronizationPaused: z.boolean().optional(),
  activityHistoryExcluded: z.boolean().optional(),
});

/** Keeps validation, remapping, snapshot preparation and atomic writes off the UI thread. */
export function createWorkerImportWriter(): ImportWriter {
  let client: ReturnType<typeof createFileJobClient> | undefined;
  let closed = false;
  let generation = 0;
  let removePreparedAbort: (() => void) | undefined;
  const get = () => {
    if (closed) throw new Error('import-writer-closed');
    return (client ??= createFileJobClient(
      new Worker(new URL('./import-writer-worker.ts', import.meta.url), {
        type: 'module',
      }),
    ));
  };
  return {
    async prepare(request, signal): Promise<ImportSavePlan> {
      removePreparedAbort?.();
      removePreparedAbort = undefined;
      const current = ++generation;
      const owner = get();
      const parsed = planSchema.parse(
        await owner.request('prepare', request, signal),
      );
      const summary = {
        ...parsed,
        synchronizationPaused: parsed.synchronizationPaused ?? false,
        activityHistoryExcluded: parsed.activityHistoryExcluded ?? false,
      };
      const discard = () => owner.discard();
      signal.addEventListener('abort', discard, { once: true });
      removePreparedAbort = () => signal.removeEventListener('abort', discard);
      if (signal.aborted) {
        discard();
        signal.throwIfAborted();
      }
      let used = false;
      return {
        ...summary,
        commit: async (commitSignal) => {
          signal.throwIfAborted();
          if (current !== generation || used)
            throw new Error('import-plan-already-used');
          used = true;
          try {
            const result = await owner.request('commit', null, commitSignal);
            return z
              .object({ profileIds: z.array(z.uuid()).max(1000) })
              .parse(result);
          } finally {
            signal.removeEventListener('abort', discard);
            removePreparedAbort = undefined;
          }
        },
      };
    },
    close() {
      closed = true;
      removePreparedAbort?.();
      removePreparedAbort = undefined;
      client?.close();
      client = undefined;
    },
  };
}
