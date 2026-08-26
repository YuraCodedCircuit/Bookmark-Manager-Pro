import Dexie from 'dexie';

import type { ActivityLogRepository } from '../application/activity-log/activity-log-repository';
import {
  activityLogEntrySchema,
  activityLogSettingsSchema,
  type ActivityLogEntry,
  type ActivityLogSettings,
} from '../domain/activity-log';
import type { BookmarkManagerDatabase } from './database';

/** Dexie-backed activity storage; every read is validated at the boundary. */
export class DexieActivityLogRepository implements ActivityLogRepository {
  constructor(private readonly database: BookmarkManagerDatabase) {}

  async add(entry: ActivityLogEntry): Promise<void> {
    await this.database.open();
    await this.database.activity.add(activityLogEntrySchema.parse(entry));
  }

  async list(profileId: string): Promise<readonly ActivityLogEntry[]> {
    await this.database.open();
    const entries = await this.database.activity
      .where('[profileId+timestamp]')
      .between([profileId, Dexie.minKey], [profileId, Dexie.maxKey])
      .reverse()
      .toArray();
    return entries.map((entry) => activityLogEntrySchema.parse(entry));
  }

  async clear(profileId: string): Promise<void> {
    await this.database.open();
    await this.database.activity.where('profileId').equals(profileId).delete();
  }

  async deleteEntries(entryIds: readonly string[]): Promise<void> {
    await this.database.open();
    await this.database.activity.bulkDelete([...entryIds]);
  }

  async getSettings(
    profileId: string,
  ): Promise<ActivityLogSettings | undefined> {
    await this.database.open();
    const stored = await this.database.activityLogSettings.get(profileId);
    return stored ? activityLogSettingsSchema.parse(stored) : undefined;
  }

  async putSettings(settings: ActivityLogSettings): Promise<void> {
    await this.database.open();
    await this.database.activityLogSettings.put(
      activityLogSettingsSchema.parse(settings),
    );
  }
}
