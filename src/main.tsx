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
import packageMetadata from '../package.json';
import { i18n } from './localization/i18n';
import { App } from './presentation/App';
import './styles/global.css';

const rootElement = document.querySelector<HTMLDivElement>('#root');

if (rootElement === null) {
  throw new Error('Application root element was not found.');
}

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
          applicationVersion={packageMetadata.version}
          bookmarkManager={bookmarkManager}
          createProfileAndResumePreflight={createProfileAndResumePreflight}
          initialPreflightSnapshot={preflightSnapshot}
          onUiReady={(operationId) => preflight.markUiReady(operationId)}
          profileManager={profileManager}
          resumePreflight={() => preflight.execute()}
          undoHistory={undoHistory}
          updateAnnouncements={updateAnnouncements}
        />
      </I18nextProvider>
    </StrictMode>,
  );
}

void bootstrap(rootElement);
