import Dexie from 'dexie';

import type {
  BookmarkRepository,
  FolderContents,
  UndoStateIds,
} from '../application/bookmark/bookmark-repository';
import { bookmarkSchema, type Bookmark } from '../domain/bookmark';
import {
  folderSchema,
  folderTreeIndexKeySchema,
  folderTreeSummarySchema,
  type Folder,
  type FolderTreeSummary,
} from '../domain/folder';
import { favoriteItemSchema, type FavoriteItem } from '../domain/favorite-item';
import {
  undoProfileStateSchema,
  type UndoProfileState,
} from '../domain/undo-history';
import type { BookmarkManagerDatabase } from './database';
import {
  hydrateFolderBackground,
  persistFolderBackground,
  deleteUnusedFolderWallpapers,
} from './folder-wallpapers';

/** Stores validated profile content in IndexedDB. */
export class DexieBookmarkRepository implements BookmarkRepository {
  constructor(private readonly database: BookmarkManagerDatabase) {}

  async ensureRoot(profileId: string, root: Folder): Promise<Folder> {
    return this.database.transaction(
      'rw',
      [this.database.folders, this.database.folderWallpapers],
      async () => {
        const existing = await this.database.folders
          .where('profileId')
          .equals(profileId)
          .filter((folder) => folder.isRoot)
          .first();
        if (existing) return this.hydrateFolder(folderSchema.parse(existing));
        await this.database.folders.add(await this.toStoredFolder(root));
        return root;
      },
    );
  }

  async getFolder(
    profileId: string,
    folderId: string,
  ): Promise<Folder | undefined> {
    const stored = await this.database.folders.get(folderId);
    return stored?.profileId === profileId
      ? this.hydrateFolder(folderSchema.parse(stored))
      : undefined;
  }

  async getBookmark(
    profileId: string,
    bookmarkId: string,
  ): Promise<Bookmark | undefined> {
    const stored = await this.database.bookmarks.get(bookmarkId);
    return stored?.profileId === profileId
      ? bookmarkSchema.parse(stored)
      : undefined;
  }

  async isItemIdAvailable(id: string): Promise<boolean> {
    const [bookmark, folder] = await Promise.all([
      this.database.bookmarks.get(id),
      this.database.folders.get(id),
    ]);
    return bookmark === undefined && folder === undefined;
  }

  async listFolders(profileId: string): Promise<readonly Folder[]> {
    return Promise.all(
      (
        await this.database.folders
          .where('profileId')
          .equals(profileId)
          .toArray()
      ).map((item) => this.hydrateFolder(folderSchema.parse(item))),
    );
  }

  async listFolderTreeSummaries(
    profileId: string,
  ): Promise<readonly FolderTreeSummary[]> {
    const [root, keys] = await Promise.all([
      this.database.folders
        .where('profileId')
        .equals(profileId)
        .filter((folder) => folder.isRoot)
        .first(),
      this.database.folders
        .where('[profileId+parentId+createdAt+id+title]')
        .between(
          [profileId, Dexie.minKey],
          [profileId, Dexie.maxKey],
          true,
          true,
        )
        .keys(),
    ]);
    const summaries = keys.map((key) => {
      const [storedProfileId, parentId, createdAt, id, title] =
        folderTreeIndexKeySchema.parse(key);
      return folderTreeSummarySchema.parse({
        createdAt,
        id,
        isRoot: false,
        parentId,
        profileId: storedProfileId,
        title,
      });
    });
    return root
      ? [folderTreeSummarySchema.parse(root), ...summaries]
      : summaries;
  }

  async listBookmarks(profileId: string): Promise<readonly Bookmark[]> {
    return (
      await this.database.bookmarks
        .where('profileId')
        .equals(profileId)
        .toArray()
    ).map((item) => bookmarkSchema.parse(item));
  }

  async listBookmarksByUrl(
    profileId: string,
    url: string,
  ): Promise<readonly Bookmark[]> {
    return (
      await this.database.bookmarks
        .where('[profileId+url]')
        .equals([profileId, url])
        .toArray()
    ).map((item) => bookmarkSchema.parse(item));
  }

  async listFavorites(profileId: string): Promise<readonly FavoriteItem[]> {
    return (
      await this.database.favoriteItems
        .where('profileId')
        .equals(profileId)
        .reverse()
        .sortBy('favoritedAt')
    ).map((item) => favoriteItemSchema.parse(item));
  }

