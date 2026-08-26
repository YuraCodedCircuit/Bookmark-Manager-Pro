import type { InitializeApplication } from '../initialization/initialize-application';
import type { RecordActivityInput } from '../activity-log/manage-activity-log';
import type { WebPreflightSnapshot } from './preflight-state';
import { resolveLanguage } from './resolve-language';

/** Supplies browser language preferences without coupling application code to DOM APIs. */
export interface BrowserLanguageSource {
  getLanguages(): readonly string[];
}

/** Applies a selected locale before React is allowed to render. */
export interface PreflightLocalizationController {
  getSupportedLanguages(): readonly string[];
  setLanguage(language: string): Promise<void>;
}

/** Records that React committed the snapshot associated with an operation. */
export interface UiReadyRecorder {
  record(operationId: string): void;
}

/** Writes preflight diagnostics only after an active profile is available. */
export interface PreflightActivityLogger {
  record(
    profileId: string,
    input: Omit<RecordActivityInput, 'message'> & {
      messageKey:
        'capabilitiesUnavailable' | 'completed' | 'localizationFailed';
    },
  ): Promise<void>;
}

const WEB_UNAVAILABLE_CAPABILITIES = [
  'extension-startup',
  'runtime-messaging',
  'extension-permissions',
  'native-bookmarks',
] as const;

/**
 * Runs the portion of preflight available to a normal webpage.
 *
 * Extension-only checks are intentionally represented as unavailable capability
 * results. They are not errors because local profile management remains usable.
 */
export class RunWebPreflight {
  constructor(
    private readonly initializer: Pick<InitializeApplication, 'execute'>,
    private readonly browserLanguageSource: BrowserLanguageSource,
    private readonly localizationController: PreflightLocalizationController,
    private readonly uiReadyRecorder: UiReadyRecorder,
    private readonly activityLogger: PreflightActivityLogger,
    private readonly createOperationId: () => string = () =>
      crypto.randomUUID(),
  ) {}

  /** Loads initialization data, resolves localization, and returns render input. */
  async execute(): Promise<WebPreflightSnapshot> {
    const initialization = await this.initializer.execute();
    const profileId =
      initialization.status === 'ready' ? initialization.profile.id : undefined;
    const profileLanguage =
      initialization.status === 'ready'
        ? initialization.settings.language
        : undefined;
    const language = resolveLanguage(
      this.browserLanguageSource.getLanguages(),
      this.localizationController.getSupportedLanguages(),
      profileLanguage,
    );

    try {
      await this.localizationController.setLanguage(language);
    } catch (error) {
      if (profileId) {
        await this.recordSafely(profileId, {
          action: 'Load language',
          category: 'Application',
          dataChanged: false,
          durationMs: 0,
          eventCode: 'PREFLIGHT-LOCALIZATION-FAILED',
          itemType: 'Localization resources',
          itemsAffected: 1,
          kind: 'DIAGNOSTIC',
          level: 'ERROR',
          messageKey: 'localizationFailed',
          outcome: 'Failed',
          source: 'Preflight service',
        });
      }
      throw error;
    }

    if (profileId) {
      await this.recordSafely(profileId, {
        action: 'Check capabilities',
        category: 'Application',
        dataChanged: false,
        durationMs: 0,
        eventCode: 'PREFLIGHT-CAPABILITIES-UNAVAILABLE',
        itemType: 'Browser capabilities',
        itemsAffected: WEB_UNAVAILABLE_CAPABILITIES.length,
        kind: 'DIAGNOSTIC',
        level: 'WARN',
        messageKey: 'capabilitiesUnavailable',
        outcome: 'Skipped',
        source: 'Preflight service',
      });
      await this.recordSafely(profileId, {
        action: 'Initialize',
        category: 'Application',
        dataChanged: false,
        durationMs: 0,
        eventCode: 'PREFLIGHT-COMPLETE',
        itemType: 'Application startup',
        itemsAffected: 1,
        kind: 'DIAGNOSTIC',
        level: 'INFO',
        messageKey: 'completed',
        outcome: 'Succeeded',
        source: 'Preflight service',
      });
    }

    return {
      operationId: this.createOperationId(),
      language,
      capabilities: WEB_UNAVAILABLE_CAPABILITIES.map((id) => ({
        id,
        status: 'unavailable',
        reason: 'web-preview',
      })),
      initialization,
    };
  }

  /** Completes the operation only after the UI reports its committed render. */
  markUiReady(operationId: string): void {
    this.uiReadyRecorder.record(operationId);
  }

  /** Logging failures are diagnosed without changing the startup result. */
  private async recordSafely(
    profileId: string,
    input: Parameters<PreflightActivityLogger['record']>[1],
  ): Promise<void> {
    try {
      await this.activityLogger.record(profileId, input);
    } catch {
      console.error('preflight-activity-log-write-failed');
    }
  }
}
