import Dexie from 'dexie';
import type { Transaction } from 'dexie';
import { z } from 'zod';
import type {
  ImportRequest,
  ImportSavePlan,
  ImportWriter,
} from '../application/import/import-writer';
import { BookmarkManagerDatabase } from './database';
import { BackupDatabase } from './backup-database';
import { DexieBackupRepository } from './dexie-backup-repository';
import {
  backupSnapshotSchema,
  digestBackupPayload,
  encodeBackupPayload,
  type BackupPayload,
  type BackupSnapshot,
} from '../domain/backup';
import { validateExport } from '../domain/profile-export';
import {
  createPortableRecords,
  importFolderDefaults,
  remapNativeProfile,
  validateImportItems,
} from '../domain/import-records';
import {
  defaultBackupPreferences,
  defaultImportPreferences,
  profileSettingsSchema,
} from '../domain/profile-settings';
import { folderSchema } from '../domain/folder';
import { normalizeBookmarkUrl } from '../domain/bookmark-url';

/** Stores complete imports and their safety/history snapshots in one abortable IndexedDB transaction. */
export class DexieImportWriter implements ImportWriter {
  private readonly backups: DexieBackupRepository;
  private closed = false;
  private failure: unknown;

  get diagnosticFailure(): unknown {
    return this.failure;
  }

  constructor(
    private readonly database = new BookmarkManagerDatabase(),
    private readonly legacy = new BackupDatabase(),
  ) {
    this.backups = new DexieBackupRepository(legacy, database);
  }

  close(): void {
    this.closed = true;
    this.database.close();
    this.legacy.close();
  }

  private check(signal: AbortSignal): void {
    signal.throwIfAborted();
    if (this.closed) throw new Error('import-writer-closed');
  }

  private async snapshot(
    payload: BackupPayload,
    input?: BackupSnapshot,
  ): Promise<BackupSnapshot> {
    const now = Date.now();
    const sizeBytes = encodeBackupPayload(payload).byteLength;
    if (sizeBytes > 256 * 1024 * 1024)
      throw new Error('import-snapshot-too-large');
    return backupSnapshotSchema.parse({
      ...(input ?? {
        name: 'Before import',
        type: 'automatic',
        trigger: 'import',
        createdAt: now,
      }),
      id: crypto.randomUUID(),
      profileId: payload.profile.id,
      profileName: payload.profile.username,
      verifiedAt: now,
      sizeBytes,
      payload,
      digest: await digestBackupPayload(payload),
    });
  }

  async prepare(
    request: ImportRequest,
    signal: AbortSignal,
  ): Promise<ImportSavePlan> {
    this.failure = undefined;
    try {
      return await this.preparePlan(request, signal);
    } catch (cause) {
      this.failure = cause;
      throw cause;
    }
  }