  async listContents(
    profileId: string,
    parentId: string,
  ): Promise<FolderContents> {
    const [bookmarks, folders] = await Promise.all([
      this.database.bookmarks
        .where('[profileId+parentId]')
        .equals([profileId, parentId])
        .toArray(),
      this.database.folders
        .where('[profileId+parentId]')
        .equals([profileId, parentId])
        .toArray(),
    ]);
    return {
      bookmarks: bookmarks
        .map((item) => bookmarkSchema.parse(item))
        .sort((a, b) => a.index - b.index),
      folders: (
        await Promise.all(
          folders.map((item) => this.hydrateFolder(folderSchema.parse(item))),
        )
      ).sort((a, b) => a.index - b.index),
    };
  }

  async nextIndex(profileId: string, parentId: string): Promise<number> {
    const rangeStart = [profileId, parentId, Dexie.minKey];
    const rangeEnd = [profileId, parentId, Dexie.maxKey];
    const [lastBookmark, lastFolder] = await Promise.all([
      this.database.bookmarks
        .where('[profileId+parentId+index]')
        .between(rangeStart, rangeEnd, true, true)
        .last(),
      this.database.folders
        .where('[profileId+parentId+index]')
        .between(rangeStart, rangeEnd, true, true)
        .last(),
    ]);
    return Math.max(lastBookmark?.index ?? -1, lastFolder?.index ?? -1) + 1;
  }

  async addBookmark(bookmark: Bookmark): Promise<Bookmark> {
    return this.database.transaction(
      'rw',
      [
        this.database.bookmarks,
        this.database.folders,
        this.database.folderWallpapers,
      ],
      async () => {
        const parent = await this.database.folders.get(bookmark.parentId);
        if (!parent || parent.profileId !== bookmark.profileId)
          throw new Error('parent-folder-not-found');
        const index = await this.nextIndex(
          bookmark.profileId,
          bookmark.parentId,
        );
        const created = bookmarkSchema.parse({ ...bookmark, index });
        await this.database.bookmarks.add(created);
        await this.touchAncestorsInTransaction(
          bookmark.profileId,
          bookmark.parentId,
          bookmark.updatedAt,
        );
        return created;
      },
    );
  }

  async addFolder(folder: Folder): Promise<Folder> {
    return this.database.transaction(
      'rw',
      [
        this.database.bookmarks,
        this.database.folders,
        this.database.folderWallpapers,
      ],
      async () => {
        if (!folder.parentId) throw new Error('parent-folder-not-found');
        const parent = await this.database.folders.get(folder.parentId);
        if (!parent || parent.profileId !== folder.profileId)
          throw new Error('parent-folder-not-found');
        const index = await this.nextIndex(folder.profileId, folder.parentId);
        const created = folderSchema.parse({ ...folder, index });
        await this.database.folders.add(await this.toStoredFolder(created));
        if (folder.parentId) {
          await this.touchAncestorsInTransaction(
            folder.profileId,
            folder.parentId,
            folder.updatedAt,
          );
        }
        return created;
      },
    );
  }

  async addItems(
    bookmarks: readonly Bookmark[],
    folders: readonly Folder[],
    destinationParentId: string,
    timestamp: number,
  ): Promise<void> {
    const validatedBookmarks = bookmarks.map((value) =>
      bookmarkSchema.parse(value),
    );
    const validatedFolders = folders.map((value) => folderSchema.parse(value));
    await this.database.transaction(
      'rw',
      [this.database.bookmarks, this.database.folders],
      async () => {
        await this.database.folders.bulkAdd(
          await Promise.all(
            validatedFolders.map((folder) => this.toStoredFolder(folder)),
          ),
        );
        await this.database.bookmarks.bulkAdd(validatedBookmarks);
        const profileId =
          validatedFolders[0]?.profileId ?? validatedBookmarks[0]?.profileId;
        if (!profileId) throw new Error('copy-source-empty');
        await this.touchAncestorsInTransaction(
          profileId,
          destinationParentId,
          timestamp,
        );
      },
    );
  }

