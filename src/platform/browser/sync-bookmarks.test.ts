import { describe, expect, it, vi } from 'vitest';
import {
  createSyncBookmarksAdapter,
  parseNativeBookmarkTree,
} from './sync-bookmarks';

describe('sync bookmark boundary', () => {
  it('requests only optional bookmarks access and never reads after revocation', async () => {
    const api = {
      permissions: {
        request: vi.fn(async () => false),
        contains: vi.fn(async () => false),
      },
      bookmarks: { getTree: vi.fn(async () => []) },
    };
    const adapter = createSyncBookmarksAdapter(api);
    await expect(adapter.requestAccess()).resolves.toBe(false);
    expect(api.permissions.request).toHaveBeenCalledWith({
      permissions: ['bookmarks'],
    });
    await expect(adapter.readTree()).rejects.toThrow(
      'sync-permission-required',
    );
    expect(api.bookmarks.getTree).not.toHaveBeenCalled();
  });
  it('validates granted tree reads and rejects malformed API output', async () => {
    const api = {
      permissions: {
        request: vi.fn(async () => true),
        contains: vi.fn(async () => true),
      },
      bookmarks: {
        getTree: vi.fn<() => Promise<unknown>>(async () => [
          {
            id: '0',
            title: '',
            children: [{ id: '1', title: 'Bookmarks bar' }],
          },
        ]),
      },
    };
    const adapter = createSyncBookmarksAdapter(api);
    expect(await adapter.readTree()).toContainEqual({
      id: '1',
      parentId: '0',
      title: 'Bookmarks bar',
      index: 0,
    });
    api.bookmarks.getTree.mockResolvedValue([{ id: 2 }]);
    await expect(adapter.readTree()).rejects.toThrow();
  });
  it('rejects duplicate native IDs and bookmarks with children', () => {
    expect(() =>
      parseNativeBookmarkTree([
        { id: '1', title: '' },
        { id: '1', title: '' },
      ]),
    ).toThrow();
    expect(() =>
      parseNativeBookmarkTree([
        { id: '1', title: '', url: 'https://example.com', children: [{}] },
      ]),
    ).toThrow('sync-tree-invalid-bookmark');
  });
});
