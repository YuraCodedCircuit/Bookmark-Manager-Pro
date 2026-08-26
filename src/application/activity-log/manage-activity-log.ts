import {
  activityLogEntrySchema,
  activityLogSettingsSchema,
  type ActivityLogEntry,
  type ActivityLogKind,
  type ActivityLogLevel,
  type ActivityLogSettings,
} from '../../domain/activity-log';
import type { ActivityLogRepository } from './activity-log-repository';

const levelRank: Record<ActivityLogLevel, number> = {
  INFO: 0,
  WARN: 1,
  ERROR: 2,
};

export interface RecordActivityInput {
  action: string;
  category: ActivityLogEntry['category'];
  dataChanged: boolean;
  durationMs: number;
  eventCode: string;
  itemType: string;
  itemsAffected: number;
  kind: ActivityLogKind;
  level: ActivityLogLevel;
  message: string;
  outcome: ActivityLogEntry['outcome'];
  source: string;
}

export interface ActivityLogExport {
  content: string;
  filename: string;
  mimeType: 'text/plain';
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

/** Formats a timestamp as local ISO-8601 with an explicit numeric UTC offset. */
export function formatLocalLogTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}${sign}${pad(Math.floor(absoluteOffset / 60))}:${pad(absoluteOffset % 60)}`;
}

const safeLogText = (value: string | number | boolean): string =>
  String(value)
    .replace(/[\r\n]/g, ' ')
    .replaceAll('[', '(')
    .replaceAll(']', ')')
    .replaceAll('|', '/');

/** Serializes one event as exactly one stable, grep-friendly text line. */
export function formatActivityLogEntry(entry: ActivityLogEntry): string {
  const prefix = `${formatLocalLogTimestamp(entry.timestamp)} [${entry.level}] [${safeLogText(entry.source)}]`;
  const fields: ReadonlyArray<readonly [string, string | number | boolean]> = [
    ['Event code', entry.eventCode],
    ['Outcome', entry.outcome],
    ['Action', entry.action],
    ['Item type', entry.itemType],
    ['Items affected', entry.itemsAffected],
    ['Data changed', entry.dataChanged ? 'Yes' : 'No'],
    ['Duration', `${entry.durationMs} ms`],
    ['Operation ID', entry.operationId],
  ];
  return `${prefix} ${safeLogText(entry.message)} | ${fields
    .map(([label, value]) => `${label}: ${safeLogText(value)}`)
    .join(' | ')}`;
}

export const defaultActivityLogSettings = (
  profileId: string,
): ActivityLogSettings =>
  activityLogSettingsSchema.parse({
    activityEnabled: true,
    autoDeleteOldest: true,
    diagnosticsEnabled: true,
    enabled: true,
    includeDiagnosticsExport: false,
    maximumStorageMb: 25,
    minimumLevel: 'INFO',
    profileId,
    retentionCount: 10_000,
  });

/** Validates, retains, exports, and clears privacy-safe profile activity. */
export class ManageActivityLog {
  constructor(
    private readonly repository: ActivityLogRepository,
    private readonly environment: {
      applicationVersion: string;
      browserTarget: string;
      operatingSystem: string;
      operatingSystemVersion: string;
    },
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => number = () => Date.now(),
  ) {}

  list(profileId: string): Promise<readonly ActivityLogEntry[]> {
    return this.repository.list(profileId);
  }

  async getSettings(profileId: string): Promise<ActivityLogSettings> {
    return (
      (await this.repository.getSettings(profileId)) ??
      defaultActivityLogSettings(profileId)
    );
  }

  async updateSettings(
    profileId: string,
    input: Omit<ActivityLogSettings, 'profileId'>,
  ): Promise<ActivityLogSettings> {
    const settings = activityLogSettingsSchema.parse({ ...input, profileId });
    await this.repository.putSettings(settings);
    await this.applyRetention(profileId, settings);
    return settings;
  }

  async record(profileId: string, input: RecordActivityInput): Promise<void> {
    const settings = await this.getSettings(profileId);
    if (!this.shouldRecord(input.kind, input.level, settings)) return;
    const timestamp = this.now();
    const entry = activityLogEntrySchema.parse({
      ...input,
      applicationVersion: this.environment.applicationVersion,
      browserTarget: this.environment.browserTarget,
      id: this.createId(),
      operationId: `op-${this.createId()}`,
      profileId,
      schemaVersion: 4,
      timestamp,
    });
    await this.repository.add(entry);
    await this.applyRetention(profileId, settings);
  }

  clear(profileId: string): Promise<void> {
    return this.repository.clear(profileId);
  }

  async createExport(profileId: string): Promise<ActivityLogExport> {
    const settings = await this.getSettings(profileId);
    const entries = (await this.list(profileId)).filter(
      (entry) => settings.includeDiagnosticsExport || entry.kind === 'ACTIVITY',
    );
    const generatedAt = this.now();
    const header = [
      '# Bookmark Manager Pro activity log',
      '# Export format: 2',
      `# Exported: ${formatLocalLogTimestamp(generatedAt)}`,
      `# Application: ${safeLogText(this.environment.applicationVersion)}`,
      `# Browser target: ${safeLogText(this.environment.browserTarget)}`,
      `# Operating system: ${safeLogText(this.environment.operatingSystem)}`,
      `# Operating system version: ${safeLogText(this.environment.operatingSystemVersion)}`,
      '# Database schema version: 2',
    ];
    return {
      content: `${header.join('\n')}\n\n${entries.map(formatActivityLogEntry).join('\n')}\n`,
      filename: `bookmark-manager-pro-activity-log-${new Date(generatedAt).toISOString().slice(0, 10)}.log`,
      mimeType: 'text/plain',
    };
  }

  private shouldRecord(
    kind: ActivityLogKind,
    level: ActivityLogLevel,
    settings: ActivityLogSettings,
  ): boolean {
    if (!settings.enabled) return false;
    if (kind === 'ACTIVITY') return settings.activityEnabled;
    return (
      settings.diagnosticsEnabled &&
      levelRank[level] >= levelRank[settings.minimumLevel]
    );
  }

  private async applyRetention(
    profileId: string,
    settings: ActivityLogSettings,
  ): Promise<void> {
    if (!settings.autoDeleteOldest) return;
    const entries = await this.repository.list(profileId);
    const maximumBytes = settings.maximumStorageMb * 1024 * 1024;
    let estimatedBytes = entries.reduce(
      (total, entry) => total + JSON.stringify(entry).length * 2,
      0,
    );
    let excessCount = Math.max(0, entries.length - settings.retentionCount);
    const ids: string[] = [];
    for (const entry of [...entries].reverse()) {
      if (excessCount <= 0 && estimatedBytes <= maximumBytes) break;
      ids.push(entry.id);
      excessCount -= 1;
      estimatedBytes -= JSON.stringify(entry).length * 2;
    }
    if (ids.length) await this.repository.deleteEntries(ids);
  }
}
