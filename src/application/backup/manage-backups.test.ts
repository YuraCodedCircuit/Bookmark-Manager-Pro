import { describe, expect, it, vi } from 'vitest';

import type { BackupPayload, BackupSnapshot } from '../../domain/backup';
import type {
  BackupRepository,
  CreateSnapshotInput,
} from './backup-repository';
import { ManageBackups } from './manage-backups';

const profileId = '11111111-1111-4111-8111-111111111111';
const rootId = '22222222-2222-4222-8222-222222222222';

function payload(): BackupPayload {
  return {
    formatVersion: 1,
    databaseSchemaVersion: 28,
    applicationVersion: '0.3.0',
    profile: {
      id: profileId,
      username: 'Research',
      createdAt: 1,
      updatedAt: 1,
    },
    settings: {
      profileId,
      theme: 'dark',
      bookmarkView: 'card',
      cardSize: 'medium',
      backupPreferences: {
        automaticEnabled: true,
        beforeDatabaseUpgrade: true,
        beforeImport: true,
        beforeProfileReset: true,
        beforeSynchronization: true,
        retentionPerTrigger: 3,
      },
    },
    activityLogSettings: null,
    bookmarks: [],
    folders: [
      {
        id: rootId,
        profileId,
        parentId: null,
        title: 'Home',
        tags: [],
        note: '',
        cardAppearance: { kind: 'color', value: '#2f80c9' },
        backgroundAppearance: { kind: 'none' },
        bookmarkView: 'card',
        detailsTableTransparency: 0,
        includeNavigationBackground: false,
        navigationTransparency: 45,
        index: 0,
        isRoot: true,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    favorites: [],
    activity: [],
    synchronization: null,
  };
}

class MemoryBackupRepository implements BackupRepository {
  snapshots: BackupSnapshot[] = [];
  replaceProfile = vi.fn(async () => undefined);
  restoreAsNew = vi.fn(async () => '33333333-3333-4333-8333-333333333333');

  async captureProfile() {
    return payload();
  }
  async delete(id: string) {
    this.snapshots = this.snapshots.filter((item) => item.id !== id);
  }
  async get(id: string) {
    return this.snapshots.find((item) => item.id === id);
  }
  async list() {
    return this.snapshots;
  }
  async put(snapshot: BackupSnapshot) {
    this.snapshots.push(structuredClone(snapshot));
  }
}

describe('ManageBackups', () => {
  it('creates and reads back a verified immutable snapshot', async () => {
    const repository = new MemoryBackupRepository();
    const service = new ManageBackups(
      repository,
      () => '44444444-4444-4444-8444-444444444444',
      () => 123,
    );
    const snapshot = await service.create({
      name: '  Before import  ',
      profileId,
      trigger: 'manual',
      type: 'manual',
    });

    expect(snapshot).toMatchObject({
      name: 'Before import',
      profileId,
      verifiedAt: 123,
      type: 'manual',
    });
    expect(snapshot.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshot.sizeBytes).toBeGreaterThan(0);
  });

  it('removes only excess automatic snapshots for the same trigger', async () => {
    const repository = new MemoryBackupRepository();
    let id = 0;
    const service = new ManageBackups(
      repository,
      () => `00000000-0000-4000-8000-${(++id).toString().padStart(12, '0')}`,
      () => id,
    );
    const input: CreateSnapshotInput = {
      profileId,
      trigger: 'synchronization',
      type: 'automatic',
    };
    await service.create(input);
    await service.create(input);
    await service.create(input);
    await service.create(input);

    expect(repository.snapshots).toHaveLength(3);
    expect(repository.snapshots.map((item) => item.createdAt)).toEqual([
      1, 2, 3,
    ]);
  });

  it('rejects a corrupted payload before replacement', async () => {
    const repository = new MemoryBackupRepository();
    const service = new ManageBackups(
      repository,
      () => '55555555-5555-4555-8555-555555555555',
      () => 1,
    );
    const snapshot = await service.create({
      profileId,
      trigger: 'manual',
      type: 'manual',
    });
    repository.snapshots[0] = {
      ...snapshot,
      payload: {
        ...snapshot.payload,
        profile: { ...snapshot.payload.profile, username: 'Changed' },
      },
    };

    await expect(service.restore(snapshot.id, 'replace')).rejects.toThrow(
      'backup-integrity-failed',
    );
    expect(repository.replaceProfile).not.toHaveBeenCalled();
  });

  it('creates a verified safety snapshot before replacing a profile', async () => {
    const repository = new MemoryBackupRepository();
    let id = 0;
    const service = new ManageBackups(
      repository,
      () => `66666666-6666-4666-8666-${(++id).toString().padStart(12, '0')}`,
      () => id,
    );
    const snapshot = await service.create({
      profileId,
      trigger: 'manual',
      type: 'manual',
    });

    await expect(service.restore(snapshot.id, 'replace')).resolves.toBe(
      profileId,
    );
    expect(repository.snapshots.some((item) => item.type === 'safety')).toBe(
      true,
    );
    expect(repository.replaceProfile).toHaveBeenCalledOnce();
  });
});
