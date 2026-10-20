import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { BookmarkManagerDatabase } from './database';
import { BackupDatabase } from './backup-database';
import { DexieBackupRepository } from './dexie-backup-repository';
import { ExportProfiles } from '../application/export/export-profiles';
import { decodeNativeExport, exportCategories } from '../domain/profile-export';
import { profileSettingsSchema } from '../domain/profile-settings';
import { folderSchema } from '../domain/folder';
import { bookmarkSchema } from '../domain/bookmark';
import { digestBackupPayload, encodeBackupPayload } from '../domain/backup';

it('captures stored wallpapers, screenshots, favicons, and profile images without changing live records', async () => {
  vi.stubGlobal('crypto', webcrypto);
  const primary = new BookmarkManagerDatabase(
    `export-test-${crypto.randomUUID()}`,
  );
  const backups = new BackupDatabase(
    `export-backups-test-${crypto.randomUUID()}`,
  );
  try {
    const id = crypto.randomUUID();
    const root = crypto.randomUUID();
    const wallpaper = crypto.randomUUID();
    const dataUrl = 'data:image/png;base64,YQ==';
    await primary.profiles.add({
      id,
      username: 'Synthetic export',
      icon: dataUrl,
      createdAt: 1,
      updatedAt: 1,
    });
    await primary.profileSettings.add(
      profileSettingsSchema.parse({
        profileId: id,
        theme: 'dark',
        bookmarkView: 'card',
        cardSize: 'small',
      }),
    );
    await primary.folderWallpapers.add({
      id: wallpaper,
      profileId: id,
      dataUrl,
      createdAt: 1,
    });
    await primary.folders.add(
      folderSchema.parse({
        id: root,
        profileId: id,
        parentId: null,
        title: 'Home',
        isRoot: true,
        index: 0,
        tags: [],
        note: '',
        cardAppearance: { kind: 'color', value: '#123456' },
        backgroundAppearance: {
          kind: 'image',
          imageId: wallpaper,
          fit: 'fill',
        },
        bookmarkView: 'card',
        detailsTableTransparency: 0,
        includeNavigationBackground: false,
        navigationTransparency: 0,
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    await primary.bookmarks.add(
      bookmarkSchema.parse({
        id: crypto.randomUUID(),
        profileId: id,
        parentId: root,
        title: 'Synthetic bookmark',
        url: 'https://example.com/',
        tags: [],
        note: '',
        favicon: dataUrl,
        cardAppearance: { kind: 'image', value: dataUrl, fit: 'fill' },
        index: 0,
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    const repository = new DexieBackupRepository(backups, primary);
    const before = await repository.captureProfile(id);
    const snapshot = {
      id: crypto.randomUUID(),
      profileId: id,
      profileName: before.profile.username,
      name: 'Synthetic snapshot',
      type: 'manual' as const,
      trigger: 'manual' as const,
      createdAt: 1,
      verifiedAt: 1,
      sizeBytes: encodeBackupPayload(before).byteLength,
      digest: await digestBackupPayload(before),
      payload: before,
    };
    await repository.put(snapshot);
    // Unrelated corrupt history must neither be loaded nor block selected-profile export.
    await primary.table('backupSnapshots').add({
      id: crypto.randomUUID(),
      profileId: crypto.randomUUID(),
      createdAt: 2,
      payload: 'invalid',
    });
    const file = await new ExportProfiles(repository).create(
      {
        profileIds: [id],
        format: 'bmpro',
        categories: [...exportCategories],
        includeBackups: true,
      },
      new AbortController().signal,
      () => undefined,
    );
    expect((await decodeNativeExport(file.content)).profiles).toEqual([before]);
    expect((await decodeNativeExport(file.content)).backups).toEqual([
      snapshot,
    ]);
    expect(await repository.captureProfile(id)).toEqual(before);
    expect(await backups.snapshots.count()).toBe(0);
  } finally {
    primary.close();
    backups.close();
    await primary.delete();
    await backups.delete();
    vi.unstubAllGlobals();
  }
});
