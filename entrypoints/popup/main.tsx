import '../../src/platform/validation/configure-runtime-validation';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import { createActivityLogService } from '../../src/application/activity-log/create-activity-log-service';
import { createBookmarkManager } from '../../src/application/bookmark/create-bookmark-manager';
import { createWebPreflight } from '../../src/application/preflight/create-web-preflight';
import { createUndoHistoryService } from '../../src/application/undo-history/create-undo-history-service';
import {
  FirstRunPopup,
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
import { createContentChangeBridge } from '../../src/platform/content-change/create-content-change-bridge';
import { refreshToolbarSavedStatus } from '../../src/platform/browser/toolbar-saved-status-permission';
import { openProfileCreation } from '../../src/platform/browser/open-profile-creation';
import { createPopupScrollbarVisibility } from '../../src/features/save-current-page/popup-scrollbar-visibility';
import '../../src/styles/global.css';
import './popup.css';

const activityLog = createActivityLogService();
const bookmarkManager = createBookmarkManager();
const preflight = createWebPreflight(activityLog);
const undoHistory = createUndoHistoryService(bookmarkManager);
const contentChanges = createContentChangeBridge(() => {
  void refreshToolbarSavedStatus().catch(() =>
    console.error('toolbar-saved-status-request-failed'),
  );
});
const popupScrollbarVisibility = createPopupScrollbarVisibility(
  document.documentElement,
  window,
);
popupScrollbarVisibility.setBehavior('scrolling');
const popupDependencies = {
  activityLog,
  bookmarkManager,
  captureCurrentTab,
  close: () => window.close(),
  contentChanges,
  initializeUndo: () => undoHistory.initialize(),
  loadDuplicateLocations: (profileId: string, url: string) =>
    withTimeout(
      bookmarkManager.listBookmarkLocationsByUrl(profileId, url),
      8_000,
    ),
  loadFolderTree: (profileId: string) =>
    withTimeout(bookmarkManager.listFolderTreeSummaries(profileId), 8_000),
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
  ready: SaveCurrentPageReadyState;
}> {
  const [snapshot, tab] = await withTimeout(
    Promise.all([
      preflight.execute().then((value) => {
        if (value.initialization.status === 'ready')
          popupScrollbarVisibility.setBehavior(
            value.initialization.settings.scrollbarBehavior ?? 'scrolling',
          );
        return value;
      }),
      getCurrentTab(),
    ]),
    8_000,
  );
  if (snapshot.initialization.status !== 'ready')
    throw new Error('popup-profile-not-ready');
  if (!isSaveableCurrentPageUrl(tab.url))
    throw new Error('popup-current-url-not-supported');
  const { profile, settings } = snapshot.initialization;
  const root = await withTimeout(bookmarkManager.ensureRoot(profile.id), 8_000);
  return {
    ready: {
      profileId: profile.id,
      root: {
        createdAt: root.createdAt,
        id: root.id,
        isRoot: root.isRoot,
        parentId: root.parentId,
        profileId: root.profileId,
        title: root.title,
      },
      settings,
      tab,
    },
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
    const { ready } = await loadReadyState();
    reactRoot.render(
      <StrictMode>
        <I18nextProvider i18n={i18n}>
          <SaveCurrentPagePopup
            dependencies={popupDependencies}
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
    if (error instanceof Error && error.message === 'popup-profile-not-ready') {
      reactRoot.render(
        <StrictMode>
          <I18nextProvider i18n={i18n}>
            <FirstRunPopup
              onClose={() => window.close()}
              openProfileCreation={openProfileCreation}
            />
          </I18nextProvider>
        </StrictMode>,
      );
      return;
    }
    console.error('save-current-page-popup-initialization-failed');
    reactRoot.render(
      <StrictMode>
        <I18nextProvider i18n={i18n}>
          {renderPopupLoadError(i18n.t('saveCurrentPage.loadError'), bootstrap)}
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
