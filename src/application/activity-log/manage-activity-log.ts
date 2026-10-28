import { z } from 'zod';
import {
  activityLogEntrySchema,
  activityLogSettingsSchema,
  type ActivityLogEntry,
  type ActivityLogSettings,
  type ActivitySessionIdentity,
  activityCaptureLevel,
  activityRecoveryCodes,
  activityReasonSchema,
  type ActivityReason,
} from '../../domain/activity-log';
import type { ActivityLogRepository } from './activity-log-repository';

export interface RecordActivityInput {
  reason?: ActivityReason | undefined;
  operationId?: string | undefined;
  action: string;
  category: ActivityLogEntry['category'];
  dataChanged: boolean;
  durationMs: number;
  eventCode: string;
  itemType: string;
  itemsAffected: number;
  kind: ActivityLogEntry['kind'];
  level: ActivityLogEntry['level'];
  message: string;
  outcome: ActivityLogEntry['outcome'];
  source: string;
}

/** Shared defaults; enabled is the independent profile recording permission. */
export const defaultActivityLogSettings = (
  profileId: string,
): ActivityLogSettings =>
  activityLogSettingsSchema.parse({
    profileId,
    enabled: true,
    activityEnabled: true,
    diagnosticsEnabled: true,
    minimumLevel: 'INFO',
    retentionCount: 10_000,
    maximumStorageMb: 25,
    autoDeleteOldest: true,
  });

/** Coordinates local-only shared history without an export or clipboard path. */
export class ManageActivityLog {
  constructor(
    private readonly repository: ActivityLogRepository,
    private readonly environment: {
      applicationVersion: string;
      browserTarget: string;
    },
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => number = () => Date.now(),
    private readonly identity: () => Promise<ActivitySessionIdentity> = async () => ({
      id: 'preview',
      startedAt: Date.now(),
      origin: 'detected',
    }),
  ) {}
  list(profileId: string) {
    return this.repository.list(profileId);
  }
  sessions() {
    return this.repository.sessions?.() ?? Promise.resolve([]);
  }
  profiles() {
    return this.repository.profiles?.() ?? Promise.resolve([]);
  }
  full() {
    return this.repository.full?.() ?? Promise.resolve(false);
  }
  subscribe(listener: () => void) {
    return this.repository.subscribe?.(listener) ?? (() => undefined);
  }
  currentSession() {
    return this.identity();
  }
  async beginSession() {
    await this.repository.begin?.(await this.identity());
  }
  async finishSession(succeeded: boolean, update = false) {
    await this.repository.finish?.(await this.identity(), succeeded, update);
  }
  async getSettings(profileId: string): Promise<ActivityLogSettings> {
    return (
      (await this.repository.getSettings(profileId)) ??
      defaultActivityLogSettings(profileId)
    );
  }
  async updateSettings(
    profileId: string,
    input: Omit<z.input<typeof activityLogSettingsSchema>, 'profileId'>,
  ): Promise<ActivityLogSettings> {
    const settings = activityLogSettingsSchema.parse({ ...input, profileId });
    await this.repository.putSettings(settings);
    return settings;
  }
  /** Saves application options without changing any profile's recording gate. */
  async updateOptions(
    profileId: string,
    input: ActivityLogSettings,
  ): Promise<ActivityLogSettings> {
    await this.repository.putSettings(
      activityLogSettingsSchema.parse({ ...input, profileId }),
      true,
    );
    return this.getSettings(profileId);
  }
  /** Applies sparse capture before allocation; successful signals may close an incident. */
  async record(
    profileId: string | null,
    input: RecordActivityInput,
    timestamp = this.now(),
  ): Promise<void> {
    if (input.reason !== undefined) activityReasonSchema.parse(input.reason);
    let level = activityCaptureLevel(input);
    const recovering =
      input.level === 'INFO' && input.outcome === 'Succeeded'
        ? await this.repository.resolveIncidents?.(
            profileId,
            activityRecoveryCodes(input.eventCode),
          )
        : false;
    if (
      level === null &&
      recovering &&
      ['SYNC-RECOVERED', 'UNDO-HISTORY-RECOVERED'].includes(input.eventCode)
    )
      level = 'INFO';
    if (level === null) return;
    const active = await this.repository.activeProfileId?.();
    const settings = await this.getSettings(
      active ?? profileId ?? '00000000-0000-4000-8000-000000000000',
    );
    const rank = { INFO: 0, WARN: 1, ERROR: 2 };
    if (!settings.enabled) return;
    if (
      !this.repository.append &&
      (!settings.enabledCategories.includes(input.category) ||
        rank[level] < rank[settings.minimumLevel] ||
        ((level === 'INFO' ? input.kind : 'DIAGNOSTIC') === 'ACTIVITY'
          ? !settings.activityEnabled
          : !settings.diagnosticsEnabled))
    )
      return;
    const identity = await this.identity();
    const entry = activityLogEntrySchema.parse({
      ...input,
      level,
      kind: level === 'INFO' ? input.kind : 'DIAGNOSTIC',
      ...(input.reason === 'committed'
        ? {
            eventCode: input.eventCode.endsWith('-REFRESH-FAILED')
              ? input.eventCode
              : input.eventCode.replace(/-FAILED$/, '-VIEW-REFRESH-DEGRADED'),
            dataChanged: true,
            outcome: 'Skipped',
          }
        : {}),
      applicationVersion: this.environment.applicationVersion,
      browserTarget: this.environment.browserTarget,
      id: this.createId(),
      operationId: input.operationId ?? `op-${this.createId()}`,
      profileId,
      schemaVersion: 5,
      timestamp,
      sessionId: identity.id,
      sequence: 0,
    });
    if (this.repository.append)
      await this.repository.append(entry, identity, input.reason);
    else await this.repository.add(entry);
  }
  clear(profileId: string, sessionId?: string) {
    return this.repository.clear(profileId, sessionId);
  }
}
