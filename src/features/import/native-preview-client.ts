import type { ImportValidationEvent } from '../../application/import/native-import-session';
import type { PortableImportItem } from '../../domain/portable-import';
import type { CsvColumn } from '../../domain/csv-export';
import type { ExportPayload } from '../../domain/profile-export';

/** Verified display-only native profile metadata; source identities never become stored IDs. */
export interface NativeProfilePreview {
  id: string;
  name: string;
  bookmarks: number;
  folders: number;
}

/** Worker responses carry verified content to the foreground owner, never errors or credentials. */
export type NativePreviewMessage =
  | { type: 'event'; event: ImportValidationEvent }
  | { type: 'ready'; profiles: NativeProfilePreview[]; payload?: ExportPayload }
  | {
      type: 'portable';
      items: PortableImportItem[];
      format?: 'json' | 'html' | 'csv';
      csvColumns?: CsvColumn[];
    }
  | { type: 'locked'; failed: boolean }
  | { type: 'failed' };

/** A dialog-owned processing boundary. Termination discards file and decrypted references. */
export interface NativePreviewClient {
  load(file: File): void;
  unlock(password: string): void;
  terminate(): void;
}

/** Starts a dedicated module worker; callers must terminate on close, replacement, and pagehide. */
export function createNativePreviewClient(
  receive: (message: NativePreviewMessage) => void,
): NativePreviewClient {
  const worker = new Worker(
    new URL('./native-preview-worker.ts', import.meta.url),
    { type: 'module' },
  );
  worker.onmessage = (event: MessageEvent<NativePreviewMessage>) =>
    receive(event.data);
  worker.onerror = (event) => {
    event.preventDefault();
    receive({
      type: 'event',
      event: { level: 'ERROR', code: 'import.validation.failed' },
    });
    receive({ type: 'failed' });
  };
  worker.onmessageerror = () => {
    receive({
      type: 'event',
      event: { level: 'ERROR', code: 'import.validation.failed' },
    });
    receive({ type: 'failed' });
  };
  return {
    load: (file) => worker.postMessage({ version: 1, type: 'load', file }),
    unlock: (password) =>
      worker.postMessage({ version: 1, type: 'unlock', password }),
    terminate: () => {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    },
  };
}
