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
  private logging: Promise<void> | undefined;
  constructor(
    private readonly repository: InitializationRepository,
    private readonly sessionStore: BackgroundSessionSnapshotStore,
    private readonly languageSource: BackgroundLanguageSource,
    private readonly capabilitySource: BackgroundCapabilitySource,
    private readonly activityLog: Pick<ManageActivityLog, 'record'> &
      Partial<Pick<ManageActivityLog, 'beginSession' | 'finishSession'>>,
    private readonly isStorageAvailable: () => boolean,
    private readonly createOperationId: () => string = () =>
      crypto.randomUUID(),
    private readonly now: () => Date = () => new Date(),
    private readonly message: (
      eventCode: string,
      level: 'INFO' | 'WARN' | 'ERROR',
    ) => string = (code, level) =>
      level === 'ERROR'
        ? 'Background preflight failed.'
        : level === 'WARN'
          ? 'Background preflight session caching is unavailable.'
          : code.endsWith('STARTED')
            ? 'Background preflight started.'
            : 'Background preflight completed.',
  ) {}

  async execute(update = false): Promise<BackgroundPreflightSnapshot> {
    const cached = backgroundPreflightSnapshotSchema.safeParse(
      await this.readCacheSafely(),
    );
    if (cached.success) {
      // Recover a pending durable queue after worker suspension. finishSession
      // only updates an existing pending header, so cleared details stay erased.
      if (!this.logging) void this.finishSafely(cached.data, update);
      return cached.data;
    }

    const startedAt = this.now().getTime();
    const loggingStarted = (async () => {
      try {
        if (!update) await this.activityLog.beginSession?.();
      } catch {
        console.error('background-preflight-session-start-failed');
      }
      await this.recordSafely(
        null,
        update
          ? 'BACKGROUND-UPDATE-PREFLIGHT-STARTED'
          : 'BACKGROUND-PREFLIGHT-STARTED',
        'INFO',
        startedAt,
      );
    })();
    const result = await this.run();
    const snapshot: BackgroundPreflightSnapshot = {
      ...result,
      completedAt: this.now().toISOString(),
      purpose: update ? 'update' : 'startup',
    };
    const succeeded =
      snapshot.initialization.status === 'ready' ||
      snapshot.initialization.status === 'first-run';
    const completedAt = this.now().getTime();
    // Logging preserves actual observation times and ordering, but never holds
    // the primary startup result behind IndexedDB or queue draining.
    const logging = loggingStarted
      .then(async () => {
        await this.recordSafely(
          null,
          update
            ? succeeded
              ? 'BACKGROUND-UPDATE-PREFLIGHT-COMPLETE'
              : 'BACKGROUND-UPDATE-PREFLIGHT-FAILED'
            : succeeded
              ? 'BACKGROUND-PREFLIGHT-COMPLETE'
              : 'BACKGROUND-PREFLIGHT-FAILED',
          succeeded ? 'INFO' : 'ERROR',
          completedAt,
        );
        await this.finishSafely(snapshot, update);
      })
      .catch(() => console.error('background-preflight-logging-failed'));
    this.logging = logging;
    void logging.finally(() => {
      if (this.logging === logging) this.logging = undefined;
    });
    await this.writeCacheSafely(snapshot);
    return snapshot;
  }

  private async finishSafely(
    snapshot: BackgroundPreflightSnapshot,
    update: boolean,
  ) {
    const succeeded =
      snapshot.initialization.status === 'ready' ||
      snapshot.initialization.status === 'first-run';
    try {
      await this.activityLog.finishSession?.(
        succeeded,
        update || snapshot.purpose === 'update',
      );
    } catch {
      console.error('background-preflight-session-finish-failed');
    }
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
        void this.recordSafely(
          profileId,
          'BACKGROUND-PREFLIGHT-SESSION-CACHE-UNAVAILABLE',
          'WARN',
        );
      }
    }
  }

  private async recordSafely(
    profileId: string | null,
    eventCode: string,
    level: 'INFO' | 'WARN' | 'ERROR' = 'INFO',
    timestamp?: number,
  ): Promise<void> {
    try {
      await this.activityLog.record(
        profileId,
        {
          action: 'Initialize',
          category: 'Application',
          dataChanged: false,
          durationMs: 0,
          eventCode,
          itemType: 'Application startup',
          itemsAffected: 1,
          kind: 'DIAGNOSTIC',
          level,
          message: this.message(eventCode, level),
          outcome:
            level === 'INFO'
              ? 'Succeeded'
              : level === 'ERROR'
                ? 'Failed'
                : 'Skipped',
          source: 'Background preflight service',
        },
        timestamp,
      );
    } catch {
      console.error('background-preflight-activity-log-write-failed');
    }
  }
}
