import type { UndoHistoryEntry } from '../domain/undo-history';
import { undoHistoryEntrySchema } from '../domain/undo-history';
import type {
  UndoHistorySessionMarker,
  UndoHistoryStorage,
} from '../application/undo-history/undo-history-storage';
import type { BookmarkManagerDatabase } from './database';
import { undoHistoryRecordSchema } from './undo-history-record';

const storedEntriesSchema = undoHistoryEntrySchema.array().max(250);

/** Persists large undo patches in a session-namespaced IndexedDB table. */
export class DexieUndoHistoryStorage implements UndoHistoryStorage {
  private sessionIdPromise: Promise<string> | undefined;

  constructor(
    private readonly database: BookmarkManagerDatabase,
    private readonly marker: UndoHistorySessionMarker,
    private readonly createSessionId: () => string = () => crypto.randomUUID(),
  ) {}

  async load(): Promise<readonly UndoHistoryEntry[]> {
    const sessionId = await this.getSessionId();
    const records = await this.database.undoHistory
      .where('[sessionId+position]')
      .between([sessionId, 0], [sessionId, Number.MAX_SAFE_INTEGER])
      .toArray();
    return records.flatMap((record) => {
      const parsed = undoHistoryEntrySchema.safeParse(record);
      return parsed.success ? [parsed.data] : [];
    });
  }

  async save(entries: readonly UndoHistoryEntry[]): Promise<void> {
    const sessionId = await this.getSessionId();
    const validated = storedEntriesSchema.parse(entries);
    const records = validated.map((entry, position) =>
      undoHistoryRecordSchema.parse({ ...entry, position, sessionId }),
    );
    await this.database.transaction(
      'rw',
      this.database.undoHistory,
      async () => {
        await this.database.undoHistory
          .where('sessionId')
          .equals(sessionId)
          .delete();
        if (records.length) await this.database.undoHistory.bulkPut(records);
      },
    );
  }

  private getSessionId(): Promise<string> {
    this.sessionIdPromise ??= this.initializeSession();
    return this.sessionIdPromise;
  }

  private async initializeSession(): Promise<string> {
    const existing = await this.marker.get();
    if (existing) {
      await this.removeLegacyHistorySafely();
      return existing;
    }

    const protectedSessionIds = await this.marker.getOtherActiveSessionIds();
    const sessionId = this.createSessionId();
    if (protectedSessionIds) {
      const protectedIds = new Set([...protectedSessionIds, sessionId]);
      await this.database.undoHistory
        .filter((record) => !protectedIds.has(record.sessionId))
        .delete();
    }
    await this.marker.set(sessionId);
    await this.removeLegacyHistorySafely();
    return sessionId;
  }

  private async removeLegacyHistorySafely(): Promise<void> {
    try {
      await this.marker.removeLegacyHistory();
    } catch {
      console.error('undo-history-legacy-session-cleanup-failed');
    }
  }
}
