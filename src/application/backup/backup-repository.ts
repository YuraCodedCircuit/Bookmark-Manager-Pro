import type {
  BackupPayload,
  BackupSnapshot,
  SnapshotTrigger,
  SnapshotType,
} from '../../domain/backup';

export interface CreateSnapshotInput {
  name?: string;
  profileId: string;
  trigger: SnapshotTrigger;
  type: SnapshotType;
}

/** Persistence boundary for immutable profile recovery snapshots. */
export interface BackupRepository {
  captureProfile(profileId: string): Promise<BackupPayload>;
  delete(snapshotId: string): Promise<void>;
  get(snapshotId: string): Promise<BackupSnapshot | undefined>;
  list(): Promise<readonly BackupSnapshot[]>;
  put(snapshot: BackupSnapshot): Promise<void>;
  replaceProfile(profileId: string, payload: BackupPayload): Promise<void>;
  restoreAsNew(payload: BackupPayload): Promise<string>;
}
