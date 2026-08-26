import type {
  BookmarkRepository,
  FolderContents,
} from '../application/bookmark/bookmark-repository';
import { bookmarkSchema, type Bookmark } from '../domain/bookmark';
import { folderSchema, type Folder } from '../domain/folder';
import { favoriteItemSchema, type FavoriteItem } from '../domain/favorite-item';
import {
  undoProfileStateSchema,
  type UndoProfileState,
} from '../domain/undo-history';
import type { BookmarkManagerDatabase } from './database';

/** Stores validated profile content in IndexedDB. */
export class DexieBookmarkRepository implements BookmarkRepository {
  constructor(private readonly database: BookmarkManagerDatabase) {}

  async ensureRoot(profileId: string, root: Folder): Promise<Folder> {
    return this.database.transaction('rw', this.database.folders, async () => {
      const existing = await this.database.folders
        .where('profileId')
        .equals(profileId)
        .filter((folder) => folder.isRoot)
        .first();
      if (existing) return folderSchema.parse(existing);
      await this.database.folders.add(root);
      return root;
    });
  }

  async getFolder(
    profileId: string,
    folderId: string,
  ): Promise<Folder | undefined> {
    const stored = await this.database.folders.get(folderId);
    return stored?.profileId === profileId
      ? folderSchema.parse(stored)
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
    return (
      await this.database.folders.where('profileId').equals(profileId).toArray()
    ).map((item) => folderSchema.parse(item));
  }

  async listBookmarks(profileId: string): Promise<readonly Bookmark[]> {
    return (
      await this.database.bookmarks
        .where('profileId')
        .equals(profileId)
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
      folders: folders
        .map((item) => folderSchema.parse(item))
        .sort((a, b) => a.index - b.index),
    };
  }

  async nextIndex(profileId: string, parentId: string): Promise<number> {
    const contents = await this.listContents(profileId, parentId);
    return (
      Math.max(
        -1,
        ...contents.bookmarks.map(({ index }) => index),
        ...contents.folders.map(({ index }) => index),
      ) + 1
    );
  }

  async addBookmark(bookmark: Bookmark): Promise<void> {
    await this.database.transaction(
      'rw',
      [this.database.bookmarks, this.database.folders],
      async () => {
        await this.database.bookmarks.add(bookmark);
        await this.touchAncestorsInTransaction(
          bookmark.profileId,
          bookmark.parentId,
          bookmark.updatedAt,
        );
      },
    );
  }

  async addFolder(folder: Folder): Promise<void> {
    await this.database.transaction('rw', this.database.folders, async () => {
      await this.database.folders.add(folder);
      if (folder.parentId) {
        await this.touchAncestorsInTransaction(
          folder.profileId,
          folder.parentId,
          folder.updatedAt,
        );
      }
    });
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
        await this.database.folders.bulkAdd(validatedFolders);
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

  async updateBookmark(bookmark: Bookmark): Promise<void> {
    await this.database.transaction(
      'rw',
      [this.database.bookmarks, this.database.folders],
      async () => {
        const existing = await this.database.bookmarks.get(bookmark.id);
        if (!existing || existing.profileId !== bookmark.profileId) {
          throw new Error('bookmark-not-found');
        }
        await this.database.bookmarks.put(bookmark);
        await this.touchAncestorsInTransaction(
          bookmark.profileId,
          bookmark.parentId,
          bookmark.updatedAt,
        );
      },
    );
  }

  async updateFolder(folder: Folder): Promise<void> {
    await this.database.transaction('rw', this.database.folders, async () => {
      const existing = await this.database.folders.get(folder.id);
      if (!existing || existing.profileId !== folder.profileId) {
        throw new Error('folder-not-found');
      }
      await this.database.folders.put(folder);
      if (folder.parentId) {
        await this.touchAncestorsInTransaction(
          folder.profileId,
          folder.parentId,
          folder.updatedAt,
        );
      }
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
}