  private async preparePlan(
    request: ImportRequest,
    signal: AbortSignal,
  ): Promise<ImportSavePlan> {
    this.check(signal);
    z.uuid().parse(request.originProfileId);
    await this.backups.ready();
    this.check(signal);
    const db = this.database;
    if (request.kind === 'native') {
      const payload = validateExport(request.payload);
      const selected = new Set(
        z
          .array(z.string().regex(/^\d+$/))
          .min(1)
          .max(1000)
          .parse(request.selected),
      );
      const sourceProfiles = payload.profiles.filter((_, index) =>
        selected.has(String(index)),
      );
      if (sourceProfiles.length !== selected.size)
        throw new Error('import-invalid-selection');
      // Verify original history before any remapping, even for callers outside the worker.
      for (const snapshot of payload.backups)
        if ((await digestBackupPayload(snapshot.payload)) !== snapshot.digest)
          throw new Error('import-history-integrity-failed');
      const profiles = sourceProfiles.map((source) => ({
        source,
        value: remapNativeProfile(source, crypto.randomUUID()),
      }));
      const snapshots: BackupSnapshot[] = [];
      for (const { source, value } of profiles)
        for (const old of payload.backups.filter(
          (item) => item.profileId === source.profile.id,
        ))
          snapshots.push(
            await this.snapshot(
              remapNativeProfile(old.payload, value.profile.id),
              old,
            ),
          );
      this.check(signal);
      const capacity = async () => {
        const origin = profileSettingsSchema.parse(
          await db.profileSettings.get(request.originProfileId),
        );
        const count = await db.profiles.count();
        const limit = origin.profilePreferences?.maximumProfiles ?? null;
        if (limit !== null && count + profiles.length > limit)
          throw new Error('import-profile-limit');
        if (!(await db.profiles.get(request.originProfileId)))
          throw new Error('import-origin-missing');
      };
      await capacity();
      return this.plan(
        {
          bookmarks: profiles.reduce(
            (sum, p) => sum + p.value.bookmarks.length,
            0,
          ),
          folders: profiles.reduce(
            (sum, p) => sum + p.value.folders.filter((f) => !f.isRoot).length,
            0,
          ),
          profiles: profiles.length,
          duplicates: 0,
          excluded: 0,
          duplicatePolicy: 'allow',
          snapshotMode: 'not-needed',
          synchronizationPaused: profiles.some(
            (p) => p.value.synchronization !== null,
          ),
        },
        signal,
        async () => {
          await capacity();
          for (const { value } of profiles) await this.addProfile(value);
          for (const snapshot of snapshots)
            await this.addVerifiedSnapshot(snapshot);
          return { profileIds: profiles.map((p) => p.value.profile.id) };
        },
      );
    }
    const profileId = z.uuid().parse(request.profileId);
    const items = validateImportItems(request.items);
    const before = await this.backups.captureProfile(profileId);
    // Logging the review is not a destination edit. All mutable product data,
    // settings, assets, and synchronization still participate in stale checks.
    const fingerprint = JSON.stringify({ ...before, activity: [] });
    const settings = before.settings;
    const roots = before.folders.filter((folder) => folder.isRoot);
    if (
      before.folders.length &&
      (roots.length !== 1 || roots[0]!.parentId !== null)
    )
      throw new Error('import-invalid-destination');
    const now = Date.now();
    const newRoot =
      !before.folders.length && request.folderId === `import-home:${profileId}`
        ? folderSchema.parse({
            ...importFolderDefaults(settings),
            id: crypto.randomUUID(),
            profileId,
            parentId: null,
            isRoot: true,
            title: 'Home',
            tags: [],
            note: '',
            index: 0,
            cardAppearance: { kind: 'color', value: '#2f7de1' },
            createdAt: now,
            updatedAt: now,
          })
        : undefined;
    const destination =
      newRoot ??
      before.folders.find((folder) => folder.id === request.folderId);
    if (!destination) throw new Error('import-destination-missing');
    const seen = new Set(
      before.bookmarks.map((item) => normalizeBookmarkUrl(item.url)),
    );
    let duplicates = 0;
    const policy = settings.duplicateHandling ?? 'allow';
    const selected = items.filter((item) => {
      if (item.kind === 'folder') return true;
      const url = normalizeBookmarkUrl(item.data.url!);
      const duplicate = seen.has(url);
      seen.add(url);
      if (duplicate) duplicates++;
      return !(duplicate && policy === 'prevent');
    });
    let nextIndex = 0;
    for (const row of [...before.bookmarks, ...before.folders])
      if (row.parentId === destination.id)
        nextIndex = Math.max(nextIndex, row.index + 1);
    const records = selected.length
      ? createPortableRecords(
          selected,
          settings,
          destination.id,
          nextIndex,
          now,
        )
      : { folders: [], bookmarks: [] };
    validateExport({
      format: 'bookmark-manager-pro',
      version: 1,
      createdAt: now,
      categories: ['bookmarks', 'settings'],
      restoreSynchronization: 'paused',
      backups: [],
      profiles: [
        {
          ...before,
          folders: [
            ...before.folders,
            ...(newRoot ? [newRoot] : []),
            ...records.folders,
          ],
          bookmarks: [...before.bookmarks, ...records.bookmarks],
        },
      ],
    });
    const preferences = settings.backupPreferences ?? defaultBackupPreferences;
    const snapshot =
      preferences.automaticEnabled &&
      preferences.beforeImport &&
      selected.length
        ? await this.snapshot(before)
        : undefined;
    this.check(signal);
    return this.plan(
      {
        bookmarks: records.bookmarks.length,
        folders: records.folders.length,
        profiles: 0,
        duplicates,
        excluded: policy === 'prevent' ? duplicates : 0,
        duplicatePolicy: policy,
        snapshotMode: !selected.length
          ? 'no-changes'
          : !preferences.automaticEnabled
            ? 'automatic-disabled'
            : !preferences.beforeImport
              ? 'disabled'
              : 'enabled',
        synchronizationPaused:
          before.synchronization !== null &&
          before.synchronization.status !== 'paused',
      },
      signal,
      async () => {
        const current = await this.backups.captureProfile(profileId);
        if (JSON.stringify({ ...current, activity: [] }) !== fingerprint)
          throw new Error('import-destination-changed');
        if (!records.bookmarks.length && !records.folders.length)
          return { profileIds: [] };
        if (snapshot) await this.addVerifiedSnapshot(snapshot);
        if (newRoot) await db.folders.add(newRoot);
        await this.addRows(records.folders, (batch) =>
          db.folders.bulkAdd(batch),
        );
        await this.addRows(records.bookmarks, (batch) =>
          db.bookmarks.bulkAdd(batch),
        );
        // Imported application content must never trigger an automatic browser-bookmark write.
        const sync = await db.metadata.get(`sync:v1:${profileId}`);
        if (sync && typeof sync.value === 'object' && sync.value !== null)
          await db.metadata.put({
            ...sync,
            value: { ...sync.value, status: 'paused' },
          });
        const origin = profileSettingsSchema.parse(
          await db.profileSettings.get(request.originProfileId),
        );
        const importPreferences =
          origin.importPreferences ?? defaultImportPreferences;
        if (importPreferences.rememberDestination)
          await db.profileSettings.put({
            ...origin,
            importPreferences: {
              ...importPreferences,
              rememberedFolders: {
                ...importPreferences.rememberedFolders,
                [profileId]: destination.id,
              },
            },
          });
        if (snapshot) {
          const old = await db.backupSnapshots
            .where('profileId')
            .equals(profileId)
            .filter(
              (row) =>
                row.type === 'automatic' &&
                row.trigger === 'import' &&
                row.id !== snapshot.id,
            )
            .sortBy('createdAt');
          await db.backupSnapshots.bulkDelete(
            old
              .slice(
                0,
                Math.max(0, old.length - preferences.retentionPerTrigger + 1),
              )
              .map((row) => row.id),
          );
        }
        return { profileIds: [profileId] };
      },
    );
  }

