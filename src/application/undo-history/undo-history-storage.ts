import type { UndoHistoryEntry } from '../../domain/undo-history';

export interface UndoHistoryStorage {
  load(): Promise<readonly UndoHistoryEntry[]>;
  save(entries: readonly UndoHistoryEntry[]): Promise<void>;
}

export interface UndoHistorySessionMarker {
  readonly sharedAcrossTabs: boolean;
  get(): Promise<string | undefined>;
  getOtherActiveSessionIds(): Promise<readonly string[] | undefined>;
  removeLegacyHistory(): Promise<void>;
  set(sessionId: string): Promise<void>;
}
