import browser from 'webextension-polyfill';

import { createActivityLogService } from '../activity-log/create-activity-log-service';
import { i18n } from '../../localization/i18n';
import { BrowserPreflightSessionStore } from '../../platform/storage/browser-preflight-session-store';
import { BookmarkManagerDatabase } from '../../storage/database';
import { DexieInitializationRepository } from '../../storage/dexie-initialization-repository';
import { RunBackgroundPreflight } from './run-background-preflight';

/** Composes extension APIs and durable repositories for worker preflight. */
export function createBackgroundPreflight(): RunBackgroundPreflight {
  return new RunBackgroundPreflight(
    new DexieInitializationRepository(new BookmarkManagerDatabase()),
    new BrowserPreflightSessionStore(),
    {
      getLanguages: () => [browser.i18n.getUILanguage()],
      getSupportedLanguages: () => Object.keys(i18n.options.resources ?? {}),
    },
    {
      getCapabilities: () => [
        { id: 'extension-startup', status: 'available' },
        { id: 'runtime-messaging', status: 'available' },
        { id: 'extension-permissions', status: 'available' },
        {
          id: 'native-bookmarks',
          status: 'unavailable',
          reason: 'permission-not-requested',
        },
      ],
    },
    createActivityLogService({ background: true }),
    () => typeof indexedDB !== 'undefined',
    undefined,
    undefined,
    (code, level) =>
      i18n.t(
        `activityRebuild.background.${level === 'WARN' ? 'cacheUnavailable' : code.includes('UPDATE') ? (code.endsWith('STARTED') ? 'updateStarted' : level === 'ERROR' ? 'updateFailed' : 'updateCompleted') : code.endsWith('STARTED') ? 'started' : level === 'ERROR' ? 'failed' : 'completed'}`,
      ),
  );
}
