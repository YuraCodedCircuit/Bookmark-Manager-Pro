import { createStore, type StoreApi } from 'zustand/vanilla';

import {
  undoHistoryEntrySchema,
  type UndoHistoryAction,
  type UndoHistoryEntry,
  type UndoHistoryItemType,
  type UndoProfileState,
} from '../../domain/undo-history';
import type { UndoHistoryStorage } from './undo-history-storage';

interface UndoHistoryState {
  busy: boolean;
  entries: readonly UndoHistoryEntry[];
  initializationFailed: boolean;
}

interface RecordOperationInput {
  action: UndoHistoryAction;
  after: UndoProfileState;
  before: UndoProfileState;
  itemId: string;
  itemType: UndoHistoryItemType;
  profileId: string;
}

type RestoreState = (
  profileId: string,
  state: UndoProfileState,
  affectedIds: {
    bookmarkIds: readonly string[];
    favoriteIds: readonly string[];
    folderIds: readonly string[];
  },
) => Promise<void>;
type RunExclusive = <T>(run: () => Promise<T>) => Promise<T>;
type StorageWriteFailureListener = (profileIds: readonly string[]) => void;
type StoragePressureListener = (
  profileIds: readonly string[],
  removedEntries: number,
) => void;

const MAX_HISTORY_ENTRIES = 100;

/** Owns serialized, session-only undo and redo state for bookmark mutations. */
export class UndoHistoryService {
  readonly store: StoreApi<UndoHistoryState> = createStore(() => ({
    busy: false,
    entries: [],
    initializationFailed: false,
  }));
  private operation: Promise<void> = Promise.resolve();
  private readonly channel =
    typeof window === 'undefined' ||
    typeof window.BroadcastChannel === 'undefined'
      ? undefined
      : new window.BroadcastChannel('bookmark-manager-pro.undo-history.v1');
  private readonly surfaceId = crypto.randomUUID();
  private readonly peers = new Set<string>();
  private readonly storageWriteFailureListeners =
    new Set<StorageWriteFailureListener>();
  private readonly storagePressureListeners =
    new Set<StoragePressureListener>();

  constructor(
    private readonly storage: UndoHistoryStorage,
    private readonly restoreState: RestoreState,
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => number = () => Date.now(),
    private readonly runExclusive: RunExclusive = (run) => run(),
  ) {
    if (this.channel)
      this.channel.onmessage = (event: MessageEvent<unknown>) => {
        const message = event.data;
        if (!isHistoryMessage(message) || message.sourceId === this.surfaceId)
          return;
        if (message.type === 'hello') {
          this.peers.add(message.sourceId);
          this.broadcast('present');
          return;
        }
        if (message.type === 'present') {
          this.peers.add(message.sourceId);
          return;
        }
        if (message.type === 'goodbye') {
          this.peers.delete(message.sourceId);
          return;
        }
        if (message.type === 'request') {
          this.broadcast('sync', this.store.getState().entries);
          return;
        }
        const parsed = undoHistoryEntrySchema
          .array()
          .max(250)
          .safeParse(message.entries);
        if (parsed.success) {
          this.store.setState({ entries: parsed.data });
          void this.persist(parsed.data, false);
        }
      };
  }

  /** Reports failed session-storage writes without exposing saved item data. */
  subscribeStorageWriteFailures(
    listener: StorageWriteFailureListener,
  ): () => void {
    this.storageWriteFailureListeners.add(listener);
    return () => this.storageWriteFailureListeners.delete(listener);
  }

  /** Reports capacity-driven removal without exposing saved item data. */
  subscribeStoragePressure(listener: StoragePressureListener): () => void {
    this.storagePressureListeners.add(listener);
    return () => this.storagePressureListeners.delete(listener);
  }

