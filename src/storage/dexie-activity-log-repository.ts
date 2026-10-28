import { liveQuery } from 'dexie';

import type { ActivityLogRepository } from '../application/activity-log/activity-log-repository';
import {
  activityLogEntrySchema,
  activityLogSettingsSchema,
  type ActivityLogEntry,
  type ActivityLogSettings,
  activityIncidentStateSchema,
  activityReasonSchema,
  type ActivityReason,
} from '../domain/activity-log';
import type { BookmarkManagerDatabase } from './database';
import { defaultActivityLogSettings } from '../application/activity-log/manage-activity-log';
import { profileSchema } from '../domain/profile';
import {
  activitySessionSchema,
  type ActivitySession,
  type ActivitySessionIdentity,
} from '../domain/activity-log';

const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength;
const ranks = { INFO: 0, WARN: 1, ERROR: 2 };
const incidentKey = 'activity:incidents:v1';

/** Dexie-backed activity storage; every read is validated at the boundary. */
export class DexieActivityLogRepository implements ActivityLogRepository {
  constructor(private readonly database: BookmarkManagerDatabase) {}

  async add(entry: ActivityLogEntry): Promise<void> {
    const parsed = activityLogEntrySchema.parse(entry);
    await this.append(parsed, {
      id: parsed.sessionId,
      startedAt: parsed.timestamp,
      origin: parsed.sessionId === 'earlier' ? 'earlier' : 'detected',
    });
  }

  /** Reads application history; profileId never restricts visible ownership. */
  async list(profileId: string): Promise<readonly ActivityLogEntry[]> {
    await this.database.open();
    void profileId;
    return (await this.database.activity.toArray())
      .map((entry) => activityLogEntrySchema.parse(entry))
      .sort(
        (a, b) =>
          a.timestamp - b.timestamp ||
          a.sequence - b.sequence ||
          a.id.localeCompare(b.id),
      );
  }

  /** Clears an explicit session or all history, preserving live identity. */
  async clear(profileId: string, sessionId?: string): Promise<void> {
    void profileId;
    await this.transaction(async () => {
      const current = (await this.database.metadata.get('activity:current'))
        ?.value;
      const old =
        typeof current === 'string'
          ? await this.database.activitySessions.get(current)
          : undefined;
      if (sessionId) {
        await this.database.activity
          .where('sessionId')
          .equals(sessionId)
          .delete();
        await this.database.activityPending
          .where('sessionId')
          .equals(sessionId)
          .delete();
        await this.database.activitySessions.delete(sessionId);
      } else {
        await this.database.activity.clear();
        await this.database.activitySessions.clear();
        await this.database.activityPending.clear();
      }
      if (
        (!sessionId || sessionId === current) &&
        old &&
        (await this.permitted())
      ) {
        await this.database.activitySessions.put({
          ...old,
          startup: 'cleared',
          cleared: true,
          trimmedCount: 0,
          omittedCount: 0,
          recordingResumed: false,
        });
      }
      await this.database.metadata.put({ key: 'activity:full', value: false });
      if (!sessionId) await this.database.metadata.delete(incidentKey);
      else {
        const state = await this.incidents();
        if (state) {
          const remaining = state.entries.filter(
            (item) => item.sessionId !== sessionId,
          );
          if (remaining.length !== state.entries.length)
            await this.database.metadata.put({
              key: incidentKey,
              value: { version: 1, entries: remaining },
            });
        }
      }
    });
  }

  async deleteEntries(entryIds: readonly string[]): Promise<void> {
    await this.database.open();
    await this.database.activity.bulkDelete([...entryIds]);
  }

  async getSettings(
    profileId: string,
  ): Promise<ActivityLogSettings | undefined> {
    await this.database.open();
    const [gate, options] = await Promise.all([
      this.database.activityLogSettings.get(profileId),
      this.database.metadata.get('activity:options'),
    ]);
    return activityLogSettingsSchema.parse({
      ...defaultActivityLogSettings(profileId),
      ...(options?.value && typeof options.value === 'object'
        ? options.value
        : {}),
      enabled: gate?.enabled ?? true,
      profileId,
    });
  }

