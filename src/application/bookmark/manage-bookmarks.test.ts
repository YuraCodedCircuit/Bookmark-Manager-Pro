import { describe, expect, it, vi } from 'vitest';

import type { BookmarkRepository } from './bookmark-repository';
import { ManageBookmarks } from './manage-bookmarks';

const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
const rootId = '11111111-1111-4111-8111-111111111111';
const itemId = '22222222-2222-4222-8222-222222222222';
const root = {
  backgroundAppearance: {
    colors: ['#2f80c9', '#185a82', '#0b1f3a'] as [string, string, string],
    direction: 135,
    kind: 'gradient' as const,
  },
  bookmarkGroupBy: 'none' as const,
  bookmarkSortBy: 'manual' as const,
  bookmarkSortDirection: 'ascending' as const,
  bookmarkView: 'card' as const,
  cardSize: 'small' as const,
  cardSpacing: 'comfortable' as const,
  detailsTableTransparency: 0,
  includeNavigationBackground: true,
  navigationTransparency: 70,
  cardAppearance: { kind: 'color' as const, value: '#2f7de1' },
  createdAt: 10,
  id: rootId,
  isRoot: true,
  index: 0,
  note: '',
  parentId: null,
  profileId,
  tags: [],
  title: 'Home',
  updatedAt: 10,
};

function repository(): BookmarkRepository {
  return {
    addBookmark: vi.fn(async () => undefined),
    addFolder: vi.fn(async () => undefined),
    addItems: vi.fn(async () => undefined),
    captureProfileState: vi.fn(async () => ({
      bookmarks: [],
      favorites: [],
      folders: [root],
    })),
    deleteItem: vi.fn(async () => undefined),
    ensureRoot: vi.fn(async (_profileId, candidate) => candidate),
    getBookmark: vi.fn(async () => undefined),
    getFolder: vi.fn(async (_profileId, folderId) =>
      folderId === rootId ? root : undefined,
    ),
    isItemIdAvailable: vi.fn(async () => true),
    listBookmarks: vi.fn(async () => []),
    listContents: vi.fn(async () => ({ bookmarks: [], folders: [] })),
    listFavorites: vi.fn(async () => []),
    listFolders: vi.fn(async () => [root]),
    moveItem: vi.fn(async () => undefined),
    nextIndex: vi.fn(async () => 0),
    removeFavorite: vi.fn(async () => undefined),
    restoreProfileState: vi.fn(async () => undefined),
    setFavorite: vi.fn(async () => undefined),
    updateBookmark: vi.fn(async () => undefined),
    updateFolder: vi.fn(async () => undefined),
  };
}

