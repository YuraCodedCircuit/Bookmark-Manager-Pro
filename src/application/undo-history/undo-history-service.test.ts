import { describe, expect, it, vi } from 'vitest';

import type { UndoProfileState } from '../../domain/undo-history';
import type { UndoHistoryStorage } from './undo-history-storage';
import { UndoHistoryService } from './undo-history-service';

const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
const itemId = '22222222-2222-4222-8222-222222222222';
const rootId = '11111111-1111-4111-8111-111111111111';
const before: UndoProfileState = {
  bookmarks: [],
  favorites: [],
  folders: [folder(rootId, 'Home', true)],
};
const after: UndoProfileState = {
  ...before,
  folders: [...before.folders, folder(itemId, 'Created folder', false)],
};

describe('UndoHistoryService', () => {
  it('preserves history when the last surface closes and a new surface opens in the same session', async () => {
    const storage = memoryStorage();
    const first = new UndoHistoryService(
      storage,
      vi.fn(async () => undefined),
    );
    await first.record({
      action: 'created',
      before,
      after,
      itemId,
      itemType: 'folder',
      profileId,
    });
    const entries = first.store.getState().entries;
    await first.dispose();
    const reopened = new UndoHistoryService(
      storage,
      vi.fn(async () => undefined),
    );
    await reopened.initialize();
    expect(reopened.store.getState().entries).toEqual(entries);
    await reopened.undo(profileId, entries[0]!.id);
    expect(reopened.store.getState().entries[0]?.status).toBe('redo');
  });

  it('loads only once and preserves new mutations before deferred maintenance runs', async () => {
    const storage = memoryStorage();
    const load = vi.spyOn(storage, 'load');
    const cleanupObsoleteSessions = vi.fn(async () => ({
      removedEntries: 7,
      deferred: false,
    }));
    const service = new UndoHistoryService(
      { ...storage, cleanupObsoleteSessions },
      vi.fn(async () => undefined),
    );
    await service.runMutation(() =>
      service.record({
        action: 'created',
        before,
        after,
        itemId,
        itemType: 'folder',
        profileId,
      }),
    );
    await Promise.all([service.initialize(), service.initialize()]);
    expect(load).toHaveBeenCalledOnce();
    expect(cleanupObsoleteSessions).not.toHaveBeenCalled();
    await service.cleanupObsoleteSessions();
    expect(service.store.getState()).toMatchObject({
      cleanupStatus: 'complete',
      removedObsoleteEntries: 7,
    });
    expect(service.store.getState().entries).toHaveLength(1);
  });

  it('isolates failed cleanup from valid history and allows retry', async () => {
    const cleanup = vi
      .fn(async () => ({ removedEntries: 0, deferred: false }))
      .mockRejectedValueOnce(new Error('cleanup failed'));
    const service = new UndoHistoryService(
      { ...memoryStorage(), cleanupObsoleteSessions: cleanup },
      vi.fn(async () => undefined),
    );
    await service.record({
      action: 'created',
      before,
      after,
      itemId,
      itemType: 'folder',
      profileId,
    });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    await service.cleanupObsoleteSessions();
    expect(service.store.getState().cleanupStatus).toBe('failed');
    expect(service.store.getState().entries[0]?.status).toBe('undo');
    await service.cleanupObsoleteSessions();
    expect(service.store.getState().cleanupStatus).toBe('complete');
    consoleError.mockRestore();
  });

  it('waits for existing history before recording a mutation during deferred startup', async () => {
    const original = new UndoHistoryService(
      memoryStorage(),
      vi.fn(async () => undefined),
    );
    await original.record({
      action: 'created',
      before,
      after,
      itemId,
      itemType: 'folder',
      profileId,
    });
    const oldEntries = original.store.getState().entries;
    let finishLoad!: (entries: readonly (typeof oldEntries)[number][]) => void;
    const loading = new Promise<readonly (typeof oldEntries)[number][]>(
      (resolve) => {
        finishLoad = resolve;
      },
    );
    const service = new UndoHistoryService(
      { load: () => loading, save: async () => undefined },
      vi.fn(async () => undefined),
    );
    const mutation = vi.fn(async () =>
      service.record({
        action: 'edited',
        before: after,
        after: {
          ...after,
          folders: [
            after.folders[0]!,
            { ...after.folders[1]!, title: 'Updated' },
          ],
        },
        itemId,
        itemType: 'folder',
        profileId,
      }),
    );
    const pending = service.runMutation(mutation);
    await Promise.resolve();
    expect(mutation).not.toHaveBeenCalled();
    finishLoad(oldEntries);
    await pending;
    expect(service.store.getState().entries).toHaveLength(2);
    expect(service.store.getState().entries[0]).toEqual(oldEntries[0]);
  });

  it('reports whether session history initialization succeeded', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const service = new UndoHistoryService(
      {
        load: async () => Promise.reject(new Error('marker read failed')),
        save: async () => undefined,
      },
      vi.fn(async () => undefined),
    );

    await expect(service.initialize()).resolves.toBe(false);
    expect(service.store.getState().entries).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith('undo-history-initialize-failed');
    consoleError.mockRestore();
  });

  it('accepts a packaged cross-tab sync without rewriting shared storage', async () => {
    const save = vi.fn(async () => undefined);
    const channel = {
      close: vi.fn(),
      onmessage: null as ((event: MessageEvent<unknown>) => void) | null,
      postMessage: vi.fn(),
    };
    const source = new UndoHistoryService(
      memoryStorage(),
      vi.fn(async () => undefined),
      () => '33333333-3333-4333-8333-333333333333',
      () => 10,
      undefined,
      undefined,
    );
    await source.record({
      action: 'created',
      after,
      before,
      itemId,
      itemType: 'folder',
      profileId,
    });
    const entries = source.store.getState().entries;
    const receiver = new UndoHistoryService(
      { load: async () => [], save, sharedAcrossTabs: true },
      vi.fn(async () => undefined),
      undefined,
      undefined,
      undefined,
      channel,
    );
    await receiver.initialize();

    channel.onmessage?.(
      new MessageEvent('message', {
        data: { entries, sourceId: 'another-surface', type: 'sync' },
      }),
    );

    expect(receiver.store.getState().entries).toEqual(entries);
    expect(save).not.toHaveBeenCalled();
  });

  it('records a minimal operation and restores its before and after states', async () => {
    const restore = vi.fn(async () => undefined);
    const storage = memoryStorage();
    const service = new UndoHistoryService(
      storage,
      restore,
      () => '33333333-3333-4333-8333-333333333333',
      () => 10,
    );

    await service.record({
      action: 'created',
      after,
      before,
      itemId,
      itemType: 'folder',
      profileId,
    });
    const entry = service.store.getState().entries[0]!;
    expect(entry.affectedFolderIds).toEqual([itemId]);

    await service.undo(profileId);
    expect(restore).toHaveBeenLastCalledWith(
      profileId,
      { bookmarks: [], favorites: [], folders: [] },
      {
        bookmarkIds: [],
        favoriteIds: [],
        folderIds: [itemId],
      },
    );
    expect(service.store.getState().entries[0]?.status).toBe('redo');

    await service.redo(profileId);
    expect(restore).toHaveBeenLastCalledWith(
      profileId,
      { bookmarks: [], favorites: [], folders: [after.folders[1]] },
      { bookmarkIds: [], favoriteIds: [], folderIds: [itemId] },
    );
    expect(service.store.getState().entries[0]?.status).toBe('undo');
  });

  it('clears the redo branch when a new mutation is recorded', async () => {
    let id = 0;
    const service = new UndoHistoryService(
      memoryStorage(),
      vi.fn(async () => undefined),
      () => `33333333-3333-4333-8333-${String(++id).padStart(12, '0')}`,
      () => id,
    );
    await service.record({
      action: 'created',
      after,
      before,
      itemId,
      itemType: 'folder',
      profileId,
    });
    await service.undo(profileId);
    await service.record({
      action: 'deleted',
      after: before,
      before: after,
      itemId,
      itemType: 'folder',
      profileId,
    });
    expect(service.store.getState().entries).toHaveLength(1);
    expect(service.store.getState().entries[0]?.action).toBe('deleted');
  });

  it('enables the newest window undo for each independent edited item', async () => {
    let id = 0;
    let timestamp = 0;
    const firstItemId = itemId;
    const secondItemId = '44444444-4444-4444-8444-444444444444';
    const initial = stateWithFolders(
      folder(firstItemId, 'First', false),
      folder(secondItemId, 'Second', false),
    );
    const firstEdit = stateWithFolders(
      { ...initial.folders[1]!, title: 'First edit', updatedAt: 2 },
      initial.folders[2]!,
      2,
    );
    const secondFirstEdit = stateWithFolders(
      { ...firstEdit.folders[1]!, title: 'First edit again', updatedAt: 3 },
      firstEdit.folders[2]!,
      3,
    );
    const secondItemEdit = stateWithFolders(
      secondFirstEdit.folders[1]!,
      {
        ...secondFirstEdit.folders[2]!,
        title: 'Second edit',
        updatedAt: 4,
      },
      4,
    );
    const service = new UndoHistoryService(
      memoryStorage(),
      vi.fn(async () => undefined),
      () => `33333333-3333-4333-8333-${String(++id).padStart(12, '0')}`,
      () => ++timestamp,
    );

    await service.record({
      action: 'edited',
      after: firstEdit,
      before: initial,
      itemId: firstItemId,
      itemType: 'folder',
      profileId,
    });
    await service.record({
      action: 'edited',
      after: secondFirstEdit,
      before: firstEdit,
      itemId: firstItemId,
      itemType: 'folder',
      profileId,
    });
    await service.record({
      action: 'edited',
      after: secondItemEdit,
      before: secondFirstEdit,
      itemId: secondItemId,
      itemType: 'folder',
      profileId,
    });

    const [olderFirst, newestFirst, newestSecond] =
      service.store.getState().entries;
    expect(service.canApply(profileId, olderFirst!.id, 'undo')).toBe(false);
    expect(service.canApply(profileId, newestFirst!.id, 'undo')).toBe(true);
    expect(service.canApply(profileId, newestSecond!.id, 'undo')).toBe(true);
  });

  it('independently undoes and redoes sibling creation and edits despite ancestor timestamps', async () => {
    const secondId = '44444444-4444-4444-8444-444444444444';
    const restore = vi.fn<ConstructorParameters<typeof UndoHistoryService>[1]>(
      async () => undefined,
    );
    let sequence = 0;
    const service = new UndoHistoryService(
      memoryStorage(),
      restore,
      () => `33333333-3333-4333-8333-${String(++sequence).padStart(12, '0')}`,
      () => sequence,
    );
    let current = before;
    for (const id of [itemId, secondId]) {
      for (const action of ['created', 'edited'] as const) {
        const next = {
          ...current,
          folders: [
            { ...current.folders[0]!, updatedAt: sequence + 2 },
            ...current.folders.slice(1).filter((value) => value.id !== id),
            { ...folder(id, action, false), updatedAt: sequence + 2 },
          ],
        };
        await service.record({
          action,
          before: current,
          after: next,
          itemId: id,
          itemType: 'folder',
          profileId,
        });
        current = next;
      }
    }
    const [firstCreate, firstEdit, secondCreate, secondEdit] =
      service.store.getState().entries;
    expect(service.canApply(profileId, firstEdit!.id, 'undo')).toBe(true);
    expect(service.canApply(profileId, secondEdit!.id, 'undo')).toBe(true);
    expect(service.canApply(profileId, firstCreate!.id, 'undo')).toBe(false);
    expect(service.canApply(profileId, secondCreate!.id, 'undo')).toBe(false);
    await service.undo(profileId, firstEdit!.id);
    await service.undo(profileId, firstCreate!.id);
    expect(service.canApply(profileId, firstEdit!.id, 'redo')).toBe(false);
    expect(service.canApply(profileId, firstCreate!.id, 'redo')).toBe(true);
    await service.undo(profileId, secondEdit!.id);
    expect(service.canApply(profileId, secondEdit!.id, 'redo')).toBe(true);
    await service.redo(profileId, firstCreate!.id);
    await service.redo(profileId, firstEdit!.id);
    expect(
      restore.mock.calls.every(
        ([, state, ids]) =>
          !ids.folderIds.includes(rootId) &&
          !state.folders.some(({ id }) => id === rootId),
      ),
    ).toBe(true);
  });

  it('safely applies existing session patches without restoring timestamp-only ancestors', async () => {
    const storage = memoryStorage();
    const original = new UndoHistoryService(
      storage,
      vi.fn(async () => undefined),
    );
    await original.record({
      action: 'created',
      before,
      after,
      itemId,
      itemType: 'folder',
      profileId,
    });
    const entry = original.store.getState().entries[0]!;
    await storage.save([
      {
        ...entry,
        affectedFolderIds: [rootId, itemId],
        before,
        after: {
          ...after,
          folders: [{ ...before.folders[0]!, updatedAt: 2 }, after.folders[1]!],
        },
      },
    ]);
    const restore = vi.fn(async () => undefined);
    const service = new UndoHistoryService(storage, restore);
    await service.initialize();
    await service.undo(profileId, entry.id);
    expect(restore).toHaveBeenLastCalledWith(
      profileId,
      { bookmarks: [], favorites: [], folders: [] },
      { bookmarkIds: [], favoriteIds: [], folderIds: [itemId] },
    );
    await service.redo(profileId, entry.id);
    expect(restore).toHaveBeenLastCalledWith(
      profileId,
      { bookmarks: [], favorites: [], folders: [after.folders[1]] },
      { bookmarkIds: [], favoriteIds: [], folderIds: [itemId] },
    );
  });

  it('keeps a multi-item edit linked to later changes of any affected item', async () => {
    const secondId = '44444444-4444-4444-8444-444444444444';
    const initial = stateWithFolders(
      folder(itemId, 'First', false),
      folder(secondId, 'Second', false),
    );
    const batch = stateWithFolders(
      { ...initial.folders[1]!, title: 'Batch first' },
      { ...initial.folders[2]!, title: 'Batch second' },
    );
    const later = stateWithFolders(batch.folders[1]!, {
      ...batch.folders[2]!,
      title: 'Later second',
    });
    const restore = vi.fn(async () => undefined);
    const service = new UndoHistoryService(memoryStorage(), restore);
    await service.record({
      action: 'edited',
      before: initial,
      after: batch,
      itemId,
      itemType: 'folder',
      profileId,
    });
    await service.record({
      action: 'edited',
      before: batch,
      after: later,
      itemId: secondId,
      itemType: 'folder',
      profileId,
    });
    const [group, latest] = service.store.getState().entries;
    await expect(service.undo(profileId, group!.id)).rejects.toThrow(
      'undo-history-dependent-operation',
    );
    expect(restore).not.toHaveBeenCalled();
    await service.undo(profileId, latest!.id);
    await service.undo(profileId, group!.id);
    expect(restore).toHaveBeenLastCalledWith(
      profileId,
      { bookmarks: [], favorites: [], folders: initial.folders.slice(1) },
      { bookmarkIds: [], favoriteIds: [], folderIds: [itemId, secondId] },
    );
    expect(service.canApply(profileId, latest!.id, 'redo')).toBe(false);
    await service.redo(profileId, group!.id);
    expect(service.canApply(profileId, latest!.id, 'redo')).toBe(true);
  });

  it('keeps history unchanged and releases busy state when restoration fails', async () => {
    const service = new UndoHistoryService(memoryStorage(), async () => {
      throw new Error('restore-failed');
    });
    await service.record({
      action: 'created',
      before,
      after,
      itemId,
      itemType: 'folder',
      profileId,
    });
    const entry = service.store.getState().entries[0]!;
    await expect(service.undo(profileId, entry.id)).rejects.toThrow(
      'restore-failed',
    );
    expect(service.store.getState().busy).toBe(false);
    expect(service.store.getState().entries[0]?.status).toBe('undo');
    expect(
      service.canApply(
        '99999999-9999-4999-8999-999999999999',
        entry.id,
        'undo',
      ),
    ).toBe(false);
  });

  it('uses the newest timestamp for the default Ctrl+Z-style undo', async () => {
    const restore = vi.fn(async () => undefined);
    const timestamps = [30, 10];
    const firstItemId = itemId;
    const secondItemId = '44444444-4444-4444-8444-444444444444';
    const initial = stateWithFolders(
      folder(firstItemId, 'First', false),
      folder(secondItemId, 'Second', false),
    );
    const firstEdit = stateWithFolders(
      { ...initial.folders[1]!, title: 'First edit', updatedAt: 2 },
      initial.folders[2]!,
      2,
    );
    const secondEdit = stateWithFolders(
      firstEdit.folders[1]!,
      { ...firstEdit.folders[2]!, title: 'Second edit', updatedAt: 3 },
      3,
    );
    const service = new UndoHistoryService(
      memoryStorage(),
      restore,
      undefined,
      () => timestamps.shift()!,
    );

    await service.record({
      action: 'edited',
      after: firstEdit,
      before: initial,
      itemId: firstItemId,
      itemType: 'folder',
      profileId,
    });
    await service.record({
      action: 'edited',
      after: secondEdit,
      before: firstEdit,
      itemId: secondItemId,
      itemType: 'folder',
      profileId,
    });

    await service.undo(profileId);

    expect(restore).toHaveBeenCalledWith(
      profileId,
      expect.any(Object),
      expect.objectContaining({
        folderIds: expect.arrayContaining([firstItemId]),
      }),
    );
    expect(service.store.getState().entries[0]?.status).toBe('redo');
    expect(service.store.getState().entries[1]?.status).toBe('undo');
  });

  it('keeps structurally dependent folder creation undo blocked', async () => {
    let id = 0;
    const parentId = itemId;
    const childId = '44444444-4444-4444-8444-444444444444';
    const parent = folder(parentId, 'Parent', false);
    const parentCreated: UndoProfileState = {
      bookmarks: [],
      favorites: [],
      folders: [{ ...before.folders[0]!, updatedAt: 2 }, parent],
    };
    const childCreated: UndoProfileState = {
      bookmarks: [],
      favorites: [],
      folders: [
        { ...before.folders[0]!, updatedAt: 3 },
        { ...parent, updatedAt: 3 },
        { ...folder(childId, 'Child', false), parentId },
      ],
    };
    const service = new UndoHistoryService(
      memoryStorage(),
      vi.fn(async () => undefined),
      () => `33333333-3333-4333-8333-${String(++id).padStart(12, '0')}`,
      () => id,
    );

    await service.record({
      action: 'created',
      after: parentCreated,
      before,
      itemId: parentId,
      itemType: 'folder',
      profileId,
    });
    await service.record({
      action: 'created',
      after: childCreated,
      before: parentCreated,
      itemId: childId,
      itemType: 'folder',
      profileId,
    });

    const [parentEntry, childEntry] = service.store.getState().entries;
    expect(service.canApply(profileId, parentEntry!.id, 'undo')).toBe(false);
    expect(service.canApply(profileId, childEntry!.id, 'undo')).toBe(true);
    await expect(service.undo(profileId, parentEntry!.id)).rejects.toThrow(
      'undo-history-dependent-operation',
    );
    await service.undo(profileId, childEntry!.id);
    await service.undo(profileId, parentEntry!.id);
    expect(service.canApply(profileId, childEntry!.id, 'redo')).toBe(false);
    await expect(service.redo(profileId, childEntry!.id)).rejects.toThrow(
      'undo-history-dependent-operation',
    );
    await service.redo(profileId, parentEntry!.id);
    await service.redo(profileId, childEntry!.id);
  });

  it('makes history unavailable when session persistence fails', async () => {
    const onStorageWriteFailure = vi.fn();
    const service = new UndoHistoryService(
      {
        load: async () => [],
        save: async () => Promise.reject(new Error('quota')),
      },
      vi.fn(async () => undefined),
    );
    service.subscribeStorageWriteFailures(onStorageWriteFailure);
    await service.record({
      action: 'created',
      after,
      before,
      itemId,
      itemType: 'folder',
      profileId,
    });
    expect(service.store.getState().entries[0]?.status).toBe('unavailable');
    expect(onStorageWriteFailure).toHaveBeenCalledWith([profileId]);
  });

  it('drops only oldest entries when accumulated history exceeds storage capacity', async () => {
    let persisted: readonly unknown[] = [];
    const onStoragePressure = vi.fn();
    const onStorageWriteFailure = vi.fn();
    const secondItemId = '44444444-4444-4444-8444-444444444444';
    const secondAfter: UndoProfileState = {
      ...after,
      folders: [...after.folders, folder(secondItemId, 'Second folder', false)],
    };
    const service = new UndoHistoryService(
      {
        load: async () => [],
        save: async (entries) => {
          if (entries.length > 1)
            throw new DOMException(
              'Storage quota exceeded',
              'QuotaExceededError',
            );
          persisted = entries;
        },
      },
      vi.fn(async () => undefined),
    );
    service.subscribeStoragePressure(onStoragePressure);
    service.subscribeStorageWriteFailures(onStorageWriteFailure);

    await service.record({
      action: 'created',
      after,
      before,
      itemId,
      itemType: 'folder',
      profileId,
    });
    await service.record({
      action: 'created',
      after: secondAfter,
      before: after,
      itemId: secondItemId,
      itemType: 'folder',
      profileId,
    });

    expect(service.store.getState().entries).toHaveLength(1);
    expect(service.store.getState().entries[0]).toMatchObject({
      itemId: secondItemId,
      status: 'undo',
    });
    expect(persisted).toEqual(service.store.getState().entries);
    expect(onStoragePressure).toHaveBeenCalledWith([profileId], 1);
    expect(onStorageWriteFailure).not.toHaveBeenCalled();
  });

  it('isolates a storage-write failure listener error', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const service = new UndoHistoryService(
      {
        load: async () => [],
        save: async () => Promise.reject(new Error('quota')),
      },
      vi.fn(async () => undefined),
    );
    service.subscribeStorageWriteFailures(() => {
      throw new Error('listener failed');
    });

    await expect(
      service.record({
        action: 'created',
        after,
        before,
        itemId,
        itemType: 'folder',
        profileId,
      }),
    ).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      'undo-history-storage-write-failure-listener-failed',
    );
    consoleError.mockRestore();
  });

  it('clears only the selected profile history', async () => {
    const service = new UndoHistoryService(
      memoryStorage(),
      vi.fn(async () => undefined),
    );
    await service.record({
      action: 'created',
      after,
      before,
      itemId,
      itemType: 'folder',
      profileId,
    });

    await service.clear(profileId);

    expect(service.store.getState().entries).toEqual([]);
  });

  it('reports a clear failure and retains unavailable history', async () => {
    let saves = 0;
    const onStorageWriteFailure = vi.fn();
    const service = new UndoHistoryService(
      {
        load: async () => [],
        save: async () => {
          saves += 1;
          if (saves > 1) throw new Error('quota');
        },
      },
      vi.fn(async () => undefined),
    );
    service.subscribeStorageWriteFailures(onStorageWriteFailure);
    await service.record({
      action: 'created',
      after,
      before,
      itemId,
      itemType: 'folder',
      profileId,
    });

    await expect(service.clear(profileId)).rejects.toThrow('quota');
    expect(service.store.getState().entries[0]?.status).toBe('unavailable');
    expect(onStorageWriteFailure).toHaveBeenCalledWith([profileId]);
  });
});

function memoryStorage(): UndoHistoryStorage {
  let entries: Parameters<UndoHistoryStorage['save']>[0] = [];
  return {
    load: async () => entries,
    save: async (value) => {
      entries = value;
    },
  };
}

function folder(id: string, title: string, isRoot: boolean) {
  return {
    backgroundAppearance: { kind: 'color' as const, value: '#0b121a' },
    bookmarkView: 'card' as const,
    detailsTableTransparency: 0,
    includeNavigationBackground: false,
    navigationTransparency: 45,
    cardAppearance: { kind: 'color' as const, value: '#2f7de1' },
    createdAt: 1,
    id,
    index: 0,
    isRoot,
    note: '',
    parentId: isRoot ? null : rootId,
    profileId,
    tags: [],
    title,
    updatedAt: 1,
  };
}

function stateWithFolders(
  first: UndoProfileState['folders'][number],
  second: UndoProfileState['folders'][number],
  rootUpdatedAt = 1,
): UndoProfileState {
  return {
    bookmarks: [],
    favorites: [],
    folders: [
      { ...folder(rootId, 'Home', true), updatedAt: rootUpdatedAt },
      first,
      second,
    ],
  };
}
