import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ManageActivityLog } from '../../application/activity-log/manage-activity-log';
import type {
  BookmarkUrlLocation,
  ManageBookmarks,
} from '../../application/bookmark/manage-bookmarks';
import type { UndoHistoryService } from '../../application/undo-history/undo-history-service';
import {
  addHttpsToHostLikeUrl,
  normalizeBookmarkUrl,
} from '../../domain/bookmark-url';
import type { Folder } from '../../domain/folder';
import type { ProfileSettings } from '../../domain/profile-settings';
import type { ContentChangeBridge } from '../../platform/content-change/content-change-bridge';
import type { CurrentTab } from '../../platform/tabs/current-tab';
import {
  CreateContentDialog,
  type CreateContentValue,
} from '../bookmark-editor/CreateContentDialog';
import { FolderTreePicker } from '../folder-tree/FolderTreePicker';
import {
  buildFolderTree,
  findFolderAncestorIds,
} from '../folder-tree/folder-tree-data';

export interface SaveCurrentPageReadyState {
  folder: Folder;
  folders: readonly Folder[];
  profileId: string;
  settings: ProfileSettings;
  tab: CurrentTab;
}

export interface SaveCurrentPagePopupDependencies {
  activityLog: Pick<ManageActivityLog, 'record'>;
  bookmarkManager: Pick<
    ManageBookmarks,
    'captureUndoState' | 'createBookmark' | 'listBookmarkLocationsByUrl'
  >;
  captureCurrentTab(windowId: number): Promise<string>;
  close(): void;
  contentChanges: Pick<
    ContentChangeBridge,
    'profileActivation' | 'publish' | 'subscribeProfileActivation'
  >;
  undoHistory: Pick<UndoHistoryService, 'record' | 'runMutation'>;
}

interface SaveCurrentPagePopupProps {
  dependencies: SaveCurrentPagePopupDependencies;
  initialDuplicateLocations: readonly BookmarkUrlLocation[];
  ready: SaveCurrentPageReadyState;
}

type DuplicateView =
  | 'editor'
  | 'initial-prevented'
  | 'initial-warning'
  | 'late-prevented'
  | 'late-warning';

type PreparedContentValue = CreateContentValue & { url: string };

interface UnsupportedCurrentPageProps {
  onClose(): void;
}

/** Explains that the active browser page cannot be stored as a bookmark. */
export function UnsupportedCurrentPage({
  onClose,
}: UnsupportedCurrentPageProps) {
  const { t } = useTranslation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <main
      aria-describedby="unsupported-current-page-message"
      aria-labelledby="unsupported-current-page-title"
      className="save-current-page__decision save-current-page__load-error"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div className="save-current-page__decision-content">
        <h1 id="unsupported-current-page-title">
          {t('saveCurrentPage.unsupportedTitle')}
        </h1>
        <p id="unsupported-current-page-message">
          {t('saveCurrentPage.unsupportedMessage')}
        </p>
      </div>
      <footer>
        <button ref={closeButtonRef} onClick={onClose} type="button">
          {t('saveCurrentPage.close')}
        </button>
      </footer>
    </main>
  );
}

