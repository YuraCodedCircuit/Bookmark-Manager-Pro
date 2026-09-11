import type { Bookmark } from '../../domain/bookmark';
import type { Folder } from '../../domain/folder';
import type { FavoriteItem } from '../../domain/favorite-item';
import type { UndoProfileState } from '../../domain/undo-history';

export interface FolderContents {
  bookmarks: readonly Bookmark[];
  folders: readonly Folder[];
}
export type MovableItem =
  { kind: 'bookmark'; value: Bookmark } | { kind: 'folder'; value: Folder };

/** Durable profile-owned bookmark and folder operations. */
export interface BookmarkRepository {
  ensureRoot(profileId: string, root: Folder): Promise<Folder>;
  getBookmark(
    profileId: string,
    bookmarkId: string,
  ): Promise<Bookmark | undefined>;
  getFolder(profileId: string, folderId: string): Promise<Folder | undefined>;
  isItemIdAvailable(id: string): Promise<boolean>;
  listFolders(profileId: string): Promise<readonly Folder[]>;
  listBookmarks(profileId: string): Promise<readonly Bookmark[]>;
  listFavorites(profileId: string): Promise<readonly FavoriteItem[]>;
  listContents(profileId: string, parentId: string): Promise<FolderContents>;
  nextIndex(profileId: string, parentId: string): Promise<number>;
  addBookmark(bookmark: Bookmark): Promise<void>;
  addFolder(folder: Folder): Promise<void>;
  addItems(
    bookmarks: readonly Bookmark[],
    folders: readonly Folder[],
    destinationParentId: string,
    timestamp: number,
  ): Promise<void>;
  updateBookmark(bookmark: Bookmark, expectedUpdatedAt?: number): Promise<void>;
  updateFolder(folder: Folder, expectedUpdatedAt?: number): Promise<void>;
  setFavorite(favorite: FavoriteItem): Promise<void>;
  removeFavorite(profileId: string, itemId: string): Promise<void>;
  deleteItem(profileId: string, itemId: string): Promise<void>;
  moveItem(
    profileId: string,
    itemId: string,
    destinationParentId: string,
    destinationIndex: number,
  ): Promise<void>;
  captureProfileState(profileId: string): Promise<UndoProfileState>;
  restoreProfileState(
    profileId: string,
    state: UndoProfileState,
    affectedIds: {
      bookmarkIds: readonly string[];
      favoriteIds: readonly string[];
      folderIds: readonly string[];
    },
  ): Promise<void>;
}
