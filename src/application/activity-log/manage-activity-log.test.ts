import { describe, expect, it, vi } from 'vitest';

import type { ActivityLogRepository } from './activity-log-repository';
import {
  formatActivityLogEntry,
  formatLocalLogTimestamp,
  ManageActivityLog,
} from './manage-activity-log';
import type {
  ActivityLogEntry,
  ActivityLogSettings,
} from '../../domain/activity-log';

const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';

function setup() {
  const entries: ActivityLogEntry[] = [];
  let settings: ActivityLogSettings | undefined;
  const repository: ActivityLogRepository = {
    add: vi.fn(async (entry) => {
      entries.unshift(entry);
    }),
    clear: vi.fn(async () => {
      entries.length = 0;
    }),
    deleteEntries: vi.fn(async (ids) => {
      for (const id of ids)
        entries.splice(
          entries.findIndex((entry) => entry.id === id),
          1,
        );
    }),
    getSettings: vi.fn(async () => settings),
    list: vi.fn(async () => entries),
    putSettings: vi.fn(async (next) => {
      settings = next;
    }),
  };
  let id = 0;
  const service = new ManageActivityLog(
    repository,
    {
      applicationVersion: '0.0.2',
      browserTarget: 'Edge v.140.0.0',
      operatingSystem: 'Windows',
      operatingSystemVersion: '10.0',
    },
    () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
    () => 1_700_000_000_000,
  );
  return { entries, repository, service };
}

const activityInput = {
  action: 'Update',
  category: 'Application' as const,
  dataChanged: false,
  durationMs: 4,
  eventCode: 'PROFILE-SETTINGS-UPDATE-COMPLETE',
  itemType: 'Profile settings',
  itemsAffected: 0,
  kind: 'ACTIVITY' as const,
  level: 'INFO' as const,
  message: 'Profile settings were updated.',
  outcome: 'Succeeded' as const,
  source: 'Settings window',
};

describe('ManageActivityLog', () => {
  it('records validated environment metadata for the owning profile', async () => {
    const { entries, service } = setup();
    await service.record(profileId, activityInput);
    expect(entries[0]).toMatchObject({
      applicationVersion: '0.0.2',
      browserTarget: 'Edge v.140.0.0',
      eventCode: 'PROFILE-SETTINGS-UPDATE-COMPLETE',
      profileId,
      schemaVersion: 4,
    });
  });

  it('honors activity and diagnostic level settings', async () => {
    const { entries, service } = setup();
    await service.updateSettings(profileId, {
      activityEnabled: false,
      autoDeleteOldest: true,
      diagnosticsEnabled: true,
      enabled: true,
      includeDiagnosticsExport: false,
      maximumStorageMb: 25,
      minimumLevel: 'ERROR',
      retentionCount: 10_000,
    });
    await service.record(profileId, activityInput);
    await service.record(profileId, {
      ...activityInput,
      kind: 'DIAGNOSTIC',
      level: 'WARN',
    });
    await service.record(profileId, {
      ...activityInput,
      kind: 'DIAGNOSTIC',
      level: 'ERROR',
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.level).toBe('ERROR');
  });

  it('does not record activity or diagnostics while the service is disabled', async () => {
    const { entries, service } = setup();
    await service.updateSettings(profileId, {
      activityEnabled: true,
      autoDeleteOldest: true,
      diagnosticsEnabled: true,
      enabled: false,
      includeDiagnosticsExport: false,
      maximumStorageMb: 25,
      minimumLevel: 'INFO',
      retentionCount: 10_000,
    });

    await service.record(profileId, activityInput);
    await service.record(profileId, {
      ...activityInput,
      kind: 'DIAGNOSTIC',
    });

    expect(entries).toHaveLength(0);
  });

  it('exports line-oriented activity without profile identifiers or excluded diagnostics', async () => {
    const { entries, service } = setup();
    await service.record(profileId, activityInput);
    await service.record(profileId, {
      ...activityInput,
      kind: 'DIAGNOSTIC',
      level: 'WARN',
    });
    const exported = await service.createExport(profileId);
    expect(exported.filename).toBe(
      'bookmark-manager-pro-activity-log-2023-11-14.log',
    );
    expect(exported.mimeType).toBe('text/plain');
    expect(exported.content).not.toContain(profileId);
    expect(exported.content).toContain('# Browser target: Edge v.140.0.0');
    expect(exported.content).toContain('# Operating system: Windows');
    expect(exported.content).toContain('# Application: 0.0.2');
    const eventLines = exported.content
      .split('\n')
      .filter((line) => line && !line.startsWith('#'));
    expect(eventLines).toEqual([
      expect.stringContaining(
        `${formatLocalLogTimestamp(1_700_000_000_000)} [INFO] [Settings window] Profile settings were updated. | Event code: PROFILE-SETTINGS-UPDATE-COMPLETE`,
      ),
    ]);
    expect(
      formatActivityLogEntry({
        ...entries[0]!,
        level: 'INFO',
        source: '[Unsafe]\nSource',
      }),
    ).toContain('[INFO] [(Unsafe) Source]');
  });
});
