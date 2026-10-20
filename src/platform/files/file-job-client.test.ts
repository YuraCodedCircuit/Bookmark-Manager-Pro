import { expect, it, vi } from 'vitest';
import { createFileJobClient } from './file-job-client';

function worker() {
  return {
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: ErrorEvent) => void) | null,
    onmessageerror: null as (() => void) | null,
    postMessage: vi.fn(),
    terminate: vi.fn(),
  };
}
it('uses versioned messages, progress and results and releases abort listeners', async () => {
  const host = worker(),
    client = createFileJobClient(host as unknown as Worker),
    controller = new AbortController(),
    progress = vi.fn();
  const pending = client.request(
    'create',
    { synthetic: true },
    controller.signal,
    progress,
  );
  expect(host.postMessage).toHaveBeenCalledWith({
    version: 1,
    id: 1,
    type: 'create',
    input: { synthetic: true },
  });
  host.onmessage!({
    data: { version: 1, id: 1, type: 'progress', done: 1, total: 2 },
  } as MessageEvent);
  host.onmessage!({
    data: { version: 1, id: 1, type: 'result', value: 42 },
  } as MessageEvent);
  expect(await pending).toBe(42);
  expect(progress).toHaveBeenCalledWith(1, 2);
  controller.abort();
  expect(host.postMessage).toHaveBeenCalledOnce();
  client.close();
  expect(host.terminate).toHaveBeenCalledOnce();
});
it('cancels pending work, ignores late results and fails closed on malformed messages', async () => {
  const host = worker(),
    client = createFileJobClient(host as unknown as Worker),
    controller = new AbortController();
  const pending = client.request('prepare', {}, controller.signal);
  controller.abort();
  await expect(pending).rejects.toThrow('Aborted');
  expect(host.postMessage).toHaveBeenLastCalledWith({
    version: 1,
    id: 1,
    type: 'abort',
  });
  host.onmessage!({
    data: { version: 1, id: 1, type: 'result', value: 42 },
  } as MessageEvent);
  const second = client.request('prepare', {}, new AbortController().signal);
  host.onmessage!({ data: { version: 99, type: 'result' } } as MessageEvent);
  await expect(second).rejects.toThrow('file-worker-failed');
  expect(host.terminate).toHaveBeenCalledOnce();
});
it('isolates worker failures and retains only a fixed stale-destination error', async () => {
  const host = worker(),
    client = createFileJobClient(host as unknown as Worker);
  const pending = client.request('commit', null, new AbortController().signal);
  host.onmessage!({
    data: {
      version: 1,
      id: 1,
      type: 'failed',
      changed: true,
      error: 'private',
    },
  } as MessageEvent);
  await expect(pending).rejects.toThrow('import-destination-changed');
  const failed = client.request('prepare', {}, new AbortController().signal);
  host.onerror!({ preventDefault: vi.fn() } as unknown as ErrorEvent);
  await expect(failed).rejects.toThrow('file-worker-failed');
});
