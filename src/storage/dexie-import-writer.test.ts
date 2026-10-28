import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookmarkManagerDatabase } from './database';
import { BackupDatabase } from './backup-database';
import { DexieImportWriter } from './dexie-import-writer';
import { DexieBackupRepository } from './dexie-backup-repository';
import { migrateBackupSnapshots } from './migrate-backup-snapshots';
import { ManageBackups } from '../application/backup/manage-backups';
import { profileSettingsSchema } from '../domain/profile-settings';
import { folderSchema } from '../domain/folder';
import {
  readPortableCsvPreview,
  readBookmarkHtml,
} from '../domain/portable-text-import';
import { readPortableJson } from '../domain/portable-import';
import { validateExport, type ExportPayload } from '../domain/profile-export';
import { activityLogEntrySchema } from '../domain/activity-log';
import { digestBackupPayload } from '../domain/backup';
import { DexieProfileManagementRepository } from './dexie-profile-management-repository';

let db: BookmarkManagerDatabase;
let legacy: BackupDatabase;
let writer: DexieImportWriter;
let profileId: string;
let rootId: string;
const signal = () => new AbortController().signal;
const csv = (
  source = 'URL,Title,Tags,Note\r\nhttps://example.com/,Imported,"[""one""]",Text',
) => readPortableCsvPreview(source, true).items;
const portable = (items = csv()) => ({
  kind: 'portable' as const,
  profileId,
  folderId: rootId,
  originProfileId: profileId,
  items,
});

beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  db = new BookmarkManagerDatabase(`import-${crypto.randomUUID()}`);
  legacy = new BackupDatabase(`import-legacy-${crypto.randomUUID()}`);
  writer = new DexieImportWriter(db, legacy);
  profileId = crypto.randomUUID();
  rootId = crypto.randomUUID();
  await db.profiles.add({
    id: profileId,
    username: 'Destination',
    createdAt: 1,
    updatedAt: 1,
  });
  await db.profileSettings.add(
    profileSettingsSchema.parse({
      profileId,
      theme: 'dark',
      rememberLastAppearance: true,
      lastBookmarkAppearance: { kind: 'color', value: '#112233' },
      lastFolderAppearance: { kind: 'color', value: '#334455' },
      defaultFolderBackgroundAppearance: { kind: 'color', value: '#556677' },
      defaultFolderNavigationTransparency: 27,
      defaultFolderIncludeNavigationBackground: true,
      cardSize: 'large',
      importPreferences: { rememberDestination: true },
    }),
  );
  await db.metadata.put({ key: 'activeProfileId', value: profileId });
  await db.folders.add(
    folderSchema.parse({
      id: rootId,
      profileId,
      parentId: null,
      title: 'Home',
      tags: [],
      note: '',
      index: 0,
      isRoot: true,
      cardAppearance: { kind: 'color', value: '#123456' },
      backgroundAppearance: { kind: 'none' },
      createdAt: 1,
      updatedAt: 1,
    }),
  );
});
afterEach(async () => {
  writer.close();
  await db.delete();
  await legacy.delete();
  vi.unstubAllGlobals();
});