  /** Option-only writes preserve the latest gate inside the same transaction. */
  async putSettings(
    settings: ActivityLogSettings,
    preserveGate = false,
  ): Promise<void> {
    await this.database.open();
    const parsed = activityLogSettingsSchema.parse(settings);
    await this.transaction(async () => {
      const previous = await this.database.activityLogSettings.get(
        parsed.profileId,
      );
      if (!preserveGate && !parsed.enabled)
        await this.database.metadata.delete(incidentKey);
      if (preserveGate) parsed.enabled = previous?.enabled ?? true;
      await this.database.activityLogSettings.put(parsed);
      if (
        parsed.enabled &&
        previous?.enabled === false &&
        (await this.activeProfileId()) === parsed.profileId
      ) {
        const current = (await this.database.metadata.get('activity:current'))
          ?.value;
        if (typeof current === 'string') {
          const session = await this.database.activitySessions.get(current);
          if (session)
            await this.database.activitySessions.update(current, {
              recordingResumed: true,
              startup:
                session.startup === 'pending'
                  ? 'not-recorded'
                  : session.startup,
            });
        }
      }
      if (
        !parsed.enabled &&
        (await this.activeProfileId()) === parsed.profileId
      )
        await this.database.activityPending.clear();
      const { enabled: _enabled, profileId: _profileId, ...shared } = parsed;
      void _enabled;
      void _profileId;
      await this.database.metadata.put({
        key: 'activity:options',
        value: shared,
      });
      await this.retain(parsed);
    });
  }

  private transaction<T>(work: () => Promise<T>): Promise<T> {
    const db = this.database;
    return db.transaction(
      'rw',
      [
        db.activity,
        db.activitySessions,
        db.activityPending,
        db.metadata,
        db.activityLogSettings,
        db.profiles,
      ],
      work,
    );
  }
  async activeProfileId(): Promise<string | undefined> {
    const active = await this.database.metadata.get('activeProfileId');
    return typeof active?.value === 'string' ? active.value : undefined;
  }
  async sessions(): Promise<readonly ActivitySession[]> {
    return (await this.database.activitySessions.toArray()).map((session) =>
      activitySessionSchema.parse(session),
    );
  }
  async profiles() {
    return (await this.database.profiles.toArray()).map((profile) =>
      profileSchema.parse(profile),
    );
  }
  async full(): Promise<boolean> {
    return (await this.database.metadata.get('activity:full'))?.value === true;
  }
  subscribe(listener: () => void): () => void {
    const subscription = liveQuery(async () => [
      await this.database.activity.toArray(),
      await this.database.activitySessions.toArray(),
      await this.database.metadata.get('activity:options'),
      await this.database.metadata.get('activity:full'),
      await this.database.profiles.toArray(),
    ]).subscribe({
      next: listener,
      error: () => console.error('activity-log-subscription-failed'),
    });
    return () => subscription.unsubscribe();
  }
  private async permitted(): Promise<ActivityLogSettings | undefined> {
    const active = await this.activeProfileId();
    if (active) {
      const settings = await this.getSettings(active);
      return settings?.enabled ? settings : undefined;
    }
    if (await this.database.profiles.count()) return undefined;
    return defaultActivityLogSettings('00000000-0000-4000-8000-000000000000');
  }
  private async session(
    identity: ActivitySessionIdentity,
    startup: ActivitySession['startup'],
  ) {
    let stored = await this.database.activitySessions.get(identity.id);
    if (!stored) {
      stored = activitySessionSchema.parse({ ...identity, startup });
      await this.database.activitySessions.add(stored);
    }
    await this.database.metadata.put({
      key: 'activity:current',
      value: identity.id,
    });
    return stored;
  }
  async begin(identity: ActivitySessionIdentity): Promise<void> {
    await this.transaction(async () => {
      const settings = await this.permitted();
      if (!settings || (!settings.autoDeleteOldest && (await this.full())))
        return;
      await this.session(identity, 'pending');
      await this.retain(settings);
    });
  }
  async finish(
    identity: ActivitySessionIdentity,
    succeeded: boolean,
    update = false,
  ): Promise<void> {
    await this.transaction(async () => {
      const settings = await this.permitted();
      if (!settings) {
        await this.database.activityPending
          .where('sessionId')
          .equals(identity.id)
          .delete();
        return;
      }
      const session = await this.database.activitySessions.get(identity.id);
      if (!session || session.startup !== 'pending') return;
      await this.database.activitySessions.update(identity.id, {
        startup: update ? 'not-recorded' : succeeded ? 'succeeded' : 'failed',
      });
      const queued = await this.database.activityPending
        .where('sessionId')
        .equals(identity.id)
        .sortBy('sequence');
      for (const entry of queued) await this.insert(entry, settings, false);
      await this.database.activityPending
        .where('sessionId')
        .equals(identity.id)
        .delete();
      await this.retain(settings);
    });
  }
  /** Validates versioned incident metadata without overwriting an unknown future format. */
  private async incidents() {
    const stored = await this.database.metadata.get(incidentKey);
    if (!stored)
      return activityIncidentStateSchema.parse({ version: 1, entries: [] });
    const result = activityIncidentStateSchema.safeParse(stored.value);
    if (result.success) return result.data;
    console.warn('activity-incident-state-unavailable');
    return null;
  }

