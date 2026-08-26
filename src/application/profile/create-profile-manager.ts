import { BookmarkManagerDatabase } from '../../storage/database';
import { DexieProfileManagementRepository } from '../../storage/dexie-profile-management-repository';
import { ManageProfiles } from './manage-profiles';

/** Composes the durable profile-management service used by webpage UI. */
export function createProfileManager(): ManageProfiles {
  return new ManageProfiles(
    new DexieProfileManagementRepository(new BookmarkManagerDatabase()),
  );
}