  private plan(
    summary: Omit<ImportSavePlan, 'commit'>,
    preparedSignal: AbortSignal,
    write: () => Promise<{ profileIds: string[] }>,
  ): ImportSavePlan {
    let used = false;
    return {
      ...summary,
      commit: async (signal) => {
        this.check(preparedSignal);
        this.check(signal);
        if (used) throw new Error('import-plan-already-used');
        used = true;
        let transaction: Transaction | undefined;
        const abort = () => transaction?.abort();
        signal.addEventListener('abort', abort, { once: true });
        preparedSignal.addEventListener('abort', abort, { once: true });
        try {
          return await this.database.transaction(
            'rw',
            this.database.tables,
            async () => {
              transaction = Dexie.currentTransaction!;
              this.check(signal);
              this.check(preparedSignal);
              const result = await write();
              this.check(signal);
              this.check(preparedSignal);
              return result;
            },
          );
        } catch (cause) {
          this.failure = cause;
          throw cause;
        } finally {
          signal.removeEventListener('abort', abort);
          preparedSignal.removeEventListener('abort', abort);
        }
      },
    };
  }

  private async addVerifiedSnapshot(snapshot: BackupSnapshot): Promise<void> {
    await this.database.backupSnapshots.add(snapshot);
    const stored = await this.database.backupSnapshots.get(snapshot.id);
    if (JSON.stringify(stored) !== JSON.stringify(snapshot))
      throw new Error('import-snapshot-verification-failed');
  }

  /** Bounds outstanding IndexedDB requests while retaining the enclosing atomic transaction. */
  private async addRows<T>(
    rows: readonly T[],
    add: (batch: T[]) => Promise<unknown>,
  ): Promise<void> {
    for (let offset = 0; offset < rows.length; offset += 500)
      await add(rows.slice(offset, offset + 500));
  }

  private async addProfile(value: BackupPayload): Promise<void> {
    const db = this.database;
    await db.profiles.add(value.profile);
    await db.profileSettings.add(value.settings);
    await this.addRows(value.folders, (batch) => db.folders.bulkAdd(batch));
    await this.addRows(value.bookmarks, (batch) => db.bookmarks.bulkAdd(batch));
    await this.addRows(value.favorites, (batch) =>
      db.favoriteItems.bulkAdd(batch),
    );
    await this.addRows(value.activity, (batch) => db.activity.bulkAdd(batch));
    if (value.activityLogSettings)
      await db.activityLogSettings.add(value.activityLogSettings);
    await this.addRows(value.notes ?? [], (batch) => db.notes.bulkAdd(batch));
    await this.addRows(value.noteFolders ?? [], (batch) =>
      db.noteFolders.bulkAdd(batch),
    );
    await this.addRows(value.folderWallpapers ?? [], (batch) =>
      db.folderWallpapers.bulkAdd(batch),
    );
    if (value.synchronization)
      await db.metadata.add({
        key: `sync:v1:${value.profile.id}`,
        value: value.synchronization,
      });
  }
}
