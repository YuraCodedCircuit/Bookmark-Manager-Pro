import type { InitializationRepository } from '../initialization/initialization-repository';
import type { ManageActivityLog } from '../activity-log/manage-activity-log';
import {
  backgroundPreflightSnapshotSchema,
  type BackgroundPreflightSnapshot,
} from '../../messaging/background-protocol';
import { resolveLanguage } from './resolve-language';

export interface BackgroundSessionSnapshotStore {
  read(): Promise<unknown>;
  write(snapshot: BackgroundPreflightSnapshot): Promise<void>;
}

export interface BackgroundLanguageSource {
  getLanguages(): readonly string[];
  getSupportedLanguages(): readonly string[];
}

export interface BackgroundCapabilitySource {
  getCapabilities(): BackgroundPreflightSnapshot['capabilities'];
}

/** Runs and caches browser-session startup without relying on worker memory. */
export class RunBackgroundPreflight {
  constructor(
    private readonly repository: InitializationRepository,
    private readonly sessionStore: BackgroundSessionSnapshotStore,
    private readonly languageSource: BackgroundLanguageSource,
    private readonly capabilitySource: BackgroundCapabilitySource,
    private readonly activityLog: Pick<ManageActivityLog, 'record'>,
    private readonly isStorageAvailable: () => boolean,
    private readonly createOperationId: () => string = () =>
      crypto.randomUUID(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(): Promise<BackgroundPreflightSnapshot> {
    const cached = backgroundPreflightSnapshotSchema.safeParse(
      await this.readCacheSafely(),
    );
    if (cached.success) return cached.data;

    const snapshot = await this.run();
    await this.writeCacheSafely(snapshot);
    return snapshot;
  }

  private async run(): Promise<BackgroundPreflightSnapshot> {
    const base = {
      schemaVersion: 1 as const,
      operationId: this.createOperationId(),
      completedAt: this.now().toISOString(),
      capabilities: this.capabilitySource.getCapabilities(),
    };

    if (!this.isStorageAvailable()) {
      return backgroundPreflightSnapshotSchema.parse({
        ...base,
        language: this.resolveLanguage(),
        initialization: { status: 'storage-unavailable' },
      });
    }

    try {
      await this.repository.open();
    } catch {
      return backgroundPreflightSnapshotSchema.parse({
        ...base,
        language: this.resolveLanguage(),
        initialization: {
          status: 'recovery',
          errorCode: 'database-open-failed',
        },
      });
    }

    let data: Awaited<ReturnType<InitializationRepository['load']>>;
    try {
      data = await this.repository.load();
    } catch {
      return backgroundPreflightSnapshotSchema.parse({
        ...base,
        language: this.resolveLanguage(),
        initialization: {
          status: 'recovery',
          errorCode: 'data-load-failed',
        },
      });
    }

    const profileLanguage =
      data.kind === 'active-profile' ? data.settings.language : undefined;
    const snapshot = backgroundPreflightSnapshotSchema.parse({
      ...base,
      language: this.resolveLanguage(profileLanguage),
      initialization:
        data.kind === 'first-run'
          ? { status: 'first-run' }
          : { status: 'ready', profileId: data.profile.id },
    });

    if (data.kind === 'active-profile') {
      await this.recordSafely(data.profile.id, 'BACKGROUND-PREFLIGHT-COMPLETE');
    }
    return snapshot;
  }

  private resolveLanguage(profileLanguage?: string): string {
    return resolveLanguage(
      this.languageSource.getLanguages(),
      this.languageSource.getSupportedLanguages(),
      profileLanguage,
    );
  }

  private async readCacheSafely(): Promise<unknown> {
    try {
      return await this.sessionStore.read();
    } catch {
      return undefined;
    }
  }

  private async writeCacheSafely(
    snapshot: BackgroundPreflightSnapshot,
  ): Promise<void> {
    try {
      await this.sessionStore.write(snapshot);
    } catch {
      const profileId =
        snapshot.initialization.status === 'ready'
          ? snapshot.initialization.profileId
          : undefined;
      if (profileId) {
        await this.recordSafely(
          profileId,
          'BACKGROUND-PREFLIGHT-SESSION-CACHE-UNAVAILABLE',
          'WARN',
        );
      }
    }
  }

  private async recordSafely(
    profileId: string,
    eventCode: string,
    level: 'INFO' | 'WARN' = 'INFO',
  ): Promise<void> {
    try {
      await this.activityLog.record(profileId, {
        action: 'Initialize',
        category: 'Application',
        dataChanged: false,
        durationMs: 0,
        eventCode,
        itemType: 'Application startup',
        itemsAffected: 1,
        kind: 'DIAGNOSTIC',
        level,
        message:
          level === 'INFO'
            ? 'Background preflight completed.'
            : 'Background preflight session caching is unavailable.',
        outcome: level === 'INFO' ? 'Succeeded' : 'Skipped',
        source: 'Background preflight service',
      });
    } catch {
      console.error('background-preflight-activity-log-write-failed');
    }
  }
}
