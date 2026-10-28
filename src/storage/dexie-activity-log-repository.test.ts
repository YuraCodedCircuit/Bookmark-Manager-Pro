import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';

import {
  defaultActivityLogSettings,
  ManageActivityLog,
} from '../application/activity-log/manage-activity-log';
import type { ActivityLogEntry } from '../domain/activity-log';
import { activityLogEntrySchema } from '../domain/activity-log';
import Dexie from 'dexie';
import { BookmarkManagerDatabase } from './database';
import { DexieActivityLogRepository } from './dexie-activity-log-repository';

const databases: BookmarkManagerDatabase[] = [];
const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';

afterEach(async () =>
  Promise.all(databases.splice(0).map((database) => database.delete())),
);

describe('DexieActivityLogRepository', () => {
  it('preserves a concurrently disabled gate when shared options are reset', async () => {
    const { repository } = await shared();
    await repository.putSettings({
      ...defaultActivityLogSettings(profileId),
      enabled: false,
    });
    await repository.putSettings(defaultActivityLogSettings(profileId), true);
    expect(await repository.getSettings(profileId)).toMatchObject({
      enabled: false,
      eventOrder: 'oldest',
    });
  });
  it('recovers a preflight interrupted by disabled recording without replay or invented success', async () => {
    const { db, repository } = await shared();
    await repository.begin(identity);
    await repository.append(row(), identity);
    await repository.putSettings({
      ...defaultActivityLogSettings(profileId),
      enabled: false,
    });
    await repository.finish(identity, true);
    await repository.putSettings(defaultActivityLogSettings(profileId));
    await repository.append(row(), { ...identity, preflightComplete: true });
    expect(await db.activity.count()).toBe(1);
    expect(await db.activityPending.count()).toBe(0);
    expect(await db.activitySessions.get(identity.id)).toMatchObject({
      startup: 'not-recorded',
      recordingResumed: true,
    });
  });
  it('rolls a malformed conversion back without deleting the last local source', async () => {
    const name = `activity-corrupt-conversion-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    old.version(38).stores({
      activity: '&id, profileId, [profileId+timestamp]',
      activityLogSettings: '&profileId',
      metadata: '&key',
      profiles: '&id',
    });
    const malformed = { ...row(), eventCode: 'invalid' };
    await old.table('activity').add(malformed);
    old.close();
    const upgraded = new BookmarkManagerDatabase(name);
    databases.push(upgraded);
    await expect(upgraded.open()).rejects.toThrow();
    upgraded.close();
    const source = new Dexie(name);
    await source.open();
    expect(source.verno).toBe(38);
    expect(await source.table('activity').get(malformed.id)).toEqual(malformed);
    source.close();
  });
  const identity = {
    id: 'session-a',
    startedAt: 10,
    origin: 'detected' as const,
  };
  const otherId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const row = (owner: string | null = profileId): ActivityLogEntry =>
    activityLogEntrySchema.parse({
      id: crypto.randomUUID(),
      profileId: owner,
      action: 'Update',
      applicationVersion: '0.7.0',
      browserTarget: 'Test',
      category: 'Application',
      dataChanged: false,
      durationMs: 0,
      eventCode: 'APP-UPDATE-COMPLETE',
      itemType: 'Application',
      itemsAffected: 0,
      kind: 'ACTIVITY',
      level: 'INFO',
      message: 'Synthetic activity.',
      operationId: 'op-test-log',
      outcome: 'Succeeded',
      schemaVersion: 5,
      source: 'Test',
      timestamp: 10,
    });
  async function shared() {
    const db = new BookmarkManagerDatabase(
      `activity-shared-${crypto.randomUUID()}`,
    );
    databases.push(db);
    await db.profiles.bulkAdd([
      { id: profileId, username: 'Synthetic A', createdAt: 1, updatedAt: 1 },
      { id: otherId, username: 'Synthetic B', createdAt: 1, updatedAt: 1 },
    ]);
    await db.metadata.put({ key: 'activeProfileId', value: profileId });
    return { db, repository: new DexieActivityLogRepository(db) };
  }
  it('coalesces concurrent incidents across repository instances and preserves escalation and recovery', async () => {
    const { db, repository } = await shared();
    const peer = new DexieActivityLogRepository(db);
    const incident = {
      ...row(),
      level: 'WARN' as const,
      eventCode: 'TEST-STORAGE-FAILED',
      kind: 'DIAGNOSTIC' as const,
    };
    await Promise.all([
      repository.append(incident, identity, 'storage'),
      peer.append(
        { ...incident, id: crypto.randomUUID() },
        identity,
        'storage',
      ),
    ]);
    expect(await db.activity.count()).toBe(1);
    const before = await db.metadata.get('activity:incidents:v1');
    await new DexieActivityLogRepository(db).append(
      { ...incident, id: crypto.randomUUID() },
      identity,
      'storage',
    );
    expect(await db.metadata.get('activity:incidents:v1')).toEqual(before);
    await peer.append(
      { ...incident, id: crypto.randomUUID(), level: 'ERROR' },
      identity,
      'storage',
    );
    await peer.append(
      { ...incident, id: crypto.randomUUID() },
      identity,
      'storage',
    );
    expect(await db.activity.count()).toBe(2);
    expect(await peer.resolveIncidents(profileId, [incident.eventCode])).toBe(
      true,
    );
    expect(await peer.resolveIncidents(profileId, [incident.eventCode])).toBe(
      false,
    );
    await repository.append(
      { ...incident, id: crypto.randomUUID() },
      identity,
      'storage',
    );
    expect(await db.activity.count()).toBe(3);
  });
  it('keeps distinct incident owners, sessions, and safe reasons separate', async () => {
    const { db, repository } = await shared();
    const incident = {
      ...row(),
      level: 'ERROR' as const,
      eventCode: 'TEST-FAILED',
    };
    await repository.append(incident, identity, 'storage');
    await repository.append(
      { ...incident, id: crypto.randomUUID() },
      identity,
      'worker',
    );
    await repository.append(
      { ...incident, id: crypto.randomUUID(), profileId: otherId },
      identity,
      'storage',
    );
    await repository.append(
      { ...incident, id: crypto.randomUUID() },
      { ...identity, id: 'session-b' },
      'storage',
    );
    expect(await db.activity.count()).toBe(4);
    await repository.putSettings({
      ...defaultActivityLogSettings(profileId),
      enabled: false,
    });
    expect(await db.metadata.get('activity:incidents:v1')).toBeUndefined();
    await repository.append(
      { ...incident, id: crypto.randomUUID() },
      identity,
      'storage',
    );
    expect(await db.activity.count()).toBe(4);
  });
  it('preserves future incident metadata and does not let it hide failures', async () => {
    const { db, repository } = await shared();
    const future = { version: 2, entries: [] };
    await db.metadata.put({ key: 'activity:incidents:v1', value: future });
    await repository.append({ ...row(), level: 'ERROR' }, identity, 'storage');
    expect(await db.activity.count()).toBe(1);
    expect((await db.metadata.get('activity:incidents:v1'))?.value).toEqual(
      future,
    );
  });
  it('persists preflight rows and eligible events while leaving routine navigation quiet through the capture service', async () => {
    const { db, repository } = await shared();
    const service = new ManageActivityLog(
      repository,
      {
        applicationVersion: '0.7.0',
        browserTarget: 'Test',
      },
      undefined,
      () => 12,
      async () => identity,
    );
    const input = row();
    await service.beginSession();
    await service.record(profileId, {
      ...input,
      eventCode: 'BACKGROUND-PREFLIGHT-STARTED',
      kind: 'DIAGNOSTIC',
    });
    await service.record(profileId, {
      ...input,
      eventCode: 'BACKGROUND-PREFLIGHT-COMPLETE',
      kind: 'DIAGNOSTIC',
    });
    await service.finishSession(true);
    await service.record(profileId, {
      ...input,
      eventCode: 'FOLDER-OPEN-COMPLETE',
    });
    expect(await db.activity.count()).toBe(2);
    expect(await db.activitySessions.get(identity.id)).toMatchObject({
      startup: 'succeeded',
    });
    for (const eventCode of [
      'IMPORT-SAVE-SUCCEEDED',
      'BACKUP-SNAPSHOT-RESTORED',
      'SYNC-COMPLETED',
    ])
      await service.record(profileId, {
        ...input,
        eventCode,
        dataChanged: true,
      });
    await service.record(profileId, {
      ...input,
      eventCode: 'SYNTHETIC-READ-FAILED',
      level: 'ERROR',
      outcome: 'Failed',
    });
    await service.record(profileId, {
      ...input,
      eventCode: 'SYNTHETIC-REFRESH-DEGRADED',
      level: 'WARN',
      outcome: 'Skipped',
    });
    const records = await new DexieActivityLogRepository(db).list(profileId);
    expect(records.map(({ eventCode, level }) => [eventCode, level])).toEqual([
      ['BACKGROUND-PREFLIGHT-STARTED', 'INFO'],
      ['BACKGROUND-PREFLIGHT-COMPLETE', 'INFO'],
      ['IMPORT-SAVE-SUCCEEDED', 'INFO'],
      ['BACKUP-SNAPSHOT-RESTORED', 'INFO'],
      ['SYNC-COMPLETED', 'INFO'],
      ['SYNTHETIC-READ-FAILED', 'ERROR'],
      ['SYNTHETIC-REFRESH-DEGRADED', 'WARN'],
    ]);
  });
  it('bounds incident fingerprints and clears them with session history', async () => {
    const { db, repository } = await shared();
    for (let index = 0; index < 130; index++)
      await repository.append(
        { ...row(), eventCode: `SYNTHETIC-${index}-FAILED`, level: 'ERROR' },
        identity,
        'system',
      );
    const state = (await db.metadata.get('activity:incidents:v1'))?.value as {
      entries: unknown[];
    };
    expect(state.entries).toHaveLength(128);
    expect(await db.activity.count()).toBe(130);
    await repository.clear(profileId, identity.id);
    expect(await db.activity.count()).toBe(0);
    const remaining = (await db.metadata.get('activity:incidents:v1'))
      ?.value as { entries: unknown[] };
    expect(remaining.entries).toHaveLength(0);
  });
  it('rolls incident and sequence state back with a rejected row', async () => {
    const { db, repository } = await shared();
    await expect(
      repository.append(
        { ...row(), level: 'ERROR', eventCode: 'invalid' },
        identity,
      ),
    ).rejects.toThrow();
    expect(await db.activity.count()).toBe(0);
    expect(await db.activitySessions.count()).toBe(0);
    expect(await db.metadata.get('activity:sequence')).toBeUndefined();
    expect(await db.metadata.get('activity:incidents:v1')).toBeUndefined();
  });
  it('shows identical history across profiles and gates cross-profile writes by the active profile', async () => {
    const { db, repository } = await shared();
    await repository.putSettings({
      ...defaultActivityLogSettings(otherId),
      enabled: false,
    });
    await repository.append(row(otherId), identity);
    expect(await repository.list(profileId)).toEqual(
      await repository.list(otherId),
    );
    expect((await repository.list(profileId))[0]!.profileId).toBe(otherId);
    await db.metadata.put({ key: 'activeProfileId', value: otherId });
    await repository.append(row(profileId), identity);
    expect(await db.activity.count()).toBe(1);
    await repository.begin({ ...identity, id: 'disabled-session' });
    expect(await db.activitySessions.get('disabled-session')).toBeUndefined();
  });
  it('shares options while preserving independent recording switches', async () => {
    const { repository } = await shared();
    await repository.putSettings({
      ...defaultActivityLogSettings(otherId),
      enabled: false,
      eventOrder: 'newest',
    });
    expect(await repository.getSettings(profileId)).toMatchObject({
      enabled: true,
      eventOrder: 'newest',
    });
    await repository.putSettings(defaultActivityLogSettings(profileId));
    expect(await repository.getSettings(otherId)).toMatchObject({
      enabled: false,
      eventOrder: 'oldest',
    });
  });
  it('never buffers disabled periods and preserves not-recorded startup on resume', async () => {
    const { db, repository } = await shared();
    await repository.putSettings({
      ...defaultActivityLogSettings(profileId),
      enabled: false,
    });
    await repository.begin(identity);
    await repository.append(row(), identity);
    await repository.finish(identity, true);
    expect(await db.activitySessions.count()).toBe(0);
    expect(await db.activityPending.count()).toBe(0);
    await repository.putSettings({
      ...defaultActivityLogSettings(profileId),
      minimumLevel: 'ERROR',
    });
    await repository.append(row(), identity);
    expect(await db.activity.count()).toBe(0);
    expect(await db.activitySessions.get(identity.id)).toMatchObject({
      startup: 'not-recorded',
    });
  });
  it('bounds the durable startup queue and reports honest omissions', async () => {
    const { db, repository } = await shared();
    await repository.begin(identity);
    for (let index = 0; index < 140; index++)
      await repository.append(row(), identity);
    expect(await db.activityPending.count()).toBe(128);
    expect(await db.activity.count()).toBe(0);
    expect(await db.activitySessions.get(identity.id)).toMatchObject({
      startup: 'pending',
      omittedCount: 12,
    });
    await repository.finish(identity, false);
    expect(await db.activity.count()).toBe(128);
    expect(await db.activityPending.count()).toBe(0);
    expect(await db.activitySessions.get(identity.id)).toMatchObject({
      startup: 'failed',
      omittedCount: 12,
    });
  });
  it('keeps a live pending queue until its actual outcome is committed', async () => {
    const { db, repository } = await shared();
    await repository.begin(identity);
    await repository.append(row(), { ...identity, preflightComplete: true });
    expect(await db.activityPending.count()).toBe(1);
    expect(await db.activitySessions.get(identity.id)).toMatchObject({
      startup: 'pending',
    });
    await repository.finish(identity, true);
    expect(await db.activityPending.count()).toBe(0);
    expect(await db.activity.count()).toBe(1);
    expect(await db.activitySessions.get(identity.id)).toMatchObject({
      startup: 'succeeded',
    });
  });

  it('enforces the UTF-8 byte limit while preserving the current startup outcome', async () => {
    const { db, repository } = await shared();
    await repository.putSettings({
      ...defaultActivityLogSettings(profileId),
      maximumStorageMb: 1,
    });
    await repository.begin(identity);
    await repository.finish(identity, true);
    await db.activity.bulkAdd(
      Array.from({ length: 1100 }, (_, sequence) => ({
        ...row(),
        sessionId: identity.id,
        sequence,
        message: '\u754c'.repeat(240),
      })),
    );
    await repository.append(row(), identity);
    const retained = await db.activity.toArray();
    const groups = await db.activitySessions.toArray();
    const size = retained.reduce(
      (total, entry) =>
        total + new TextEncoder().encode(JSON.stringify(entry)).byteLength,
      new TextEncoder().encode(JSON.stringify(groups)).byteLength,
    );
    expect(size).toBeLessThanOrEqual(1024 * 1024);
    expect(retained.length).toBeLessThan(1101);
    expect(groups).toEqual([
      expect.objectContaining({
        id: identity.id,
        startup: 'succeeded',
        trimmedCount: 1101 - retained.length,
      }),
    ]);
  });
  it('discards queued records if recording is disabled before startup finishes', async () => {
    const { db, repository } = await shared();
    await repository.begin(identity);
    await repository.append(row(), identity);
    await repository.putSettings({
      ...defaultActivityLogSettings(profileId),
      enabled: false,
    });
    await repository.finish(identity, true);
    expect(await db.activityPending.count()).toBe(0);
    expect(await db.activity.count()).toBe(0);
  });
  it('removes completed groups first and trims an oversized current group with a count', async () => {
    const { db, repository } = await shared();
    await repository.putSettings({
      ...defaultActivityLogSettings(profileId),
      retentionCount: 100,
    });
    for (let index = 0; index < 50; index++)
      await repository.append(row(), identity);
    const next = { ...identity, id: 'session-b', startedAt: 20 };
    for (let index = 0; index < 101; index++)
      await repository.append(row(), next);
    expect(await db.activitySessions.get(identity.id)).toBeUndefined();
    expect(await db.activity.count()).toBe(100);
    expect(await db.activitySessions.get(next.id)).toMatchObject({
      trimmedCount: 1,
    });
  });
  it('pauses at capacity without cleanup and resumes without replay after clearing', async () => {
    const { db, repository } = await shared();
    await repository.putSettings({
      ...defaultActivityLogSettings(profileId),
      retentionCount: 100,
      autoDeleteOldest: false,
    });
    for (let index = 0; index < 104; index++)
      await repository.append(row(), identity);
    expect(await db.activity.count()).toBe(100);
    expect(await repository.full()).toBe(true);
    await repository.clear(profileId, identity.id);
    expect(await repository.full()).toBe(false);
    expect(await repository.getSettings(profileId)).toMatchObject({
      autoDeleteOldest: false,
      retentionCount: 100,
    });
    await repository.append(row(), identity);
    expect(await db.activity.count()).toBe(1);
    expect(await db.activitySessions.get(identity.id)).toMatchObject({
      startup: 'cleared',
      cleared: true,
    });
  });
  it('trims ordinary current-session events before startup details', async () => {
    const { db, repository } = await shared();
    await repository.putSettings({
      ...defaultActivityLogSettings(profileId),
      retentionCount: 100,
    });
    await repository.begin(identity);
    const started = { ...row(), eventCode: 'BACKGROUND-PREFLIGHT-STARTED' };
    const completed = { ...row(), eventCode: 'BACKGROUND-PREFLIGHT-COMPLETE' };
    await repository.append(started, identity);
    await repository.append(completed, identity);
    await repository.finish(identity, true);
    for (let index = 0; index < 100; index++)
      await repository.append(row(), identity);
    expect(await db.activity.count()).toBe(100);
    expect(await db.activity.get(started.id)).toBeDefined();
    expect(await db.activity.get(completed.id)).toBeDefined();
    expect(await db.activitySessions.get(identity.id)).toMatchObject({
      startup: 'succeeded',
      trimmedCount: 2,
    });
  });
  it('does not resurrect erased preflight when a pending session is cleared', async () => {
    const { db, repository } = await shared();
    await repository.begin(identity);
    await repository.append(row(), identity);
    await repository.clear(profileId);
    await repository.append(
      { ...row(), eventCode: 'BACKGROUND-PREFLIGHT-STARTED' },
      identity,
    );
    await repository.append(
      { ...row(), eventCode: 'BACKGROUND-PREFLIGHT-COMPLETE' },
      identity,
    );
    await repository.finish(identity, true);
    expect(await db.activity.count()).toBe(0);
    expect(await db.activityPending.count()).toBe(0);
    expect(await db.activitySessions.get(identity.id)).toMatchObject({
      startup: 'cleared',
    });
  });
  it('converts local v38 history atomically and initializes active-profile shared options once', async () => {
    const name = `activity-conversion-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    old.version(38).stores({
      activity: '&id, profileId, [profileId+timestamp]',
      activityLogSettings: '&profileId',
      metadata: '&key',
      profiles: '&id',
    });
    const entry = row();
    await old.table('activity').add(entry);
    await old
      .table('metadata')
      .put({ key: 'activeProfileId', value: profileId });
    await old.table('activityLogSettings').put({
      ...defaultActivityLogSettings(profileId),
      enabled: false,
      retentionCount: 300,
    });
    old.close();
    const db = new BookmarkManagerDatabase(name);
    databases.push(db);
    await db.open();
    expect(await db.activity.get(entry.id)).toMatchObject({
      id: entry.id,
      profileId,
      timestamp: 10,
      sessionId: 'earlier',
    });
    expect(await db.activitySessions.get('earlier')).toMatchObject({
      origin: 'earlier',
      startup: 'not-recorded',
    });
    const repository = new DexieActivityLogRepository(db);
    expect(await repository.getSettings(profileId)).toMatchObject({
      enabled: false,
      retentionCount: 300,
    });
    db.close();
    await db.open();
    expect(await db.activity.count()).toBe(1);
  });
  it('persists, orders, configures, and clears profile-owned records', async () => {
    const database = new BookmarkManagerDatabase(
      `activity-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = new DexieActivityLogRepository(database);
    const base: ActivityLogEntry = {
      sessionId: 'test-session',
      sequence: 0,
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
    ).toEqual([1, 2]);
    await repository.putSettings(defaultActivityLogSettings(profileId));
    await expect(repository.getSettings(profileId)).resolves.toEqual(
      defaultActivityLogSettings(profileId),
    );
    await repository.clear(profileId);
    await expect(repository.list(profileId)).resolves.toEqual([]);
  });
});
