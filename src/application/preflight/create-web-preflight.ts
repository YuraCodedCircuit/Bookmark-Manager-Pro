import type { i18n as I18nInstance } from 'i18next';

import { i18n } from '../../localization/i18n';
import { createBrowserInitializer } from '../initialization/create-browser-initializer';
import { RunWebPreflight } from './run-web-preflight';
import type { ManageActivityLog } from '../activity-log/manage-activity-log';
import type { PreflightCapability } from './preflight-state';

/** Composes webpage-specific DOM and navigator adapters around core preflight. */
export function createWebPreflight(
  activityLog: Pick<ManageActivityLog, 'record'> &
    Partial<Pick<ManageActivityLog, 'beginSession' | 'finishSession'>>,
): RunWebPreflight {
  const initializer = createBrowserInitializer();
  const extension = globalThis.location?.protocol.endsWith('-extension:');
  let capabilities: readonly PreflightCapability[] = [];
  let firstRun = false;
  let loggingStarted = Promise.resolve();
  let loggingWrites = Promise.resolve();
  return new RunWebPreflight(
    {
      execute: async () => {
        if (extension) {
          try {
            const browser = (await import('webextension-polyfill')).default;
            const { backgroundPreflightSnapshotSchema } =
              await import('../../messaging/background-protocol');
            const result: unknown = await browser.runtime.sendMessage({
              protocolVersion: 1,
              type: 'preflight.get',
            });
            if (
              !result ||
              typeof result !== 'object' ||
              !('snapshot' in result)
            )
              throw new Error('background-preflight-unavailable');
            capabilities = backgroundPreflightSnapshotSchema.parse(
              result.snapshot,
            ).capabilities;
          } catch {
            // A missing worker cannot prevent local initialization or trigger
            // fictional webpage checks in a packaged extension surface.
            capabilities = [
              {
                id: 'runtime-messaging',
                status: 'unavailable',
                reason: 'background-unavailable',
              },
            ];
            console.warn('background-preflight-unavailable');
          }
        } else {
          const startedAt = Date.now();
          loggingStarted = (async () => {
            try {
              await activityLog.beginSession?.();
            } catch {
              console.error('preview-log-session-start-failed');
            }
            try {
              await activityLog.record(
                null,
                {
                  action: 'Initialize',
                  category: 'Application',
                  dataChanged: false,
                  durationMs: 0,
                  eventCode: 'PREFLIGHT-STARTED',
                  itemType: 'Application startup',
                  itemsAffected: 0,
                  kind: 'DIAGNOSTIC',
                  level: 'INFO',
                  message: i18n.t('activityRebuild.preflightStarted'),
                  outcome: 'Succeeded',
                  source: 'Preflight service',
                },
                startedAt,
              );
            } catch {
              console.error('preview-log-preflight-record-failed');
            }
          })();
        }
        const state = await initializer.execute();
        firstRun = state.status === 'first-run';
        return state;
      },
    },
    {
      getLanguages: () => window.navigator.languages,
    },
    createI18nController(i18n),
    {
      record: (operationId) => {
        document.documentElement.dataset.preflightReady = operationId;
      },
    },
    {
      record: (_profileId, { messageKey, ...input }) => {
        void _profileId;
        if (extension && input.eventCode !== 'PREFLIGHT-LOCALIZATION-FAILED')
          return Promise.resolve();
        const observedAt = Date.now();
        loggingWrites = loggingWrites
          .then(() => loggingStarted)
          .then(() =>
            activityLog.record(
              null,
              {
                ...input,
                message: i18n.t(`activityLog.messages.preflight.${messageKey}`),
              },
              observedAt,
            ),
          )
          .catch(() => console.error('preview-log-preflight-record-failed'));
        return loggingWrites;
      },
    },
    undefined,
    extension,
    async (succeeded) => {
      const completedAt = Date.now();
      if (!extension) {
        try {
          await loggingStarted;
          await loggingWrites;
          if (firstRun || !succeeded)
            await activityLog.record(
              null,
              {
                action: 'Initialize',
                category: 'Application',
                dataChanged: false,
                durationMs: 0,
                eventCode: succeeded
                  ? 'PREFLIGHT-COMPLETE'
                  : 'PREFLIGHT-FAILED',
                itemType: 'Application startup',
                itemsAffected: 0,
                kind: 'DIAGNOSTIC',
                level: succeeded ? 'INFO' : 'ERROR',
                message: i18n.t(
                  succeeded
                    ? 'activityLog.messages.preflight.completed'
                    : 'activityRebuild.preflightFailed',
                ),
                outcome: succeeded ? 'Succeeded' : 'Failed',
                source: 'Preflight service',
              },
              completedAt,
            );
          await activityLog.finishSession?.(succeeded);
        } catch {
          console.error('preview-log-session-finish-failed');
        }
      }
    },
    () => capabilities,
  );
}

/** Keeps i18next language and document language/direction attributes synchronized. */
function createI18nController(instance: I18nInstance) {
  return {
    getSupportedLanguages: () => Object.keys(instance.options.resources ?? {}),
    setLanguage: async (language: string) => {
      await instance.changeLanguage(language);
      document.documentElement.lang = language;
      document.documentElement.dir = instance.dir(language);
    },
  };
}
