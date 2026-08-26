import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';

import { BookmarkManagerDatabase } from './database';
import { DexieBookmarkRepository } from './dexie-bookmark-repository';

const databases: BookmarkManagerDatabase[] = [];
const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
const rootId = '11111111-1111-4111-8111-111111111111';
const root = {
  backgroundAppearance: { kind: 'color' as const, value: '#0b121a' },
  bookmarkView: 'card' as const,
  detailsTableTransparency: 0,
  includeNavigationBackground: false,
  navigationTransparency: 45,
  cardAppearance: { kind: 'color' as const, value: '#2f7de1' },
  createdAt: 1,
  id: rootId,
  isRoot: true,
  index: 0,
  note: '',
  parentId: null,
  profileId,
  tags: [],
  title: 'Home',
  updatedAt: 1,
};

afterEach(async () =>
  Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  ),
);

describe('DexieBookmarkRepository', () => {
  it('adds a prepared copied tree in one profile transaction', async () => {
    const database = new BookmarkManagerDatabase(
      `copy-tree-test-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = new DexieBookmarkRepository(database);
    const folderId = '22222222-2222-4222-8222-222222222222';
    const bookmarkId = '33333333-3333-4333-8333-333333333333';
    const folder = {
      ...root,
      createdAt: 10,
      id: folderId,
      isRoot: false,
      parentId: rootId,
      title: 'Copied folder',
      updatedAt: 10,
    };
    const bookmark = {
      cardAppearance: { kind: 'color' as const, value: '#abcdef' },
      createdAt: 10,
      id: bookmarkId,
      index: 0,
      note: '',
      parentId: folderId,
      profileId,
      tags: [],
      title: 'Copied bookmark',
      updatedAt: 10,
      url: 'https://example.com/',
    };
    await repository.ensureRoot(profileId, root);

    await repository.addItems([bookmark], [folder], rootId, 10);

    await expect(repository.getFolder(profileId, folderId)).resolves.toEqual(
      folder,
    );
    await expect(
      repository.getBookmark(profileId, bookmarkId),
    ).resolves.toEqual(bookmark);
    await expect(
      repository.getFolder(profileId, rootId),
    ).resolves.toMatchObject({
      updatedAt: 10,
    });
  });

  it('saves, orders, removes, and isolates favorites by profile', async () => {
    const database = new BookmarkManagerDatabase(
      `favorite-test-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = new DexieBookmarkRepository(database);
    const otherProfileId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const firstId = '22222222-2222-4222-8222-222222222222';
    const secondId = '33333333-3333-4333-8333-333333333333';

    await repository.setFavorite({
      favoritedAt: 1,
      itemId: firstId,
      kind: 'folder',
      profileId,
    });
    await repository.setFavorite({
      favoritedAt: 2,
      itemId: secondId,
      kind: 'bookmark',
      profileId,
    });
    await repository.setFavorite({
      favoritedAt: 3,
      itemId: firstId,
      kind: 'folder',
      profileId: otherProfileId,
    });

    await expect(repository.listFavorites(profileId)).resolves.toEqual([
      expect.objectContaining({ itemId: secondId }),
      expect.objectContaining({ itemId: firstId }),
    ]);
    await repository.removeFavorite(profileId, secondId);
    await expect(repository.listFavorites(profileId)).resolves.toEqual([
      expect.objectContaining({ itemId: firstId }),
    ]);
    await expect(
      repository.listFavorites(otherProfileId),
    ).resolves.toHaveLength(1);
  });

  it('creates one root and lists profile-scoped children', async () => {
    const database = new BookmarkManagerDatabase(
      `bookmark-test-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = new DexieBookmarkRepository(database);
    await expect(repository.ensureRoot(profileId, root)).resolves.toEqual(root);
    await expect(
      repository.ensureRoot(profileId, {
        ...root,
        id: '22222222-2222-4222-8222-222222222222',
      }),
    ).resolves.toEqual(root);
    const childId = '33333333-3333-4333-8333-333333333333';
    await repository.addFolder({
      ...root,
      id: childId,
      isRoot: false,
      index: 0,
      title: 'Child',
      parentId: rootId,
    });
    await repository.addBookmark({
      cardAppearance: { kind: 'color', value: '#123456' },
      createdAt: 2,
      id: '44444444-4444-4444-8444-444444444444',
      index: 1,
      note: '',
      parentId: rootId,
      profileId,
      title: 'Example',
      tags: [],
      updatedAt: 2,
      url: 'https://example.com/',
    });
    const contents = await repository.listContents(profileId, rootId);
    expect(contents.folders.map(({ title }) => title)).toEqual(['Child']);
    expect(contents.bookmarks.map(({ title }) => title)).toEqual(['Example']);
    await expect(repository.nextIndex(profileId, rootId)).resolves.toBe(2);
    await repository.addBookmark({
      cardAppearance: { kind: 'color', value: '#abcdef' },
      createdAt: 99,
      id: '55555555-5555-4555-8555-555555555555',
      index: 0,
      note: '',
      parentId: childId,
      profileId,
      tags: [],
      title: 'Nested',
      updatedAt: 99,
      url: 'ftp://example.com/file.txt',
    });
    await expect(database.folders.get(childId)).resolves.toMatchObject({
      updatedAt: 99,
    });
    await expect(database.folders.get(rootId)).resolves.toMatchObject({
      updatedAt: 99,
    });
    await expect(repository.isItemIdAvailable(childId)).resolves.toBe(false);

    const bookmark = contents.bookmarks[0];
    const folder = contents.folders[0];
    expect(bookmark).toBeDefined();
    expect(folder).toBeDefined();
    await repository.updateBookmark({
      ...bookmark!,
      title: 'Updated bookmark',
      updatedAt: 100,
    });
    await repository.updateFolder({
      ...folder!,
      title: 'Updated folder',
      updatedAt: 101,
    });
    await expect(database.bookmarks.get(bookmark!.id)).resolves.toMatchObject({
      title: 'Updated bookmark',
      updatedAt: 100,
    });
    await expect(database.folders.get(folder!.id)).resolves.toMatchObject({
      title: 'Updated folder',
      updatedAt: 101,
    });
  });

  it('atomically restores affected records from an undo patch', async () => {
    const database = new BookmarkManagerDatabase(
      `undo-restore-test-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = new DexieBookmarkRepository(database);
    const childId = '22222222-2222-4222-8222-222222222222';
    const child = {
      ...root,
      id: childId,
      isRoot: false,
      parentId: rootId,
      title: 'Restored',
    };
    await repository.ensureRoot(profileId, root);

    await repository.restoreProfileState(
      profileId,
      { bookmarks: [], favorites: [], folders: [child] },
      { bookmarkIds: [], favoriteIds: [], folderIds: [childId] },
    );
    await expect(
      repository.getFolder(profileId, childId),
    ).resolves.toMatchObject({ title: 'Restored' });

    await repository.restoreProfileState(
      profileId,
      { bookmarks: [], favorites: [], folders: [] },
      { bookmarkIds: [], favoriteIds: [], folderIds: [childId] },
    );
    await expect(
      repository.getFolder(profileId, childId),
    ).resolves.toBeUndefined();
  });
});
