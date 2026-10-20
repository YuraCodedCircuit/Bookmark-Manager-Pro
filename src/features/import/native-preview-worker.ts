import { z } from 'zod';
import { NativeImportSession } from '../../application/import/native-import-session';
import { MAX_NATIVE_EXPORT_FILE_BYTES } from '../../domain/profile-export';
import { decodeImportFileText } from '../../domain/import-file-text';
import type { NativePreviewMessage } from './native-preview-client';
import { readPortableJson } from '../../domain/portable-import';
import {
  readBookmarkHtml,
  readPortableCsvPreview,
} from '../../domain/portable-text-import';

z.config({ jitless: true });

const command = z.discriminatedUnion('type', [
  z.object({
    version: z.literal(1),
    type: z.literal('load'),
    file: z.instanceof(File),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal('unlock'),
    password: z.string(),
  }),
]);
const send = (message: NativePreviewMessage) => postMessage(message);
const session = new NativeImportSession((event) =>
  send({ type: 'event', event }),
);
let busy = false;

// Raw bytes and credentials stay here; only verified content crosses to the foreground owner.
addEventListener('message', (event: MessageEvent<unknown>) => {
  if (busy) return;
  busy = true;
  void (async () => {
    try {
      const input = command.parse(event.data);
      let content: string | undefined;
      if (input.type === 'load') {
        content = await readFile(input.file);
        if (!content.trimStart().startsWith('{')) {
          send({
            type: 'event',
            event: { level: 'INFO', code: 'import.validation.started' },
          });
          const format = content.trimStart().startsWith('<') ? 'html' : 'csv';
          const preview =
            format === 'csv' ? readPortableCsvPreview(content, true) : null;
          const items = preview
            ? preview.items
            : readBookmarkHtml(content, true);
          send({
            type: 'event',
            event: { level: 'INFO', code: 'import.validation.ready' },
          });
          if (format === 'csv')
            send({
              type: 'event',
              event: { level: 'WARN', code: 'import.validation.csv-flat' },
            });
          // The UI terminates this worker as soon as it receives the final preview.
          send({
            type: 'portable',
            items,
            format,
            ...(preview ? { csvColumns: preview.columns } : {}),
          });
          return;
        }
        const header = z
          .object({ format: z.string() })
          .parse(JSON.parse(content));
        if (header.format === 'bookmark-manager-pro-bookmarks') {
          send({
            type: 'event',
            event: { level: 'INFO', code: 'import.validation.started' },
          });
          const items = readPortableJson(content, true);
          send({
            type: 'event',
            event: { level: 'INFO', code: 'import.validation.ready' },
          });
          send({ type: 'portable', items, format: 'json' });
          return;
        }
      }
      const state =
        input.type === 'load'
          ? await session.load(content!)
          : await session.unlock(input.password);
      if (state.phase === 'ready') {
        send({
          type: 'ready',
          payload: state.payload,
          profiles: state.payload.profiles.map((item, index) => ({
            id: String(index),
            name: item.profile.username,
            bookmarks: item.bookmarks?.length ?? 0,
            folders:
              item.folders?.filter((folder) => !folder.isRoot).length ?? 0,
          })),
        });
      } else if (state.phase === 'locked') {
        send({ type: 'locked', failed: state.unlockFailed });
      } else {
        send({ type: 'failed' });
      }
    } catch {
      send({
        type: 'event',
        event: { level: 'ERROR', code: 'import.validation.failed' },
      });
      send({ type: 'failed' });
    } finally {
      busy = false;
    }
  })();
});

async function readFile(file: File): Promise<string> {
  if (!file.size || file.size > MAX_NATIVE_EXPORT_FILE_BYTES)
    throw new Error('import-file-size');
  return decodeImportFileText(new Uint8Array(await file.arrayBuffer()));
}
