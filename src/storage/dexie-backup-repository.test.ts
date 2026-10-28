import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookmarkManagerDatabase } from './database';
import { BackupDatabase } from './backup-database';
import { DexieBackupRepository } from './dexie-backup-repository';
import { activityLogEntrySchema } from '../domain/activity-log';
import { profileSettingsSchema } from '../domain/profile-settings';

let database: BookmarkManagerDatabase;
let legacy: BackupDatabase;
let repository: DexieBackupRepository;
let profileId: string;

function entry() {
  return activityLogEntrySchema.parse({
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
}

beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  database = new BookmarkManagerDatabase(
    `backup-history-${crypto.randomUUID()}`,
  );
  legacy = new BackupDatabase(`backup-legacy-${crypto.randomUUID()}`);
  repository = new DexieBackupRepository(legacy, database);
  profileId = crypto.randomUUID();
  await database.profiles.add({
    id: profileId,
    username: 'Synthetic',
    createdAt: 1,
    updatedAt: 1,
  });
  await database.profileSettings.add(
    profileSettingsSchema.parse({ profileId, theme: 'dark' }),
  );
});

afterEach(async () => {
  database.close();
  legacy.close();
  await database.delete();
  await legacy.delete();
  vi.unstubAllGlobals();
});

describe('local-only activity in recovery', () => {
  it('captures no activity and preserves the local source', async () => {
    const local = entry();
    await database.activity.add(local);
    expect((await repository.captureProfile(profileId)).activity).toEqual([]);
    expect(await database.activity.toArray()).toEqual([local]);
  });

  it.each(['replace', 'new'] as const)(
    'ignores older snapshot history during %s restore',
    async (mode) => {
      const local = entry();
      await database.activity.add(local);
      const payload = await repository.captureProfile(profileId);
      payload.activity = [{ ...entry(), profileId }];
      payload.profile.username = 'Restored synthetic';
      if (mode === 'replace')
        await repository.replaceProfile(profileId, payload);
      else await repository.restoreAsNew(payload);
      expect(await database.activity.toArray()).toEqual([local]);
      expect(
        (await database.profiles.toArray()).some((profile) =>
          profile.username.startsWith('Restored synthetic'),
        ),
      ).toBe(true);
      expect(payload.activity).toHaveLength(1);
    },
  );
});