describe('foreground import persistence', () => {
  it.each(['failure', 'cancel'] as const)(
    'rolls back earlier write batches and the snapshot on a later %s',
    async (mode) => {
      const controller = new AbortController();
      const items = csv(
        'URL,Title\r\n' +
          Array.from(
            { length: 601 },
            (_, i) => `https://example.com/${i},Synthetic ${i}`,
          ).join('\r\n'),
      );
      const plan = await writer.prepare(portable(items), controller.signal);
      let created = 0;
      const hook = () => {
        if (++created === 501) {
          if (mode === 'cancel') controller.abort();
          else throw new Error('synthetic-late-failure');
        }
      };
      db.bookmarks.hook('creating', hook);
      try {
        await expect(plan.commit(controller.signal)).rejects.toThrow();
      } finally {
        db.bookmarks.hook('creating').unsubscribe(hook);
      }
      expect(created).toBeGreaterThanOrEqual(501);
      expect(await db.bookmarks.count()).toBe(0);
      expect(await db.folders.count()).toBe(1);
      expect(await db.backupSnapshots.count()).toBe(0);
      expect(
        (await db.profileSettings.get(profileId))!.importPreferences!
          .rememberedFolders,
      ).toEqual({});
      await (await writer.prepare(portable(items), signal())).commit(signal());
      expect(await db.bookmarks.count()).toBe(601);
      expect(await db.backupSnapshots.count()).toBe(1);
    },
  );
  it('saves CSV with destination styles, verified safety snapshot, and remembered destination', async () => {
    const plan = await writer.prepare(portable(), signal());
    expect(plan.snapshotMode).toBe('enabled');
    expect(await db.bookmarks.count()).toBe(0);
    const result = await plan.commit(signal());
    expect(result.profileIds).toEqual([profileId]);
    expect(await db.bookmarks.toArray()).toEqual([
      expect.objectContaining({
        title: 'Imported',
        tags: ['one'],
        note: 'Text',
        profileId,
        parentId: rootId,
        cardAppearance: { kind: 'color', value: '#112233' },
      }),
    ]);
    const snapshots = await db.backupSnapshots.toArray();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.payload.bookmarks).toEqual([]);
    expect(
      (await db.profileSettings.get(profileId))!.importPreferences!
        .rememberedFolders[profileId],
    ).toBe(rootId);
    await expect(plan.commit(signal())).rejects.toThrow(
      'import-plan-already-used',
    );
  });
  it('saves HTML hierarchy with folder defaults without requesting icons or source resources', async () => {
    const items = readBookmarkHtml(
      '<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><DT><H3>Imported folder</H3><DL><DT><A HREF="https://example.com/" ICON="https://tracker.invalid/icon">Child</A></DL></DL>',
      true,
    );
    await (await writer.prepare(portable(items), signal())).commit(signal());
    const folder = (await db.folders.toArray()).find((row) => !row.isRoot)!;
    expect(folder).toMatchObject({
      parentId: rootId,
      cardSize: 'large',
      navigationTransparency: 27,
      includeNavigationBackground: true,
      cardAppearance: { kind: 'color', value: '#334455' },
      backgroundAppearance: { kind: 'color', value: '#556677' },
    });
    expect((await db.bookmarks.toArray())[0]).toMatchObject({
      parentId: folder.id,
    });
    expect((await db.bookmarks.toArray())[0]!.favicon).toBeUndefined();
  });
  it('preserves JSON v2 folder tags and notes and maps the structural root to the destination', async () => {
    const folder = crypto.randomUUID();
    const bookmark = crypto.randomUUID();
    const items = readPortableJson(
      JSON.stringify({
        format: 'bookmark-manager-pro-bookmarks',
        version: 2,
        profiles: [
          {
            id: crypto.randomUUID(),
            name: 'Source',
            content: [
              {
                id: crypto.randomUUID(),
                parentId: null,
                title: 'Source root',
                index: 0,
                tags: [],
                note: '',
                content: [],
              },
            ],
          },
        ],
      }),
      true,
    );
    expect(items).toEqual([]);
    const root = crypto.randomUUID();
    const data = readPortableJson(
      JSON.stringify({
        format: 'bookmark-manager-pro-bookmarks',
        version: 2,
        profiles: [
          {
            id: crypto.randomUUID(),
            name: 'Source',
            content: [
              {
                id: root,
                parentId: null,
                title: 'Source root',
                index: 0,
                tags: [],
                note: '',
                content: [
                  {
                    id: folder,
                    parentId: root,
                    title: 'Folder',
                    index: 0,
                    tags: ['folder tag'],
                    note: 'Folder note',
                    content: [
                      {
                        id: bookmark,
                        parentId: folder,
                        title: 'Bookmark',
                        index: 0,
                        tags: ['tag'],
                        note: 'Note',
                        url: 'https://example.org/',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
      true,
    );
    await (await writer.prepare(portable(data), signal())).commit(signal());
    expect(await db.folders.count()).toBe(2);
    expect(
      (await db.folders.toArray()).find((row) => !row.isRoot),
    ).toMatchObject({
      tags: ['folder tag'],
      note: 'Folder note',
      parentId: rootId,
    });
  });
  it.each(['allow', 'warn', 'prevent'] as const)(
    'applies %s to canonical duplicates within the same file',
    async (policy) => {
      await db.profileSettings.update(profileId, { duplicateHandling: policy });
      const plan = await writer.prepare(
        portable(csv('URL\r\nhttps://example.com\r\nhttps://example.com/')),
        signal(),
      );
      expect(plan.duplicates).toBe(1);
      expect(plan.excluded).toBe(policy === 'prevent' ? 1 : 0);
      await plan.commit(signal());
      expect(await db.bookmarks.count()).toBe(policy === 'prevent' ? 1 : 2);
    },
  );
  it.each([
    [true, false, 'disabled'],
    [false, true, 'automatic-disabled'],
  ] as const)(
    'reports snapshot policy for automatic=%s and beforeImport=%s',
    async (automaticEnabled, beforeImport, expected) => {
      await db.profileSettings.update(profileId, {
        backupPreferences: {
          automaticEnabled,
          beforeImport,
          beforeDatabaseUpgrade: true,
          beforeProfileReset: true,
          beforeSynchronization: true,
          retentionPerTrigger: 5,
        },
      });
      const plan = await writer.prepare(portable(), signal());
      expect(plan.snapshotMode).toBe(expected);
      await plan.commit(signal());
      expect(await db.backupSnapshots.count()).toBe(0);
    },
  );
  it('rejects stale settings and destination deletion without storing records or safety snapshots', async () => {
    const plan = await writer.prepare(portable(), signal());
    await db.profileSettings.update(profileId, { cardSize: 'small' });
    await expect(plan.commit(signal())).rejects.toThrow(
      'import-destination-changed',
    );
    expect(await db.bookmarks.count()).toBe(0);
    expect(await db.backupSnapshots.count()).toBe(0);
    const next = await writer.prepare(portable(), signal());
    await db.folders.delete(rootId);
    await expect(next.commit(signal())).rejects.toThrow(
      'import-destination-changed',
    );
  });
  it('allows review logging without treating it as a destination edit', async () => {
    const plan = await writer.prepare(portable(), signal());
    await db.activity.add(
      activityLogEntrySchema.parse({
        id: crypto.randomUUID(),
        profileId,
        action: 'Import',
        category: 'Application',
        level: 'INFO',
        kind: 'ACTIVITY',
        eventCode: 'IMPORT-SAVE-PREPARED',
        message: 'Import review ready.',
        source: 'Import window',
        itemType: 'Import',
        itemsAffected: 0,
        durationMs: 0,
        dataChanged: false,
        applicationVersion: '0.6.2',
        browserTarget: 'Test',
        operationId: 'op-test-import',
        schemaVersion: 1,
        timestamp: 1,
        outcome: 'Succeeded',
      }),
    );
    await plan.commit(signal());
    expect(await db.bookmarks.count()).toBe(1);
    expect(await db.activity.count()).toBe(1);
  });
  it('rolls back records, snapshots, and preferences on a storage failure and permits a fresh retry', async () => {
    const fail = () => {
      throw new Error('synthetic-quota-failure');
    };
    db.bookmarks.hook('creating', fail);
    await expect(
      (await writer.prepare(portable(), signal())).commit(signal()),
    ).rejects.toThrow('synthetic-quota-failure');
    expect(await db.bookmarks.count()).toBe(0);
    expect(await db.backupSnapshots.count()).toBe(0);
    expect(
      (await db.profileSettings.get(profileId))!.importPreferences!
        .rememberedFolders,
    ).toEqual({});
    db.bookmarks.hook('creating').unsubscribe(fail);
    await (await writer.prepare(portable(), signal())).commit(signal());
    expect(await db.bookmarks.count()).toBe(1);
  });
  it('aborts an in-flight transaction and rolls back its safety snapshot', async () => {
    const controller = new AbortController();
    db.bookmarks.hook('creating', () => {
      controller.abort();
    });
    await expect(
      (await writer.prepare(portable(), controller.signal)).commit(
        controller.signal,
      ),
    ).rejects.toThrow();
    expect(await db.bookmarks.count()).toBe(0);
    expect(await db.backupSnapshots.count()).toBe(0);
  });
  it('resolves an empty destination Home only inside the successful transaction', async () => {
    await db.folders.clear();
    const request = { ...portable(), folderId: `import-home:${profileId}` };
    const plan = await writer.prepare(request, signal());
    expect(await db.folders.count()).toBe(0);
    await plan.commit(signal());
    expect(await db.folders.count()).toBe(1);
    expect((await db.bookmarks.toArray())[0]!.parentId).toBe(
      (await db.folders.toArray())[0]!.id,
    );
    expect((await db.metadata.get('activeProfileId'))!.value).toBe(profileId);
  });
  it.each([
    ['title', 'x'.repeat(201)],
    ['note', 'x'.repeat(10_001)],
    ['url', 'javascript:alert(1)'],
    ['tags', ['x'.repeat(81)]],
    ['tags', Array(51).fill('tag')],
  ])(
    'rejects invalid %s at the authoritative boundary before any writes',
    async (field, value) => {
      const items = csv();
      if (field === 'title') items[0]!.title = value as string;
      else Object.assign(items[0]!.data!, { [field as string]: value });
      await expect(writer.prepare(portable(items), signal())).rejects.toThrow();
      expect(await db.bookmarks.count()).toBe(0);
      expect(await db.backupSnapshots.count()).toBe(0);
    },
  );
  it('preserves allowed spreadsheet protection at title and note boundaries', async () => {
    const items = csv();
    items[0]!.title = "'" + 'x'.repeat(200);
    items[0]!.data!.note = "'" + 'x'.repeat(10_000);
    await (await writer.prepare(portable(items), signal())).commit(signal());
    expect((await db.bookmarks.toArray())[0]!.title).toHaveLength(201);
  });
  it('imports native profiles and history atomically with fresh identities and preserved names/styles', async () => {
    const repo = new DexieBackupRepository(legacy, db);
    const original = await repo.captureProfile(profileId);
    const history = await new ManageBackups(repo).create({
      profileId,
      type: 'manual',
      trigger: 'manual',
    });
    const local = activityLogEntrySchema.parse({
      id: crypto.randomUUID(),
      profileId,
      action: 'Import',
      applicationVersion: '0.7.0',
      browserTarget: 'Test',
      category: 'Application',
      dataChanged: false,
      durationMs: 0,
      eventCode: 'IMPORT-SAVE-COMPLETE',
      itemType: 'Import',
      itemsAffected: 0,
      kind: 'ACTIVITY',
      level: 'INFO',
      message: 'Synthetic history.',
      operationId: 'op-test-import',
      outcome: 'Succeeded',
      schemaVersion: 1,
      source: 'Import',
      timestamp: 1,
    });
    await db.activity.add(local);
    original.activity = [{ ...local, profileId, id: crypto.randomUUID() }];
    history.payload.activity = [
      { ...local, profileId, id: crypto.randomUUID() },
    ];
    history.digest = await digestBackupPayload(history.payload);
    const payload: ExportPayload = {
      format: 'bookmark-manager-pro',
      version: 1,
      createdAt: 1,
      categories: ['bookmarks', 'settings'],
      restoreSynchronization: 'paused',
      profiles: [original],
      backups: [history],
    };
    const plan = await writer.prepare(
      { kind: 'native', payload, selected: ['0'], originProfileId: profileId },
      signal(),
    );
    expect(plan.snapshotMode).toBe('not-needed');
    expect(plan.activityHistoryExcluded).toBe(true);
    expect(await db.profiles.count()).toBe(1);
    const result = await plan.commit(signal());
    const importedId = result.profileIds[0]!;
    expect(importedId).not.toBe(profileId);
    expect(await db.profiles.get(importedId)).toMatchObject({
      username: original.profile.username,
      createdAt: 1,
    });
    expect(
      (await db.folders.where('profileId').equals(importedId).toArray())[0],
    ).toMatchObject({
      isRoot: true,
      backgroundAppearance: original.folders[0]!.backgroundAppearance,
    });
    const snapshots = await db.backupSnapshots
      .where('profileId')
      .equals(importedId)
      .toArray();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.payload.profile.id).toBe(importedId);
    expect(snapshots[0]!.payload.activity).toEqual([]);
    expect(await db.activity.toArray()).toEqual([local]);
    expect(original.activity).toHaveLength(1);
    expect(history.payload.activity).toHaveLength(1);
    expect((await db.metadata.get('activeProfileId'))!.value).toBe(profileId);
    await new DexieProfileManagementRepository(db).delete(importedId);
    expect(await db.profiles.get(importedId)).toBeUndefined();
    expect(
      await db.backupSnapshots.where('profileId').equals(importedId).count(),
    ).toBe(1);
  });
  it('rejects native missing/multiple roots', async () => {
    const original = await new DexieBackupRepository(legacy, db).captureProfile(
      profileId,
    );
    const payload: ExportPayload = {
      format: 'bookmark-manager-pro',
      version: 1,
      createdAt: 1,
      categories: ['bookmarks'],
      restoreSynchronization: 'paused',
      profiles: [original],
      backups: [],
    };
    original.folders[0]!.isRoot = false;
    expect(() => validateExport(payload)).toThrow('export-invalid-folder-root');
    original.folders[0]!.isRoot = true;
    original.folders.push({ ...original.folders[0]!, id: crypto.randomUUID() });
    expect(() => validateExport(payload)).toThrow('export-invalid-folder-root');
  });
  it('rolls back new native profiles when included history cannot be stored', async () => {
    const repo = new DexieBackupRepository(legacy, db);
    const original = await repo.captureProfile(profileId);
    const history = await new ManageBackups(repo).create({
      profileId,
      type: 'manual',
      trigger: 'manual',
    });
    const payload: ExportPayload = {
      format: 'bookmark-manager-pro',
      version: 1,
      createdAt: 1,
      categories: ['bookmarks'],
      restoreSynchronization: 'paused',
      profiles: [original],
      backups: [history],
    };
    const plan = await writer.prepare(
      { kind: 'native', payload, selected: ['0'], originProfileId: profileId },
      signal(),
    );
    db.backupSnapshots.hook('creating', () => {
      throw new Error('synthetic-history-quota');
    });
    await expect(plan.commit(signal())).rejects.toThrow(
      'synthetic-history-quota',
    );
    expect(await db.profiles.count()).toBe(1);
    expect(await db.folders.count()).toBe(1);
    expect(await db.backupSnapshots.count()).toBe(1);
  });
  it('honors disabled backups and leaves older snapshots untouched on cancellation', async () => {
    await db.profileSettings.update(profileId, {
      backupPreferences: {
        automaticEnabled: false,
        beforeImport: true,
        beforeDatabaseUpgrade: true,
        beforeProfileReset: true,
        beforeSynchronization: true,
        retentionPerTrigger: 5,
      },
    });
    const controller = new AbortController();
    const plan = await writer.prepare(portable(), controller.signal);
    controller.abort();
    await expect(plan.commit(controller.signal)).rejects.toThrow();
    await (await writer.prepare(portable(), signal())).commit(signal());
    expect(await db.backupSnapshots.count()).toBe(0);
  });
});

describe('legacy snapshot migration', () => {
  it('handles concurrent migration without duplicating records', async () => {
    const snapshot = await new ManageBackups(
      new DexieBackupRepository(legacy, db),
    ).create({ profileId, type: 'manual', trigger: 'manual' });
    await db.metadata.clear();
    await db.backupSnapshots.clear();
    await legacy.snapshots.add(snapshot);
    await Promise.all([
      migrateBackupSnapshots(db, legacy),
      migrateBackupSnapshots(db, legacy),
    ]);
    expect(await db.backupSnapshots.count()).toBe(1);
  });
  it('copies verified history once and preserves the legacy recovery copy', async () => {
    const repository = new DexieBackupRepository(legacy, db);
    const snapshot = await new ManageBackups(repository).create({
      profileId,
      type: 'manual',
      trigger: 'manual',
    });
    await db.metadata.clear();
    await db.backupSnapshots.clear();
    await legacy.snapshots.add(snapshot);
    await migrateBackupSnapshots(db, legacy);
    expect(await db.backupSnapshots.get(snapshot.id)).toEqual(snapshot);
    expect(await legacy.snapshots.get(snapshot.id)).toEqual(snapshot);
    await db.backupSnapshots.delete(snapshot.id);
    await migrateBackupSnapshots(db, legacy);
    expect(await db.backupSnapshots.count()).toBe(0);
  });
  it('fails closed on corrupt history and can retry after correction', async () => {
    const snapshot = await new ManageBackups(
      new DexieBackupRepository(legacy, db),
    ).create({ profileId, type: 'manual', trigger: 'manual' });
    await db.metadata.clear();
    await db.backupSnapshots.clear();
    await legacy.snapshots.add({ ...snapshot, digest: '0'.repeat(64) });
    await expect(migrateBackupSnapshots(db, legacy)).rejects.toThrow(
      'backup-migration-integrity-failed',
    );
    expect(await db.backupSnapshots.count()).toBe(0);
    expect(await legacy.snapshots.count()).toBe(1);
    await legacy.snapshots.put(snapshot);
    await migrateBackupSnapshots(db, legacy);
    expect(await db.backupSnapshots.count()).toBe(1);
  });
});
