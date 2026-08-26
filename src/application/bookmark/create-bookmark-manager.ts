import { BookmarkManagerDatabase } from '../../storage/database';
import { DexieBookmarkRepository } from '../../storage/dexie-bookmark-repository';
import { ManageBookmarks } from './manage-bookmarks';

/** Composes the browser-page bookmark service with durable IndexedDB storage. */
export function createBookmarkManager(): ManageBookmarks {
  return new ManageBookmarks(
    new DexieBookmarkRepository(new BookmarkManagerDatabase()),
  );
}
