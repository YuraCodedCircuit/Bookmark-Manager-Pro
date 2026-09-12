import { z } from 'zod';

import type { BackupPayload, BackupSnapshot } from '../domain/backup';
import { backupPayloadSchema, backupSnapshotSchema } from '../domain/backup';
import type { BackupRepository } from '../application/backup/backup-repository';
import { syncConnectionSchema } from '../domain/synchronization';
import { BookmarkManagerDatabase } from './database';
import { BackupDatabase } from './backup-database';
import packageMetadata from '../../package.json';

export class DexieBackupRepository implements BackupRepository {
  constructor(
    private readonly backups = new BackupDatabase(),
    private readonly primary = new BookmarkManagerDatabase(),
  ) {}

  async captureProfile(profileId: string): Promise<BackupPayload> {
    return this.primary.transaction(
      'r',
      [
        this.primary.profiles,
        this.primary.profileSettings,
        this.primary.activityLogSettings,
        this.primary.bookmarks,
        this.primary.folders,
        this.primary.favoriteItems,
        this.primary.activity,
        this.primary.metadata,
      ],
      async () => {
        const [
          profile,
          settings,
          activityLogSettings,
          bookmarks,
          folders,
          favorites,
          activity,
          syncRecord,
        ] = await Promise.all([
          this.primary.profiles.get(profileId),
          this.primary.profileSettings.get(profileId),
          this.primary.activityLogSettings.get(profileId),
          this.primary.bookmarks.where('profileId').equals(profileId).toArray(),
          this.primary.folders.where('profileId').equals(profileId).toArray(),
          this.primary.favoriteItems
            .where('profileId')
            .equals(profileId)
            .toArray(),
          this.primary.activity.where('profileId').equals(profileId).toArray(),
          this.primary.metadata.get(`sync:v1:${profileId}`),
        ]);
        if (!profile || !settings) throw new Error('backup-profile-not-found');
        return backupPayloadSchema.parse({
          formatVersion: 1,
          databaseSchemaVersion: this.primary.verno,
          applicationVersion: packageMetadata.version,
          profile,
          settings,
          activityLogSettings: activityLogSettings ?? null,
          bookmarks,
          folders,
          favorites,
          activity,
          synchronization: syncRecord
            ? syncConnectionSchema.parse(syncRecord.value)
            : null,
        });
      },
    );
  }

  async list(): Promise<readonly BackupSnapshot[]> {
    return (
      await this.backups.snapshots.orderBy('createdAt').reverse().toArray()
    ).map((snapshot) => backupSnapshotSchema.parse(snapshot));
  }

  async get(snapshotId: string): Promise<BackupSnapshot | undefined> {
    const snapshot = await this.backups.snapshots.get(
      z.uuid().parse(snapshotId),
    );
    return snapshot ? backupSnapshotSchema.parse(snapshot) : undefined;
  }

  async put(snapshot: BackupSnapshot): Promise<void> {
    await this.backups.snapshots.add(backupSnapshotSchema.parse(snapshot));
  }

  async delete(snapshotId: string): Promise<void> {
    await this.backups.snapshots.delete(z.uuid().parse(snapshotId));
  }

  async replaceProfile(profileId: string, input: BackupPayload): Promise<void> {
    const payload = backupPayloadSchema.parse(input);
    if (payload.profile.id !== profileId)
      throw new Error('backup-profile-id-mismatch');
    await this.primary.transaction(
      'rw',
      [
        this.primary.profiles,
        this.primary.profileSettings,
        this.primary.activityLogSettings,
        this.primary.bookmarks,
        this.primary.folders,
        this.primary.favoriteItems,
        this.primary.activity,
        this.primary.metadata,
      ],
      async () => {
        if (!(await this.primary.profiles.get(profileId)))
          throw new Error('backup-profile-not-found');
        await Promise.all([
          this.primary.bookmarks.where('profileId').equals(profileId).delete(),
          this.primary.folders.where('profileId').equals(profileId).delete(),
          this.primary.favoriteItems
            .where('profileId')
            .equals(profileId)
            .delete(),
          this.primary.activity.where('profileId').equals(profileId).delete(),
        ]);
        await this.primary.profiles.put(payload.profile);
        await this.primary.profileSettings.put(payload.settings);
        if (payload.activityLogSettings)
          await this.primary.activityLogSettings.put(
            payload.activityLogSettings,
          );
        else await this.primary.activityLogSettings.delete(profileId);
        await this.primary.bookmarks.bulkPut(payload.bookmarks);
        await this.primary.folders.bulkPut(payload.folders);
        await this.primary.favoriteItems.bulkPut(payload.favorites);
        await this.primary.activity.bulkPut(payload.activity);
        if (payload.synchronization)
          await this.primary.metadata.put({
            key: `sync:v1:${profileId}`,
            value: {
              ...payload.synchronization,
              status: 'paused',
              operations: [],
            },
          });
        else await this.primary.metadata.delete(`sync:v1:${profileId}`);
      },
    );
  }

