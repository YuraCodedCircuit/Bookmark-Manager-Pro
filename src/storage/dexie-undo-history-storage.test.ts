import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { UndoHistoryEntry } from '../domain/undo-history';
import type { UndoHistorySessionMarker } from '../application/undo-history/undo-history-storage';
import { BookmarkManagerDatabase } from './database';
import { DexieUndoHistoryStorage } from './dexie-undo-history-storage';

const databases: BookmarkManagerDatabase[] = [];
const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const previousSessionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

afterEach(async () =>
  Promise.all(databases.splice(0).map((database) => database.delete())),
);

describe('DexieUndoHistoryStorage', () => {
  it('creates a shared session, deletes previous-session rows, and persists ordered entries', async () => {
    const database = createDatabase();
    await database.undoHistory.add({
      ...entry('11111111-1111-4111-8111-111111111111', 1),
      position: 0,
      sessionId: previousSessionId,
    });
    const marker = markerStore(undefined, true);
    const storage = new DexieUndoHistoryStorage(
      database,
      marker,
      () => sessionId,
    );
    const entries = [
      entry('22222222-2222-4222-8222-222222222222', 2),
      entry('33333333-3333-4333-8333-333333333333', 3),
    ];

    await expect(storage.load()).resolves.toEqual([]);
    expect(marker.set).toHaveBeenCalledWith(sessionId);
    await expect(database.undoHistory.count()).resolves.toBe(0);

    await storage.save(entries);

    await expect(storage.load()).resolves.toEqual(entries);
    await expect(database.undoHistory.toArray()).resolves.toMatchObject([
      { id: entries[0]!.id, position: 0, sessionId },
      { id: entries[1]!.id, position: 1, sessionId },
    ]);
  });

  it('does not delete another webpage tab session when the marker is tab-scoped', async () => {
    const database = createDatabase();
    await database.undoHistory.add({
      ...entry('11111111-1111-4111-8111-111111111111', 1),
      position: 0,
      sessionId: previousSessionId,
    });
    const marker = markerStore(undefined, false);
    marker.getOtherActiveSessionIds.mockResolvedValueOnce([previousSessionId]);
    const storage = new DexieUndoHistoryStorage(
      database,
      marker,
      () => sessionId,
    );

    await expect(storage.load()).resolves.toEqual([]);
    await expect(database.undoHistory.count()).resolves.toBe(1);
  });

  it('does not treat a marker read failure as a missing session', async () => {
    const database = createDatabase();
    await database.undoHistory.add({
      ...entry('11111111-1111-4111-8111-111111111111', 1),
      position: 0,
      sessionId: previousSessionId,
    });
    const marker = markerStore(undefined, true);
    marker.get.mockRejectedValueOnce(new Error('session API unavailable'));
    const storage = new DexieUndoHistoryStorage(
      database,
      marker,
      () => sessionId,
    );

    await expect(storage.load()).rejects.toThrow('session API unavailable');
    expect(marker.set).not.toHaveBeenCalled();
    await expect(database.undoHistory.count()).resolves.toBe(1);
  });

  it('isolates legacy session-value cleanup failure', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const marker = markerStore(sessionId, true);
    marker.removeLegacyHistory.mockRejectedValueOnce(
      new Error('remove failed'),
    );
    const storage = new DexieUndoHistoryStorage(createDatabase(), marker);

    await expect(storage.load()).resolves.toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      'undo-history-legacy-session-cleanup-failed',
    );
    consoleError.mockRestore();
  });
});

function createDatabase(): BookmarkManagerDatabase {
  const database = new BookmarkManagerDatabase(
    `undo-history-${crypto.randomUUID()}`,
  );
  databases.push(database);
  return database;
}

function markerStore(
  value: string | undefined,
  sharedAcrossTabs: boolean,
): UndoHistorySessionMarker & {
  get: ReturnType<typeof vi.fn>;
  getOtherActiveSessionIds: ReturnType<typeof vi.fn>;
  removeLegacyHistory: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
} {
  return {
    sharedAcrossTabs,
    get: vi.fn(async () => value),
    getOtherActiveSessionIds: vi.fn(async () =>
      sharedAcrossTabs ? [] : undefined,
    ),
    removeLegacyHistory: vi.fn(async () => undefined),
    set: vi.fn(async () => undefined),
  };
}

function entry(id: string, createdAt: number): UndoHistoryEntry {
  const folder = {
    backgroundAppearance: { kind: 'color' as const, value: '#0b121a' },
    bookmarkView: 'card' as const,
    cardAppearance: { kind: 'color' as const, value: '#2f7de1' },
    createdAt: 1,
    detailsTableTransparency: 0,
    id: '44444444-4444-4444-8444-444444444444',
    includeNavigationBackground: false,
    index: 0,
    isRoot: false,
    navigationTransparency: 45,
    note: '',
    parentId: '55555555-5555-4555-8555-555555555555',
    profileId,
    tags: [],
    title: 'Folder',
    updatedAt: 1,
  };
  return {
    action: 'edited',
    affectedBookmarkIds: [],
    affectedFavoriteIds: [],
    affectedFolderIds: [folder.id],
    after: { bookmarks: [], favorites: [], folders: [folder] },
    before: {
      bookmarks: [],
      favorites: [],
      folders: [{ ...folder, title: 'Before' }],
    },
    createdAt,
    id,
    itemId: folder.id,
    itemType: 'folder',
    profileId,
    status: 'undo',
  };
}
