import { afterEach, expect, it, vi } from 'vitest';
import { createImportWriter } from './create-import-writer';
import type {
  ImportWriter,
  ImportSavePlan,
  ImportRequest,
} from './import-writer';

afterEach(() => vi.restoreAllMocks());
it('serializes commit with synchronization and aborts a queued request on cancellation', async () => {
  const commit = vi.fn(async () => ({ profileIds: [] }));
  const plan: ImportSavePlan = {
    profiles: 0,
    bookmarks: 1,
    folders: 0,
    duplicatePolicy: 'allow',
    snapshotMode: 'enabled',
    duplicates: 0,
    excluded: 0,
    commit,
  };
  const storage: ImportWriter = { prepare: async () => plan, close: vi.fn() };
  const request = {
    kind: 'portable',
    items: [],
    profileId: '',
    folderId: '',
    originProfileId: '',
  } satisfies ImportRequest;
  const lock = vi.fn(
    (_name: string, options: LockOptions) =>
      new Promise<void>((_resolve, reject) => {
        options.signal!.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      }),
  );
  const previous = Object.getOwnPropertyDescriptor(navigator, 'locks');
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: lock },
  });
  try {
    const writer = createImportWriter(storage);
    const controller = new AbortController();
    const prepared = await writer.prepare(request, controller.signal);
    const pending = prepared.commit(new AbortController().signal);
    expect(lock.mock.calls[0]![0]).toBe('bookmark-synchronization-v1');
    expect(commit).not.toHaveBeenCalled();
    controller.abort();
    await expect(pending).rejects.toThrow('Aborted');
    expect(commit).not.toHaveBeenCalled();
    writer.close();
    expect(storage.close).toHaveBeenCalledOnce();
  } finally {
    if (previous) Object.defineProperty(navigator, 'locks', previous);
    else Reflect.deleteProperty(navigator, 'locks');
  }
});
