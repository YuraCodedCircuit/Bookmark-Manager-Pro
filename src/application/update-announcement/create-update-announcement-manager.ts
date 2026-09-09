import { BookmarkManagerDatabase } from '../../storage/database';
import { DexieUpdateAnnouncementRepository } from '../../storage/dexie-update-announcement-repository';
import { ManageUpdateAnnouncements } from './manage-update-announcements';

/** Composes the global update-announcement service over IndexedDB metadata. */
export function createUpdateAnnouncementManager(): ManageUpdateAnnouncements {
  return new ManageUpdateAnnouncements(
    new DexieUpdateAnnouncementRepository(new BookmarkManagerDatabase()),
  );
}
