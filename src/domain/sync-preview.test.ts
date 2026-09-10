import { describe, expect, it } from 'vitest';
import {
  previewInitialSync,
  validateSyncTree,
  type SyncNode,
} from './sync-preview';

const root: SyncNode = { id: 'root', parentId: null, title: 'Root', index: 0 };
const bookmark: SyncNode = {
  id: 'bookmark',
  parentId: 'root',
  title: 'Example',
  url: 'https://example.com/',
  index: 0,
};
describe('initial synchronization preview', () => {
  it('proposes additions in the allowed direction without initial deletions', () => {
    const extension = [root, bookmark];
    const browser = [
      root,
      { ...bookmark, id: 'other', url: 'https://other.example/' },
    ];
    expect(
      previewInitialSync(extension, browser, 'root', 'root', 'both'),
    ).toMatchObject({
      extension: { add: 1, update: 0, delete: 0 },
      browser: { add: 1, update: 0, delete: 0 },
      conflicts: 0,
    });
    expect(
      previewInitialSync(
        extension,
        browser,
        'root',
        'root',
        'browser-to-extension',
      ),
    ).toMatchObject({ extension: { add: 1 }, browser: { add: 0 } });
    expect(
      previewInitialSync(
        extension,
        browser,
        'root',
        'root',
        'extension-to-browser',
      ),
    ).toMatchObject({ extension: { add: 0 }, browser: { add: 1 } });
    expect(extension).toEqual([root, bookmark]);
  });
  it('normalizes URLs and identifies title conflicts rather than pairing arbitrarily', () => {
    const browser = [
      root,
      { ...bookmark, url: 'https://example.com', title: 'Other title' },
    ];
    expect(
      previewInitialSync([root, bookmark], browser, 'root', 'root', 'both')
        .conflicts,
    ).toBe(1);
    expect(
      previewInitialSync(
        [root, bookmark],
        browser,
        'root',
        'root',
        'browser-to-extension',
      ).extension.update,
    ).toBe(1);
  });
  it('withholds ambiguous folder descendants and does not merge duplicate URLs', () => {
    const duplicate = { ...bookmark, id: 'duplicate' };
    expect(
      previewInitialSync(
        [root, bookmark, duplicate],
        [root, bookmark],
        'root',
        'root',
        'both',
      ),
    ).toMatchObject({
      conflicts: 1,
      extension: { add: 0 },
      browser: { add: 0 },
    });
    const folder = {
      id: 'folder',
      title: 'Folder',
      parentId: 'root',
      index: 0,
    };
    expect(
      previewInitialSync(
        [
          root,
          folder,
          { ...folder, id: 'second' },
          { ...bookmark, parentId: 'folder' },
        ],
        [root, folder],
        'root',
        'root',
        'both',
      ),
    ).toMatchObject({ conflicts: 1, browser: { add: 0 } });
  });
  it('counts nested additions and skips unsafe URLs', () => {
    const folder = {
      id: 'folder',
      title: 'Folder',
      parentId: 'root',
      index: 0,
    };
    const browser = [
      root,
      folder,
      { ...bookmark, parentId: 'folder' },
      {
        ...bookmark,
        id: 'unsafe',
        parentId: 'folder',
        url: 'javascript:alert(1)',
      },
    ];
    expect(
      previewInitialSync([root], browser, 'root', 'root', 'both'),
    ).toMatchObject({ extension: { add: 2 }, skipped: 1 });
  });
  it('rejects missing selections, duplicate IDs, dangling parents, and cycles', () => {
    expect(() =>
      previewInitialSync([root], [root], 'missing', 'root', 'both'),
    ).toThrow('sync-folder-unavailable');
    expect(() => validateSyncTree([root, root])).toThrow(
      'sync-tree-duplicate-id',
    );
    expect(() => validateSyncTree([bookmark])).toThrow(
      'sync-tree-invalid-parent',
    );
    expect(() => validateSyncTree([{ ...root, parentId: 'root' }])).toThrow(
      'sync-tree-cycle',
    );
  });
});
