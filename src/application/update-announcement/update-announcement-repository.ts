import type {
  UpdateAnnouncementPreferences,
  UpdateAnnouncementState,
} from '../../domain/update-announcement';

export interface UpdateAnnouncementRepository {
  claim(
    version: string,
    claimId: string,
    claimedAt: number,
    staleBefore: number,
  ): Promise<UpdateAnnouncementState | null>;
  getPreferences(): Promise<UpdateAnnouncementPreferences>;
  markShown(version: string, claimId: string): Promise<void>;
  markUnavailable(version: string, claimId: string): Promise<void>;
  recordUpgrade(
    previousVersion: string,
    version: string,
    installedAt: number,
  ): Promise<void>;
  updatePreferences(showAfterUpdate: boolean): Promise<void>;
}