  /** Clears a real incident atomically across surfaces, without recording routine success. */
  async resolveIncidents(
    profileId: string | null,
    eventCodes: readonly string[],
  ): Promise<boolean> {
    if (!eventCodes.length) return false;
    const snapshot = await this.incidents();
    if (
      !snapshot?.entries.some(
        (item) =>
          item.profileId === profileId && eventCodes.includes(item.eventCode),
      )
    )
      return false;
    return this.transaction(async () => {
      if (!(await this.permitted())) return false;
      const state = await this.incidents();
      if (!state) return false;
      const remaining = state.entries.filter(
        (item) =>
          item.profileId !== profileId || !eventCodes.includes(item.eventCode),
      );
      if (remaining.length === state.entries.length) return false;
      await this.database.metadata.put({
        key: incidentKey,
        value: { version: 1, entries: remaining },
      });
      return true;
    });
  }

  async append(
    input: ActivityLogEntry,
    identity: ActivitySessionIdentity,
    reason: ActivityReason = 'system',
  ): Promise<void> {
    reason = activityReasonSchema.parse(reason);
    await this.transaction(async () => {
      const settings = await this.permitted();
      if (!settings) return;
      if (!settings.autoDeleteOldest && (await this.full())) return;
      const incidents = input.level === 'INFO' ? null : await this.incidents();
      const sameIncident = (
        item: NonNullable<typeof incidents>['entries'][number],
      ) =>
        item.profileId === input.profileId &&
        item.sessionId === identity.id &&
        item.eventCode === input.eventCode &&
        item.reason === reason;
      if (
        incidents?.entries.some(
          (item) =>
            sameIncident(item) &&
            (item.level === 'ERROR' || input.level === 'WARN'),
        )
      )
        return;
      const remember = async () => {
        if (!incidents || input.level === 'INFO') return;
        const remaining = incidents.entries.filter(
          (item) => !sameIncident(item),
        );
        remaining.push({
          profileId: input.profileId,
          sessionId: identity.id,
          eventCode: input.eventCode,
          operationId: input.operationId,
          reason,
          level: input.level,
        });
        await this.database.metadata.put({
          key: incidentKey,
          value: { version: 1, entries: remaining.slice(-128) },
        });
      };
      const session = await this.session(identity, 'not-recorded');
      // A detached startup write may finish after a user clears the session.
      // Post-update checks remain real new work; old startup details stay erased.
      if (
        session.cleared &&
        input.eventCode.includes('PREFLIGHT') &&
        !input.eventCode.includes('UPDATE')
      )
        return;
      if (
        session.startup === 'pending' &&
        identity.preflightComplete &&
        session.recordingResumed
      ) {
        session.startup = 'not-recorded';
        await this.database.activitySessions.update(session.id, {
          startup: 'not-recorded',
          recordingResumed: true,
        });
        await this.database.activityPending
          .where('sessionId')
          .equals(session.id)
          .delete();
      }
      if (
        !settings.enabledCategories.includes(input.category) ||
        ranks[input.level] < ranks[settings.minimumLevel] ||
        (input.kind === 'ACTIVITY'
          ? !settings.activityEnabled
          : !settings.diagnosticsEnabled)
      ) {
        await this.retain(settings);
        return;
      }
      const sequence =
        Number(
          (await this.database.metadata.get('activity:sequence'))?.value ?? 0,
        ) + 1;
      await this.database.metadata.put({
        key: 'activity:sequence',
        value: sequence,
      });
      const entry = activityLogEntrySchema.parse({
        ...input,
        sessionId: identity.id,
        sequence,
      });
      if (
        session.startup === 'pending' &&
        !entry.eventCode.includes('PREFLIGHT')
      ) {
        await this.database.activityPending.add(entry);
        const overflow = (await this.database.activityPending.count()) - 128;
        if (overflow > 0) {
          const removed = await this.database.activityPending
            .orderBy('sequence')
            .limit(overflow)
            .primaryKeys();
          await this.database.activityPending.bulkDelete(removed);
          await this.database.activitySessions.update(session.id, {
            omittedCount: session.omittedCount + removed.length,
          });
        }
        await remember();
        return;
      }
      await this.insert(entry, settings, true);
      if (incidents && (await this.database.activity.get(entry.id)))
        await remember();
    });
  }
  private async insert(
    entry: ActivityLogEntry,
    settings: ActivityLogSettings,
    retain: boolean,
  ) {
    if (!settings.autoDeleteOldest) {
      const [entries, sessions] = await Promise.all([
        this.database.activity.toArray(),
        this.database.activitySessions.toArray(),
      ]);
      if (
        entries.length >= settings.retentionCount ||
        entries.reduce((sum, item) => sum + bytes(item), bytes(sessions)) +
          bytes(entry) >
          settings.maximumStorageMb * 1024 * 1024
      ) {
        await this.database.metadata.put({ key: 'activity:full', value: true });
        return;
      }
    }
    await this.database.activity.add(entry);
    if (retain) await this.retain(settings);
  }
  private async retain(settings: ActivityLogSettings) {
    const db = this.database;
    const entries = await db.activity.toArray();
    const sessions = await db.activitySessions.orderBy('startedAt').toArray();
    const current = (await db.metadata.get('activity:current'))?.value;
    let count = entries.length;
    let size = entries.reduce(
      (sum, entry) => sum + bytes(entry),
      bytes(sessions),
    );
    const over = () =>
      count > settings.retentionCount ||
      size > settings.maximumStorageMb * 1024 * 1024;
    if (settings.autoDeleteOldest) {
      for (const session of sessions) {
        if (!over()) break;
        if (session.id === current) continue;
        const group = entries.filter((entry) => entry.sessionId === session.id);
        if (session.origin === 'earlier') {
          let removed = 0;
          for (const entry of group.sort(
            (a, b) => a.timestamp - b.timestamp || a.sequence - b.sequence,
          )) {
            if (!over()) break;
            await db.activity.delete(entry.id);
            count--;
            size -= bytes(entry);
            removed++;
          }
          if (removed)
            await db.activitySessions.update(session.id, {
              trimmedCount: session.trimmedCount + removed,
            });
          continue;
        }
        await db.activity.bulkDelete(group.map((entry) => entry.id));
        await db.activitySessions.delete(session.id);
        await db.activityPending.where('sessionId').equals(session.id).delete();
        count -= group.length;
        size -= group.reduce(
          (sum, entry) => sum + bytes(entry),
          bytes(session),
        );
      }
      let removed = 0;
      for (const entry of entries
        .filter((entry) => entry.sessionId === current)
        .sort(
          (a, b) =>
            Number(a.eventCode.includes('PREFLIGHT')) -
              Number(b.eventCode.includes('PREFLIGHT')) ||
            a.sequence - b.sequence,
        )) {
        if (!over()) break;
        await db.activity.delete(entry.id);
        count--;
        size -= bytes(entry);
        removed++;
      }
      if (removed && typeof current === 'string') {
        const session = await db.activitySessions.get(current);
        if (session)
          await db.activitySessions.update(current, {
            trimmedCount: session.trimmedCount + removed,
          });
      }
    }
    await db.metadata.put({
      key: 'activity:full',
      value:
        !settings.autoDeleteOldest &&
        (over() || count >= settings.retentionCount),
    });
  }
}
