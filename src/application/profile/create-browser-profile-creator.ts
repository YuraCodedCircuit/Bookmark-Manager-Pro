import { BookmarkManagerDatabase } from '../../storage/database';
import { DexieProfileCreationRepository } from '../../storage/dexie-profile-creation-repository';
import { CreateFirstProfile } from './create-first-profile';

/** Composes the durable repository used by first-profile creation. */
export function createBrowserProfileCreator(): CreateFirstProfile {
  const database = new BookmarkManagerDatabase();
  return new CreateFirstProfile(new DexieProfileCreationRepository(database));
}
