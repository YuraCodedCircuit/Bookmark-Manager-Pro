import './platform/validation/configure-runtime-validation';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import type { CreateFirstProfileInput } from './application/profile/create-first-profile';
import { createActivityLogService } from './application/activity-log/create-activity-log-service';
import { createBookmarkManager } from './application/bookmark/create-bookmark-manager';
import { createBrowserProfileCreator } from './application/profile/create-browser-profile-creator';
import { createProfileManager } from './application/profile/create-profile-manager';
import { createWebPreflight } from './application/preflight/create-web-preflight';
import { createUndoHistoryService } from './application/undo-history/create-undo-history-service';
import { createUpdateAnnouncementManager } from './application/update-announcement/create-update-announcement-manager';
import { createBackupManager } from './application/backup/create-backup-manager';
import packageMetadata from '../package.json';
import { i18n } from './localization/i18n';
import { App } from './presentation/App';
import { createContentChangeBridge } from './platform/content-change/create-content-change-bridge';
import './styles/global.css';

const rootElement = document.querySelector<HTMLDivElement>('#root');

if (rootElement === null) {
  throw new Error('Application root element was not found.');
}

/** Loads the extension-only adapter outside the local webpage preview. */
const loadToolbarSavedStatusPermission = () =>
  import('./platform/browser/toolbar-saved-status-permission');

/** Loads the extension-only clipboard reader outside the local webpage preview. */
const loadClipboardReader = () =>
  import('./platform/clipboard/read-clipboard-text');

/** Defers the extension-only windows API so local webpage preview still starts. */
const openBookmarkWindow = async (url: string) =>
  (await import('./platform/browser/open-bookmark-window')).openBookmarkWindow(
    url,
  );

/**
 * Completes webpage preflight before mounting React so untranslated or partially
 * loaded application UI is never displayed.
 */
async function bootstrap(applicationRoot: HTMLDivElement): Promise<void> {
  const activityLog = createActivityLogService();
  const bookmarkManager = createBookmarkManager();
  const undoHistory = createUndoHistoryService(bookmarkManager);
  const preflight = createWebPreflight(activityLog);
  const profileCreator = createBrowserProfileCreator();
  const profileManager = createProfileManager();
  const updateAnnouncements = createUpdateAnnouncementManager();
  const backupManager = createBackupManager();
  // Firefox requires permissions.request() to run in the original user-action
  // chain. Load this module before rendering so the button callback can invoke
  // the browser API directly instead of awaiting a dynamic import first.
  const isExtensionPage = globalThis.location.protocol.endsWith('-extension:');
  const [toolbarSavedStatusPermission, clipboardReader] = isExtensionPage
    ? await Promise.all([
        loadToolbarSavedStatusPermission(),
        loadClipboardReader(),
      ])
    : [undefined, undefined];
  const contentChanges = createContentChangeBridge(() => {
    void toolbarSavedStatusPermission
      ?.refreshToolbarSavedStatus()
      .catch(() => console.error('toolbar-saved-status-request-failed'));
  });
  const preflightSnapshot = await preflight.execute();
  const undoHistoryReady = await undoHistory.initialize();
  if (
    !undoHistoryReady &&
    preflightSnapshot.initialization.status === 'ready'
  ) {
    try {
      await activityLog.record(preflightSnapshot.initialization.profile.id, {
        action: 'Initialize',
        category: 'Application',
        dataChanged: false,
        durationMs: 0,
        eventCode: 'UNDO-HISTORY-INITIALIZATION-FAILED',
        itemType: 'Undo history',
        itemsAffected: 0,
        kind: 'DIAGNOSTIC',
        level: 'ERROR',
        message: i18n.t('undoHistory.initializeFailed'),
        outcome: 'Failed',
        source: 'Application startup',
      });
    } catch {
      console.error('undo-history-initialization-log-write-failed');
    }
  }

  const createProfileAndResumePreflight = async (
    input: CreateFirstProfileInput,
  ) => {
    await profileCreator.execute(input);
    // Reuse the normal load-and-validate path rather than trusting creation output.
    return preflight.execute();
  };

  createRoot(applicationRoot).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <App
          activityLog={activityLog}
          backupManager={backupManager}
          applicationVersion={packageMetadata.version}
          bookmarkManager={bookmarkManager}
          contentChanges={contentChanges}
          createProfileAndResumePreflight={createProfileAndResumePreflight}
          initialPreflightSnapshot={preflightSnapshot}
          onUiReady={(operationId) => preflight.markUiReady(operationId)}
          openBookmarkWindow={openBookmarkWindow}
          profileManager={profileManager}
          {...(clipboardReader
            ? {
                readClipboardText: clipboardReader.requestAndReadClipboardText,
              }
            : {})}
          resumePreflight={() => preflight.execute()}
          toolbarSavedStatus={{
            refresh: () =>
              toolbarSavedStatusPermission?.refreshToolbarSavedStatus() ??
              Promise.resolve(),
            removePermissionIfUnused: () =>
              toolbarSavedStatusPermission?.removeToolbarSavedStatusPermissionIfUnused() ??
              Promise.resolve(),
            requestPermission: () =>
              toolbarSavedStatusPermission?.requestToolbarSavedStatusPermission() ??
              Promise.resolve(),
          }}
          undoHistory={undoHistory}
          updateAnnouncements={updateAnnouncements}
        />
      </I18nextProvider>
    </StrictMode>,
  );
}

void bootstrap(rootElement);
