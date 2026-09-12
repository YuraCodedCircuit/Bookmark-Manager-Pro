import '../../src/platform/validation/configure-runtime-validation';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import { createActivityLogService } from '../../src/application/activity-log/create-activity-log-service';
import { createBookmarkManager } from '../../src/application/bookmark/create-bookmark-manager';
import { createWebPreflight } from '../../src/application/preflight/create-web-preflight';
import { createUndoHistoryService } from '../../src/application/undo-history/create-undo-history-service';
import {
  SaveCurrentPagePopup,
  type SaveCurrentPageReadyState,
  UnsupportedCurrentPage,
} from '../../src/features/save-current-page/SaveCurrentPagePopup';
import { isSaveableCurrentPageUrl } from '../../src/features/save-current-page/current-page-url';
import { i18n } from '../../src/localization/i18n';
import {
  captureCurrentTab,
  CurrentTabUrlUnavailableError,
  getCurrentTab,
} from '../../src/platform/tabs/current-tab';
import { findNewestNonRootFolder } from '../../src/features/folder-tree/folder-tree-data';
import { createContentChangeBridge } from '../../src/platform/content-change/create-content-change-bridge';
import '../../src/styles/global.css';
import './popup.css';

const activityLog = createActivityLogService();
const bookmarkManager = createBookmarkManager();
const preflight = createWebPreflight(activityLog);
const undoHistory = createUndoHistoryService(bookmarkManager);
const contentChanges = createContentChangeBridge();
const popupDependencies = {
  activityLog,
  bookmarkManager,
  captureCurrentTab,
  close: () => window.close(),
  contentChanges,
  undoHistory,
};
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      window.setTimeout(
        () => reject(new Error('popup-initialization-timeout')),
        timeoutMs,
      ),
    ),
  ]);
}

async function loadReadyState(): Promise<{
  initialDuplicateLocations: Awaited<
    ReturnType<typeof bookmarkManager.listBookmarkLocationsByUrl>
  >;
  ready: SaveCurrentPageReadyState;
}> {
  const [snapshot, tab] = await withTimeout(
    Promise.all([preflight.execute(), getCurrentTab()]),
    8_000,
  );
  if (snapshot.initialization.status !== 'ready')
    throw new Error('popup-profile-not-ready');
  if (!isSaveableCurrentPageUrl(tab.url))
    throw new Error('popup-current-url-not-supported');
  const { profile, settings } = snapshot.initialization;
  const [root, folders] = await withTimeout(
    Promise.all([
      bookmarkManager.ensureRoot(profile.id),
      bookmarkManager.listFolders(profile.id),
      undoHistory.initialize(),
    ]).then(
      ([rootFolder, profileFolders]) => [rootFolder, profileFolders] as const,
    ),
    8_000,
  );
  const folder = findNewestNonRootFolder(folders) ?? root;
  let initialDuplicateLocations: Awaited<
    ReturnType<typeof bookmarkManager.listBookmarkLocationsByUrl>
  > = [];
  if (settings.duplicateHandling !== 'allow') {
    try {
      initialDuplicateLocations = await withTimeout(
        bookmarkManager.listBookmarkLocationsByUrl(profile.id, tab.url),
        8_000,
      );
    } catch (error) {
      try {
        await activityLog.record(profile.id, {
          action: 'Read',
          category: 'Bookmarks',
          dataChanged: false,
          durationMs: 0,
          eventCode: 'CURRENT-TAB-DUPLICATE-CHECK-FAILED',
          itemType: 'Bookmark',
          itemsAffected: 0,
          kind: 'DIAGNOSTIC',
          level: 'ERROR',
          message: 'Current page duplicate check failed.',
          outcome: 'Failed',
          source: 'Toolbar popup',
        });
      } catch {
        console.error('current-tab-popup-activity-log-write-failed');
      }
      throw new Error('popup-duplicate-check-failed', { cause: error });
    }
  }
  return {
    initialDuplicateLocations,
    ready: { folder, folders, profileId: profile.id, settings, tab },
  };
}

const root = document.querySelector<HTMLDivElement>('#root');
if (!root) throw new Error('Popup root element was not found.');
const reactRoot = createRoot(root);
reactRoot.render(<main className="save-current-page__status">Loading…</main>);

async function bootstrap(): Promise<void> {
  reactRoot.render(
    <main className="save-current-page__status">Loading...</main>,
  );
  try {
    const { initialDuplicateLocations, ready } = await loadReadyState();
    reactRoot.render(
      <StrictMode>
        <I18nextProvider i18n={i18n}>
          <SaveCurrentPagePopup
            dependencies={popupDependencies}
            initialDuplicateLocations={initialDuplicateLocations}
            ready={ready}
          />
        </I18nextProvider>
      </StrictMode>,
    );
  } catch (error) {
    if (
      error instanceof CurrentTabUrlUnavailableError ||
      (error instanceof Error &&
        error.message === 'popup-current-url-not-supported')
    ) {
      reactRoot.render(
        <StrictMode>
          <I18nextProvider i18n={i18n}>
            <UnsupportedCurrentPage onClose={() => window.close()} />
          </I18nextProvider>
        </StrictMode>,
      );
      return;
    }
    console.error('save-current-page-popup-initialization-failed');
    const message =
      error instanceof Error && error.message === 'popup-profile-not-ready'
        ? i18n.t('saveCurrentPage.firstRun')
        : i18n.t('saveCurrentPage.loadError');
    reactRoot.render(
      <StrictMode>
        <I18nextProvider i18n={i18n}>
          {renderPopupLoadError(message, bootstrap)}
        </I18nextProvider>
      </StrictMode>,
    );
  }
}

function renderPopupLoadError(message: string, onRetry: () => Promise<void>) {
  return (
    <main className="save-current-page__decision save-current-page__load-error">
      <div className="save-current-page__decision-content">
        <p role="alert">{message}</p>
      </div>
      <footer>
        <button onClick={() => window.close()} type="button">
          {i18n.t('saveCurrentPage.close')}
        </button>
        <button autoFocus onClick={() => void onRetry()} type="button">
          {i18n.t('saveCurrentPage.retry')}
        </button>
      </footer>
    </main>
  );
}

void bootstrap();
