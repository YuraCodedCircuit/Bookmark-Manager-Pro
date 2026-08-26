import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';

import { defaultActivityLogSettings } from '../application/activity-log/manage-activity-log';
import type { ActivityLogEntry } from '../domain/activity-log';
import { BookmarkManagerDatabase } from './database';
import { DexieActivityLogRepository } from './dexie-activity-log-repository';

const databases: BookmarkManagerDatabase[] = [];
const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';

afterEach(async () =>
  Promise.all(databases.splice(0).map((database) => database.delete())),
);

describe('DexieActivityLogRepository', () => {
  it('persists, orders, configures, and clears profile-owned records', async () => {
    const database = new BookmarkManagerDatabase(
      `activity-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = new DexieActivityLogRepository(database);
    const base: ActivityLogEntry = {
      action: 'Update',
      applicationVersion: '0.0.2',
      browserTarget: 'Edge v.140.0.0',
      category: 'Application',
      dataChanged: false,
      durationMs: 1,
      eventCode: 'PROFILE-SETTINGS-UPDATE-COMPLETE',
      id: '11111111-1111-4111-8111-111111111111',
      itemType: 'Profile settings',
      itemsAffected: 0,
      kind: 'ACTIVITY',
      level: 'INFO',
      message: 'Profile settings were updated.',
      operationId: 'op-local-1111',
      outcome: 'Succeeded',
      profileId,
      schemaVersion: 2,
      source: 'Settings window',
      timestamp: 1,
    };
    await repository.add(base);
    await repository.add({
      ...base,
      id: '22222222-2222-4222-8222-222222222222',
      timestamp: 2,
    });
    expect(
      (await repository.list(profileId)).map(({ timestamp }) => timestamp),
    ).toEqual([2, 1]);
    await repository.putSettings(defaultActivityLogSettings(profileId));
    await expect(repository.getSettings(profileId)).resolves.toEqual(
      defaultActivityLogSettings(profileId),
    );
    await repository.clear(profileId);
    await expect(repository.list(profileId)).resolves.toEqual([]);
  });
});
