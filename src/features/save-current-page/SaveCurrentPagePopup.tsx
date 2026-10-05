import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { FolderTreeSummary } from '../../domain/folder';
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
  findNewestNonRootFolder,
} from '../folder-tree/folder-tree-data';

export interface SaveCurrentPageReadyState {
  profileId: string;
  root: FolderTreeSummary;
  settings: ProfileSettings;
  tab: CurrentTab;
}

export interface SaveCurrentPagePopupDependencies {
  activityLog: Pick<ManageActivityLog, 'record'>;
  bookmarkManager: Pick<
    ManageBookmarks,
    'captureUndoLineage' | 'createBookmark' | 'listBookmarkLocationsByUrl'
  >;
  captureCurrentTab(windowId: number): Promise<string>;
  close(): void;
  contentChanges: Pick<
    ContentChangeBridge,
    'profileActivation' | 'publish' | 'subscribeProfileActivation'
  >;
  initializeUndo(): Promise<boolean>;
  loadDuplicateLocations(
    profileId: string,
    url: string,
  ): Promise<readonly BookmarkUrlLocation[]>;
  loadFolderTree(profileId: string): Promise<readonly FolderTreeSummary[]>;
  undoHistory: Pick<UndoHistoryService, 'record' | 'runMutation'>;
}

interface SaveCurrentPagePopupProps {
  dependencies: SaveCurrentPagePopupDependencies;
  ready: SaveCurrentPageReadyState;
}

type DuplicateView =
  | 'editor'
  | 'checking-duplicate'
  | 'duplicate-check-failed'
  | 'initial-prevented'
  | 'initial-warning'
  | 'late-prevented'
  | 'late-warning';

type PreparedContentValue = CreateContentValue & { url: string };

interface UnsupportedCurrentPageProps {
  onClose(): void;
}

interface FirstRunPopupProps {
  onClose(): void;
  openProfileCreation(): Promise<void>;
}

