import type { ManageBookmarks } from '../bookmark/manage-bookmarks';
import { BrowserUndoHistorySessionMarker } from '../../platform/storage/browser-undo-history-session-marker';
import { UndoHistoryService } from './undo-history-service';
import { runWithBrowserSessionLock } from '../../platform/concurrency/run-with-browser-session-lock';
import { BookmarkManagerDatabase } from '../../storage/database';
import { DexieUndoHistoryStorage } from '../../storage/dexie-undo-history-storage';

/** Composes session history with browser storage and atomic bookmark restoration. */
export function createUndoHistoryService(
  bookmarks: Pick<ManageBookmarks, 'restoreUndoState'>,
): UndoHistoryService {
  return new UndoHistoryService(
    new DexieUndoHistoryStorage(
      new BookmarkManagerDatabase(),
      new BrowserUndoHistorySessionMarker(),
    ),
    (profileId, state, affectedIds) =>
      bookmarks.restoreUndoState(profileId, state, affectedIds),
    undefined,
    undefined,
    runWithBrowserSessionLock,
  );
}