describe('ManageBookmarks', () => {
  it('matches duplicate bookmarks by canonical URL across the profile', async () => {
    const repo = repository();
    vi.mocked(repo.listBookmarks).mockResolvedValue([
      {
        cardAppearance: { kind: 'color', value: '#123456' },
        createdAt: 1,
        id: itemId,
        index: 0,
        note: '',
        parentId: rootId,
        profileId,
        tags: [],
        title: 'Existing',
        updatedAt: 1,
        url: 'https://example.com/',
      },
    ]);
    const service = new ManageBookmarks(repo);
    await expect(
      service.hasBookmarkWithUrl(profileId, 'https://example.com'),
    ).resolves.toBe(true);
    await expect(
      service.hasBookmarkWithUrl(profileId, 'https://example.com', itemId),
    ).resolves.toBe(false);
  });

  it('requires an existing non-root item before deletion', async () => {
    const repo = repository();
    const service = new ManageBookmarks(repo);
    await expect(service.deleteItem(profileId, rootId)).rejects.toThrow(
      'root-folder-cannot-delete',
    );
    await expect(service.deleteItem(profileId, itemId)).rejects.toThrow(
      'delete-item-not-found',
    );
    expect(repo.deleteItem).not.toHaveBeenCalled();
  });

  it('rejects moving a folder into its descendant', async () => {
    const repo = repository();
    const parent = { ...root, id: itemId, isRoot: false, parentId: rootId };
    const child = {
      ...parent,
      id: '33333333-3333-4333-8333-333333333333',
      parentId: itemId,
    };
    vi.mocked(repo.getFolder).mockImplementation(async (_profileId, folderId) =>
      [root, parent, child].find((folder) => folder.id === folderId),
    );
    vi.mocked(repo.listFolders).mockResolvedValue([root, parent, child]);
    const service = new ManageBookmarks(repo);
    const onValidated = vi.fn();
    await expect(
      service.moveItem(profileId, itemId, child.id, 0, onValidated),
    ).rejects.toThrow('folder-cycle-detected');
    expect(onValidated).not.toHaveBeenCalled();
    expect(repo.moveItem).not.toHaveBeenCalled();
  });

  it('signals successful validation immediately before move persistence', async () => {
    const repo = repository();
    const order: string[] = [];
    vi.mocked(repo.getBookmark).mockResolvedValue({
      cardAppearance: { kind: 'color', value: '#123456' },
      createdAt: 1,
      id: itemId,
      index: 0,
      note: '',
      parentId: rootId,
      profileId,
      tags: [],
      title: 'Example',
      updatedAt: 1,
      url: 'https://example.com/',
    });
    vi.mocked(repo.moveItem).mockImplementation(async () => {
      order.push('persist');
    });
    const service = new ManageBookmarks(repo);

    await service.moveItem(profileId, itemId, rootId, 0, () => {
      order.push('validated');
    });

    expect(order).toEqual(['validated', 'persist']);
  });

  it('recursively copies a folder tree with new IDs and timestamps', async () => {
    const repo = repository();
    const childId = '33333333-3333-4333-8333-333333333333';
    const bookmarkId = '44444444-4444-4444-8444-444444444444';
    const copiedFolderId = '55555555-5555-4555-8555-555555555555';
    const copiedChildId = '66666666-6666-4666-8666-666666666666';
    const copiedBookmarkId = '77777777-7777-4777-8777-777777777777';
    const source = { ...root, id: itemId, isRoot: false, parentId: rootId };
    const child = { ...source, id: childId, parentId: itemId };
    const bookmark = {
      cardAppearance: { kind: 'color' as const, value: '#123456' },
      createdAt: 1,
      id: bookmarkId,
      index: 0,
      note: '',
      parentId: childId,
      profileId,
      tags: [],
      title: 'Nested',
      updatedAt: 1,
      url: 'https://example.com/',
    };
    vi.mocked(repo.getFolder).mockImplementation(async (_profileId, folderId) =>
      [root, source, child].find(({ id }) => id === folderId),
    );
    vi.mocked(repo.listFolders).mockResolvedValue([root, source, child]);
    vi.mocked(repo.listBookmarks).mockResolvedValue([bookmark]);
    const ids = [copiedFolderId, copiedChildId, copiedBookmarkId];
    const service = new ManageBookmarks(
      repo,
      () => ids.shift()!,
      () => 50,
    );

    await expect(service.copyItem(profileId, itemId, rootId)).resolves.toEqual({
      itemCount: 3,
      rootItemId: copiedFolderId,
    });
    expect(repo.addItems).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: copiedBookmarkId,
          parentId: copiedChildId,
        }),
      ],
      expect.arrayContaining([
        expect.objectContaining({ id: copiedFolderId, parentId: rootId }),
        expect.objectContaining({
          id: copiedChildId,
          parentId: copiedFolderId,
        }),
      ]),
      rootId,
      50,
    );
  });

  it('rejects copying a folder into itself or a descendant', async () => {
    const repo = repository();
    const child = {
      ...root,
      id: '33333333-3333-4333-8333-333333333333',
      isRoot: false,
      parentId: itemId,
    };
    const source = { ...child, id: itemId, parentId: rootId };
    vi.mocked(repo.getFolder).mockImplementation(async (_profileId, folderId) =>
      [root, source, child].find(({ id }) => id === folderId),
    );
    vi.mocked(repo.listFolders).mockResolvedValue([root, source, child]);
    const service = new ManageBookmarks(repo);

    await expect(service.copyItem(profileId, itemId, child.id)).rejects.toThrow(
      'invalid-folder-destination',
    );
    expect(repo.addItems).not.toHaveBeenCalled();
  });

  it('creates a safe root folder for a profile', async () => {
    const repo = repository();
    const service = new ManageBookmarks(
      repo,
      () => rootId,
      () => 10,
    );
    await expect(service.ensureRoot(profileId)).resolves.toEqual(root);
    expect(repo.ensureRoot).toHaveBeenCalledWith(profileId, root);
  });

  it('creates bookmarks and folders under the selected parent', async () => {
    const repo = repository();
    const service = new ManageBookmarks(
      repo,
      () => itemId,
      () => 20,
    );
    await service.createBookmark({
      cardAppearance: { kind: 'color', value: '#123456' },
      note: 'Note',
      parentId: rootId,
      profileId,
      title: 'Example',
      tags: ['docs'],
      url: 'https://example.com/',
    });
    await service.createFolder({
      bookmarkGroupBy: 'domain',
      bookmarkSortBy: 'title',
      bookmarkSortDirection: 'descending',
      cardAppearance: {
        colors: ['#000000', '#777777', '#ffffff'],
        direction: 90,
        kind: 'gradient',
      },
      cardSize: 'large',
      cardSpacing: 'spacious',
      note: '',
      parentId: rootId,
      profileId,
      title: 'Reading',
      tags: [],
    });
    expect(repo.addBookmark).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: rootId, title: 'Example' }),
    );
    expect(repo.addFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        bookmarkGroupBy: 'domain',
        bookmarkSortBy: 'title',
        bookmarkSortDirection: 'descending',
        cardSize: 'large',
        cardSpacing: 'spacious',
        parentId: rootId,
        title: 'Reading',
      }),
    );
  });

  it('rejects unsafe URLs and parents outside the active profile', async () => {
    const repo = repository();
    const service = new ManageBookmarks(
      repo,
      () => itemId,
      () => 20,
    );
    await expect(
      service.createBookmark({
        cardAppearance: { kind: 'color', value: '#123456' },
        note: '',
        parentId: rootId,
        profileId,
        title: 'Unsafe',
        tags: [],
        url: 'javascript:alert(1)',
      }),
    ).rejects.toThrow();
    await expect(
      service.createFolder({
        cardAppearance: { kind: 'color', value: '#123456' },
        note: '',
        parentId: itemId,
        profileId,
        title: 'Missing parent',
        tags: [],
      }),
    ).rejects.toThrow('parent-folder-not-found');
  });

  it('updates editable fields while preserving identity and placement', async () => {
    const repo = repository();
    const bookmark = {
      cardAppearance: { kind: 'color' as const, value: '#123456' },
      createdAt: 10,
      id: itemId,
      index: 4,
      note: 'Old note',
      parentId: rootId,
      profileId,
      tags: ['old'],
      title: 'Old bookmark',
      updatedAt: 10,
      url: 'https://old.example.com/',
    };
    const folder = {
      ...root,
      createdAt: 11,
      id: '33333333-3333-4333-8333-333333333333',
      index: 5,
      isRoot: false,
      parentId: rootId,
      title: 'Old folder',
    };
    vi.mocked(repo.getBookmark).mockResolvedValue(bookmark);
    vi.mocked(repo.getFolder).mockImplementation(async (_profileId, id) =>
      id === folder.id ? folder : root,
    );
    const service = new ManageBookmarks(
      repo,
      () => itemId,
      () => 30,
    );

    await service.updateBookmark(profileId, bookmark.id, {
      cardAppearance: { kind: 'color', value: '#abcdef' },
      note: 'New note',
      tags: ['new'],
      title: 'New bookmark',
      url: 'https://new.example.com/',
    });
    await service.updateFolder(profileId, folder.id, {
      cardAppearance: { kind: 'color', value: '#fedcba' },
      note: 'Folder note',
      tags: ['folder'],
      title: 'New folder',
    });

    expect(repo.updateBookmark).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: 10,
        id: itemId,
        index: 4,
        parentId: rootId,
        title: 'New bookmark',
        updatedAt: 30,
      }),
    );
    expect(repo.updateFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundAppearance: root.backgroundAppearance,
        createdAt: 11,
        id: folder.id,
        index: 5,
        parentId: rootId,
        title: 'New folder',
        updatedAt: 30,
      }),
    );
  });

  it('updates the current folder background and view in one mutation', async () => {
    const repo = repository();
    const service = new ManageBookmarks(
      repo,
      () => itemId,
      () => 40,
    );

    await service.updateFolderStyle(profileId, rootId, {
      backgroundAppearance: { kind: 'color', value: '#123456' },
      bookmarkGroupBy: 'type',
      bookmarkSortBy: 'title',
      bookmarkSortDirection: 'descending',
      bookmarkView: 'details',
      cardSize: 'large',
      cardSpacing: 'spacious',
      detailsTableTransparency: 35,
      includeNavigationBackground: true,
      navigationTransparency: 70,
    });

    expect(repo.updateFolder).toHaveBeenCalledWith({
      ...root,
      backgroundAppearance: { kind: 'color', value: '#123456' },
      bookmarkGroupBy: 'type',
      bookmarkSortBy: 'title',
      bookmarkSortDirection: 'descending',
      bookmarkView: 'details',
      cardSize: 'large',
      cardSpacing: 'spacious',
      detailsTableTransparency: 35,
      includeNavigationBackground: true,
      navigationTransparency: 70,
      updatedAt: 40,
    });
  });

  it('returns saved favorites and the five newest non-root items', async () => {
    const repo = repository();
    const bookmark = {
      cardAppearance: { kind: 'color' as const, value: '#123456' },
      createdAt: 30,
      id: itemId,
      index: 0,
      note: '',
      parentId: rootId,
      profileId,
      tags: [],
      title: 'Newest bookmark',
      updatedAt: 30,
      url: 'https://example.com/',
    };
    vi.mocked(repo.listBookmarks).mockResolvedValue([bookmark]);
    vi.mocked(repo.listFavorites).mockResolvedValue([
      { favoritedAt: 40, itemId, kind: 'bookmark', profileId },
    ]);
    const result = await new ManageBookmarks(repo).listNavigationItems(
      profileId,
    );
    expect(result.favorites).toEqual([{ kind: 'bookmark', value: bookmark }]);
    expect(result.recent).toEqual([{ kind: 'bookmark', value: bookmark }]);
  });

  it('validates ownership before adding or removing a favorite', async () => {
    const repo = repository();
    const folder = { ...root, id: itemId, isRoot: false };
    vi.mocked(repo.getFolder).mockResolvedValue(folder);
    const service = new ManageBookmarks(repo, undefined, () => 50);
    await service.setFavorite(profileId, itemId, true);
    expect(repo.setFavorite).toHaveBeenCalledWith({
      favoritedAt: 50,
      itemId,
      kind: 'folder',
      profileId,
    });
    await service.setFavorite(profileId, itemId, false);
    expect(repo.removeFavorite).toHaveBeenCalledWith(profileId, itemId);
  });
});
