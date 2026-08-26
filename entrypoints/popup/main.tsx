import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider, useTranslation } from 'react-i18next';

import { createActivityLogService } from '../../src/application/activity-log/create-activity-log-service';
import { createBookmarkManager } from '../../src/application/bookmark/create-bookmark-manager';
import { createWebPreflight } from '../../src/application/preflight/create-web-preflight';
import { createUndoHistoryService } from '../../src/application/undo-history/create-undo-history-service';
import {
  CreateContentDialog,
  type CreateContentValue,
} from '../../src/features/bookmark-editor/CreateContentDialog';
import { i18n } from '../../src/localization/i18n';
import {
  captureCurrentTab,
  getCurrentTab,
  type CurrentTab,
} from '../../src/platform/tabs/current-tab';
import type { Folder } from '../../src/domain/folder';
import type { ProfileSettings } from '../../src/domain/profile-settings';
import { addHttpsToHostLikeUrl } from '../../src/domain/bookmark-url';
import '../../src/styles/global.css';
import './popup.css';

const activityLog = createActivityLogService();
const bookmarkManager = createBookmarkManager();
const preflight = createWebPreflight(activityLog);
const undoHistory = createUndoHistoryService(bookmarkManager);

interface ReadyState {
  folder: Folder;
  profileId: string;
  settings: ProfileSettings;
  tab: CurrentTab;
}

interface SaveCurrentPagePopupProps {
  ready: ReadyState;
}

export function SaveCurrentPagePopup({ ready }: SaveCurrentPagePopupProps) {
  const { t } = useTranslation();

  const record = async (
    eventCode: string,
    level: 'INFO' | 'ERROR',
    outcome: 'Succeeded' | 'Failed',
  ) => {
    try {
      await activityLog.record(ready.profileId, {
        action: eventCode.includes('SCREENSHOT') ? 'Capture' : 'Create',
        category: 'Bookmarks',
        dataChanged: eventCode === 'CURRENT-TAB-BOOKMARK-CREATE-COMPLETE',
        durationMs: 0,
        eventCode,
        itemType: eventCode.includes('SCREENSHOT') ? 'Card image' : 'Bookmark',
        itemsAffected: outcome === 'Succeeded' ? 1 : 0,
        kind: level === 'INFO' ? 'ACTIVITY' : 'DIAGNOSTIC',
        level,
        message:
          outcome === 'Succeeded'
            ? 'Current page operation completed.'
            : 'Current page operation failed.',
        outcome,
        source: 'Toolbar popup',
      });
    } catch {
      console.error('current-tab-popup-activity-log-write-failed');
    }
  };

  const save = async (value: CreateContentValue) => {
    if (!value.url) throw new Error('popup-not-ready');
    try {
      let url = value.url;
      const normalized = addHttpsToHostLikeUrl(url);
      if (normalized && window.confirm(t('contentEditor.normalizationConfirm')))
        url = normalized;
      if (
        url.toLowerCase().startsWith('ftp://') &&
        !window.confirm(t('contentEditor.ftpSaveConfirm'))
      )
        throw new Error('ftp-bookmark-cancelled');
      const duplicate = await bookmarkManager.hasBookmarkWithUrl(
        ready.profileId,
        url,
      );
      if (duplicate && ready.settings.duplicateHandling === 'prevent')
        throw new Error('duplicate-bookmark-prevented');
      if (
        duplicate &&
        ready.settings.duplicateHandling === 'warn' &&
        !window.confirm(t('contentEditor.duplicateConfirm'))
      )
        throw new Error('duplicate-bookmark-cancelled');

      await undoHistory.runMutation(async () => {
        const before = await bookmarkManager.captureUndoState(ready.profileId);
        await bookmarkManager.createBookmark({
          ...value,
          parentId: ready.folder.id,
          profileId: ready.profileId,
          tags:
            ready.settings.tagOrder === 'alphabetical'
              ? [...value.tags].sort((left, right) => left.localeCompare(right))
              : value.tags,
          url,
        });
        const after = await bookmarkManager.captureUndoState(ready.profileId);
        const beforeIds = new Set(before.bookmarks.map(({ id }) => id));
        const created = after.bookmarks.find(({ id }) => !beforeIds.has(id));
        if (created) {
          await undoHistory.record({
            action: 'created',
            after,
            before,
            itemId: created.id,
            itemType: 'bookmark',
            profileId: ready.profileId,
          });
        }
      });
      await record('CURRENT-TAB-BOOKMARK-CREATE-COMPLETE', 'INFO', 'Succeeded');
      window.close();
    } catch (error) {
      await record('CURRENT-TAB-BOOKMARK-CREATE-FAILED', 'ERROR', 'Failed');
      throw error;
    }
  };

  return (
    <CreateContentDialog
      defaultAppearance={ready.settings.lastBookmarkAppearance}
      initialValue={{
        cardAppearance: ready.settings.lastBookmarkAppearance ?? {
          kind: 'color',
          value: '#2f7de1',
        },
        note: '',
        tags: [],
        title: ready.tab.title || ready.tab.url,
        url: ready.tab.url,
      }}
      isOpen
      kind="bookmark"
      onCaptureScreenshot={async () => {
        try {
          const image = await captureCurrentTab(ready.tab.windowId);
          await record(
            'CURRENT-TAB-SCREENSHOT-CAPTURE-COMPLETE',
            'INFO',
            'Succeeded',
          );
          return image;
        } catch (error) {
          await record(
            'CURRENT-TAB-SCREENSHOT-CAPTURE-FAILED',
            'ERROR',
            'Failed',
          );
          throw error;
        }
      }}
      onClose={() => window.close()}
      onCreate={save}
      parentName={ready.folder.title}
      titleKey="saveCurrentPage.title"
    />
  );
}

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

async function loadReadyState(): Promise<ReadyState> {
  const [snapshot, tab] = await withTimeout(
    Promise.all([preflight.execute(), getCurrentTab()]),
    8_000,
  );
  if (snapshot.initialization.status !== 'ready')
    throw new Error('popup-profile-not-ready');
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
  const folder =
    folders.find(({ id }) => id === settings.lastOpenedFolderId) ?? root;
  return { folder, profileId: profile.id, settings, tab };
}

const root = document.querySelector<HTMLDivElement>('#root');
if (!root) throw new Error('Popup root element was not found.');
const reactRoot = createRoot(root);
reactRoot.render(<main className="save-current-page__status">Loading…</main>);

async function bootstrap(): Promise<void> {
  try {
    const ready = await loadReadyState();
    reactRoot.render(
      <StrictMode>
        <I18nextProvider i18n={i18n}>
          <SaveCurrentPagePopup ready={ready} />
        </I18nextProvider>
      </StrictMode>,
    );
  } catch (error) {
    console.error('save-current-page-popup-initialization-failed');
    const message =
      error instanceof Error && error.message === 'popup-profile-not-ready'
        ? i18n.t('saveCurrentPage.firstRun')
        : i18n.t('saveCurrentPage.loadError');
    reactRoot.render(
      <main className="save-current-page__status" role="alert">
        {message}
      </main>,
    );
  }
}

void bootstrap();
