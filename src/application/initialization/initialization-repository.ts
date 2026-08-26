import type { Profile } from '../../domain/profile';
import type { ProfileSettings } from '../../domain/profile-settings';

export type InitializationData =
  | { kind: 'first-run' }
  | {
      kind: 'active-profile';
      profile: Profile;
      settings: ProfileSettings;
    };

export interface InitializationRepository {
  open(): Promise<void>;
  load(): Promise<InitializationData>;
}
