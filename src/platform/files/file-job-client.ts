import { z } from 'zod';

const replySchema = z.discriminatedUnion('type', [
  z.object({
    version: z.literal(1),
    id: z.number().int(),
    type: z.literal('result'),
    value: z.unknown(),
  }),
  z.object({
    version: z.literal(1),
    id: z.number().int(),
    type: z.literal('failed'),
    changed: z.boolean().optional(),
  }),
  z.object({
    version: z.literal(1),
    id: z.number().int(),
    type: z.literal('progress'),
    done: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
]);

/** Owns one local file-processing worker. Protocol errors fail closed without exposing worker errors. */
export function createFileJobClient(worker: Worker) {
  let nextId = 0;
  let closed = false;
  const pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      cleanup: () => void;
      progress?: ((done: number, total: number) => void) | undefined;
    }
  >();
  const fail = () => {
    if (closed) return;
    for (const entry of pending.values()) {
      entry.cleanup();
      entry.reject(new Error('file-worker-failed'));
    }
    pending.clear();
    closed = true;
    worker.terminate();
  };
  worker.onmessage = (event: MessageEvent<unknown>) => {
    const parsed = replySchema.safeParse(event.data);
    if (!parsed.success) {
      fail();
      return;
    }
    const reply = parsed.data;
    const entry = pending.get(reply.id);
    if (!entry) return;
    if (reply.type === 'progress') {
      entry.progress?.(reply.done, reply.total);
      return;
    }
    pending.delete(reply.id);
    entry.cleanup();
    if (reply.type === 'result') entry.resolve(reply.value);
    else
      entry.reject(
        new Error(
          reply.changed ? 'import-destination-changed' : 'file-worker-failed',
        ),
      );
  };
  worker.onerror = (event) => {
    event.preventDefault();
    fail();
  };
  worker.onmessageerror = fail;
  return {
    request(
      type: string,
      input: unknown,
      signal: AbortSignal,
      progress?: (done: number, total: number) => void,
    ): Promise<unknown> {
      signal.throwIfAborted();
      if (closed) return Promise.reject(new Error('file-worker-closed'));
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        const abort = () => {
          worker.postMessage({ version: 1, type: 'abort', id });
          pending.delete(id);
          signal.removeEventListener('abort', abort);
          reject(new DOMException('Aborted', 'AbortError'));
        };
        signal.addEventListener('abort', abort, { once: true });
        pending.set(id, {
          resolve,
          reject,
          cleanup: () => signal.removeEventListener('abort', abort),
          progress,
        });
        try {
          worker.postMessage({ version: 1, id, type, input });
        } catch {
          fail();
        }
      });
    },
    discard: () => {
      if (!closed) worker.postMessage({ version: 1, type: 'abort', id: 0 });
    },
    close: fail,
  };
}