  async updateBookmark(
    bookmark: Bookmark,
    expectedUpdatedAt?: number,
  ): Promise<void> {
    await this.database.transaction(
      'rw',
      [this.database.bookmarks, this.database.folders],
      async () => {
        const existing = await this.database.bookmarks.get(bookmark.id);
        if (!existing || existing.profileId !== bookmark.profileId) {
          throw new Error('bookmark-not-found');
        }
        if (
          expectedUpdatedAt !== undefined &&
          existing.updatedAt !== expectedUpdatedAt
        )
          throw new Error('content-changed');
        await this.database.bookmarks.put(bookmark);
        await this.touchAncestorsInTransaction(
          bookmark.profileId,
          bookmark.parentId,
          bookmark.updatedAt,
        );
      },
    );
  }

  async updateFolder(
    folder: Folder,
    expectedUpdatedAt?: number,
  ): Promise<void> {
    await this.database.transaction(
      'rw',
      [
        this.database.folders,
        this.database.folderWallpapers,
        this.database.profileSettings,
      ],
      async () => {
        const existing = await this.database.folders.get(folder.id);
        if (!existing || existing.profileId !== folder.profileId) {
          throw new Error('folder-not-found');
        }
        if (
          expectedUpdatedAt !== undefined &&
          existing.updatedAt !== expectedUpdatedAt
        )
          throw new Error('content-changed');
        await this.database.folders.put(await this.toStoredFolder(folder));
        if (folder.parentId) {
          await this.touchAncestorsInTransaction(
            folder.profileId,
            folder.parentId,
            folder.updatedAt,
          );
        }
        await deleteUnusedFolderWallpapers(this.database, folder.profileId);
      },
    );
  }

  private async hydrateFolder(folder: Folder): Promise<Folder> {
    return folderSchema.parse({
      ...folder,
      backgroundAppearance: await hydrateFolderBackground(
        this.database,
        folder.profileId,
        folder.backgroundAppearance,
      ),
    });
  }

  private async toStoredFolder(folder: Folder): Promise<Folder> {
    return folderSchema.parse({
      ...folder,
      backgroundAppearance: await persistFolderBackground(
        this.database,
        folder.profileId,
        folder.backgroundAppearance,
        folder.updatedAt,
      ),
    });
  }

  async setFavorite(favorite: FavoriteItem): Promise<void> {
    await this.database.favoriteItems.put(favoriteItemSchema.parse(favorite));
  }

  async removeFavorite(profileId: string, itemId: string): Promise<void> {
    await this.database.favoriteItems.delete([profileId, itemId]);
  }

  async deleteItem(profileId: string, itemId: string): Promise<void> {
    await this.database.transaction(
      'rw',
      [
        this.database.bookmarks,
        this.database.folders,
        this.database.favoriteItems,
        this.database.folderWallpapers,
        this.database.profileSettings,
      ],
      async () => {
        const bookmark = await this.database.bookmarks.get(itemId);
        if (bookmark?.profileId === profileId) {
          await this.database.bookmarks.delete(itemId);
          await this.database.favoriteItems.delete([profileId, itemId]);
          return;
        }
        const folder = await this.database.folders.get(itemId);
        if (!folder || folder.profileId !== profileId || folder.isRoot)
          throw new Error('delete-item-not-found');
        const folders = await this.database.folders
          .where('profileId')
          .equals(profileId)
          .toArray();
        const descendantIds = new Set([itemId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const candidate of folders) {
            if (
              candidate.parentId &&
              descendantIds.has(candidate.parentId) &&
              !descendantIds.has(candidate.id)
            ) {
              descendantIds.add(candidate.id);
              changed = true;
            }
          }
        }
        const bookmarks = await this.database.bookmarks
          .where('profileId')
          .equals(profileId)
          .filter((candidate) => descendantIds.has(candidate.parentId))
          .primaryKeys();
        await this.database.bookmarks.bulkDelete(bookmarks);
        await this.database.folders.bulkDelete([...descendantIds]);
        await this.database.favoriteItems
          .where('profileId')
          .equals(profileId)
          .filter(
            (favorite) =>
              descendantIds.has(favorite.itemId) ||
              bookmarks.includes(favorite.itemId),
          )
          .delete();
        await deleteUnusedFolderWallpapers(this.database, profileId);
      },
    );
  }