  async initialize(): Promise<boolean> {
    try {
      await this.runExclusive(async () => {
        this.store.setState({
          entries: await this.storage.load(),
          initializationFailed: false,
        });
      });
      this.broadcast('hello');
      this.broadcast('request');
      return true;
    } catch {
      this.store.setState({ entries: [], initializationFailed: true });
      console.error('undo-history-initialize-failed');
      return false;
    }
  }

  async record(input: RecordOperationInput): Promise<void> {
    const changed = changedIds(input.before, input.after);
    if (
      !changed.bookmarkIds.length &&
      !changed.folderIds.length &&
      !changed.favoriteIds.length
    )
      return;
    const entry = undoHistoryEntrySchema.parse({
      ...input,
      after: selectChangedState(input.after, changed),
      affectedBookmarkIds: changed.bookmarkIds,
      affectedFavoriteIds: changed.favoriteIds,
      affectedFolderIds: changed.folderIds,
      before: selectChangedState(input.before, changed),
      createdAt: this.now(),
      id: this.createId(),
      ...historyDisplayContext(input),
      status: 'undo',
    });
    const current = this.store
      .getState()
      .entries.filter(
        (candidate) =>
          candidate.profileId !== input.profileId ||
          candidate.status !== 'redo',
      );
    const entries = [...current, entry].slice(-MAX_HISTORY_ENTRIES);
    this.store.setState({ entries });
    await this.persist(entries);
  }

