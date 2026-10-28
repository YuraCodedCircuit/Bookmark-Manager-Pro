import { describe, expect, it, vi } from 'vitest';
import {
  createFolderTabHandler,
  type FolderTabDependencies,
} from './folder-tabs';

const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
const folderId = '7bcb5b52-10ec-432b-b527-b3bda97103c1';
const pageUrl = 'chrome-extension://test/newtab.html';
const pendingPageUrl = 'chrome-extension://test/folder-tab-pending.html';
const sender = {
  id: 'test',
  url: pageUrl,
  tab: {
    id: 1,
    index: 0,
    highlighted: false,
    active: true,
    pinned: false,
    incognito: false,
  },
};
const open = {
  protocolVersion: 1,
  type: 'folder-tab.open',
  profileId,
  folderId,
};
const claim = { protocolVersion: 1, type: 'folder-tab.claim', profileId };

function fixture() {
  const values = new Map<string, unknown>();
  let nextTab = 2;
  const deps: FolderTabDependencies = {
    pageUrl,
    pendingPageUrl,
    extensionId: 'test',
    read: vi.fn(async (key) => values.get(key)),
    keys: vi.fn(async () => [...values.keys()]),
    write: vi.fn(async (key, value) => {
      values.set(key, value);
    }),
    remove: vi.fn(async (key) => {
      values.delete(key);
    }),
    exists: vi.fn(async () => true),
    create: vi.fn(async () => nextTab++),
    activate: vi.fn(async (id) => {
      expect(values.has('folderTabV1:' + id)).toBe(true);
    }),
  };
  return { values, deps, handle: createFolderTabHandler(deps) };
}