  async restoreAsNew(input: BackupPayload): Promise<string> {
    const payload = backupPayloadSchema.parse(input);
    const profileId = crypto.randomUUID();
    const ids = new Map<string, string>([
      [payload.profile.id, profileId],
      ...[...payload.folders, ...payload.bookmarks].map(
        (item) => [item.id, crypto.randomUUID()] as const,
      ),
    ]);
    const remap = (id: string) => ids.get(id) ?? id;
    const now = Date.now();
    const username = await this.uniqueRestoredName(
      `${payload.profile.username} (Restored)`,
    );
    await this.primary.transaction(
      'rw',
      [
        this.primary.profiles,
        this.primary.profileSettings,
        this.primary.activityLogSettings,
        this.primary.bookmarks,
        this.primary.folders,
        this.primary.favoriteItems,
        this.primary.activity,
        this.primary.metadata,
      ],
      async () => {
        await this.primary.profiles.add({
          ...payload.profile,
          id: profileId,
          username,
          createdAt: now,
          updatedAt: now,
        });
        await this.primary.profileSettings.add({
          ...payload.settings,
          profileId,
          lastOpenedFolderId: payload.settings.lastOpenedFolderId
            ? remap(payload.settings.lastOpenedFolderId)
            : undefined,
        });
        if (payload.activityLogSettings)
          await this.primary.activityLogSettings.add({
            ...payload.activityLogSettings,
            profileId,
          });
        await this.primary.folders.bulkAdd(
          payload.folders.map((item) => ({
            ...item,
            id: remap(item.id),
            profileId,
            parentId: item.parentId ? remap(item.parentId) : null,
          })),
        );
        await this.primary.bookmarks.bulkAdd(
          payload.bookmarks.map((item) => ({
            ...item,
            id: remap(item.id),
            profileId,
            parentId: remap(item.parentId),
          })),
        );
        await this.primary.favoriteItems.bulkAdd(
          payload.favorites.map((item) => ({
            ...item,
            profileId,
            itemId: remap(item.itemId),
          })),
        );
        await this.primary.activity.bulkAdd(
          payload.activity.map((item) => ({
            ...item,
            id: crypto.randomUUID(),
            operationId: `op-${crypto.randomUUID()}`,
            profileId,
          })),
        );
        if (payload.synchronization)
          await this.primary.metadata.put({
            key: `sync:v1:${profileId}`,
            value: {
              ...payload.synchronization,
              profileId,
              extensionRoot: remap(payload.synchronization.extensionRoot),
              status: 'paused',
              links: [],
              plannedLinks: [],
              operations: [],
            },
          });
      },
    );
    return profileId;
  }

  private async uniqueRestoredName(input: string): Promise<string> {
    const names = new Set(
      (await this.primary.profiles.toArray()).map((p) => p.username),
    );
    const base = input.slice(0, 80);
    if (!names.has(base)) return base;
    for (let index = 2; index < 1_000; index += 1) {
      const suffix = ` #${index}`;
      const candidate = `${base.slice(0, 80 - suffix.length)}${suffix}`;
      if (!names.has(candidate)) return candidate;
    }
    throw new Error('backup-profile-name-unavailable');
  }
}
