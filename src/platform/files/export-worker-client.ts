import { z } from 'zod';
import { createFileJobClient } from './file-job-client';
import type {
  ExportEstimateOptions,
  ExportOptions,
  ExportFile,
} from '../../application/export/export-profiles';

/** Shares a Blob with the download adapter instead of cloning a large serialized string onto the UI thread. */
export type ExportDownloadFile = Omit<ExportFile, 'content'> & {
  content: string | Blob;
};
const fileSchema = z.object({
  content: z.instanceof(Blob),
  filename: z
    .string()
    .regex(/^bookmark-manager-pro-[\d-]+\.(bmpro|json|csv|html)$/),
  mimeType: z.string().max(100),
});

/** Runs each export or password-free estimate in a terminable, local dedicated worker. */
export function createWorkerExportService() {
  const run = async (
    type: 'create' | 'estimate',
    input: ExportOptions | ExportEstimateOptions,
    signal: AbortSignal,
    progress?: (done: number, total: number) => void,
  ) => {
    signal.throwIfAborted();
    const client = createFileJobClient(
      new Worker(new URL('./export-worker.ts', import.meta.url), {
        type: 'module',
      }),
    );
    const abort = () => client.close();
    signal.addEventListener('abort', abort, { once: true });
    try {
      return await client.request(type, input, signal, progress);
    } finally {
      signal.removeEventListener('abort', abort);
      client.close();
    }
  };
  return {
    create: async (
      options: ExportOptions,
      signal: AbortSignal,
      progress: (done: number, total: number) => void,
    ): Promise<ExportDownloadFile> =>
      fileSchema.parse(await run('create', options, signal, progress)),
    estimate: async (
      options: ExportEstimateOptions,
      signal: AbortSignal,
    ): Promise<number> =>
      z
        .number()
        .int()
        .nonnegative()
        .parse(await run('estimate', options, signal)),
  };
}
