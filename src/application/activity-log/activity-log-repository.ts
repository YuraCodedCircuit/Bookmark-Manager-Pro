import type {
  ActivityLogEntry,
  ActivityLogSettings,
} from '../../domain/activity-log';

/** Storage contract for profile-scoped activity records and settings. */
export interface ActivityLogRepository {
  add(entry: ActivityLogEntry): Promise<void>;
  clear(profileId: string): Promise<void>;
  deleteEntries(entryIds: readonly string[]): Promise<void>;
  getSettings(profileId: string): Promise<ActivityLogSettings | undefined>;
  list(profileId: string): Promise<readonly ActivityLogEntry[]>;
  putSettings(settings: ActivityLogSettings): Promise<void>;
}
