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
    if (existing) return existing;
    const sessionId = this.createSessionId();
    await this.marker.set(sessionId);
    return sessionId;
  }

  /** Keeps current and live preview sessions; a failed marker read never authorizes deletion. */
  async cleanupObsoleteSessions(): Promise<{
    removedEntries: number;
    deferred: boolean;
  }> {
    const sessionId = await this.getSessionId();
    if ((await this.marker.get()) !== sessionId)
      return { removedEntries: 0, deferred: true };
    const otherSessionIds = await this.marker.getOtherActiveSessionIds();
    if (!otherSessionIds) return { removedEntries: 0, deferred: true };
    const protectedIds = new Set([sessionId, ...otherSessionIds]);
    const removedEntries = await this.database.undoHistory
      .where('sessionId')
      .noneOf([...protectedIds])
      .delete();
    await this.marker.removeLegacyHistory();
    return { removedEntries, deferred: false };
  }
}
