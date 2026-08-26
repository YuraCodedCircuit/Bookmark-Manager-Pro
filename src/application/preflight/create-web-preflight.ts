import type { i18n as I18nInstance } from 'i18next';

import { i18n } from '../../localization/i18n';
import { createBrowserInitializer } from '../initialization/create-browser-initializer';
import { RunWebPreflight } from './run-web-preflight';
import type { ManageActivityLog } from '../activity-log/manage-activity-log';

/** Composes webpage-specific DOM and navigator adapters around core preflight. */
export function createWebPreflight(
  activityLog: Pick<ManageActivityLog, 'record'>,
): RunWebPreflight {
  return new RunWebPreflight(
    createBrowserInitializer(),
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
      record: (profileId, { messageKey, ...input }) =>
        activityLog.record(profileId, {
          ...input,
          message: i18n.t(`activityLog.messages.preflight.${messageKey}`),
        }),
    },
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
