import {
  defaultUpdateAnnouncementPreferences,
  updateAnnouncementPreferencesSchema,
  updateAnnouncementStateSchema,
  type UpdateAnnouncementState,
} from '../domain/update-announcement';
import type { UpdateAnnouncementRepository } from '../application/update-announcement/update-announcement-repository';
import type { BookmarkManagerDatabase } from './database';

const PREFERENCES_KEY = 'updateAnnouncementPreferences';
const STATE_KEY = 'updateAnnouncementState';

/** Stores global update-announcement state in validated metadata records. */
export class DexieUpdateAnnouncementRepository implements UpdateAnnouncementRepository {
  constructor(private readonly database: BookmarkManagerDatabase) {}

  async getPreferences() {
    await this.database.open();
    const stored = await this.database.metadata.get(PREFERENCES_KEY);
    return stored
      ? updateAnnouncementPreferencesSchema.parse(stored.value)
      : defaultUpdateAnnouncementPreferences;
  }

  async updatePreferences(showAfterUpdate: boolean): Promise<void> {
    await this.database.open();
    await this.database.metadata.put({
      key: PREFERENCES_KEY,
      value: updateAnnouncementPreferencesSchema.parse({
        schemaVersion: 1,
        showAfterUpdate,
      }),
    });
  }

  async recordUpgrade(
    previousVersion: string,
    version: string,
    installedAt: number,
  ): Promise<void> {
    await this.database.open();
    await this.database.transaction('rw', this.database.metadata, async () => {
      const preferencesRecord =
        await this.database.metadata.get(PREFERENCES_KEY);
      const preferences = preferencesRecord
        ? updateAnnouncementPreferencesSchema.parse(preferencesRecord.value)
        : defaultUpdateAnnouncementPreferences;
      await this.database.metadata.put({
        key: STATE_KEY,
        value: updateAnnouncementStateSchema.parse({
          installedAt,
          previousVersion,
          schemaVersion: 1,
          status: preferences.showAfterUpdate ? 'pending' : 'skipped',
          version,
        }),
      });
    });
  }

  async claim(
    version: string,
    claimId: string,
    claimedAt: number,
    staleBefore: number,
  ): Promise<UpdateAnnouncementState | null> {
    await this.database.open();
    return this.database.transaction('rw', this.database.metadata, async () => {
      const record = await this.database.metadata.get(STATE_KEY);
      if (!record) return null;
      const state = updateAnnouncementStateSchema.parse(record.value);
      if (
        state.version !== version ||
        (state.status !== 'pending' &&
          !(state.status === 'claimed' && state.claimedAt <= staleBefore))
      )
        return null;
      const claimed = updateAnnouncementStateSchema.parse({
        claimId,
        claimedAt,
        installedAt: state.installedAt,
        previousVersion: state.previousVersion,
        schemaVersion: 1,
        status: 'claimed',
        version,
      });
      await this.database.metadata.put({ key: STATE_KEY, value: claimed });
      return claimed;
    });
  }

  markShown(version: string, claimId: string): Promise<void> {
    return this.completeClaim(version, claimId, 'shown');
  }

  markUnavailable(version: string, claimId: string): Promise<void> {
    return this.completeClaim(version, claimId, 'unavailable');
  }

  private async completeClaim(
    version: string,
    claimId: string,
    status: 'shown' | 'unavailable',
  ): Promise<void> {
    await this.database.open();
    await this.database.transaction('rw', this.database.metadata, async () => {
      const record = await this.database.metadata.get(STATE_KEY);
      if (!record) throw new Error('update-announcement-state-not-found');
      const state = updateAnnouncementStateSchema.parse(record.value);
      if (
        state.status !== 'claimed' ||
        state.version !== version ||
        state.claimId !== claimId
      )
        throw new Error('update-announcement-claim-mismatch');
      await this.database.metadata.put({
        key: STATE_KEY,
        value: updateAnnouncementStateSchema.parse({
          installedAt: state.installedAt,
          previousVersion: state.previousVersion,
          schemaVersion: 1,
          status,
          version,
        }),
      });
    });
  }
}
