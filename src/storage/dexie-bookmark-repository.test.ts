import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';

import { BookmarkManagerDatabase } from './database';
import { DexieBookmarkRepository } from './dexie-bookmark-repository';
import { UndoHistoryService } from '../application/undo-history/undo-history-service';

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
  it('never deletes a folder through a stale bookmark-only request and keeps other profiles intact', async () => {
    const database = new BookmarkManagerDatabase(
      `bookmark-only-delete-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = new DexieBookmarkRepository(database);
    await repository.ensureRoot(profileId, root);
    const folderId = '22222222-2222-4222-8222-222222222222';
    await repository.addFolder({
      ...root,
      id: folderId,
      parentId: rootId,
      isRoot: false,
    });
    await expect(
      repository.deleteItem(profileId, folderId, 'bookmark'),
    ).rejects.toThrow('delete-bookmark-not-found');
    expect(await repository.getFolder(profileId, folderId)).toBeDefined();
    const bookmarkId = '33333333-3333-4333-8333-333333333333';
    const bookmark = {
      id: bookmarkId,
      profileId,
      parentId: folderId,
      title: 'Private bookmark',
      url: 'https://example.com/',
      index: 0,
      note: '',
      tags: [],
      createdAt: 1,
      updatedAt: 1,
      cardAppearance: root.cardAppearance,
    };
    await repository.addBookmark(bookmark);
    await expect(
      repository.deleteItem(
        '44444444-4444-4444-8444-444444444444',
        bookmarkId,
        'bookmark',
      ),
    ).rejects.toThrow();
    expect(await repository.getBookmark(profileId, bookmarkId)).toBeDefined();
    await repository.setFavorite({
      profileId,
      itemId: bookmarkId,
      kind: 'bookmark',
      favoritedAt: 1,
    });
    await repository.deleteItem(profileId, bookmarkId, 'bookmark');
    expect(await repository.getBookmark(profileId, bookmarkId)).toBeUndefined();
    expect(
      await database.favoriteItems.get([profileId, bookmarkId]),
    ).toBeUndefined();
    expect(await repository.getFolder(profileId, folderId)).toBeDefined();
  });
  it('returns validated tree summaries without image-bearing appearance data', async () => {
    const database = new BookmarkManagerDatabase(
      `folder-summaries-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = new DexieBookmarkRepository(database);
    await repository.ensureRoot(profileId, {
      ...root,
      backgroundAppearance: {
        fit: 'fill',
        kind: 'image',
        value: `data:image/png;base64,${'a'.repeat(500_000)}`,
      },
    });

    const storedRoot = await database.folders.get(rootId);
    expect(storedRoot?.backgroundAppearance).toMatchObject({
      fit: 'fill',
      kind: 'image',
    });
    expect(storedRoot?.backgroundAppearance).not.toHaveProperty('value');
    await expect(database.folderWallpapers.count()).resolves.toBe(1);

    await expect(
      repository.listFolderTreeSummaries(profileId),
    ).resolves.toEqual([
      {
        createdAt: root.createdAt,
        id: root.id,
        isRoot: true,
        parentId: null,
        profileId,
        title: 'Home',
      },
    ]);
  });

  it('uses the profile and URL index to return only matching bookmarks', async () => {
    const database = new BookmarkManagerDatabase(
      `bookmarks-by-url-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = new DexieBookmarkRepository(database);
    await repository.ensureRoot(profileId, root);
    const bookmark = (id: string, url: string) => ({
      cardAppearance: { kind: 'color' as const, value: '#abcdef' },
      createdAt: 2,
      id,
      index: 0,
      note: '',
      parentId: rootId,
      profileId,
      tags: [],
      title: 'Bookmark',
      updatedAt: 2,
      url,
    });
    await database.bookmarks.bulkAdd([
      bookmark('22222222-2222-4222-8222-222222222222', 'https://example.com/'),
      bookmark(
        '33333333-3333-4333-8333-333333333333',
        'https://other.example/',
      ),
    ]);

    await expect(
      repository.listBookmarksByUrl(profileId, 'https://example.com/'),
    ).resolves.toHaveLength(1);
  });

  it('captures only a deleted folder subtree, its favorites, and its ancestry', async () => {
    const database = new BookmarkManagerDatabase(
      `bounded-delete-state-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = new DexieBookmarkRepository(database);
    const targetId = '22222222-2222-4222-8222-222222222222';
    const descendantId = '33333333-3333-4333-8333-333333333333';
    const siblingId = '44444444-4444-4444-8444-444444444444';
    const includedBookmarkId = '55555555-5555-4555-8555-555555555555';
    const unrelatedBookmarkId = '66666666-6666-4666-8666-666666666666';
    await repository.ensureRoot(profileId, root);
    for (const folder of [
      {
        ...root,
        backgroundAppearance: {
          fit: 'fill' as const,
          kind: 'image' as const,
          value: `data:image/png;base64,${'w'.repeat(100_000)}`,
        },
        id: targetId,
        isRoot: false,
        parentId: rootId,
        title: 'Target',
      },
      {
        ...root,
        id: descendantId,
        isRoot: false,
        parentId: targetId,
        title: 'Descendant',
      },
      {
        ...root,
        id: siblingId,
        isRoot: false,
        parentId: rootId,
        title: 'Sibling',
      },
    ])
      await repository.addFolder(folder);
    const bookmark = (id: string, parentId: string, title: string) => ({
      cardAppearance: {
        fit: 'fill' as const,
        kind: 'image' as const,
        value: `data:image/png;base64,${title.repeat(10_000)}`,
      },
      createdAt: 2,
      id,
      index: 0,
      note: '',
      parentId,
      profileId,
      tags: [],
      title,
      updatedAt: 2,
      url: `https://${title}.example/`,
    });
    await repository.addBookmark(
      bookmark(includedBookmarkId, descendantId, 'included'),
    );
    await repository.addBookmark(
      bookmark(unrelatedBookmarkId, siblingId, 'unrelated'),
    );
    await repository.setFavorite({
      favoritedAt: 3,
      itemId: includedBookmarkId,
      kind: 'bookmark',
      profileId,
    });

    const captured = await repository.captureItemState(profileId, targetId);

    expect(captured.bookmarks.map(({ id }) => id)).toEqual([
      includedBookmarkId,
    ]);
    expect(captured.favorites.map(({ itemId }) => itemId)).toEqual([
      includedBookmarkId,
    ]);
    expect(new Set(captured.folders.map(({ id }) => id))).toEqual(
      new Set([rootId, targetId, descendantId]),
    );
    await expect(database.folderWallpapers.count()).resolves.toBe(1);
  });

  it('filters every bounded undo record by profile ownership', async () => {
    const database = new BookmarkManagerDatabase(
      `bounded-profile-state-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = new DexieBookmarkRepository(database);
    const otherProfileId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const otherRootId = '22222222-2222-4222-8222-222222222222';
    await repository.ensureRoot(profileId, root);
    await repository.ensureRoot(otherProfileId, {
      ...root,
      id: otherRootId,
      profileId: otherProfileId,
    });

    const captured = await repository.captureStateByIds(profileId, {
      bookmarkIds: [],
      favoriteItemIds: [],
      folderIds: [rootId, otherRootId],
    });

    expect(captured.folders.map(({ id }) => id)).toEqual([rootId]);
  });

  it('allocates unique append indexes inside concurrent creation transactions', async () => {
    const database = new BookmarkManagerDatabase(
      `concurrent-append-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = new DexieBookmarkRepository(database);
    await repository.ensureRoot(profileId, root);
    const bookmark = (id: string, title: string) => ({
      cardAppearance: { kind: 'color' as const, value: '#abcdef' },
      createdAt: 2,
      id,
      index: 0,
      note: '',
      parentId: rootId,
      profileId,
      tags: [],
      title,
      updatedAt: 2,
      url: `https://${title.toLowerCase()}.example/`,
    });

    await Promise.all([
      repository.addBookmark(
        bookmark('22222222-2222-4222-8222-222222222222', 'First'),
      ),
      repository.addBookmark(
        bookmark('33333333-3333-4333-8333-333333333333', 'Second'),
      ),
    ]);

    const contents = await repository.listContents(profileId, rootId);
    expect(contents.bookmarks.map(({ index }) => index)).toEqual([0, 1]);
    expect(new Set(contents.bookmarks.map(({ index }) => index)).size).toBe(2);
  });

  it('rejects an edit whose expected version became stale', async () => {
    const database = new BookmarkManagerDatabase(
      `stale-edit-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = new DexieBookmarkRepository(database);
    await repository.ensureRoot(profileId, root);
    const bookmark = {
      cardAppearance: { kind: 'color' as const, value: '#abcdef' },
      createdAt: 2,
      id: '22222222-2222-4222-8222-222222222222',
      index: 0,
      note: '',
      parentId: rootId,
      profileId,
      tags: [],
      title: 'Original',
      updatedAt: 2,
      url: 'https://example.com/',
    };
    await repository.addBookmark(bookmark);
    await repository.updateBookmark({
      ...bookmark,
      title: 'Other tab',
      updatedAt: 3,
    });

    await expect(
      repository.updateBookmark(
        { ...bookmark, title: 'Stale editor', updatedAt: 4 },
        2,
      ),
    ).rejects.toThrow('content-changed');
    await expect(
      repository.getBookmark(profileId, bookmark.id),
    ).resolves.toMatchObject({
      title: 'Other tab',
      updatedAt: 3,
    });
  });

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

  it('undoes sibling history independently without overwriting a later parent edit', async () => {
    const database = new BookmarkManagerDatabase(
      `independent-history-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = new DexieBookmarkRepository(database);
    await repository.ensureRoot(profileId, root);
    const service = new UndoHistoryService(
      { load: async () => [], save: async () => undefined },
      (id, state, affected) =>
        repository.restoreProfileState(id, state, affected),
    );
    const childIds = [
      '22222222-2222-4222-8222-222222222222',
      '44444444-4444-4444-8444-444444444444',
    ];
    for (const [index, id] of childIds.entries()) {
      const before = await repository.captureProfileState(profileId);
      const created = await repository.addFolder({
        ...root,
        id,
        isRoot: false,
        parentId: rootId,
        title: `Child ${index}`,
        updatedAt: index + 2,
      });
      await service.record({
        action: 'created',
        before,
        after: await repository.captureProfileState(profileId),
        itemId: id,
        itemType: 'folder',
        profileId,
      });
      const editBefore = await repository.captureItemState(profileId, id);
      await repository.updateFolder({
        ...created,
        title: `Edited ${index}`,
        updatedAt: index + 4,
      });
      await service.record({
        action: 'edited',
        before: editBefore,
        after: await repository.captureItemState(profileId, id),
        itemId: id,
        itemType: 'folder',
        profileId,
      });
    }
    const parent = await repository.getFolder(profileId, rootId);
    await repository.updateFolder({
      ...parent!,
      title: 'Later parent edit',
      updatedAt: 20,
    });
    const [firstCreate, firstEdit, secondCreate, secondEdit] =
      service.store.getState().entries;
    await service.undo(profileId, firstEdit!.id);
    await expect(
      repository.getFolder(profileId, childIds[0]!),
    ).resolves.toMatchObject({ title: 'Child 0' });
    await expect(
      repository.getFolder(profileId, childIds[1]!),
    ).resolves.toMatchObject({ title: 'Edited 1' });
    await service.undo(profileId, firstCreate!.id);
    await expect(
      repository.getFolder(profileId, childIds[0]!),
    ).resolves.toBeUndefined();
    await service.undo(profileId, secondEdit!.id);
    await service.undo(profileId, secondCreate!.id);
    await service.redo(profileId, secondCreate!.id);
    await service.redo(profileId, secondEdit!.id);
    await service.redo(profileId, firstCreate!.id);
    await service.redo(profileId, firstEdit!.id);
    await expect(
      repository.getFolder(profileId, rootId),
    ).resolves.toMatchObject({ title: 'Later parent edit', updatedAt: 20 });
    await expect(
      repository.getFolder(profileId, childIds[0]!),
    ).resolves.toMatchObject({ title: 'Edited 0' });
    await expect(
      repository.getFolder(profileId, childIds[1]!),
    ).resolves.toMatchObject({ title: 'Edited 1' });
  });

  it.each(['deleted', 'moved'] as const)(
    'restores a %s folder and its contents as one history action',
    async (action) => {
      const database = new BookmarkManagerDatabase(
        `linked-history-${crypto.randomUUID()}`,
      );
      databases.push(database);
      const repository = new DexieBookmarkRepository(database);
      await repository.ensureRoot(profileId, root);
      const parentId = '22222222-2222-4222-8222-222222222222';
      const childId = '33333333-3333-4333-8333-333333333333';
      const destinationId = '44444444-4444-4444-8444-444444444444';
      const bookmarkId = '55555555-5555-4555-8555-555555555555';
      for (const [id, parent] of [
        [parentId, rootId],
        [childId, parentId],
        [destinationId, rootId],
      ]) {
        await repository.addFolder({
          ...root,
          id: id!,
          parentId: parent!,
          isRoot: false,
        });
      }
      await repository.addBookmark({
        cardAppearance: root.cardAppearance,
        createdAt: 1,
        id: bookmarkId,
        index: 0,
        note: '',
        parentId: childId,
        profileId,
        tags: [],
        title: 'Nested bookmark',
        updatedAt: 1,
        url: 'https://example.com/',
      });
      const service = new UndoHistoryService(
        { load: async () => [], save: async () => undefined },
        (id, state, affected) =>
          repository.restoreProfileState(id, state, affected),
      );
      const before = await repository.captureProfileState(profileId);
      if (action === 'deleted')
        await repository.deleteItem(profileId, parentId);
      else await repository.moveItem(profileId, parentId, destinationId, 0);
      await service.record({
        action,
        before,
        after: await repository.captureProfileState(profileId),
        itemId: parentId,
        itemType: 'folder',
        profileId,
      });
      expect(service.store.getState().entries).toHaveLength(1);
      await service.undo(profileId);
      await expect(
        repository.getFolder(profileId, parentId),
      ).resolves.toMatchObject({ parentId: rootId });
      await expect(
        repository.getFolder(profileId, childId),
      ).resolves.toMatchObject({ parentId });
      await expect(
        repository.getBookmark(profileId, bookmarkId),
      ).resolves.toMatchObject({ parentId: childId });
      await service.redo(profileId);
      if (action === 'deleted') {
        await expect(
          repository.getFolder(profileId, parentId),
        ).resolves.toBeUndefined();
        await expect(
          repository.getFolder(profileId, childId),
        ).resolves.toBeUndefined();
        await expect(
          repository.getBookmark(profileId, bookmarkId),
        ).resolves.toBeUndefined();
      } else {
        await expect(
          repository.getFolder(profileId, parentId),
        ).resolves.toMatchObject({ parentId: destinationId });
        await expect(
          repository.getFolder(profileId, childId),
        ).resolves.toMatchObject({ parentId });
        await expect(
          repository.getBookmark(profileId, bookmarkId),
        ).resolves.toMatchObject({ parentId: childId });
      }
      await expect(
        repository.getFolder(profileId, destinationId),
      ).resolves.toBeDefined();
    },
  );

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