describe('background folder tabs', () => {
  it('binds before clean navigation and survives worker recreation and repeated claims', async () => {
    const { handle, deps } = fixture();
    expect(await handle(open, sender)).toEqual({ status: 'opened' });
    const restarted = createFolderTabHandler(deps);
    const destinationSender = { ...sender, tab: { ...sender.tab, id: 2 } };
    expect(await restarted(claim, destinationSender)).toEqual({
      status: 'destination',
      folderId,
    });
    expect(await restarted(claim, destinationSender)).toEqual({
      status: 'destination',
      folderId,
    });
    expect(await restarted(claim, sender)).toEqual({ status: 'none' });
  });

  it('isolates concurrent destinations and preserves startup profile selection', async () => {
    const { handle } = fixture();
    const other = 'fd288ddd-a9cb-4787-aab9-99ad99381321';
    await Promise.all([
      handle(open, sender),
      handle({ ...open, folderId: other }, sender),
    ]);
    const results = await Promise.all(
      [2, 3].map((id) =>
        handle(claim, { ...sender, tab: { ...sender.tab, id } }),
      ),
    );
    expect(results).toEqual([
      { status: 'destination', folderId },
      { status: 'destination', folderId: other },
    ]);
    expect(
      await handle(
        { ...claim, profileId: other },
        { ...sender, tab: { ...sender.tab, id: 2 } },
      ),
    ).toEqual({ status: 'none' });
  });

  it.each([
    { ...sender, id: 'foreign' },
    { ...sender, url: 'https://example.com/' },
    { ...sender, url: 'chrome-extension://test/popup.html' },
    { id: sender.id, url: sender.url },
    { ...sender, url: 'not a URL' },
  ])('rejects untrusted senders without reading storage', async (untrusted) => {
    const { handle, deps } = fixture();
    expect(await handle(claim, untrusted)).toEqual({
      status: 'failed',
      errorCode: 'INVALID_REQUEST',
    });
    expect(deps.read).not.toHaveBeenCalled();
  });

  it('rejects forged tab IDs and malformed requests', async () => {
    const { handle } = fixture();
    expect(await handle({ ...claim, tabId: 2 }, sender)).toEqual({
      status: 'failed',
      errorCode: 'INVALID_REQUEST',
    });
    expect(await handle({ ...open, folderId: 'bad' }, sender)).toEqual({
      status: 'failed',
      errorCode: 'INVALID_REQUEST',
    });
  });

  it('rejects missing and cross-profile folders before creating a tab', async () => {
    const { handle, deps } = fixture();
    vi.mocked(deps.exists).mockResolvedValue(false);
    expect(await handle(open, sender)).toEqual({
      status: 'failed',
      errorCode: 'MISSING_DESTINATION',
    });
    expect(deps.create).not.toHaveBeenCalled();
  });

  it('does not create a tab when session persistence fails', async () => {
    const { handle, deps } = fixture();
    vi.mocked(deps.write).mockRejectedValue(new Error('quota'));
    expect(await handle(open, sender)).toEqual({
      status: 'failed',
      errorCode: 'UNAVAILABLE',
    });
    expect(deps.create).not.toHaveBeenCalled();
  });

  it('cleans its session state without activating a tab when binding fails', async () => {
    const { handle, deps, values } = fixture();
    vi.mocked(deps.write).mockImplementation(async (key, value) => {
      if (key === 'folderTabV1:2') throw new Error('quota');
      values.set(key, value);
    });
    expect(await handle(open, sender)).toEqual({
      status: 'failed',
      errorCode: 'TAB_FAILED',
    });
    expect(deps.activate).not.toHaveBeenCalled();
    expect(values.size).toBe(0);
  });

  it('keeps the binding retryable after failed readiness activation', async () => {
    const { handle, deps, values } = fixture();
    vi.mocked(deps.activate).mockRejectedValue(new Error('activation'));
    expect(await handle(open, sender)).toEqual({ status: 'opened' });
    const placeholder = {
      ...sender,
      url: pendingPageUrl,
      tab: { ...sender.tab, id: 2 },
    };
    expect(
      await handle(
        { protocolVersion: 1, type: 'folder-tab.ready' },
        placeholder,
      ),
    ).toEqual({
      status: 'failed',
      errorCode: 'UNAVAILABLE',
    });
    expect(values.has('folderTabV1:2')).toBe(true);
    vi.mocked(deps.activate).mockResolvedValue(undefined);
    expect(
      await createFolderTabHandler(deps)(
        { protocolVersion: 1, type: 'folder-tab.ready' },
        placeholder,
      ),
    ).toEqual({ status: 'ready' });
  });

  it('rejects corrupted bindings and revalidates deleted destinations', async () => {
    const { handle, values, deps } = fixture();
    values.set('folderTabV1:1', { version: 2, profileId, folderId });
    expect(await handle(claim, sender)).toEqual({
      status: 'failed',
      errorCode: 'UNAVAILABLE',
    });
    values.set('folderTabV1:1', { version: 1, profileId, folderId });
    vi.mocked(deps.exists).mockResolvedValue(false);
    expect(await handle(claim, sender)).toEqual({
      status: 'failed',
      errorCode: 'MISSING_DESTINATION',
    });
  });

  it('prunes expired creation intents without guessing which blank tabs they own', async () => {
    const { handle, values } = fixture();
    values.set('folderTabPendingV1:interrupted', {
      version: 1,
      profileId,
      folderId,
      expiresAt: Date.now() - 1,
    });
    expect(await handle(open, sender)).toEqual({ status: 'opened' });
    expect(values.has('folderTabPendingV1:interrupted')).toBe(false);
  });

  it('bounds outstanding bindings without creating another tab', async () => {
    const { handle, deps, values } = fixture();
    for (let index = 0; index < 100; index++)
      values.set('folderTabV1:' + index, { version: 1, profileId, folderId });
    expect(await handle(open, sender)).toEqual({
      status: 'failed',
      errorCode: 'UNAVAILABLE',
    });
    expect(deps.create).not.toHaveBeenCalled();
  });

  it('preserves the primary failure when cleanup also fails', async () => {
    const { handle, deps } = fixture();
    const diagnostic = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      vi.mocked(deps.write).mockImplementation(async (key) => {
        if (key.startsWith('folderTabV1:')) throw new Error('binding');
      });
      vi.mocked(deps.remove).mockRejectedValue(new Error('cleanup'));
      expect(await handle(open, sender)).toEqual({
        status: 'failed',
        errorCode: 'TAB_FAILED',
      });
      expect(diagnostic.mock.calls.flat()).not.toContain(profileId);
      expect(diagnostic.mock.calls.flat()).not.toContain(folderId);
    } finally {
      diagnostic.mockRestore();
    }
  });

  it('waits for binding before allowing only the owned placeholder to navigate itself', async () => {
    const { handle } = fixture();
    const ready = { protocolVersion: 1, type: 'folder-tab.ready' };
    const placeholder = {
      ...sender,
      url: pendingPageUrl,
      tab: { ...sender.tab, id: 2 },
    };
    expect(await handle(ready, placeholder)).toEqual({ status: 'waiting' });
    await handle(open, sender);
    expect(await handle(ready, placeholder)).toEqual({ status: 'ready' });
    expect(await handle(ready, sender)).toEqual({
      status: 'failed',
      errorCode: 'INVALID_REQUEST',
    });
    expect(await handle(ready, { ...placeholder, frameId: 1 })).toEqual({
      status: 'failed',
      errorCode: 'INVALID_REQUEST',
    });
    expect(
      await handle(ready, { ...placeholder, url: 'https://example.com/' }),
    ).toEqual({ status: 'failed', errorCode: 'INVALID_REQUEST' });
  });
});