  /** Serializes a new mutation against undo and redo database writes. */
  runMutation<T>(run: () => Promise<T>): Promise<T> {
    const task = this.operation.then(() =>
      this.runExclusive(async () => {
        this.store.setState({ busy: true });
        try {
          return await run();
        } finally {
          this.store.setState({ busy: false });
        }
      }),
    );
    this.operation = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  undo(profileId: string, entryId?: string): Promise<void> {
    return this.enqueue(() => this.apply('undo', profileId, entryId));
  }

  redo(profileId: string, entryId?: string): Promise<void> {
    return this.enqueue(() => this.apply('redo', profileId, entryId));
  }

  /** Clears every session-history entry owned by one profile. */
  clear(profileId: string): Promise<void> {
    return this.enqueue(async () => {
      await this.runExclusive(async () => {
        this.store.setState({ busy: true });
        try {
          const original = this.store.getState().entries;
          const entries = original.filter(
            (entry) => entry.profileId !== profileId,
          );
          this.store.setState({ entries });
          try {
            await this.storage.save(entries);
            this.broadcast('sync', entries);
          } catch (error) {
            this.store.setState({
              entries: original.map((entry) => ({
                ...entry,
                status: 'unavailable',
              })),
            });
            this.reportStorageWriteFailure(original);
            throw error;
          }
        } finally {
          this.store.setState({ busy: false });
        }
      });
    });
  }

  /** Releases cross-tab resources and clears storage when this is the last surface. */
  async dispose(): Promise<void> {
    if (this.peers.size === 0)
      await this.storage
        .save([])
        .catch(() =>
          this.reportStorageWriteFailure(this.store.getState().entries),
        );
    else this.broadcast('goodbye');
    this.channel?.close();
  }

  canApply(
    profileId: string,
    entryId: string,
    direction: 'redo' | 'undo',
  ): boolean {
    const entries = this.store.getState().entries;
    const index = entries.findIndex(
      (entry) =>
        entry.id === entryId &&
        entry.profileId === profileId &&
        entry.status === direction,
    );
    if (index < 0) return false;
    const entry = entries[index]!;
    const possibleBlockers =
      direction === 'undo' ? entries.slice(index + 1) : entries.slice(0, index);
    return !possibleBlockers.some(
      (candidate) =>
        candidate.profileId === profileId &&
        candidate.status === direction &&
        operationsOverlap(entry, candidate),
    );
  }

  private enqueue(run: () => Promise<void>): Promise<void> {
    const next = this.operation.then(run, run);
    this.operation = next.catch(() => undefined);
    return next;
  }

  private async apply(
    direction: 'redo' | 'undo',
    profileId: string,
    entryId?: string,
  ): Promise<void> {
    await this.runExclusive(async () => {
      this.store.setState({ busy: true });
      try {
        const entries = [...this.store.getState().entries];
        const candidates = entries.filter(
          (entry) =>
            entry.profileId === profileId && entry.status === direction,
        );
        const entry = entryId
          ? candidates.find((candidate) => candidate.id === entryId)
          : selectDefaultCandidate(candidates, direction);
        if (!entry) return;
        if (!this.canApply(profileId, entry.id, direction))
          throw new Error('undo-history-dependent-operation');
        await this.restoreState(
          profileId,
          direction === 'undo' ? entry.before : entry.after,
          {
            bookmarkIds: entry.affectedBookmarkIds,
            favoriteIds: entry.affectedFavoriteIds,
            folderIds: entry.affectedFolderIds,
          },
        );
        const updated = entries.map((candidate) =>
          candidate.id === entry.id
            ? {
                ...candidate,
                status:
                  direction === 'undo' ? ('redo' as const) : ('undo' as const),
              }
            : candidate,
        );
        this.store.setState({ entries: updated });
        await this.persist(updated);
      } finally {
        this.store.setState({ busy: false });
      }
    });
  }

  private async persist(
    entries: readonly UndoHistoryEntry[],
    broadcast = true,
  ): Promise<void> {
    let retainedEntries = [...entries];
    while (retainedEntries.length) {
      try {
        await this.storage.save(retainedEntries);
        this.store.setState({ entries: retainedEntries });
        if (broadcast) this.broadcast('sync', retainedEntries);
        const removedEntries = entries.length - retainedEntries.length;
        if (removedEntries)
          this.reportStoragePressure(retainedEntries, removedEntries);
        return;
      } catch (error) {
        if (!isStorageCapacityError(error) || retainedEntries.length === 1)
          break;
        retainedEntries = retainedEntries.slice(1);
      }
    }
    this.store.setState({
      entries: entries.map((entry) => ({ ...entry, status: 'unavailable' })),
    });
    this.reportStorageWriteFailure(entries);
  }

  private reportStoragePressure(
    entries: readonly UndoHistoryEntry[],
    removedEntries: number,
  ): void {
    const profileIds = [...new Set(entries.map(({ profileId }) => profileId))];
    for (const listener of this.storagePressureListeners) {
      try {
        listener(profileIds, removedEntries);
      } catch {
        console.error('undo-history-storage-pressure-listener-failed');
      }
    }
  }

  private reportStorageWriteFailure(
    entries: readonly UndoHistoryEntry[],
  ): void {
    const profileIds = [...new Set(entries.map(({ profileId }) => profileId))];
    if (!profileIds.length || !this.storageWriteFailureListeners.size) {
      console.error('undo-history-storage-write-failed');
      return;
    }
    for (const listener of this.storageWriteFailureListeners) {
      try {
        listener(profileIds);
      } catch {
        console.error('undo-history-storage-write-failure-listener-failed');
      }
    }
  }

  private broadcast(
    type: 'goodbye' | 'hello' | 'present' | 'request' | 'sync',
    entries?: readonly UndoHistoryEntry[],
  ): void {
    this.channel?.postMessage({ entries, sourceId: this.surfaceId, type });
  }
}

function isStorageCapacityError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'QuotaExceededError')
    return true;
  return (
    error instanceof Error &&
    /quota|quota_bytes|storage(?: space)? limit/i.test(
      `${error.name} ${error.message}`,
    )
  );
}

function operationsOverlap(
  left: UndoHistoryEntry,
  right: UndoHistoryEntry,
): boolean {
  if (left.itemId === right.itemId) return true;
  if (!isStructuralAction(left.action) && !isStructuralAction(right.action))
    return false;
  const rightIds = new Set([
    ...right.affectedBookmarkIds,
    ...right.affectedFavoriteIds,
    ...right.affectedFolderIds,
  ]);
  return [
    ...left.affectedBookmarkIds,
    ...left.affectedFavoriteIds,
    ...left.affectedFolderIds,
  ].some((id) => rightIds.has(id));
}

