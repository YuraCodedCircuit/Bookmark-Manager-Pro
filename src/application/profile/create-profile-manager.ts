import { BookmarkManagerDatabase } from '../../storage/database';
import { DexieProfileManagementRepository } from '../../storage/dexie-profile-management-repository';
import { ManageProfiles } from './manage-profiles';
import { runWithBrowserLock } from '../../platform/concurrency/run-with-browser-session-lock';

/** Composes the durable profile-management service used by webpage UI. */
export function createProfileManager(): ManageProfiles {
  return new ManageProfiles(
    new DexieProfileManagementRepository(new BookmarkManagerDatabase()),
    undefined,
    undefined,
    (run) => runWithBrowserLock('bookmark-manager-pro.profile-activation', run),
  );
}
