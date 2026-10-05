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
  private persistedEntries:
    | Map<string, { position: number; status: UndoHistoryEntry['status'] }>
    | undefined;

  constructor(
    private readonly database: BookmarkManagerDatabase,
    private readonly marker: UndoHistorySessionMarker,
    private readonly createSessionId: () => string = () => crypto.randomUUID(),
  ) {}

  /** Reports whether every extension surface writes to the same session rows. */
  get sharedAcrossTabs(): boolean {
    return this.marker.sharedAcrossTabs;
  }

  async load(): Promise<readonly UndoHistoryEntry[]> {
    const sessionId = await this.getSessionId();
    const records = await this.database.undoHistory
      .where('[sessionId+position]')
      .between([sessionId, 0], [sessionId, Number.MAX_SAFE_INTEGER])
      .toArray();
    const entries = records.flatMap((record) => {
      const parsed = undoHistoryEntrySchema.safeParse(record);
      return parsed.success ? [parsed.data] : [];
    });
    this.persistedEntries = new Map(
      entries.map((entry, position) => [
        entry.id,
        { position, status: entry.status },
      ]),
    );
    return entries;
  }

  async save(entries: readonly UndoHistoryEntry[]): Promise<void> {
    const sessionId = await this.getSessionId();
    const validated = storedEntriesSchema.parse(entries);
    const records = validated.map((entry, position) =>
      undoHistoryRecordSchema.parse({ ...entry, position, sessionId }),
    );
    const nextEntries = new Map(
      records.map(({ id, position, status }) => [id, { position, status }]),
    );
    await this.database.transaction(
      'rw',
      this.database.undoHistory,
      async () => {
        if (!this.persistedEntries) {
          await this.database.undoHistory
            .where('sessionId')
            .equals(sessionId)
            .delete();
          if (records.length) await this.database.undoHistory.bulkPut(records);
          return;
        }
        const removedIds = [...this.persistedEntries.keys()].filter(
          (id) => !nextEntries.has(id),
        );
        const changedRecords = records.filter((record) => {
          const previous = this.persistedEntries?.get(record.id);
          return (
            !previous ||
            previous.position !== record.position ||
            previous.status !== record.status
          );
        });
        if (removedIds.length)
          await this.database.undoHistory.bulkDelete(removedIds);
        if (changedRecords.length)
          await this.database.undoHistory.bulkPut(changedRecords);
      },
    );
    this.persistedEntries = nextEntries;
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
