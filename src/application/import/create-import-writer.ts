import { createWorkerImportWriter } from '../../platform/files/import-writer-client';
import type { ImportWriter } from './import-writer';
import { runWithBrowserLock } from '../../platform/concurrency/run-with-browser-session-lock';

/** Creates dialog-owned worker persistence; explicit storage injection supports repository verification. */
export function createImportWriter(storage?: ImportWriter): ImportWriter {
  if (!storage) return createWorkerImportWriter();
  return {
    get diagnosticFailure() {
      return storage.diagnosticFailure;
    },
    close: () => storage.close(),
    prepare: async (request, signal) => {
      const plan = await storage.prepare(request, signal);
      return {
        ...plan,
        commit: async (commitSignal) => {
          signal.throwIfAborted();
          commitSignal.throwIfAborted();
          const pending = new AbortController();
          const abort = () => pending.abort();
          signal.addEventListener('abort', abort, { once: true });
          commitSignal.addEventListener('abort', abort, { once: true });
          try {
            // Uses the background synchronizer's lock so an in-flight browser
            // operation finishes before import rechecks and pauses its connection.
            return await runWithBrowserLock(
              'bookmark-synchronization-v1',
              () => plan.commit(pending.signal),
              pending.signal,
            );
          } finally {
            signal.removeEventListener('abort', abort);
            commitSignal.removeEventListener('abort', abort);
          }
        },
      };
    },
  };
}
