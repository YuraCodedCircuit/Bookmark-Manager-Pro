import { z } from 'zod';
import { createExportService } from '../../application/export/create-export-service';
import { exportCategories } from '../../domain/profile-export';
import { csvExportColumnsSchema } from '../../domain/csv-export';

z.config({ jitless: true });
const inputSchema = z.object({
  profileIds: z.array(z.uuid()).min(1).max(1000),
  format: z.enum(['bmpro', 'json', 'csv', 'html']),
  categories: z.array(z.enum(exportCategories)).max(5),
  includeBackups: z.boolean(),
  password: z.string().optional(),
  encrypted: z.boolean().optional(),
  csvColumns: csvExportColumnsSchema.optional(),
});
const commandSchema = z.object({
  version: z.literal(1),
  id: z.number().int(),
  type: z.enum(['create', 'estimate', 'abort']),
  input: z.unknown().optional(),
});
let busy = false;
addEventListener('message', (event: MessageEvent<unknown>) => {
  const command = commandSchema.safeParse(event.data);
  if (!command.success || command.data.type === 'abort') return;
  const { id, type } = command.data;
  if (busy) {
    postMessage({ version: 1, id, type: 'failed' });
    return;
  }
  busy = true;
  void (async () => {
    try {
      const parsedInput = inputSchema.parse(command.data.input);
      const { csvColumns, ...rest } = parsedInput;
      const input = { ...rest, ...(csvColumns ? { csvColumns } : {}) };
      const service = createExportService();
      const signal = new AbortController().signal;
      if (type === 'estimate') {
        const estimate = { ...input };
        delete estimate.password;
        const value = await service.estimate(
          { ...estimate, encrypted: input.encrypted ?? false },
          signal,
        );
        postMessage({ version: 1, id, type: 'result', value });
      } else {
        const file = await service.create(input, signal, (done, total) =>
          postMessage({ version: 1, id, type: 'progress', done, total }),
        );
        postMessage({
          version: 1,
          id,
          type: 'result',
          value: {
            ...file,
            content: new Blob([file.content], { type: file.mimeType }),
          },
        });
      }
    } catch {
      postMessage({ version: 1, id, type: 'failed' });
    } finally {
      busy = false;
    }
  })();
});
