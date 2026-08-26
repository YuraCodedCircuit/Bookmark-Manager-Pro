import type { Profile } from '../../domain/profile';
import type { ProfileSettings } from '../../domain/profile-settings';

export interface ProfileCreationRepository {
  create(profile: Profile, settings: ProfileSettings): Promise<void>;
  isProfileIdAvailable(profileId: string): Promise<boolean>;
}
