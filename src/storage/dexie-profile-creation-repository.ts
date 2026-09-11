import type { ProfileCreationRepository } from '../application/profile/profile-creation-repository';
import type { Profile } from '../domain/profile';
import type { ProfileSettings } from '../domain/profile-settings';
import type { BookmarkManagerDatabase } from './database';

export class DexieProfileCreationRepository implements ProfileCreationRepository {
  constructor(private readonly database: BookmarkManagerDatabase) {}

  async isProfileIdAvailable(profileId: string): Promise<boolean> {
    return (await this.database.profiles.get(profileId)) === undefined;
  }

  async create(profile: Profile, settings: ProfileSettings): Promise<void> {
    await this.database.transaction(
      'rw',
      [
        this.database.profiles,
        this.database.profileSettings,
        this.database.metadata,
      ],
      async () => {
        if ((await this.database.profiles.count()) !== 0) {
          throw new Error('first-profile-already-exists');
        }

        await this.database.profiles.add(profile);
        await this.database.profileSettings.add(settings);
        await this.database.metadata.add({
          key: 'activeProfileId',
          value: profile.id,
        });
        await this.database.metadata.put({
          key: 'profile-activation-revision:v1',
          value: 1,
        });
      },
    );
  }
}