function isStructuralAction(action: UndoHistoryAction): boolean {
  return action === 'created' || action === 'deleted' || action === 'moved';
}

function selectDefaultCandidate(
  candidates: readonly UndoHistoryEntry[],
  direction: 'redo' | 'undo',
): UndoHistoryEntry | undefined {
  return candidates.reduce<UndoHistoryEntry | undefined>(
    (selected, candidate) => {
      if (!selected) return candidate;
      if (direction === 'undo')
        return candidate.createdAt >= selected.createdAt ? candidate : selected;
      return candidate.createdAt < selected.createdAt ? candidate : selected;
    },
    undefined,
  );
}

function isHistoryMessage(value: unknown): value is {
  entries?: unknown;
  sourceId: string;
  type: 'goodbye' | 'hello' | 'present' | 'request' | 'sync';
} {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sourceId === 'string' &&
    (candidate.type === 'goodbye' ||
      candidate.type === 'hello' ||
      candidate.type === 'present' ||
      candidate.type === 'request' ||
      candidate.type === 'sync')
  );
}

function selectChangedState(
  state: UndoProfileState,
  changed: ReturnType<typeof changedIds>,
): UndoProfileState {
  const bookmarkIds = new Set(changed.bookmarkIds);
  const favoriteIds = new Set(changed.favoriteIds);
  const folderIds = new Set(changed.folderIds);
  return {
    bookmarks: state.bookmarks.filter(({ id }) => bookmarkIds.has(id)),
    favorites: state.favorites.filter(({ itemId }) => favoriteIds.has(itemId)),
    folders: state.folders.filter(({ id }) => folderIds.has(id)),
  };
}

function historyDisplayContext(input: RecordOperationInput): {
  parentTitle?: string;
  siteHostname?: string;
} {
  const itemCollection =
    input.itemType === 'bookmark' ? 'bookmarks' : 'folders';
  const afterItem = input.after[itemCollection].find(
    ({ id }) => id === input.itemId,
  );
  const beforeItem = input.before[itemCollection].find(
    ({ id }) => id === input.itemId,
  );
  const item = afterItem ?? beforeItem;
  if (!item) return {};
  const preferredFolders = afterItem
    ? input.after.folders
    : input.before.folders;
  const parentTitle = item.parentId
    ? (
        preferredFolders.find(({ id }) => id === item.parentId) ??
        [...input.after.folders, ...input.before.folders].find(
          ({ id }) => id === item.parentId,
        )
      )?.title
    : undefined;
  const siteHostname = 'url' in item ? safeHostname(item.url) : undefined;
  return {
    ...(parentTitle ? { parentTitle } : {}),
    ...(siteHostname ? { siteHostname } : {}),
  };
}

function safeHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname || undefined;
  } catch {
    return undefined;
  }
}

function changedIds(before: UndoProfileState, after: UndoProfileState) {
  return {
    bookmarkIds: changedEntityIds(
      before.bookmarks,
      after.bookmarks,
      (value) => value.id,
    ),
    favoriteIds: changedEntityIds(
      before.favorites,
      after.favorites,
      (value) => value.itemId,
    ),
    folderIds: changedEntityIds(
      before.folders,
      after.folders,
      (value) => value.id,
    ),
  };
}

function changedEntityIds<T>(
  before: readonly T[],
  after: readonly T[],
  getId: (value: T) => string,
): string[] {
  const beforeValues = new Map(
    before.map((value) => [getId(value), JSON.stringify(value)]),
  );
  const afterValues = new Map(
    after.map((value) => [getId(value), JSON.stringify(value)]),
  );
  return [...new Set([...beforeValues.keys(), ...afterValues.keys()])].filter(
    (id) => beforeValues.get(id) !== afterValues.get(id),
  );
}
