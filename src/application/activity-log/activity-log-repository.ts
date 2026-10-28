import type {
  ActivityLogEntry,
  ActivityLogSettings,
  ActivitySession,
  ActivitySessionIdentity,
  ActivityReason,
} from '../../domain/activity-log';

/** Shared history with independent active-profile recording permission. */
export interface ActivityLogRepository {
  add(entry: ActivityLogEntry): Promise<void>;
  clear(profileId: string, sessionId?: string): Promise<void>;
  deleteEntries(entryIds: readonly string[]): Promise<void>;
  getSettings(profileId: string): Promise<ActivityLogSettings | undefined>;
  list(profileId: string): Promise<readonly ActivityLogEntry[]>;
  putSettings(
    settings: ActivityLogSettings,
    preserveGate?: boolean,
  ): Promise<void>;
  append?(
    entry: ActivityLogEntry,
    identity: ActivitySessionIdentity,
    reason?: ActivityReason,
  ): Promise<void>;
  /** Resolves only previously recorded incidents; never creates an activity row. */
  resolveIncidents?(
    profileId: string | null,
    eventCodes: readonly string[],
  ): Promise<boolean>;
  sessions?(): Promise<readonly ActivitySession[]>;
  profiles?(): Promise<readonly { id: string; username: string }[]>;
  activeProfileId?(): Promise<string | undefined>;
  subscribe?(listener: () => void): () => void;
  full?(): Promise<boolean>;
  begin?(identity: ActivitySessionIdentity): Promise<void>;
  finish?(
    identity: ActivitySessionIdentity,
    succeeded: boolean,
    update?: boolean,
  ): Promise<void>;
}