  async moveItem(
    profileId: string,
    itemId: string,
    destinationParentId: string,
    destinationIndex: number,
  ): Promise<void> {
    await this.database.transaction(
      'rw',
      [this.database.bookmarks, this.database.folders],
      async () => {
        const bookmark = await this.database.bookmarks.get(itemId);
        const folder = bookmark
          ? undefined
          : await this.database.folders.get(itemId);
        const item = bookmark ?? folder;
        if (!item || item.profileId !== profileId)
          throw new Error('move-item-not-found');
        const destination =
          await this.database.folders.get(destinationParentId);
        if (!destination || destination.profileId !== profileId)
          throw new Error('destination-folder-not-found');
        const oldParentId = item.parentId;
        if (!oldParentId) throw new Error('root-folder-cannot-move');
        const sourceItems = [
          ...(await this.database.bookmarks
            .where('[profileId+parentId]')
            .equals([profileId, oldParentId])
            .toArray()),
          ...(await this.database.folders
            .where('[profileId+parentId]')
            .equals([profileId, oldParentId])
            .toArray()),
        ]
          .filter((candidate) => candidate.id !== itemId)
          .sort((a, b) => a.index - b.index);
        const destinationItems =
          oldParentId === destinationParentId
            ? sourceItems
            : [
                ...(await this.database.bookmarks
                  .where('[profileId+parentId]')
                  .equals([profileId, destinationParentId])
                  .toArray()),
                ...(await this.database.folders
                  .where('[profileId+parentId]')
                  .equals([profileId, destinationParentId])
                  .toArray()),
              ].sort((a, b) => a.index - b.index);
        destinationItems.splice(
          Math.min(destinationIndex, destinationItems.length),
          0,
          {
            ...item,
            parentId: destinationParentId,
          },
        );
        const put = async (value: Bookmark | Folder): Promise<void> => {
          if ('url' in value) await this.database.bookmarks.put(value);
          else await this.database.folders.put(value);
        };
        for (const [index, value] of sourceItems.entries())
          await put({ ...value, index });
        for (const [index, value] of destinationItems.entries())
          await put({ ...value, index });
        const timestamp = Date.now();
        await this.touchAncestorsInTransaction(
          profileId,
          destinationParentId,
          timestamp,
        );
        if (oldParentId && oldParentId !== destinationParentId)
          await this.touchAncestorsInTransaction(
            profileId,
            oldParentId,
            timestamp,
          );
      },
    );
  }

  async captureProfileState(profileId: string): Promise<UndoProfileState> {
    const [bookmarks, folders, favorites] = await Promise.all([
      this.listBookmarks(profileId),
      this.listFolders(profileId),
      this.listFavorites(profileId),
    ]);
    return undoProfileStateSchema.parse({ bookmarks, favorites, folders });
  }

  async captureFolderLineageState(
    profileId: string,
    folderId: string,
  ): Promise<UndoProfileState> {
    const folderIds = await this.folderLineageIds(profileId, folderId);
    return this.captureStateByIds(profileId, {
      bookmarkIds: [],
      favoriteItemIds: [],
      folderIds,
    });
  }

  async captureItemState(
    profileId: string,
    itemId: string,
  ): Promise<UndoProfileState> {
    const bookmark = await this.database.bookmarks.get(itemId);
    if (bookmark?.profileId === profileId) {
      return this.captureStateByIds(profileId, {
        bookmarkIds: [itemId],
        favoriteItemIds: [itemId],
        folderIds: await this.folderLineageIds(profileId, bookmark.parentId),
      });
    }

    const target = await this.database.folders.get(itemId);
    if (!target || target.profileId !== profileId)
      throw new Error('undo-item-not-found');
    const folders = await this.database.folders
      .where('profileId')
      .equals(profileId)
      .toArray();
    const descendantIds = new Set([itemId]);
    let foundDescendant = true;
    while (foundDescendant) {
      foundDescendant = false;
      for (const folder of folders) {
        if (
          folder.parentId &&
          descendantIds.has(folder.parentId) &&
          !descendantIds.has(folder.id)
        ) {
          descendantIds.add(folder.id);
          foundDescendant = true;
        }
      }
    }
    const bookmarks = await this.database.bookmarks
      .where('profileId')
      .equals(profileId)
      .filter(({ parentId }) => descendantIds.has(parentId))
      .primaryKeys();
    const ancestorIds = target.parentId
      ? await this.folderLineageIds(profileId, target.parentId)
      : [];
    return this.captureStateByIds(profileId, {
      bookmarkIds: bookmarks,
      favoriteItemIds: [...bookmarks, ...descendantIds],
      folderIds: [...ancestorIds, ...descendantIds],
    });
  }

