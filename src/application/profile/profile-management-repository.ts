import type { Profile } from '../../domain/profile';
import type { ProfileSettings } from '../../domain/profile-settings';
import type { ProfilePreferences } from '../../domain/profile-settings';

export interface ProfileListItem {
  profile: Profile;
  isActive: boolean;
}

export interface ProfileStorageUsage {
  profileId: string;
  sizeBytes: number;
}

export interface ProfileActivationResult {
  changed: boolean;
  profileId: string;
  revision: number;
}

/** Durable operations required by profile management and switching. */
export interface ProfileManagementRepository {
  list(): Promise<readonly ProfileListItem[]>;
  isProfileIdAvailable(profileId: string): Promise<boolean>;
  create(profile: Profile, settings: ProfileSettings): Promise<void>;
  copyOwnedData(
    sourceProfileId: string,
    targetProfileId: string,
    preferences: ProfilePreferences,
  ): Promise<void>;
  getSettings(profileId: string): Promise<ProfileSettings>;
  getStorageUsage(): Promise<readonly ProfileStorageUsage[]>;
  updateSettings(settings: ProfileSettings): Promise<void>;
  update(profile: Profile): Promise<void>;
  delete(profileId: string): Promise<void>;
  switchTo(profileId: string): Promise<ProfileActivationResult>;
}