/** Directs a user without an active profile to first-profile creation. */
export function FirstRunPopup({
  onClose,
  openProfileCreation,
}: FirstRunPopupProps) {
  const { t } = useTranslation();
  const [isOpening, setIsOpening] = useState(false);
  const [openError, setOpenError] = useState(false);

  return (
    <main
      aria-describedby="first-run-popup-message"
      aria-labelledby="first-run-popup-title"
      className="save-current-page__decision save-current-page__load-error"
    >
      <div className="save-current-page__decision-content">
        <h1 id="first-run-popup-title">{t('saveCurrentPage.firstRunTitle')}</h1>
        <p id="first-run-popup-message">{t('saveCurrentPage.firstRun')}</p>
        {openError ? (
          <p role="alert">{t('saveCurrentPage.profileOpenFailed')}</p>
        ) : null}
      </div>
      <footer>
        <button disabled={isOpening} onClick={onClose} type="button">
          {t('saveCurrentPage.close')}
        </button>
        <button
          autoFocus
          disabled={isOpening}
          onClick={() => {
            setIsOpening(true);
            setOpenError(false);
            void openProfileCreation()
              .then(onClose)
              .catch(() => {
                console.error('profile-creation-tab-open-failed');
                setOpenError(true);
                setIsOpening(false);
              });
          }}
          type="button"
        >
          {isOpening
            ? t('saveCurrentPage.openingProfileCreation')
            : t('saveCurrentPage.createProfile')}
        </button>
      </footer>
    </main>
  );
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
  ready,
}: SaveCurrentPagePopupProps) {
  const { t } = useTranslation();
  const [folders, setFolders] = useState<readonly FolderTreeSummary[]>([
    ready.root,
  ]);
  const [selectedFolderId, setSelectedFolderId] = useState(ready.root.id);
  const [treeStatus, setTreeStatus] = useState<'loading' | 'ready' | 'failed'>(
    'loading',
  );
  const userSelectedFolderRef = useRef(false);
  const startupStartedRef = useRef(false);
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
  const [duplicateLocations, setDuplicateLocations] = useState<
    readonly BookmarkUrlLocation[]
  >([]);
  const [decisionError, setDecisionError] = useState('');
  const [isDecisionSaving, setIsDecisionSaving] = useState(false);
  const [view, setView] = useState<DuplicateView>(() =>
    ready.settings.duplicateHandling === 'allow'
      ? 'editor'
      : 'checking-duplicate',
  );
  const selectedFolder =
    folders.find(({ id }) => id === selectedFolderId) ?? ready.root;

  const recordDiagnostic = useCallback(
    async (eventCode: string, level: 'WARN' | 'ERROR', message: string) => {
      try {
        await dependencies.activityLog.record(ready.profileId, {
          action: 'Read',
          category: 'Application',
          dataChanged: false,
          durationMs: 0,
          eventCode,
          itemType: 'Popup state',
          itemsAffected: 0,
          kind: 'DIAGNOSTIC',
          level,
          message,
          outcome: level === 'WARN' ? 'Skipped' : 'Failed',
          source: 'Toolbar popup',
        });
      } catch {
        console.error('current-tab-popup-activity-log-write-failed');
      }
    },
    [dependencies.activityLog, ready.profileId],
  );

  const loadFolderTree = useCallback(async () => {
    setTreeStatus('loading');
    try {
      const loadedFolders = await dependencies.loadFolderTree(ready.profileId);
      const hasRoot = loadedFolders.some(
        ({ id, isRoot }) => id === ready.root.id && isRoot,
      );
      if (!hasRoot) throw new Error('popup-folder-tree-root-missing');
      setFolders(loadedFolders);
      if (!userSelectedFolderRef.current) {
        setSelectedFolderId(
          (findNewestNonRootFolder(loadedFolders) ?? ready.root).id,
        );
      }
      setTreeStatus('ready');
    } catch {
      setFolders([ready.root]);
      setSelectedFolderId(ready.root.id);
      setTreeStatus('failed');
      await recordDiagnostic(
        'POPUP-FOLDER-TREE-LOAD-DEGRADED',
        'WARN',
        'Popup folder tree was unavailable. Home remains available.',
      );
    }
  }, [dependencies, ready.profileId, ready.root, recordDiagnostic]);

  useEffect(() => {
    if (startupStartedRef.current) return;
    startupStartedRef.current = true;
    void loadFolderTree();
    if (ready.settings.duplicateHandling === 'allow') return;
    void dependencies
      .loadDuplicateLocations(ready.profileId, ready.tab.url)
      .then((locations) => {
        setDuplicateLocations(locations);
        setView(
          locations.length === 0
            ? 'editor'
            : ready.settings.duplicateHandling === 'prevent'
              ? 'initial-prevented'
              : 'initial-warning',
        );
      })
      .catch(async () => {
        setView('duplicate-check-failed');
        await recordDiagnostic(
          'CURRENT-TAB-DUPLICATE-CHECK-FAILED',
          'ERROR',
          'Current page duplicate check failed.',
        );
      });
  }, [
    dependencies,
    loadFolderTree,
    ready.profileId,
    ready.settings.duplicateHandling,
    ready.tab.url,
    recordDiagnostic,
  ]);

  useEffect(
    () =>
      dependencies.contentChanges.subscribeProfileActivation((activation) => {
        if (activation.profileId !== ready.profileId) dependencies.close();
      }),
    [dependencies, ready.profileId],
  );

  const record = async (
    eventCode: string,
    level: 'INFO' | 'WARN' | 'ERROR',
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
    const mutate = async () => {
      const before = await dependencies.bookmarkManager.captureUndoLineage(
        ready.profileId,
        selectedFolder.id,
      );
      const created = await dependencies.bookmarkManager.createBookmark({
        ...value,
        parentId: selectedFolder.id,
        profileId: ready.profileId,
        tags:
          ready.settings.tagOrder === 'alphabetical'
            ? [...value.tags].sort((left, right) => left.localeCompare(right))
            : value.tags,
      });
      const afterLineage =
        await dependencies.bookmarkManager.captureUndoLineage(
          ready.profileId,
          selectedFolder.id,
        );
      await dependencies.undoHistory.record({
        action: 'created',
        after: {
          ...afterLineage,
          bookmarks: [created],
        },
        before,
        itemId: created.id,
        itemType: 'bookmark',
        profileId: ready.profileId,
      });
    };
    const undoReady = await dependencies.initializeUndo();
    if (undoReady) await dependencies.undoHistory.runMutation(mutate);
    else {
      await recordDiagnostic(
        'CURRENT-TAB-UNDO-HISTORY-DEGRADED',
        'WARN',
        'Current page save continued without undo history.',
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
    }
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

  if (view === 'checking-duplicate') {
    return (
      <main className="save-current-page__status" role="status">
        {t('saveCurrentPage.checkingDuplicate')}
      </main>
    );
  }

  if (view === 'duplicate-check-failed') {
    return (
      <main className="save-current-page__decision save-current-page__load-error">
        <div className="save-current-page__decision-content">
          <p role="alert">{t('saveCurrentPage.duplicateCheckFailed')}</p>
        </div>
        <footer>
          <button onClick={dependencies.close} type="button">
            {t('saveCurrentPage.close')}
          </button>
          <button
            autoFocus
            onClick={() => {
              setView('checking-duplicate');
              void dependencies
                .loadDuplicateLocations(ready.profileId, ready.tab.url)
                .then((locations) => {
                  setDuplicateLocations(locations);
                  setView(
                    locations.length === 0
                      ? 'editor'
                      : ready.settings.duplicateHandling === 'prevent'
                        ? 'initial-prevented'
                        : 'initial-warning',
                  );
                })
                .catch(() => setView('duplicate-check-failed'));
            }}
            type="button"
          >
            {t('saveCurrentPage.retry')}
          </button>
        </footer>
      </main>
    );
  }

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
      autoCropScreenshot={ready.settings.autoCropPopupScreenshots ?? false}
      afterNote={
        <section
          aria-labelledby="save-current-page-destination"
          className="save-current-page__destination"
        >
          <h2 id="save-current-page-destination">
            {t('saveCurrentPage.destination')}
          </h2>
          <FolderTreePicker
            folderTree={buildFolderTree(folders)}
            idPrefix="save-current-page"
            initiallyExpandedFolderIds={findFolderAncestorIds(
              folders,
              selectedFolder.id,
            )}
            onSelect={(_path, folderId) => {
              userSelectedFolderRef.current = true;
              setSelectedFolderId(folderId);
            }}
            selectedFolderId={selectedFolder.id}
            key={treeStatus}
          />
          {treeStatus === 'loading' ? (
            <p role="status">{t('saveCurrentPage.folderTreeLoading')}</p>
          ) : null}
          {treeStatus === 'failed' ? (
            <div className="save-current-page__tree-error">
              <p role="alert">{t('saveCurrentPage.folderTreeFailed')}</p>
              <button onClick={() => void loadFolderTree()} type="button">
                {t('saveCurrentPage.retryFolders')}
              </button>
            </div>
          ) : null}
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
      showImageAppearance={false}
      onAutoCropResult={(outcome) =>
        record(
          outcome === 'succeeded'
            ? 'CURRENT-TAB-SCREENSHOT-AUTO-CROP-COMPLETE'
            : 'CURRENT-TAB-SCREENSHOT-AUTO-CROP-FALLBACK',
          outcome === 'succeeded' ? 'INFO' : 'WARN',
          outcome === 'succeeded' ? 'Succeeded' : 'Failed',
        )
      }
      onCropFailure={() =>
        record('CURRENT-TAB-IMAGE-CROP-FAILED', 'ERROR', 'Failed')
      }
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