/** Coordinates duplicate decisions and persistence for the toolbar save popup. */
export function SaveCurrentPagePopup({
  dependencies,
  initialDuplicateLocations,
  ready,
}: SaveCurrentPagePopupProps) {
  const { t } = useTranslation();
  const [selectedFolderId, setSelectedFolderId] = useState(ready.folder.id);
  const [approvedCanonicalUrl, setApprovedCanonicalUrl] = useState<
    string | undefined
  >();
  const [editorValue, setEditorValue] = useState<CreateContentValue>(() => ({
    cardAppearance: ready.settings.lastBookmarkAppearance ?? {
      kind: 'color',
      value: '#2f7de1',
    },
    note: '',
    tags: [],
    title: ready.tab.title || ready.tab.url,
    url: ready.tab.url,
  }));
  const [pendingValue, setPendingValue] = useState<PreparedContentValue>();
  const [duplicateLocations, setDuplicateLocations] = useState(
    initialDuplicateLocations,
  );
  const [decisionError, setDecisionError] = useState('');
  const [isDecisionSaving, setIsDecisionSaving] = useState(false);
  const [view, setView] = useState<DuplicateView>(() => {
    if (
      initialDuplicateLocations.length === 0 ||
      ready.settings.duplicateHandling === 'allow'
    )
      return 'editor';
    return ready.settings.duplicateHandling === 'prevent'
      ? 'initial-prevented'
      : 'initial-warning';
  });
  const selectedFolder =
    ready.folders.find(({ id }) => id === selectedFolderId) ?? ready.folder;

  useEffect(
    () =>
      dependencies.contentChanges.subscribeProfileActivation((activation) => {
        if (activation.profileId !== ready.profileId) dependencies.close();
      }),
    [dependencies, ready.profileId],
  );

  const record = async (
    eventCode: string,
    level: 'INFO' | 'ERROR',
    outcome: 'Succeeded' | 'Failed',
  ) => {
    try {
      await dependencies.activityLog.record(ready.profileId, {
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

  const persist = async (value: PreparedContentValue) => {
    const activation = await dependencies.contentChanges.profileActivation();
    if (activation.profileId !== ready.profileId) {
      dependencies.close();
      throw new Error('popup-profile-changed');
    }
    await dependencies.undoHistory.runMutation(async () => {
      const before = await dependencies.bookmarkManager.captureUndoState(
        ready.profileId,
      );
      await dependencies.bookmarkManager.createBookmark({
        ...value,
        parentId: selectedFolder.id,
        profileId: ready.profileId,
        tags:
          ready.settings.tagOrder === 'alphabetical'
            ? [...value.tags].sort((left, right) => left.localeCompare(right))
            : value.tags,
      });
      const after = await dependencies.bookmarkManager.captureUndoState(
        ready.profileId,
      );
      const beforeIds = new Set(before.bookmarks.map(({ id }) => id));
      const created = after.bookmarks.find(({ id }) => !beforeIds.has(id));
      if (created) {
        await dependencies.undoHistory.record({
          action: 'created',
          after,
          before,
          itemId: created.id,
          itemType: 'bookmark',
          profileId: ready.profileId,
        });
      }
    });
    await dependencies.contentChanges
      .publish({
        affectedParentIds: [selectedFolder.id],
        changedFolderIds: [],
        deletedFolderPaths: [],
        fullRefresh: false,
        navigationChanged: true,
        profileId: ready.profileId,
      })
      .catch(() => console.error('popup-content-change-publish-failed'));
    await record('CURRENT-TAB-BOOKMARK-CREATE-COMPLETE', 'INFO', 'Succeeded');
  };

  const prepareForSave = async (
    value: CreateContentValue,
  ): Promise<PreparedContentValue> => {
    if (!value.url) throw new Error('popup-not-ready');
    let url = value.url;
    const normalized = addHttpsToHostLikeUrl(url);
    if (normalized && window.confirm(t('contentEditor.normalizationConfirm')))
      url = normalized;
    if (
      url.toLowerCase().startsWith('ftp://') &&
      !window.confirm(t('contentEditor.ftpSaveConfirm'))
    )
      throw new Error('ftp-bookmark-cancelled');
    return { ...value, url };
  };

  const save = async (value: CreateContentValue): Promise<boolean | void> => {
    try {
      const preparedValue = await prepareForSave(value);
      const canonicalUrl = normalizeBookmarkUrl(preparedValue.url ?? '');
      if (ready.settings.duplicateHandling !== 'allow') {
        const locations =
          await dependencies.bookmarkManager.listBookmarkLocationsByUrl(
            ready.profileId,
            canonicalUrl,
          );
        if (locations.length > 0 && approvedCanonicalUrl !== canonicalUrl) {
          setEditorValue(preparedValue);
          setPendingValue(preparedValue);
          setDuplicateLocations(locations);
          setDecisionError('');
          setView(
            ready.settings.duplicateHandling === 'prevent'
              ? 'late-prevented'
              : 'late-warning',
          );
          return false;
        }
      }
      await persist(preparedValue);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'ftp-bookmark-cancelled' ||
          error.message === 'popup-profile-changed')
      )
        throw error;
      await record('CURRENT-TAB-BOOKMARK-CREATE-FAILED', 'ERROR', 'Failed');
      throw error;
    }
  };

  const approveInitialDuplicate = () => {
    setApprovedCanonicalUrl(normalizeBookmarkUrl(ready.tab.url));
    setView('editor');
  };

  const approveLateDuplicate = async () => {
    if (!pendingValue) return;
    setIsDecisionSaving(true);
    setDecisionError('');
    try {
      await persist(pendingValue);
      dependencies.close();
    } catch {
      await record('CURRENT-TAB-BOOKMARK-CREATE-FAILED', 'ERROR', 'Failed');
      setDecisionError(t('contentEditor.saveError'));
      setIsDecisionSaving(false);
    }
  };

  const returnToEditor = () => {
    setDecisionError('');
    setPendingValue(undefined);
    setView('editor');
  };

  if (view !== 'editor') {
    const isInitial = view.startsWith('initial');
    const isPrevented = view.endsWith('prevented');
    return (
      <DuplicateDecision
        duplicateLocations={duplicateLocations}
        error={decisionError}
        isInitial={isInitial}
        isPrevented={isPrevented}
        isSaving={isDecisionSaving}
        onBack={returnToEditor}
        onClose={dependencies.close}
        onContinue={() => {
          if (isInitial) approveInitialDuplicate();
          else void approveLateDuplicate();
        }}
      />
    );
  }

  return (
    <CreateContentDialog
      afterNote={
        <section
          aria-labelledby="save-current-page-destination"
          className="save-current-page__destination"
        >
          <h2 id="save-current-page-destination">
            {t('saveCurrentPage.destination')}
          </h2>
          <FolderTreePicker
            folderTree={buildFolderTree(ready.folders)}
            idPrefix="save-current-page"
            initiallyExpandedFolderIds={findFolderAncestorIds(
              ready.folders,
              selectedFolder.id,
            )}
            onSelect={(_path, folderId) => setSelectedFolderId(folderId)}
            selectedFolderId={selectedFolder.id}
          />
        </section>
      }
      defaultAppearance={ready.settings.lastBookmarkAppearance}
      initialValue={editorValue}
      isOpen
      kind="bookmark"
      onCaptureScreenshot={async () => {
        try {
          const image = await dependencies.captureCurrentTab(
            ready.tab.windowId,
          );
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
      onClose={dependencies.close}
      onCreate={save}
      parentName={selectedFolder.title}
      titleKey="saveCurrentPage.title"
    />
  );
}

interface DuplicateDecisionProps {
  duplicateLocations: readonly BookmarkUrlLocation[];
  error: string;
  isInitial: boolean;
  isPrevented: boolean;
  isSaving: boolean;
  onBack(): void;
  onClose(): void;
  onContinue(): void;
}

function DuplicateDecision({
  duplicateLocations,
  error,
  isInitial,
  isPrevented,
  isSaving,
  onBack,
  onClose,
  onContinue,
}: DuplicateDecisionProps) {
  const { t } = useTranslation();
  const safeActionRef = useRef<HTMLButtonElement>(null);
  const visibleLocations = duplicateLocations.slice(0, 3);
  const remainingLocationCount =
    duplicateLocations.length - visibleLocations.length;

  useEffect(() => safeActionRef.current?.focus(), []);

  return (
    <main
      aria-labelledby="duplicate-decision-title"
      className="save-current-page__decision"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || isSaving) return;
        event.preventDefault();
        if (isInitial) onClose();
        else onBack();
      }}
    >
      <div className="save-current-page__decision-content">
        <h1 id="duplicate-decision-title">
          {t('saveCurrentPage.duplicateTitle')}
        </h1>
        <p id="duplicate-decision-message">
          {t('saveCurrentPage.duplicateMessage')}
        </p>
        <div
          className="save-current-page__duplicate-locations"
          id="duplicate-decision-locations"
        >
          <p>{t('saveCurrentPage.duplicateSavedIn')}</p>
          <ul>
            {visibleLocations.map((location) => (
              <li key={location.folderId} title={location.folderTitle}>
                {location.folderTitle}
              </li>
            ))}
            {remainingLocationCount > 0 ? (
              <li>
                {t('saveCurrentPage.duplicateMoreFolders', {
                  count: remainingLocationCount,
                })}
              </li>
            ) : null}
          </ul>
        </div>
        <p id="duplicate-decision-detail">
          {t(
            isPrevented
              ? 'saveCurrentPage.duplicatePrevented'
              : 'saveCurrentPage.duplicateQuestion',
          )}
        </p>
        {error ? (
          <p className="content-editor__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <footer>
        <button
          aria-describedby="duplicate-decision-message duplicate-decision-locations duplicate-decision-detail"
          disabled={isSaving}
          onClick={isInitial ? onClose : onBack}
          ref={safeActionRef}
          type="button"
        >
          {t(isInitial ? 'saveCurrentPage.close' : 'saveCurrentPage.goBack')}
        </button>
        {!isPrevented ? (
          <button disabled={isSaving} onClick={onContinue} type="button">
            {t(
              isSaving
                ? 'saveCurrentPage.savingAnother'
                : 'saveCurrentPage.saveAnother',
            )}
          </button>
        ) : null}
      </footer>
    </main>
  );
}
