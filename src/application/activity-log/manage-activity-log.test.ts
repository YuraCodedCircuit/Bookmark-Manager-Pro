import { describe, expect, it, vi } from 'vitest';
import {
  defaultActivityLogSettings,
  ManageActivityLog,
} from './manage-activity-log';
import type { ActivityLogRepository } from './activity-log-repository';
import type {
  ActivityLogEntry,
  ActivityLogSettings,
} from '../../domain/activity-log';

const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
const input = {
  action: 'Update',
  category: 'Application' as const,
  dataChanged: false,
  durationMs: 4,
  eventCode: 'IMPORT-SAVE-SUCCEEDED',
  itemType: 'Profile settings',
  itemsAffected: 0,
  kind: 'ACTIVITY' as const,
  level: 'INFO' as const,
  message: 'Profile settings were updated.',
  outcome: 'Succeeded' as const,
  source: 'Settings window',
};
function setup() {
  const entries: ActivityLogEntry[] = [];
  let settings: ActivityLogSettings | undefined;
  const repository: ActivityLogRepository = {
    add: vi.fn(async (entry) => {
      entries.push(entry);
    }),
    clear: vi.fn(async () => {
      entries.length = 0;
    }),
    deleteEntries: vi.fn(async () => undefined),
    getSettings: vi.fn(async () => settings),
    list: vi.fn(async () => entries),
    putSettings: vi.fn(async (value) => {
      settings = value;
    }),
  };
  const service = new ManageActivityLog(repository, {
    applicationVersion: '0.7.0',
    browserTarget: 'Test',
  });
  return { service, entries, repository };
}
describe('ManageActivityLog shared contract', () => {
  it('admits actual startup and post-update preflight diagnostics but keeps the redundant update summary quiet', async () => {
    const { service, entries } = setup();
    const codes = [
      'BACKGROUND-PREFLIGHT-STARTED',
      'BACKGROUND-PREFLIGHT-COMPLETE',
      'BACKGROUND-UPDATE-PREFLIGHT-STARTED',
      'BACKGROUND-UPDATE-PREFLIGHT-COMPLETE',
    ];
    for (const eventCode of [...codes, 'APPLICATION-UPDATE-COMPLETE'])
      await service.record(null, { ...input, eventCode, kind: 'DIAGNOSTIC' });
    expect(entries.map(({ eventCode }) => eventCode)).toEqual(codes);
    expect(
      entries.every(
        ({ kind, level, profileId }) =>
          kind === 'DIAGNOSTIC' && level === 'INFO' && profileId === null,
      ),
    ).toBe(true);
  });
  it('honors disabled diagnostics and minimum severity for preflight rows', async () => {
    const { service, entries } = setup();
    const event = {
      ...input,
      eventCode: 'BACKGROUND-PREFLIGHT-COMPLETE',
      kind: 'DIAGNOSTIC' as const,
    };
    await service.updateSettings(profileId, {
      ...defaultActivityLogSettings(profileId),
      diagnosticsEnabled: false,
    });
    await service.record(profileId, event);
    await service.updateSettings(profileId, {
      ...defaultActivityLogSettings(profileId),
      minimumLevel: 'WARN',
    });
    await service.record(profileId, event);
    expect(entries).toHaveLength(0);
  });
  it('drops routine and expected feedback before allocating identifiers or reading settings', async () => {
    const { service, repository } = setup();
    for (const event of [
      { eventCode: 'FOLDER-OPEN-COMPLETE', level: 'INFO' as const },
      { eventCode: 'BOOKMARK-DUPLICATE-PREVENTED', level: 'WARN' as const },
      {
        eventCode: 'ITEM-CREATE-FAILED',
        level: 'ERROR' as const,
        reason: 'validation' as const,
      },
      {
        eventCode: 'ITEM-LOAD-FAILED',
        level: 'ERROR' as const,
        reason: 'stale' as const,
      },
    ])
      await service.record(profileId, { ...input, ...event });
    expect(repository.getSettings).not.toHaveBeenCalled();
    expect(repository.add).not.toHaveBeenCalled();
  });
  it('distinguishes committed degradation from failed persistence without storing classification metadata', async () => {
    const { service, entries } = setup();
    await service.record(profileId, {
      ...input,
      eventCode: 'ITEM-CREATE-FAILED',
      level: 'ERROR',
      outcome: 'Failed',
      reason: 'committed',
      operationId: 'op-committed-test',
    });
    expect(entries[0]).toMatchObject({
      eventCode: 'ITEM-CREATE-VIEW-REFRESH-DEGRADED',
      level: 'WARN',
      kind: 'DIAGNOSTIC',
      dataChanged: true,
      outcome: 'Skipped',
      operationId: 'op-committed-test',
    });
    expect(entries[0]).not.toHaveProperty('reason');
  });
  it('records recovery only after a matching persistent incident was resolved', async () => {
    const { service, repository, entries } = setup();
    repository.resolveIncidents = vi.fn(async () => false);
    const signal = { ...input, eventCode: 'SYNC-RECOVERED' };
    await service.record(profileId, signal);
    expect(entries).toHaveLength(0);
    repository.resolveIncidents = vi.fn(async () => true);
    await service.record(profileId, signal);
    expect(entries).toHaveLength(1);
    expect(repository.resolveIncidents).toHaveBeenCalledWith(
      profileId,
      expect.arrayContaining(['SYNC-FAILED', 'SYNC-WAKE-FAILED']),
    );
  });
  it('measures capture volume for a fixed synthetic workload', async () => {
    const { service, entries } = setup();
    const routine = [
      'FOLDER-OPEN-COMPLETE',
      'PROFILE-LIST-LOAD-COMPLETE',
      'PROFILE-SETTINGS-UPDATE-COMPLETE',
      'BOOKMARK-URL-COPY-COMPLETE',
    ];
    for (let repeat = 0; repeat < 100; repeat++)
      for (const eventCode of routine)
        await service.record(profileId, { ...input, eventCode });
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
    process.stdout.write(
      `${JSON.stringify({
        workload: 'activity-capture',
        rows: entries.length,
        serializedBytes: new TextEncoder().encode(JSON.stringify(entries))
          .length,
      })}\n`,
    );
    expect(entries).toHaveLength(3);
  });
  it('validates environment metadata and owning-profile attribution', async () => {
    const { service, entries } = setup();
    await service.record(profileId, input);
    expect(entries[0]).toMatchObject({
      profileId,
      schemaVersion: 5,
      applicationVersion: '0.7.0',
      sessionId: 'preview',
    });
    expect('createExport' in service).toBe(false);
  });
  it('honors the master gate for both activity and diagnostics', async () => {
    const { service, entries } = setup();
    await service.updateSettings(profileId, {
      ...defaultActivityLogSettings(profileId),
      enabled: false,
    });
    await service.record(profileId, input);
    await service.record(null, {
      ...input,
      kind: 'DIAGNOSTIC',
      level: 'ERROR',
    });
    expect(entries).toEqual([]);
  });
  it('applies minimum levels to activity and diagnostic markers', async () => {
    const { service, entries } = setup();
    await service.updateSettings(profileId, {
      ...defaultActivityLogSettings(profileId),
      minimumLevel: 'ERROR',
    });
    await service.record(profileId, input);
    await service.record(profileId, {
      ...input,
      kind: 'DIAGNOSTIC',
      level: 'WARN',
    });
    await service.record(profileId, {
      ...input,
      kind: 'DIAGNOSTIC',
      level: 'ERROR',
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.level).toBe('ERROR');
  });
  it('uses the active profile gate for another owning profile', async () => {
    const { service, repository } = setup();
    repository.activeProfileId = async () =>
      '11111111-1111-4111-8111-111111111111';
    await service.record(profileId, input);
    expect(repository.getSettings).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
    );
    expect(repository.add).toHaveBeenCalledWith(
      expect.objectContaining({ profileId }),
    );
  });
});