  async captureStateByIds(
    profileId: string,
    ids: UndoStateIds,
  ): Promise<UndoProfileState> {
    const [storedBookmarks, storedFolders, storedFavorites] = await Promise.all(
      [
        this.database.bookmarks.bulkGet([...new Set(ids.bookmarkIds)]),
        this.database.folders.bulkGet([...new Set(ids.folderIds)]),
        this.database.favoriteItems.bulkGet(
          [...new Set(ids.favoriteItemIds)].map(
            (itemId) => [profileId, itemId] as [string, string],
          ),
        ),
      ],
    );
    const bookmarks = storedBookmarks.flatMap((value) =>
      value?.profileId === profileId ? [bookmarkSchema.parse(value)] : [],
    );
    const folders = await Promise.all(
      storedFolders.flatMap((value) =>
        value?.profileId === profileId
          ? [this.hydrateFolder(folderSchema.parse(value))]
          : [],
      ),
    );
    const favorites = storedFavorites.flatMap((value) =>
      value?.profileId === profileId ? [favoriteItemSchema.parse(value)] : [],
    );
    return undoProfileStateSchema.parse({ bookmarks, favorites, folders });
  }

  async restoreProfileState(
    profileId: string,
    state: UndoProfileState,
    affectedIds: {
      bookmarkIds: readonly string[];
      favoriteIds: readonly string[];
      folderIds: readonly string[];
    },
  ): Promise<void> {
    const validated = undoProfileStateSchema.parse(state);
    if (
      [
        ...validated.bookmarks,
        ...validated.folders,
        ...validated.favorites,
      ].some((value) => value.profileId !== profileId)
    )
      throw new Error('undo-profile-mismatch');

    await this.database.transaction(
      'rw',
      [
        this.database.bookmarks,
        this.database.folders,
        this.database.favoriteItems,
      ],
      async () => {
        const bookmarkMap = new Map(
          validated.bookmarks.map((bookmark) => [bookmark.id, bookmark]),
        );
        const folderMap = new Map(
          validated.folders.map((folder) => [folder.id, folder]),
        );
        const favoriteMap = new Map(
          validated.favorites.map((favorite) => [favorite.itemId, favorite]),
        );

        for (const id of affectedIds.bookmarkIds) {
          const value = bookmarkMap.get(id);
          if (value) await this.database.bookmarks.put(value);
          else await this.database.bookmarks.delete(id);
        }
        for (const id of affectedIds.folderIds) {
          const value = folderMap.get(id);
          if (value) await this.database.folders.put(value);
          else await this.database.folders.delete(id);
        }
        for (const id of affectedIds.favoriteIds) {
          const value = favoriteMap.get(id);
          if (value) await this.database.favoriteItems.put(value);
          else await this.database.favoriteItems.delete([profileId, id]);
        }
      },
    );
  }

  private async touchAncestorsInTransaction(
    profileId: string,
    parentId: string,
    updatedAt: number,
  ): Promise<void> {
    let currentId: string | null = parentId;
    const visited = new Set<string>();
    while (currentId) {
      if (visited.has(currentId)) throw new Error('folder-cycle-detected');
      visited.add(currentId);
      const folder: Folder | undefined =
        await this.database.folders.get(currentId);
      if (!folder || folder.profileId !== profileId) {
        throw new Error('parent-folder-not-found');
      }
      await this.database.folders.update(currentId, { updatedAt });
      currentId = folder.parentId;
    }
  }

  private async folderLineageIds(
    profileId: string,
    folderId: string,
  ): Promise<string[]> {
    const ids: string[] = [];
    const visited = new Set<string>();
    let currentId: string | null = folderId;
    while (currentId) {
      if (visited.has(currentId)) throw new Error('folder-cycle-detected');
      visited.add(currentId);
      const folder: Folder | undefined =
        await this.database.folders.get(currentId);
      if (!folder || folder.profileId !== profileId)
        throw new Error('parent-folder-not-found');
      ids.push(currentId);
      currentId = folder.parentId;
    }
    return ids;
  }
}
