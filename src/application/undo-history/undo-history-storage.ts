import type { UndoHistoryEntry } from '../../domain/undo-history';

export interface UndoHistoryStorage {
  /** Indicates that every open surface addresses the same stored session. */
  readonly sharedAcrossTabs?: boolean;
  load(): Promise<readonly UndoHistoryEntry[]>;
  save(entries: readonly UndoHistoryEntry[]): Promise<void>;
  /** Removes obsolete sessions separately from history loading and mutations. */
  cleanupObsoleteSessions?(): Promise<{
    removedEntries: number;
    deferred: boolean;
  }>;
}

export interface UndoHistorySessionMarker {
  readonly sharedAcrossTabs: boolean;
  get(): Promise<string | undefined>;
  getOtherActiveSessionIds(): Promise<readonly string[] | undefined>;
  removeLegacyHistory(): Promise<void>;
  set(sessionId: string): Promise<void>;
}
