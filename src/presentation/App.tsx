import {
  type CSSProperties,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useTranslation } from 'react-i18next';

import type { CreateFirstProfileInput } from '../application/profile/create-first-profile';
import type {
  ManageBookmarks,
  NavigationItem,
} from '../application/bookmark/manage-bookmarks';
import type { Bookmark } from '../domain/bookmark';
import type { Folder } from '../domain/folder';
import {
  defaultActivityLogSettings,
  type ManageActivityLog,
} from '../application/activity-log/manage-activity-log';
import type { ActivityLogSettings } from '../domain/activity-log';
import type { WebPreflightSnapshot } from '../application/preflight/preflight-state';
import type { ManageProfiles } from '../application/profile/manage-profiles';
import type {
  ProfileListItem,
  ProfileStorageUsage,
} from '../application/profile/profile-management-repository';
import { BookmarkGrid } from '../features/bookmark-browser/BookmarkGrid';
import { TopNavigation } from '../features/bookmark-browser/TopNavigation';
import {
  ContextMenu,
  type ContextMenuRequest,
} from '../features/context-menu/ContextMenu';
import { FolderTreePanel } from '../features/folder-tree/FolderTreePanel';
import { BookmarkActivityLogDialog } from '../features/activity-log/BookmarkActivityLogDialog';
import { ProfileMenuPanel } from '../features/profile-menu/ProfileMenuPanel';
import { ProfileManagerDialog } from '../features/profile-manager/ProfileManagerDialog';
import { ProfileSwitcherDialog } from '../features/profile-manager/ProfileSwitcherDialog';
import { UndoHistoryDialog } from '../features/undo-history/UndoHistoryDialog';
import { SynchronizationDialog } from '../features/synchronization/SynchronizationDialog';
import { shouldNotifyForSyncSetupEvent } from '../features/synchronization/sync-setup-feedback';
import { SyncFeedbackBridge } from '../features/synchronization/SyncFeedbackBridge';
import { createSyncBookmarksAdapter } from '../platform/browser/sync-bookmarks';
import { WelcomeDialog } from '../features/welcome/WelcomeDialog';
import {
  CreateContentDialog,
  type ContentKind,
  type CreateContentValue,
} from '../features/bookmark-editor/CreateContentDialog';
import { buildFolderTree } from '../features/folder-tree/folder-tree-data';
import { BookmarkDisplaySettingsDialog } from '../features/settings/BookmarkDisplaySettingsDialog';
import { FolderStyleDialog } from '../features/folder-style/FolderStyleDialog';
import {
  ItemInfoDialog,
  type ItemInfoField,
} from '../features/item-info/ItemInfoDialog';
import { getPathSeparator } from '../platform/navigation/path-separator';
import { writeClipboardText } from '../platform/clipboard/write-clipboard-text';
import { folderBackgroundStyle } from '../shared/appearance-style';
import {
  NotificationService,
  type NotificationInput,
} from '../application/notification/notification-service';
import { NotificationViewport } from '../features/notifications/NotificationViewport';
import { classifyBookmarkInputError } from '../application/bookmark/bookmark-input-error';
import { defaultNotificationPreferences } from '../domain/profile-settings';
import { addHttpsToHostLikeUrl } from '../domain/bookmark-url';
import { ConfirmationService } from '../application/confirmation/confirmation-service';
import { ConfirmationDialog } from '../features/confirmation/ConfirmationDialog';
import type { UndoHistoryService } from '../application/undo-history/undo-history-service';
import type {
  UndoHistoryAction,
  UndoHistoryItemType,
  UndoProfileState,
} from '../domain/undo-history';
import {
  defaultSearchPreferences,
  type BookmarkSearchResult,
  type SearchProfileSource,
} from '../domain/bookmark-search';
import { SearchDialog } from '../features/search/SearchDialog';
import { AboutDialog } from '../features/about/AboutDialog';
import { ChangelogDialog } from '../features/changelog/ChangelogDialog';
import changelogMarkdown from '../../CHANGELOG.md?raw';
import { getPublishedVersionSection } from '../features/changelog/changelog-sections';
import { LegalDialog } from '../features/legal/LegalDialog';
import { HelpDialog } from '../features/help/HelpDialog';
import { createBrowserSearchAdapter } from '../platform/search/browser-search';
import {
  defaultShortcutPreferences,
  matchesShortcut,
} from '../domain/keyboard-shortcuts';
import type { ManageUpdateAnnouncements } from '../application/update-announcement/manage-update-announcements';
import { createContentChangeBridge } from '../platform/content-change/create-content-change-bridge';
import type { ContentChangeBridge } from '../platform/content-change/content-change-bridge';
import type {
  ContentChange,
  ContentChangeInput,
  ProfileActivation,
  ProfileActivationInput,
} from '../messaging/content-change-protocol';
import { summarizeContentChange } from '../application/bookmark/summarize-content-change';

const browserSearch = createBrowserSearchAdapter();

interface AppProps {
  activityLog: Pick<
    ManageActivityLog,
    | 'clear'
    | 'createExport'
    | 'getSettings'
    | 'list'
    | 'record'
    | 'updateSettings'
  >;
  applicationVersion: string;
  contentChanges?: {
    profileActivation: ContentChangeBridge['profileActivation'];
    publish(input: ContentChangeInput): Promise<unknown>;
    publishProfileActivation: ContentChangeBridge['publishProfileActivation'];
    revision: ContentChangeBridge['revision'];
    subscribe: ContentChangeBridge['subscribe'];
    subscribeProfileActivation: ContentChangeBridge['subscribeProfileActivation'];
  };
  bookmarkManager: Pick<
    ManageBookmarks,
    | 'ensureRoot'
    | 'listFolders'
    | 'listBookmarks'
    | 'listContents'
    | 'listNavigationItems'
    | 'createBookmark'
    | 'createFolder'
    | 'updateBookmark'
    | 'updateFolder'
    | 'updateFolderStyle'
    | 'setFavorite'
    | 'moveItem'
    | 'hasBookmarkWithUrl'
    | 'deleteItem'
    | 'captureUndoState'
    | 'copyItem'
    | 'restoreUndoState'
  >;
  /** Persists the first profile and returns a freshly validated preflight snapshot. */
  createProfileAndResumePreflight(
    input: CreateFirstProfileInput,
  ): Promise<WebPreflightSnapshot>;
  initialPreflightSnapshot: WebPreflightSnapshot;
  /** Reports that React committed the current snapshot to the document. */
  onUiReady(operationId: string): void;
  profileManager: Pick<
    ManageProfiles,
    | 'list'
    | 'create'
    | 'update'
    | 'delete'
    | 'duplicate'
    | 'switchTo'
    | 'getStorageUsage'
    | 'updateBookmarkDisplay'
    | 'updateProfileSettings'
    | 'updateLastOpenedFolder'
  >;
  resumePreflight(): Promise<WebPreflightSnapshot>;
  undoHistory: UndoHistoryService;
  updateAnnouncements: Pick<
    ManageUpdateAnnouncements,
    | 'claim'
    | 'getPreferences'
    | 'markShown'
    | 'markUnavailable'
    | 'updatePreferences'
  >;
}

type ConfirmationAction =
  'clearAll' | 'addHttps' | 'delete' | 'move' | 'open' | 'save' | 'saveCopy';

type InternalClipboard = {
  itemId: string;
  kind: 'bookmark' | 'folder';
  operation: 'copy' | 'cut';
  parentId: string;
  profileId: string;
};

const pasteDisabledKeys = new Set(['paste']);

/** Renders the application exclusively from a completed preflight snapshot. */
export function App({
  activityLog,
  applicationVersion,
  contentChanges: suppliedContentChanges,
  bookmarkManager,
  createProfileAndResumePreflight,
  initialPreflightSnapshot,
  onUiReady,
  profileManager,
  resumePreflight,
  undoHistory,
  updateAnnouncements,
}: AppProps) {
  const { t } = useTranslation();
  const [confirmationService] = useState(() => new ConfirmationService());
  const [notificationService] = useState(() => new NotificationService());
  const [syncAdapter] = useState(() => createSyncBookmarksAdapter());
  const [contentChanges] = useState(
    () => suppliedContentChanges ?? createContentChangeBridge(),
  );
  const undoHistoryState = useSyncExternalStore(
    undoHistory.store.subscribe,
    undoHistory.store.getState,
    undoHistory.store.getInitialState,
  );
  const requestConfirmation = useCallback(
    async (message: string, action: ConfirmationAction) => {
      try {
        return await confirmationService.request({
          cancelLabel: t('confirmation.cancel'),
          confirmLabel: t(`confirmation.actions.${action}`),
          message,
          title: t('confirmation.title'),
          variant: action === 'delete' ? 'danger' : 'primary',
        });
      } catch {
        console.error(
          'A privacy-safe confirmation could not be displayed; the action was cancelled.',
        );
        return false;
      }
    },
    [confirmationService, t],
  );
  /** Keeps transient notification failures from changing the primary result. */
  const showNotification = useCallback(
    (input: NotificationInput) => {
      try {
        notificationService.show(input);
      } catch {
        console.error('A privacy-safe notification could not be displayed.');
      }
    },
    [notificationService],
  );
  const [preflightSnapshot, setPreflightSnapshot] = useState(
    initialPreflightSnapshot,
  );
  const currentInitializationState = preflightSnapshot.initialization;
  const [currentPath, setCurrentPath] = useState<readonly string[]>(['Home']);
  const [currentFolderId, setCurrentFolderId] = useState<string>();
  const [bookmarks, setBookmarks] = useState<readonly Bookmark[]>([]);
  const [folders, setFolders] = useState<readonly Folder[]>([]);
  const [allFolders, setAllFolders] = useState<readonly Folder[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<readonly NavigationItem[]>(
    [],
  );
  const [recentItems, setRecentItems] = useState<readonly NavigationItem[]>([]);
  const [contentWindow, setContentWindow] = useState<{
    kind: ContentKind;
    target?: Bookmark | Folder;
  } | null>(null);
  const [isFolderStyleOpen, setIsFolderStyleOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchSources, setSearchSources] = useState<
    readonly SearchProfileSource[]
  >([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchLoadFailed, setSearchLoadFailed] = useState(false);
  const [infoItem, setInfoItem] = useState<NavigationItem | null>(null);
  const [isTreeOpen, setIsTreeOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [openActivityLogAfterMenuClose, setOpenActivityLogAfterMenuClose] =
    useState(false);
  const [openUndoHistoryAfterMenuClose, setOpenUndoHistoryAfterMenuClose] =
    useState(false);
  const [openSettingsAfterMenuClose, setOpenSettingsAfterMenuClose] =
    useState(false);
  const [openAboutAfterMenuClose, setOpenAboutAfterMenuClose] = useState(false);
  const [openChangelogAfterMenuClose, setOpenChangelogAfterMenuClose] =
    useState(false);
  const [openLegalAfterMenuClose, setOpenLegalAfterMenuClose] = useState(false);
  const [openHelpAfterMenuClose, setOpenHelpAfterMenuClose] = useState(false);
  const [openSyncAfterMenuClose, setOpenSyncAfterMenuClose] = useState(false);
  const [profileWindow, setProfileWindow] = useState<
    | 'about'
    | 'activity-log'
    | 'changelog'
    | 'legal'
    | 'help'
    | 'manage'
    | 'settings'
    | 'switch'
    | 'undo-history'
    | 'synchronization'
    | null
  >(null);
  const [automaticChangelogContent, setAutomaticChangelogContent] = useState<
    { kind: 'version'; markdown: string } | { kind: 'unavailable' } | null
  >(null);
  const [updateAnnouncementsEnabled, setUpdateAnnouncementsEnabled] =
    useState(true);
  const [profiles, setProfiles] = useState<readonly ProfileListItem[]>([]);
  const [profileStorageUsage, setProfileStorageUsage] = useState<
    readonly ProfileStorageUsage[]
  >([]);
  const [activityLogSettings, setActivityLogSettings] =
    useState<ActivityLogSettings | null>(null);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(
    currentInitializationState.status === 'first-run',
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuRequest | null>(
    null,
  );
  const [internalClipboard, setInternalClipboard] =
    useState<InternalClipboard | null>(null);
  const [isScrollbarActive, setIsScrollbarActive] = useState(false);
  const scrollbarIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const treeButtonRef = useRef<HTMLButtonElement>(null);
  const bookmarkContentRef = useRef<HTMLElement>(null);
  const contextMenuFocusRef = useRef<HTMLElement | null>(null);
  const lastFolderByProfileRef = useRef(new Map<string, string>());
  const initializedProfileIdRef = useRef<string | undefined>(undefined);
  const clipboardProfileIdRef = useRef<string | undefined>(undefined);
  const initializationStateRef = useRef(currentInitializationState);
  const currentFolderIdRef = useRef(currentFolderId);
  const allFoldersRef = useRef(allFolders);
  const readyProfileIdRef = useRef<string | undefined>(undefined);
  const pendingExternalRevisionRef = useRef(0);
  const observedExternalRevisionRef = useRef(0);
  const pendingExternalChangeRef = useRef<ContentChange | undefined>(undefined);
  const pendingFullRefreshRef = useRef(false);
  const externalRefreshPromiseRef = useRef<Promise<void> | undefined>(
    undefined,
  );
  const observedProfileActivationRevisionRef = useRef(0);
  const pendingProfileActivationRef = useRef<ProfileActivation | undefined>(
    undefined,
  );
  const forceHomeProfileIdRef = useRef<string | undefined>(undefined);
  const refreshExternalContentRef = useRef<
    ((change?: ContentChange) => Promise<void>) | undefined
  >(undefined);
  const updateAnnouncementCheckedRef = useRef(false);
  const updateAnnouncementMountedRef = useRef(false);
  const updateAnnouncementClaimRef = useRef<{
    claimId: string;
    version: string;
  } | null>(null);
  const pathSeparator = getPathSeparator(window.navigator.userAgent);

  useEffect(() => {
    initializationStateRef.current = currentInitializationState;
  }, [currentInitializationState]);

  useEffect(() => {
    updateAnnouncementMountedRef.current = true;
    return () => {
      updateAnnouncementMountedRef.current = false;
    };
  }, []);

  const readyProfileId =
    currentInitializationState.status === 'ready'
      ? currentInitializationState.profile.id
      : undefined;

  useEffect(() => {
    currentFolderIdRef.current = currentFolderId;
    allFoldersRef.current = allFolders;
    readyProfileIdRef.current = readyProfileId;
  }, [allFolders, currentFolderId, readyProfileId]);

  useEffect(() => {
    if (
      clipboardProfileIdRef.current &&
      clipboardProfileIdRef.current !== readyProfileId
    )
      setInternalClipboard(null);
    clipboardProfileIdRef.current = readyProfileId;
  }, [readyProfileId]);

  /** Emits a notice only when the active profile has notifications enabled. */
  const notifyForActiveProfile = useCallback(
    (input: NotificationInput) => {
      if (currentInitializationState.status !== 'ready') return;
      const preferences =
        currentInitializationState.settings.notificationPreferences ??
        defaultNotificationPreferences;
      if (preferences.enabled) showNotification(input);
    },
    [currentInitializationState, showNotification],
  );

  /** Shows a persistent, privacy-safe explanation for an operation failure. */
  const notifyOperationError = useCallback(
    (message: string) => {
      notifyForActiveProfile({
        level: 'error',
        message,
        title: t('notifications.errorTitle'),
      });
    },
    [notifyForActiveProfile, t],
  );

  useEffect(() => {
    if (undoHistoryState.initializationFailed)
      notifyOperationError(t('undoHistory.initializeFailed'));
  }, [notifyOperationError, t, undoHistoryState.initializationFailed]);

  /** Explains bookmark validation failures without repeating the submitted URL. */
  const notifyContentFailure = useCallback(
    (
      error: unknown,
      kind: 'bookmark' | 'folder',
      operation: 'create' | 'update',
    ) => {
      const inputError =
        kind === 'bookmark' ? classifyBookmarkInputError(error) : undefined;
      notifyForActiveProfile({
        level: 'error',
        message: inputError
          ? t(`notifications.bookmarkUrl.${inputError}`)
          : t(`notifications.contentFailure.${kind}.${operation}`),
        title: inputError
          ? t('notifications.bookmarkUrlTitle')
          : t(`notifications.contentFailureTitle.${kind}`),
      });
    },
    [notifyForActiveProfile, t],
  );

  /** Logging is best-effort and never changes the primary operation result. */
  const recordEventForProfile = useCallback(
    async (
      profileId: string,
      input: Parameters<ManageActivityLog['record']>[1],
    ) => {
      try {
        await activityLog.record(profileId, input);
      } catch {
        console.error('profile-activity-log-write-failed');
      }
    },
    [activityLog],
  );

  useEffect(() => {
    if (
      !readyProfileId ||
      isWelcomeOpen ||
      profileWindow !== null ||
      updateAnnouncementCheckedRef.current
    )
      return;
    updateAnnouncementCheckedRef.current = true;
    void updateAnnouncements
      .claim(applicationVersion)
      .then(async (claim) => {
        if (!claim || claim.status !== 'claimed') return;
        const section = getPublishedVersionSection(
          changelogMarkdown,
          applicationVersion,
        );
        updateAnnouncementClaimRef.current = {
          claimId: claim.claimId,
          version: claim.version,
        };
        if (section) {
          if (updateAnnouncementMountedRef.current) {
            setAutomaticChangelogContent({
              kind: 'version',
              markdown: section,
            });
            setProfileWindow('changelog');
          }
          return;
        }
        await recordEventForProfile(readyProfileId, {
          action: 'Load',
          category: 'Application',
          dataChanged: false,
          durationMs: 0,
          eventCode: 'UPDATE-RELEASE-NOTES-UNAVAILABLE',
          itemType: 'Release notes',
          itemsAffected: 0,
          kind: 'DIAGNOSTIC',
          level: 'ERROR',
          message: t('activityLog.messages.updateReleaseNotesUnavailable'),
          outcome: 'Failed',
          source: 'Application startup',
        });
        if (updateAnnouncementMountedRef.current) {
          setAutomaticChangelogContent({ kind: 'unavailable' });
          setProfileWindow('changelog');
        }
      })
      .catch(() => console.error('update-announcement-claim-failed'));
  }, [
    applicationVersion,
    isWelcomeOpen,
    profileWindow,
    readyProfileId,
    recordEventForProfile,
    t,
    updateAnnouncements,
  ]);

  useEffect(
    () =>
      undoHistory.subscribeStorageWriteFailures((profileIds) => {
        for (const profileId of profileIds) {
          void recordEventForProfile(profileId, {
            action: 'Write',
            category: 'Application',
            dataChanged: false,
            durationMs: 0,
            eventCode: 'UNDO-HISTORY-STORAGE-WRITE-FAILED',
            itemType: 'Undo history',
            itemsAffected: 0,
            kind: 'DIAGNOSTIC',
            level: 'ERROR',
            message: t('undoHistory.storageWriteFailed'),
            outcome: 'Failed',
            source: 'Undo history',
          });
        }
      }),
    [recordEventForProfile, t, undoHistory],
  );

  useEffect(
    () =>
      undoHistory.subscribeStoragePressure((profileIds, removedEntries) => {
        if (readyProfileId && profileIds.includes(readyProfileId)) {
          notifyForActiveProfile({
            level: 'warning',
            message: t('undoHistory.storagePressure'),
            title: t('notifications.limitedDataTitle'),
          });
        }
        for (const profileId of profileIds) {
          void recordEventForProfile(profileId, {
            action: 'Remove',
            category: 'Application',
            dataChanged: false,
            durationMs: 0,
            eventCode: 'UNDO-HISTORY-OLDER-ENTRIES-REMOVED',
            itemType: 'Undo history',
            itemsAffected: removedEntries,
            kind: 'DIAGNOSTIC',
            level: 'WARN',
            message: t('undoHistory.storagePressure'),
            outcome: 'Skipped',
            source: 'Undo history',
          });
        }
      }),
    [
      notifyForActiveProfile,
      readyProfileId,
      recordEventForProfile,
      t,
      undoHistory,
    ],
  );

  /** Reloads the current folder and complete navigation tree after mutations. */
  const loadFolderContent = useCallback(
    async (profileId: string, folderId: string) => {
      const [contents, profileFolders, navigationItems] = await Promise.all([
        bookmarkManager.listContents(profileId, folderId),
        bookmarkManager.listFolders(profileId),
        bookmarkManager.listNavigationItems(profileId),
      ]);
      setBookmarks(contents.bookmarks);
      setFolders(contents.folders);
      setAllFolders(profileFolders);
      setFavoriteItems(navigationItems.favorites);
      setRecentItems(navigationItems.recent);
    },
    [bookmarkManager],
  );

  const refreshExternalContent = useCallback(
    async (change?: ContentChange) => {
      const profileId = readyProfileIdRef.current;
      const folderId = currentFolderIdRef.current;
      if (!profileId || !folderId || (change && change.profileId !== profileId))
        return;
      try {
        const latestFolders = await bookmarkManager.listFolders(profileId);
        const currentStillExists = latestFolders.some(
          ({ id }) => id === folderId,
        );
        if (!currentStillExists) {
          const previousChain = findFolderChain(
            allFoldersRef.current,
            folderId,
          );
          const fallback =
            [...previousChain]
              .reverse()
              .find((candidate) =>
                latestFolders.some(({ id }) => id === candidate.id),
              ) ?? latestFolders.find(({ isRoot }) => isRoot);
          if (!fallback) throw new Error('external-refresh-root-unavailable');
          setContentWindow(null);
          await loadFolderContent(profileId, fallback.id);
          setCurrentFolderId(fallback.id);
          setCurrentPath(findFolderPath(latestFolders, fallback.id));
          try {
            await profileManager.updateLastOpenedFolder(profileId, fallback.id);
          } catch {
            console.error('external-folder-fallback-save-failed');
          }
          notifyForActiveProfile({
            id: 'external-folder-removed',
            level: 'information',
            message: t('notifications.externalFolderRemovedMessage'),
            title: t('notifications.externalFolderRemovedTitle'),
          });
          return;
        }
        const contentAffected =
          !change ||
          change.fullRefresh ||
          change.affectedParentIds.includes(folderId) ||
          change.changedFolderIds.includes(folderId);
        if (contentAffected) {
          await loadFolderContent(profileId, folderId);
          setCurrentPath(findFolderPath(latestFolders, folderId));
        } else if (change.navigationChanged || change.changedFolderIds.length) {
          const navigationItems =
            await bookmarkManager.listNavigationItems(profileId);
          setAllFolders(latestFolders);
          setFavoriteItems(navigationItems.favorites);
          setRecentItems(navigationItems.recent);
          setCurrentPath(findFolderPath(latestFolders, folderId));
        }
      } catch {
        await recordEventForProfile(profileId, {
          action: 'Load',
          category: 'Bookmarks',
          dataChanged: false,
          durationMs: 0,
          eventCode: 'EXTERNAL-CONTENT-REFRESH-FAILED',
          itemType: 'Folder contents',
          itemsAffected: 0,
          kind: 'DIAGNOSTIC',
          level: 'ERROR',
          message: t('activityLog.messages.externalContentRefreshFailed'),
          outcome: 'Failed',
          source: 'Cross-tab content refresh',
        });
        notifyForActiveProfile({
          actions: [
            {
              id: 'retry-external-content-refresh',
              label: t('notifications.retry'),
              run: () => refreshExternalContentRef.current?.(),
            },
          ],
          id: 'external-content-refresh-failed',
          level: 'error',
          message: t('notifications.externalContentRefreshFailedMessage'),
          title: t('notifications.externalContentRefreshFailedTitle'),
        });
      }
    },
    [
      bookmarkManager,
      loadFolderContent,
      notifyForActiveProfile,
      profileManager,
      recordEventForProfile,
      t,
    ],
  );

  useEffect(() => {
    refreshExternalContentRef.current = refreshExternalContent;
  }, [refreshExternalContent]);

  const closeProfileBoundState = useCallback(() => {
    setContentWindow(null);
    setIsFolderStyleOpen(false);
    setIsSearchOpen(false);
    setInfoItem(null);
    setIsTreeOpen(false);
    setIsProfileMenuOpen(false);
    setContextMenu(null);
    setInternalClipboard(null);
    setProfileWindow((current) =>
      current &&
      [
        'activity-log',
        'manage',
        'settings',
        'switch',
        'synchronization',
        'undo-history',
      ].includes(current)
        ? null
        : current,
    );
  }, []);

  const clearProfileBoundContent = useCallback(() => {
    setBookmarks([]);
    setFolders([]);
    setAllFolders([]);
    setFavoriteItems([]);
    setRecentItems([]);
    setCurrentFolderId(undefined);
    setCurrentPath(['Home']);
  }, []);

  /** Announces a committed activation without turning delivery failure into save failure. */
  const publishProfileActivationSafely = useCallback(
    async (activation: ProfileActivationInput) => {
      try {
        contentChanges.publishProfileActivation(activation);
      } catch {
        console.error('profile-activation-publish-failed');
        await recordEventForProfile(activation.profileId, {
          action: 'Publish',
          category: 'Profiles',
          dataChanged: false,
          durationMs: 0,
          eventCode: 'PROFILE-ACTIVATION-PUBLISH-FAILED',
          itemType: 'Active profile',
          itemsAffected: 0,
          kind: 'DIAGNOSTIC',
          level: 'WARN',
          message: t('activityLog.messages.profileActivationPublishFailed'),
          outcome: 'Skipped',
          source: 'Profile activation',
        });
        notifyForActiveProfile({
          level: 'warning',
          message: t('notifications.profileActivationPublishFailedMessage'),
          title: t('notifications.profileActivationPublishFailedTitle'),
        });
      }
    },
    [contentChanges, notifyForActiveProfile, recordEventForProfile, t],
  );

  const applyExternalProfileActivation = useCallback(
    async (activation?: ProfileActivation) => {
      let targetProfileId = activation?.profileId;
      try {
        const durable = await contentChanges.profileActivation();
        targetProfileId = durable.profileId;
        const revision = Math.max(durable.revision, activation?.revision ?? 0);
        if (
          revision <= observedProfileActivationRevisionRef.current &&
          durable.profileId === readyProfileIdRef.current
        )
          return;
        observedProfileActivationRevisionRef.current = revision;
        if (durable.profileId === readyProfileIdRef.current) return;

        closeProfileBoundState();
        clearProfileBoundContent();
        initializedProfileIdRef.current = undefined;
        forceHomeProfileIdRef.current = durable.profileId;
        pendingExternalChangeRef.current = undefined;
        pendingFullRefreshRef.current = false;
        pendingExternalRevisionRef.current = 0;
        observedExternalRevisionRef.current = 0;

        const resumed = await resumePreflight();
        if (
          resumed.initialization.status !== 'ready' ||
          resumed.initialization.profile.id !== durable.profileId
        )
          throw new Error('profile-activation-state-mismatch');
        setPreflightSnapshot(resumed);
        const preferences =
          resumed.initialization.settings.notificationPreferences ??
          defaultNotificationPreferences;
        if (preferences.enabled)
          showNotification({
            level: 'information',
            message: t('notifications.externalProfileChangedMessage'),
            title: t('notifications.externalProfileChangedTitle'),
          });
      } catch {
        console.error('external-profile-activation-failed');
        clearProfileBoundContent();
        if (targetProfileId)
          await recordEventForProfile(targetProfileId, {
            action: 'Load',
            category: 'Profiles',
            dataChanged: false,
            durationMs: 0,
            eventCode: 'EXTERNAL-PROFILE-ACTIVATION-FAILED',
            itemType: 'Active profile',
            itemsAffected: 0,
            kind: 'DIAGNOSTIC',
            level: 'ERROR',
            message: t('notifications.externalProfileChangeFailed'),
            outcome: 'Failed',
            source: 'Profile activation',
          });
        notifyOperationError(t('notifications.externalProfileChangeFailed'));
      }
    },
    [
      closeProfileBoundState,
      clearProfileBoundContent,
      contentChanges,
      notifyOperationError,
      recordEventForProfile,
      resumePreflight,
      showNotification,
      t,
    ],
  );

  const queueExternalContentRefresh = useCallback(
    (change?: ContentChange) => {
      if (change)
        pendingExternalChangeRef.current = mergeContentChanges(
          pendingExternalChangeRef.current,
          change,
        );
      else pendingFullRefreshRef.current = true;
      if (
        document.visibilityState === 'hidden' ||
        externalRefreshPromiseRef.current
      )
        return;

      const drain = async () => {
        do {
          const pending = pendingExternalChangeRef.current;
          const fullRefresh = pendingFullRefreshRef.current;
          pendingExternalChangeRef.current = undefined;
          pendingFullRefreshRef.current = false;
          await refreshExternalContent(fullRefresh ? undefined : pending);
        } while (
          pendingFullRefreshRef.current ||
          pendingExternalChangeRef.current
        );
      };
      externalRefreshPromiseRef.current = drain().finally(() => {
        externalRefreshPromiseRef.current = undefined;
      });
    },
    [refreshExternalContent],
  );

  useEffect(() => {
    const unsubscribe = contentChanges.subscribe((change) => {
      if (change.profileId !== readyProfileIdRef.current) return;
      const previousRevision = observedExternalRevisionRef.current;
      observedExternalRevisionRef.current = Math.max(
        previousRevision,
        change.revision,
      );
      if (document.visibilityState === 'hidden') {
        pendingExternalRevisionRef.current = Math.max(
          pendingExternalRevisionRef.current,
          change.revision,
        );
        pendingExternalChangeRef.current = mergeContentChanges(
          pendingExternalChangeRef.current,
          change,
        );
        return;
      }
      queueExternalContentRefresh(
        change.revision > previousRevision + 1 ? undefined : change,
      );
    });
    const unsubscribeProfile = contentChanges.subscribeProfileActivation(
      (activation) => {
        if (activation.revision <= observedProfileActivationRevisionRef.current)
          return;
        if (document.visibilityState === 'hidden') {
          pendingProfileActivationRef.current = activation;
          return;
        }
        void applyExternalProfileActivation(activation);
      },
    );
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const pendingActivation = pendingProfileActivationRef.current;
      pendingProfileActivationRef.current = undefined;
      void applyExternalProfileActivation(pendingActivation);
      const profileId = readyProfileIdRef.current;
      if (!profileId) return;
      void contentChanges
        .revision(profileId)
        .then((revision) => {
          if (
            revision <= observedExternalRevisionRef.current &&
            pendingExternalRevisionRef.current === 0
          )
            return;
          observedExternalRevisionRef.current = Math.max(
            observedExternalRevisionRef.current,
            revision,
          );
          pendingExternalRevisionRef.current = 0;
          queueExternalContentRefresh();
        })
        .catch(() => console.error('content-revision-read-failed'));
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsubscribe();
      unsubscribeProfile();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [
    applyExternalProfileActivation,
    contentChanges,
    queueExternalContentRefresh,
  ]);

  const recordUndoHistoryDegraded = useCallback(
    (profileId: string) => {
      notifyForActiveProfile({
        level: 'warning',
        message: t('undoHistory.recordSkipped'),
        title: t('notifications.limitedDataTitle'),
      });
      return recordEventForProfile(profileId, {
        action: 'Record',
        category: 'Bookmarks',
        dataChanged: false,
        durationMs: 0,
        eventCode: 'UNDO-HISTORY-RECORD-SKIPPED',
        itemType: 'Undo history',
        itemsAffected: 0,
        kind: 'DIAGNOSTIC',
        level: 'WARN',
        message: t('undoHistory.recordSkipped'),
        outcome: 'Skipped',
        source: 'Undo history',
      });
    },
    [notifyForActiveProfile, recordEventForProfile, t],
  );

  /** Publishes a privacy-safe mutation summary without changing save success. */
  const publishLocalContentChange = useCallback(
    async (
      profileId: string,
      before?: UndoProfileState,
      after?: UndoProfileState,
    ) => {
      const change: ContentChangeInput | undefined =
        before && after
          ? summarizeContentChange(profileId, before, after)
          : {
              affectedParentIds: [],
              changedFolderIds: [],
              deletedFolderPaths: [],
              fullRefresh: true,
              navigationChanged: true,
              profileId,
            };
      if (!change) return;
      try {
        await contentChanges.publish(change);
      } catch {
        console.error('local-content-change-publish-failed');
        await recordEventForProfile(profileId, {
          action: 'Publish',
          category: 'Bookmarks',
          dataChanged: false,
          durationMs: 0,
          eventCode: 'LOCAL-CONTENT-CHANGE-PUBLISH-FAILED',
          itemType: 'Cross-tab update',
          itemsAffected: 0,
          kind: 'DIAGNOSTIC',
          level: 'WARN',
          message: t('activityLog.messages.localContentChangePublishFailed'),
          outcome: 'Skipped',
          source: 'Local content mutation',
        });
        notifyForActiveProfile({
          level: 'warning',
          message: t('notifications.localContentChangePublishFailedMessage'),
          title: t('notifications.localContentChangePublishFailedTitle'),
        });
      }
    },
    [contentChanges, notifyForActiveProfile, recordEventForProfile, t],
  );

  /** Records only the validated database delta created by one successful mutation. */
  const runUndoable = useCallback(
    async (
      profileId: string,
      itemId: string,
      itemType: UndoHistoryItemType,
      action: UndoHistoryAction,
      mutation: () => Promise<void>,
    ) => {
      await undoHistory.runMutation(async () => {
        let before;
        try {
          before = await bookmarkManager.captureUndoState(profileId);
        } catch {
          await mutation();
          await publishLocalContentChange(profileId);
          console.error('undo-history-capture-before-failed');
          await recordUndoHistoryDegraded(profileId);
          return;
        }
        await mutation();
        let after: UndoProfileState | undefined;
        try {
          after = await bookmarkManager.captureUndoState(profileId);
          await undoHistory.record({
            action,
            after,
            before,
            itemId,
            itemType,
            profileId,
          });
        } catch {
          console.error('undo-history-record-failed');
          await recordUndoHistoryDegraded(profileId);
        }
        await publishLocalContentChange(profileId, before, after);
      });
    },
    [
      bookmarkManager,
      publishLocalContentChange,
      recordUndoHistoryDegraded,
      undoHistory,
    ],
  );

  /** Opens one folder and records only privacy-safe navigation metadata. */
  const openFolder = async (folderId: string, source: string) => {
    const startedAt = performance.now();
    if (!readyProfileId) throw new Error('active-profile-not-ready');
    try {
      await loadFolderContent(readyProfileId, folderId);
      setCurrentFolderId(folderId);
      setCurrentPath(findFolderPath(allFolders, folderId));
      try {
        await profileManager.updateLastOpenedFolder(readyProfileId, folderId);
      } catch {
        await recordEventForProfile(readyProfileId, {
          action: 'Save',
          category: 'Profiles',
          dataChanged: false,
          durationMs: 0,
          eventCode: 'LAST-FOLDER-SAVE-DEGRADED',
          itemType: 'Navigation settings',
          itemsAffected: 0,
          kind: 'DIAGNOSTIC',
          level: 'WARN',
          message: t('activityLog.messages.lastFolderSaveDegraded'),
          outcome: 'Skipped',
          source: 'Folder navigation',
        });
      }
      await recordEventForProfile(readyProfileId, {
        action: 'Open',
        category: 'Bookmarks',
        dataChanged: false,
        durationMs: 0,
        eventCode: 'FOLDER-OPEN-COMPLETE',
        itemType: 'Folder',
        itemsAffected: 1,
        kind: 'ACTIVITY',
        level: 'INFO',
        message: t('activityLog.messages.folderOpened'),
        outcome: 'Succeeded',
        source,
      });
    } catch (error) {
      await recordEventForProfile(readyProfileId, {
        action: 'Open',
        category: 'Bookmarks',
        dataChanged: false,
        durationMs: Math.round(performance.now() - startedAt),
        eventCode: 'FOLDER-OPEN-FAILED',
        itemType: 'Folder',
        itemsAffected: 0,
        kind: 'DIAGNOSTIC',
        level: 'ERROR',
        message: t('activityLog.messages.folderOpenFailed'),
        outcome: 'Failed',
        source,
      });
      throw error;
    }
  };

  /** Requests safe bookmark navigation without recording its URL or title. */
  const openBookmark = async (
    url: string,
    disposition: 'current-tab' | 'new-tab',
    source: string,
  ) => {
    if (!readyProfileId) throw new Error('active-profile-not-ready');
    if (currentInitializationState.status === 'ready') {
      const confirmationMessage = url.startsWith('ftp:')
        ? t('bookmarks.ftpWarning')
        : currentInitializationState.settings.confirmExternalLinks
          ? t('security.confirmExternalLink')
          : undefined;
      if (
        confirmationMessage &&
        !(await requestConfirmation(confirmationMessage, 'open'))
      )
        return;
    }
    try {
      if (disposition === 'new-tab') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      await recordEventForProfile(readyProfileId, {
        action: disposition === 'new-tab' ? 'Open in new tab' : 'Open',
        category: 'Bookmarks',
        dataChanged: false,
        durationMs: 0,
        eventCode:
          disposition === 'new-tab'
            ? 'BOOKMARK-OPEN-NEW-TAB-REQUESTED'
            : 'BOOKMARK-OPEN-REQUESTED',
        itemType: 'Bookmark',
        itemsAffected: 1,
        kind: 'ACTIVITY',
        level: 'INFO',
        message: t('activityLog.messages.bookmarkOpenRequested'),
        outcome: 'Succeeded',
        source,
      });
      if (disposition === 'current-tab') window.location.assign(url);
    } catch (error) {
      await recordEventForProfile(readyProfileId, {
        action: disposition === 'new-tab' ? 'Open in new tab' : 'Open',
        category: 'Bookmarks',
        dataChanged: false,
        durationMs: 0,
        eventCode: 'BOOKMARK-OPEN-FAILED',
        itemType: 'Bookmark',
        itemsAffected: 0,
        kind: 'DIAGNOSTIC',
        level: 'ERROR',
        message: t('activityLog.messages.bookmarkOpenFailed'),
        outcome: 'Failed',
        source,
      });
      throw error;
    }
  };

  /** Opens a trusted app-documentation link without treating it as bookmark activity. */
  const openExternalAppLink = async (url: string) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:')
      throw new Error('external-app-link-protocol-not-allowed');
    if (
      currentInitializationState.status === 'ready' &&
      currentInitializationState.settings.confirmExternalLinks &&
      !(await requestConfirmation(t('security.confirmExternalLink'), 'open'))
    )
      return;
    window.open(parsedUrl.href, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (!readyProfileId || initializedProfileIdRef.current === readyProfileId)
      return;
    let cancelled = false;
    const initializationState = initializationStateRef.current;
    void bookmarkManager
      .ensureRoot(readyProfileId)
      .then(async (root) => {
        if (cancelled) return;
        const profileFolders =
          await bookmarkManager.listFolders(readyProfileId);
        const requestedFolderId = new URLSearchParams(
          window.location.search,
        ).get('folder');
        const requestedFolder = profileFolders.find(
          (folder) => folder.id === requestedFolderId,
        );
        const rememberedFolderId =
          initializationState.status === 'ready' &&
          initializationState.settings.profilePreferences
            ?.reopenLastFolderOnSwitch
            ? lastFolderByProfileRef.current.get(readyProfileId)
            : undefined;
        const rememberedFolder = profileFolders.find(
          (folder) => folder.id === rememberedFolderId,
        );
        const startupSettings =
          initializationState.status === 'ready'
            ? initializationState.settings
            : undefined;
        const configuredId =
          startupSettings?.startupLocation === 'last'
            ? startupSettings.lastOpenedFolderId
            : undefined;
        const configuredFolder = profileFolders.find(
          (folder) => folder.id === configuredId,
        );
        if (configuredId && !configuredFolder) {
          await recordEventForProfile(readyProfileId, {
            action: 'Load',
            category: 'Profiles',
            dataChanged: false,
            durationMs: 0,
            eventCode: 'STARTUP-FOLDER-FALLBACK',
            itemType: 'Startup location',
            itemsAffected: 0,
            kind: 'DIAGNOSTIC',
            level: 'WARN',
            message: t('activityLog.messages.startupFolderFallback'),
            outcome: 'Skipped',
            source: 'Application startup',
          });
        }
        const forceHome = forceHomeProfileIdRef.current === readyProfileId;
        const initialFolder = forceHome
          ? root
          : (requestedFolder ?? configuredFolder ?? rememberedFolder ?? root);
        if (forceHome) forceHomeProfileIdRef.current = undefined;
        setCurrentFolderId(initialFolder.id);
        setCurrentPath(findFolderPath(profileFolders, initialFolder.id));
        await loadFolderContent(readyProfileId, initialFolder.id);
        initializedProfileIdRef.current = readyProfileId;
      })
      .catch(async () => {
        if (cancelled) return;
        await recordEventForProfile(readyProfileId, {
          action: 'Load',
          category: 'Bookmarks',
          dataChanged: false,
          durationMs: 0,
          eventCode: 'INITIAL-FOLDER-LOAD-FAILED',
          itemType: 'Folder contents',
          itemsAffected: 0,
          kind: 'DIAGNOSTIC',
          level: 'ERROR',
          message: t('activityLog.messages.initialFolderLoadFailed'),
          outcome: 'Failed',
          source: 'Application startup',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [
    bookmarkManager,
    loadFolderContent,
    readyProfileId,
    recordEventForProfile,
    t,
  ]);

  const openNavigationItem = async (item: NavigationItem) => {
    if (item.kind === 'bookmark') {
      await openBookmark(item.value.url, 'current-tab', 'Folder navigation');
      return;
    }
    if (!readyProfileId) return;
    await openFolder(item.value.id, 'Folder navigation');
    closeTree();
  };

  const changeFavorite = async (item: NavigationItem, favorite: boolean) => {
    if (!readyProfileId || !currentFolderId || !activeSettings)
      throw new Error('active-folder-not-ready');
    try {
      await runUndoable(
        readyProfileId,
        item.value.id,
        item.kind,
        'favorite',
        () =>
          bookmarkManager.setFavorite(readyProfileId, item.value.id, favorite),
      );
      await loadFolderContent(readyProfileId, currentFolderId);
      await recordEventForProfile(readyProfileId, {
        action: favorite ? 'Add' : 'Remove',
        category: 'Bookmarks',
        dataChanged: true,
        durationMs: 0,
        eventCode: favorite
          ? 'FAVORITE-ITEM-ADD-COMPLETE'
          : 'FAVORITE-ITEM-REMOVE-COMPLETE',
        itemType: item.kind === 'folder' ? 'Folder' : 'Bookmark',
        itemsAffected: 1,
        kind: 'ACTIVITY',
        level: 'INFO',
        message: favorite
          ? t('activityLog.messages.favoriteAdded')
          : t('activityLog.messages.favoriteRemoved'),
        outcome: 'Succeeded',
        source: 'Folder navigation',
      });
    } catch (error) {
      await recordEventForProfile(readyProfileId, {
        action: favorite ? 'Add' : 'Remove',
        category: 'Bookmarks',
        dataChanged: false,
        durationMs: 0,
        eventCode: favorite
          ? 'FAVORITE-ITEM-ADD-FAILED'
          : 'FAVORITE-ITEM-REMOVE-FAILED',
        itemType: item.kind === 'folder' ? 'Folder' : 'Bookmark',
        itemsAffected: 0,
        kind: 'DIAGNOSTIC',
        level: 'ERROR',
        message: t('activityLog.messages.favoriteUpdateFailed'),
        outcome: 'Failed',
        source: 'Folder navigation',
      });
      throw error;
    }
  };

  useEffect(() => {
    // Effects run after commit, making this the UI half of preflight completion.
    onUiReady(preflightSnapshot.operationId);
  }, [onUiReady, preflightSnapshot.operationId]);

  const closeTree = () => {
    setIsTreeOpen(false);
  };

  const openProfileWindow = async (window: 'manage' | 'switch') => {
    const startedAt = performance.now();
    setIsProfileMenuOpen(false);
    try {
      setProfiles(await profileManager.list());
      setProfileWindow(window);
      if (readyProfileId) {
        await recordEventForProfile(readyProfileId, {
          action: 'Load',
          category: 'Profiles',
          dataChanged: false,
          durationMs: 0,
          eventCode: 'PROFILE-LIST-LOAD-COMPLETE',
          itemType: 'Profile list',
          itemsAffected: 0,
          kind: 'ACTIVITY',
          level: 'INFO',
          message: t('activityLog.messages.profileListLoaded'),
          outcome: 'Succeeded',
          source: window === 'manage' ? 'Profile manager' : 'Profile switcher',
        });
      }
    } catch (error) {
      if (readyProfileId) {
        await recordEventForProfile(readyProfileId, {
          action: 'Load',
          category: 'Profiles',
          dataChanged: false,
          durationMs: Math.round(performance.now() - startedAt),
          eventCode: 'PROFILE-LIST-LOAD-FAILED',
          itemType: 'Profile list',
          itemsAffected: 0,
          kind: 'DIAGNOSTIC',
          level: 'ERROR',
          message: t('activityLog.messages.profileListLoadFailed'),
          outcome: 'Failed',
          source: window === 'manage' ? 'Profile manager' : 'Profile switcher',
        });
      }
      notifyOperationError(t('activityLog.messages.profileListLoadFailed'));
      throw error;
    }
  };
  const refreshProfiles = async () => setProfiles(await profileManager.list());

  const openSearchWindow = useCallback(() => {
    if (!readyProfileId || !currentFolderId) return;
    setIsSearchOpen(true);
    setIsSearchLoading(true);
    setSearchLoadFailed(false);
    void profileManager
      .list()
      .then(async (profileItems) => {
        const sources = await Promise.all(
          profileItems.map(async ({ profile }) => {
            const [profileBookmarks, profileFolders] = await Promise.all([
              bookmarkManager.listBookmarks(profile.id),
              bookmarkManager.listFolders(profile.id),
            ]);
            return {
              bookmarks: profileBookmarks,
              folders: profileFolders,
              profileId: profile.id,
              profileName: profile.username,
            } satisfies SearchProfileSource;
          }),
        );
        setProfiles(profileItems);
        setSearchSources(sources);
      })
      .catch(async () => {
        setSearchLoadFailed(true);
        await recordEventForProfile(readyProfileId, {
          action: 'Load',
          category: 'Bookmarks',
          dataChanged: false,
          durationMs: 0,
          eventCode: 'SEARCH-DATA-LOAD-FAILED',
          itemType: 'Search data',
          itemsAffected: 0,
          kind: 'DIAGNOSTIC',
          level: 'ERROR',
          message: t('searchWindow.loadFailed'),
          outcome: 'Failed',
          source: 'Search window',
        });
        notifyOperationError(t('searchWindow.loadFailed'));
      })
      .finally(() => setIsSearchLoading(false));
  }, [
    bookmarkManager,
    currentFolderId,
    profileManager,
    notifyOperationError,
    readyProfileId,
    recordEventForProfile,
    t,
  ]);

  const recordProfileEvent = (
    input: Parameters<ManageActivityLog['record']>[1],
  ) =>
    currentInitializationState.status === 'ready'
      ? recordEventForProfile(currentInitializationState.profile.id, input)
      : Promise.resolve();

  /** Adds matched INFO/ERROR records around one implemented profile mutation. */
  const runLoggedProfileAction = async (
    work: () => Promise<void>,
    action: string,
    eventStem: string,
    successMessage: string,
    failureMessage: string,
    notify = true,
  ) => {
    try {
      await work();
      await recordProfileEvent({
        action,
        category: 'Profiles',
        dataChanged: true,
        durationMs: 0,
        eventCode: `PROFILE-${eventStem}-COMPLETE`,
        itemType: 'Profile settings',
        itemsAffected: 1,
        kind: 'ACTIVITY',
        level: 'INFO',
        message: successMessage,
        outcome: 'Succeeded',
        source: 'Profile manager',
      });
      if (notify)
        notifyForActiveProfile({
          level: 'success',
          message: successMessage,
          title: t('notifications.operationCompletedTitle'),
        });
    } catch (error) {
      await recordProfileEvent({
        action,
        category: 'Profiles',
        dataChanged: false,
        durationMs: 0,
        eventCode: `PROFILE-${eventStem}-FAILED`,
        itemType: 'Profile settings',
        itemsAffected: 0,
        kind: 'DIAGNOSTIC',
        level: 'ERROR',
        message: failureMessage,
        outcome: 'Failed',
        source: 'Profile manager',
      });
      if (notify) notifyOperationError(failureMessage);
      throw error;
    }
  };

  const clearContextMenu = useCallback(() => setContextMenu(null), []);

  const closeContextMenu = useCallback(() => {
    const focusTarget = contextMenuFocusRef.current;
    setContextMenu(null);
    window.requestAnimationFrame(() =>
      focusTarget?.focus({ preventScroll: true }),
    );
  }, []);

  const openEmptyAreaContextMenu = (position: { x: number; y: number }) => {
    contextMenuFocusRef.current = bookmarkContentRef.current;
    setContextMenu({ kind: 'empty-area', ...position });
  };

  /** Persists one validated item in the currently open profile folder. */
  const createContent = async (
    kind: ContentKind,
    value: CreateContentValue,
  ) => {
    if (!readyProfileId || !currentFolderId || !activeSettings)
      throw new Error('active-folder-not-ready');
    try {
      const settings = activeSettings;
      let preparedValue = {
        ...value,
        note: value.note.trim(),
        tags:
          settings.tagOrder === 'alphabetical'
            ? [...value.tags].sort((a, b) => a.localeCompare(b))
            : value.tags,
        title: value.title.trim(),
      };
      if (kind === 'bookmark') {
        const normalizedCandidate = addHttpsToHostLikeUrl(value.url ?? '');
        if (normalizedCandidate) {
          const mode = settings.urlNormalization ?? 'ask';
          if (
            mode === 'add' ||
            (mode === 'ask' &&
              (await requestConfirmation(
                t('contentEditor.normalizationConfirm'),
                'addHttps',
              )))
          )
            preparedValue = { ...preparedValue, url: normalizedCandidate };
        }
        if (
          preparedValue.url?.trim().toLowerCase().startsWith('ftp://') &&
          !(await requestConfirmation(
            t('contentEditor.ftpSaveConfirm'),
            'save',
          ))
        )
          throw new Error('ftp-bookmark-cancelled');
        const duplicate = await bookmarkManager.hasBookmarkWithUrl(
          readyProfileId,
          preparedValue.url ?? '',
        );
        if (duplicate && settings.duplicateHandling === 'prevent')
          throw new Error('duplicate-bookmark-prevented');
        if (
          duplicate &&
          settings.duplicateHandling === 'warn' &&
          !(await requestConfirmation(
            t('contentEditor.duplicateConfirm'),
            'saveCopy',
          ))
        )
          throw new Error('duplicate-bookmark-cancelled');
      }
      await undoHistory.runMutation(async () => {
        const undoBefore = await bookmarkManager
          .captureUndoState(readyProfileId)
          .catch(() => undefined);
        if (kind === 'bookmark') {
          await bookmarkManager.createBookmark({
            cardAppearance: preparedValue.cardAppearance,
            note: preparedValue.note,
            parentId: currentFolderId,
            profileId: readyProfileId,
            title: preparedValue.title,
            tags: preparedValue.tags,
            url: preparedValue.url ?? '',
          });
        } else {
          await bookmarkManager.createFolder({
            bookmarkGroupBy:
              currentInitializationState.status === 'ready'
                ? (currentInitializationState.settings.bookmarkGroupBy ??
                  'none')
                : 'none',
            bookmarkSortBy:
              currentInitializationState.status === 'ready'
                ? (currentInitializationState.settings.bookmarkSortBy ??
                  'manual')
                : 'manual',
            bookmarkSortDirection:
              currentInitializationState.status === 'ready'
                ? (currentInitializationState.settings.bookmarkSortDirection ??
                  'ascending')
                : 'ascending',
            cardAppearance: preparedValue.cardAppearance,
            cardSize:
              currentInitializationState.status === 'ready'
                ? currentInitializationState.settings.cardSize
                : 'medium',
            cardSpacing:
              currentInitializationState.status === 'ready'
                ? (currentInitializationState.settings.cardSpacing ??
                  'comfortable')
                : 'comfortable',
            note: preparedValue.note,
            parentId: currentFolderId,
            profileId: readyProfileId,
            title: preparedValue.title,
            tags: preparedValue.tags,
            bookmarkView:
              currentInitializationState.status === 'ready'
                ? currentInitializationState.settings.bookmarkView
                : 'card',
          });
        }
        const undoAfter = await bookmarkManager
          .captureUndoState(readyProfileId)
          .catch(() => undefined);
        await publishLocalContentChange(readyProfileId, undoBefore, undoAfter);
        if (!undoBefore) {
          console.error('undo-history-capture-before-failed');
          await recordUndoHistoryDegraded(readyProfileId);
          return;
        }
        if (!undoAfter) {
          console.error('undo-history-record-failed');
          await recordUndoHistoryDegraded(readyProfileId);
          return;
        }
        const existingIds = new Set([
          ...undoBefore.bookmarks.map(({ id }) => id),
          ...undoBefore.folders.map(({ id }) => id),
        ]);
        const createdItem = [...undoAfter.bookmarks, ...undoAfter.folders].find(
          ({ id }) => !existingIds.has(id),
        );
        if (createdItem)
          await undoHistory.record({
            action: 'created',
            after: undoAfter,
            before: undoBefore,
            itemId: createdItem.id,
            itemType: kind,
            profileId: readyProfileId,
          });
      });
      if (settings.rememberLastAppearance) {
        try {
          await profileManager.updateProfileSettings(readyProfileId, {
            ...settings,
            ...(kind === 'bookmark'
              ? { lastBookmarkAppearance: preparedValue.cardAppearance }
              : { lastFolderAppearance: preparedValue.cardAppearance }),
          });
          setPreflightSnapshot(await resumePreflight());
        } catch {
          await recordEventForProfile(readyProfileId, {
            action: 'Update',
            category: 'Bookmarks',
            dataChanged: false,
            durationMs: 0,
            eventCode: 'LAST-APPEARANCE-SAVE-SKIPPED',
            itemType: 'Bookmark settings',
            itemsAffected: 0,
            kind: 'DIAGNOSTIC',
            level: 'WARN',
            message: t('activityLog.messages.lastAppearanceSaveDegraded'),
            outcome: 'Skipped',
            source: 'Bookmark creator',
          });
        }
      }
      await loadFolderContent(readyProfileId, currentFolderId);
      await recordEventForProfile(readyProfileId, {
        action: 'Create',
        category: 'Bookmarks',
        dataChanged: true,
        durationMs: 0,
        eventCode: `${kind.toUpperCase()}-CREATE-COMPLETE`,
        itemType: kind === 'bookmark' ? 'Bookmark' : 'Folder',
        itemsAffected: 1,
        kind: 'ACTIVITY',
        level: 'INFO',
        message: t(`activityLog.messages.${kind}Created`),
        outcome: 'Succeeded',
        source: kind === 'bookmark' ? 'Bookmark creator' : 'Folder creator',
      });
      notifyForActiveProfile({
        level: 'success',
        message: t(`activityLog.messages.${kind}Created`),
        title: t(
          `notifications.${kind === 'bookmark' ? 'bookmarkCreatedTitle' : 'folderCreatedTitle'}`,
        ),
      });
    } catch (error) {
      if (isDuplicatePolicyOutcome(error)) {
        await recordEventForProfile(readyProfileId, {
          action: 'Create',
          category: 'Bookmarks',
          dataChanged: false,
          durationMs: 0,
          eventCode: duplicatePolicyEventCode(error),
          itemType: 'Bookmark',
          itemsAffected: 0,
          kind: 'ACTIVITY',
          level: 'WARN',
          message: t('activityLog.messages.bookmarkCreateFailed'),
          outcome: 'Skipped',
          source: 'Bookmark creator',
        });
        throw error;
      }
      await recordEventForProfile(readyProfileId, {
        action: 'Create',
        category: 'Bookmarks',
        dataChanged: false,
        durationMs: 0,
        eventCode: `${kind.toUpperCase()}-CREATE-FAILED`,
        itemType: kind === 'bookmark' ? 'Bookmark' : 'Folder',
        itemsAffected: 0,
        kind: 'DIAGNOSTIC',
        level: 'ERROR',
        message: t(`activityLog.messages.${kind}CreateFailed`),
        outcome: 'Failed',
        source: kind === 'bookmark' ? 'Bookmark creator' : 'Folder creator',
      });
      notifyContentFailure(error, kind, 'create');
      throw error;
    }
  };

  /** Persists editable fields without changing item identity or placement. */
  const updateContent = async (
    target: Bookmark | Folder,
    value: CreateContentValue,
  ) => {
    if (!readyProfileId || !currentFolderId || !activeSettings)
      throw new Error('active-folder-not-ready');
    const isBookmark = 'url' in target;
    const itemType = isBookmark ? 'Bookmark' : 'Folder';
    try {
      const settings = activeSettings;
      let preparedValue = {
        ...value,
        note: value.note.trim(),
        tags:
          settings.tagOrder === 'alphabetical'
            ? [...value.tags].sort((a, b) => a.localeCompare(b))
            : value.tags,
        title: value.title.trim(),
      };
      if (isBookmark) {
        const normalizedCandidate = addHttpsToHostLikeUrl(value.url ?? '');
        if (normalizedCandidate) {
          const mode = settings.urlNormalization ?? 'ask';
          if (
            mode === 'add' ||
            (mode === 'ask' &&
              (await requestConfirmation(
                t('contentEditor.normalizationConfirm'),
                'addHttps',
              )))
          )
            preparedValue = { ...preparedValue, url: normalizedCandidate };
        }
        if (
          preparedValue.url?.trim().toLowerCase().startsWith('ftp://') &&
          !(await requestConfirmation(
            t('contentEditor.ftpSaveConfirm'),
            'save',
          ))
        )
          throw new Error('ftp-bookmark-cancelled');
        const duplicate = await bookmarkManager.hasBookmarkWithUrl(
          readyProfileId,
          preparedValue.url ?? '',
          target.id,
        );
        if (duplicate && settings.duplicateHandling === 'prevent')
          throw new Error('duplicate-bookmark-prevented');
        if (
          duplicate &&
          settings.duplicateHandling === 'warn' &&
          !(await requestConfirmation(
            t('contentEditor.duplicateConfirm'),
            'saveCopy',
          ))
        )
          throw new Error('duplicate-bookmark-cancelled');
      }
      await runUndoable(
        readyProfileId,
        target.id,
        isBookmark ? 'bookmark' : 'folder',
        'edited',
        () =>
          isBookmark
            ? bookmarkManager.updateBookmark(
                readyProfileId,
                target.id,
                {
                  cardAppearance: preparedValue.cardAppearance,
                  note: preparedValue.note,
                  tags: preparedValue.tags,
                  title: preparedValue.title,
                  url: preparedValue.url ?? '',
                },
                target.updatedAt,
              )
            : bookmarkManager.updateFolder(
                readyProfileId,
                target.id,
                {
                  cardAppearance: preparedValue.cardAppearance,
                  note: preparedValue.note,
                  tags: preparedValue.tags,
                  title: preparedValue.title,
                },
                target.updatedAt,
              ),
      );
      if (settings.rememberLastAppearance) {
        try {
          await profileManager.updateProfileSettings(readyProfileId, {
            ...settings,
            ...(isBookmark
              ? { lastBookmarkAppearance: preparedValue.cardAppearance }
              : { lastFolderAppearance: preparedValue.cardAppearance }),
          });
          setPreflightSnapshot(await resumePreflight());
        } catch {
          await recordEventForProfile(readyProfileId, {
            action: 'Update',
            category: 'Bookmarks',
            dataChanged: false,
            durationMs: 0,
            eventCode: 'LAST-APPEARANCE-SAVE-SKIPPED',
            itemType: 'Bookmark settings',
            itemsAffected: 0,
            kind: 'DIAGNOSTIC',
            level: 'WARN',
            message: t('activityLog.messages.lastAppearanceSaveDegraded'),
            outcome: 'Skipped',
            source: 'Bookmark editor',
          });
        }
      }
      await loadFolderContent(readyProfileId, currentFolderId);
      await recordEventForProfile(readyProfileId, {
        action: 'Update',
        category: 'Bookmarks',
        dataChanged: true,
        durationMs: 0,
        eventCode: `${itemType.toUpperCase()}-UPDATE-COMPLETE`,
        itemType,
        itemsAffected: 1,
        kind: 'ACTIVITY',
        level: 'INFO',
        message: t(
          `activityLog.messages.${isBookmark ? 'bookmarkUpdated' : 'folderUpdated'}`,
        ),
        outcome: 'Succeeded',
        source: isBookmark ? 'Bookmark editor' : 'Folder editor',
      });
      notifyForActiveProfile({
        level: 'success',
        message: t(
          `activityLog.messages.${isBookmark ? 'bookmarkUpdated' : 'folderUpdated'}`,
        ),
        title: t(
          `notifications.${isBookmark ? 'bookmarkUpdatedTitle' : 'folderUpdatedTitle'}`,
        ),
      });
    } catch (error) {
      if (isDuplicatePolicyOutcome(error)) {
        await recordEventForProfile(readyProfileId, {
          action: 'Update',
          category: 'Bookmarks',
          dataChanged: false,
          durationMs: 0,
          eventCode: duplicatePolicyEventCode(error),
          itemType: 'Bookmark',
          itemsAffected: 0,
          kind: 'ACTIVITY',
          level: 'WARN',
          message: t('activityLog.messages.bookmarkUpdateFailed'),
          outcome: 'Skipped',
          source: 'Bookmark editor',
        });
        throw error;
      }
      await recordEventForProfile(readyProfileId, {
        action: 'Update',
        category: 'Bookmarks',
        dataChanged: false,
        durationMs: 0,
        eventCode: `${itemType.toUpperCase()}-UPDATE-FAILED`,
        itemType,
        itemsAffected: 0,
        kind: 'DIAGNOSTIC',
        level: 'ERROR',
        message: t(
          `activityLog.messages.${isBookmark ? 'bookmarkUpdateFailed' : 'folderUpdateFailed'}`,
        ),
        outcome: 'Failed',
        source: isBookmark ? 'Bookmark editor' : 'Folder editor',
      });
      notifyContentFailure(error, isBookmark ? 'bookmark' : 'folder', 'update');
      throw error;
    }
  };

  const folderTree = buildFolderTree(allFolders);
  const currentFolder = allFolders.find(
    (folder) => folder.id === currentFolderId,
  );

  const isClipboardDestinationInvalid = (
    clipboard: InternalClipboard,
    destinationFolderId: string,
  ) => {
    if (
      clipboard.operation === 'cut' &&
      clipboard.parentId === destinationFolderId
    )
      return true;
    if (clipboard.kind !== 'folder') return false;
    let candidate = allFolders.find(({ id }) => id === destinationFolderId);
    const visited = new Set<string>();
    while (candidate) {
      if (candidate.id === clipboard.itemId) return true;
      if (!candidate.parentId || visited.has(candidate.id)) return false;
      visited.add(candidate.id);
      candidate = allFolders.find(({ id }) => id === candidate?.parentId);
    }
    return false;
  };

  const pasteDisabled =
    !internalClipboard ||
    !readyProfileId ||
    !currentFolderId ||
    internalClipboard.profileId !== readyProfileId ||
    isClipboardDestinationInvalid(internalClipboard, currentFolderId);

  const selectInternalClipboard = async (
    target: NavigationItem,
    operation: 'copy' | 'cut',
  ) => {
    if (!readyProfileId || !target.value.parentId) return;
    setInternalClipboard({
      itemId: target.value.id,
      kind: target.kind,
      operation,
      parentId: target.value.parentId,
      profileId: readyProfileId,
    });
    const message = t(
      operation === 'copy' ? 'bookmarks.copyReady' : 'bookmarks.cutReady',
    );
    await recordEventForProfile(readyProfileId, {
      action: operation === 'copy' ? 'Copy' : 'Cut',
      category: 'Bookmarks',
      dataChanged: false,
      durationMs: 0,
      eventCode: `ITEM-${operation.toUpperCase()}-READY`,
      itemType: target.kind === 'folder' ? 'Folder' : 'Bookmark',
      itemsAffected: 1,
      kind: 'ACTIVITY',
      level: 'INFO',
      message,
      outcome: 'Succeeded',
      source: 'Item context menu or shortcut',
    });
    notifyForActiveProfile({
      level: 'information',
      message,
      title: t('notifications.operationCompletedTitle'),
    });
  };

  const duplicateItem = async (target: NavigationItem) => {
    if (!readyProfileId || !currentFolderId || !target.value.parentId) return;
    const startedAt = performance.now();
    let itemsAffected = 0;
    try {
      await runUndoable(
        readyProfileId,
        target.value.id,
        target.kind,
        'created',
        async () => {
          const result = await bookmarkManager.copyItem(
            readyProfileId,
            target.value.id,
            target.value.parentId!,
          );
          itemsAffected = result.itemCount;
        },
      );
      await loadFolderContent(readyProfileId, currentFolderId);
      await recordEventForProfile(readyProfileId, {
        action: 'Duplicate',
        category: 'Bookmarks',
        dataChanged: true,
        durationMs: Math.round(performance.now() - startedAt),
        eventCode: 'ITEM-DUPLICATE-COMPLETE',
        itemType: target.kind === 'folder' ? 'Folder' : 'Bookmark',
        itemsAffected,
        kind: 'ACTIVITY',
        level: 'INFO',
        message: t('bookmarks.duplicateSucceeded'),
        outcome: 'Succeeded',
        source: 'Item context menu',
      });
      notifyForActiveProfile({
        level: 'success',
        message: t('bookmarks.duplicateSucceeded'),
        title: t('notifications.operationCompletedTitle'),
      });
    } catch {
      await recordEventForProfile(readyProfileId, {
        action: 'Duplicate',
        category: 'Bookmarks',
        dataChanged: false,
        durationMs: Math.round(performance.now() - startedAt),
        eventCode: 'ITEM-DUPLICATE-FAILED',
        itemType: target.kind === 'folder' ? 'Folder' : 'Bookmark',
        itemsAffected: 0,
        kind: 'DIAGNOSTIC',
        level: 'ERROR',
        message: t('bookmarks.duplicateFailed'),
        outcome: 'Failed',
        source: 'Item context menu',
      });
      notifyOperationError(t('bookmarks.duplicateFailed'));
    }
  };

  const pasteInternalClipboard = async () => {
    if (!internalClipboard || !readyProfileId || !currentFolderId) return;
    if (
      internalClipboard.profileId !== readyProfileId ||
      isClipboardDestinationInvalid(internalClipboard, currentFolderId)
    ) {
      await recordEventForProfile(readyProfileId, {
        action: 'Paste',
        category: 'Bookmarks',
        dataChanged: false,
        durationMs: 0,
        eventCode: 'ITEM-PASTE-DESTINATION-REJECTED',
        itemType: internalClipboard.kind === 'folder' ? 'Folder' : 'Bookmark',
        itemsAffected: 0,
        kind: 'ACTIVITY',
        level: 'WARN',
        message: t('bookmarks.pasteInvalidDestination'),
        outcome: 'Skipped',
        source: 'Content context menu or shortcut',
      });
      notifyForActiveProfile({
        level: 'warning',
        message: t('bookmarks.pasteInvalidDestination'),
        title: t('notifications.limitedDataTitle'),
      });
      return;
    }
    const startedAt = performance.now();
    let itemsAffected = 1;
    try {
      await runUndoable(
        readyProfileId,
        internalClipboard.itemId,
        internalClipboard.kind,
        internalClipboard.operation === 'copy' ? 'created' : 'moved',
        async () => {
          if (internalClipboard.operation === 'copy') {
            const result = await bookmarkManager.copyItem(
              readyProfileId,
              internalClipboard.itemId,
              currentFolderId,
            );
            itemsAffected = result.itemCount;
          } else {
            await bookmarkManager.moveItem(
              readyProfileId,
              internalClipboard.itemId,
              currentFolderId,
              bookmarks.length + folders.length,
            );
          }
        },
      );
      setInternalClipboard(null);
      await loadFolderContent(readyProfileId, currentFolderId);
      await recordEventForProfile(readyProfileId, {
        action: 'Paste',
        category: 'Bookmarks',
        dataChanged: true,
        durationMs: Math.round(performance.now() - startedAt),
        eventCode: 'ITEM-PASTE-COMPLETE',
        itemType: internalClipboard.kind === 'folder' ? 'Folder' : 'Bookmark',
        itemsAffected,
        kind: 'ACTIVITY',
        level: 'INFO',
        message: t('bookmarks.pasteSucceeded'),
        outcome: 'Succeeded',
        source: 'Content context menu or shortcut',
      });
      notifyForActiveProfile({
        level: 'success',
        message: t('bookmarks.pasteSucceeded'),
        title: t('notifications.operationCompletedTitle'),
      });
    } catch {
      await recordEventForProfile(readyProfileId, {
        action: 'Paste',
        category: 'Bookmarks',
        dataChanged: false,
        durationMs: Math.round(performance.now() - startedAt),
        eventCode: 'ITEM-PASTE-FAILED',
        itemType: internalClipboard.kind === 'folder' ? 'Folder' : 'Bookmark',
        itemsAffected: 0,
        kind: 'DIAGNOSTIC',
        level: 'ERROR',
        message: t('bookmarks.pasteFailed'),
        outcome: 'Failed',
        source: 'Content context menu or shortcut',
      });
      notifyOperationError(t('bookmarks.pasteFailed'));
    }
  };

  const recordHistoryOutcome = useCallback(
    async (
      direction: 'redo' | 'undo',
      outcome: 'failed' | 'succeeded',
      itemType: UndoHistoryItemType | 'unknown' = 'unknown',
    ) => {
      if (!readyProfileId) return;
      const succeeded = outcome === 'succeeded';
      await recordEventForProfile(readyProfileId, {
        action: direction === 'undo' ? 'Undo' : 'Redo',
        category: 'Bookmarks',
        dataChanged: succeeded,
        durationMs: 0,
        eventCode: `HISTORY-${direction.toUpperCase()}-${succeeded ? 'COMPLETE' : 'FAILED'}`,
        itemType:
          itemType === 'unknown'
            ? 'Bookmark or folder'
            : itemType === 'folder'
              ? 'Folder'
              : 'Bookmark',
        itemsAffected: succeeded ? 1 : 0,
        kind: succeeded ? 'ACTIVITY' : 'DIAGNOSTIC',
        level: succeeded ? 'INFO' : 'ERROR',
        message: t(
          succeeded
            ? `undoHistory.${direction}Succeeded`
            : 'undoHistory.operationFailed',
        ),
        outcome: succeeded ? 'Succeeded' : 'Failed',
        source: 'Undo history',
      });
      if (succeeded)
        notifyForActiveProfile({
          level: 'success',
          message: t(`undoHistory.${direction}Succeeded`),
          title: t('notifications.operationCompletedTitle'),
        });
      else notifyOperationError(t('undoHistory.operationFailed'));
    },
    [
      notifyForActiveProfile,
      notifyOperationError,
      readyProfileId,
      recordEventForProfile,
      t,
    ],
  );

  const shortcutPreferences =
    currentInitializationState.status === 'ready'
      ? (currentInitializationState.settings.shortcutPreferences ??
        defaultShortcutPreferences)
      : defaultShortcutPreferences;

  useEffect(() => {
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      if (!shortcutPreferences.enabled || !readyProfileId) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement)
      )
        return;
      if (document.querySelector('dialog[open]')) return;

      if (matchesShortcut(event, shortcutPreferences.bindings.history)) {
        event.preventDefault();
        setProfileWindow('undo-history');
        return;
      }
      const direction = matchesShortcut(
        event,
        shortcutPreferences.bindings.redo,
      )
        ? 'redo'
        : matchesShortcut(event, shortcutPreferences.bindings.undo)
          ? 'undo'
          : undefined;
      if (!direction) return;
      const hasOperation = undoHistory.store
        .getState()
        .entries.some(
          (entry) =>
            entry.profileId === readyProfileId && entry.status === direction,
        );
      if (!hasOperation || undoHistory.store.getState().busy) return;
      event.preventDefault();
      void (async () => {
        const before = await bookmarkManager
          .captureUndoState(readyProfileId)
          .catch(() => undefined);
        if (direction === 'redo') await undoHistory.redo(readyProfileId);
        else await undoHistory.undo(readyProfileId);
        const after = await bookmarkManager
          .captureUndoState(readyProfileId)
          .catch(() => undefined);
        await publishLocalContentChange(readyProfileId, before, after);
        try {
          if (currentFolderId)
            await loadFolderContent(readyProfileId, currentFolderId);
          await recordHistoryOutcome(direction, 'succeeded');
        } catch {
          await recordHistoryOutcome(direction, 'failed');
        }
      })().catch(() => void recordHistoryOutcome(direction, 'failed'));
    };
    window.addEventListener('keydown', handleHistoryShortcut);
    return () => window.removeEventListener('keydown', handleHistoryShortcut);
  }, [
    bookmarkManager,
    currentFolderId,
    loadFolderContent,
    notifyOperationError,
    publishLocalContentChange,
    recordHistoryOutcome,
    readyProfileId,
    shortcutPreferences,
    t,
    undoHistory,
  ]);

  useEffect(() => {
    const handleClipboardShortcut = (event: KeyboardEvent) => {
      if (
        !shortcutPreferences.enabled ||
        !readyProfileId ||
        document.querySelector('dialog[open]')
      )
        return;
      const eventTarget = event.target;
      if (
        eventTarget instanceof HTMLElement &&
        (eventTarget.isContentEditable ||
          eventTarget instanceof HTMLInputElement ||
          eventTarget instanceof HTMLTextAreaElement ||
          eventTarget instanceof HTMLSelectElement)
      )
        return;
      const action = matchesShortcut(event, shortcutPreferences.bindings.copy)
        ? 'copy'
        : matchesShortcut(event, shortcutPreferences.bindings.cut)
          ? 'cut'
          : matchesShortcut(event, shortcutPreferences.bindings.paste)
            ? 'paste'
            : undefined;
      if (!action) return;
      const activeElement = document.activeElement;
      const itemElement =
        activeElement instanceof Element
          ? activeElement.closest<HTMLElement>(
              '[data-context-menu="bookmark"][data-item-id]',
            )
          : null;
      if (action === 'paste') {
        const inContentPanel =
          activeElement instanceof Element &&
          Boolean(activeElement.closest('.bookmark-grid'));
        if (!inContentPanel || pasteDisabled) return;
        event.preventDefault();
        void pasteInternalClipboard();
        return;
      }
      if (!itemElement) return;
      const selected =
        itemElement.dataset.itemKind === 'folder'
          ? folders.find(({ id }) => id === itemElement.dataset.itemId)
          : bookmarks.find(({ id }) => id === itemElement.dataset.itemId);
      if (!selected || !selected.parentId) return;
      event.preventDefault();
      void selectInternalClipboard(
        'url' in selected
          ? { kind: 'bookmark', value: selected }
          : { kind: 'folder', value: selected },
        action,
      );
    };
    window.addEventListener('keydown', handleClipboardShortcut);
    return () => window.removeEventListener('keydown', handleClipboardShortcut);
  });

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if (
        !shortcutPreferences.enabled ||
        !matchesShortcut(event, shortcutPreferences.bindings.search) ||
        !readyProfileId ||
        document.querySelector('dialog[open]')
      )
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement)
      )
        return;
      event.preventDefault();
      openSearchWindow();
    };
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, [openSearchWindow, readyProfileId, shortcutPreferences]);

  const openContextMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    const target = event.target;
    const itemElement =
      target instanceof Element &&
      target.closest<HTMLElement>('[data-context-menu="bookmark"]');
    const bookmarkContent =
      target instanceof Element &&
      target.closest<HTMLElement>('.bookmark-grid');

    if (itemElement) {
      const itemId = itemElement.dataset.itemId;
      const selectedItem =
        itemElement.dataset.itemKind === 'folder'
          ? folders.find((folder) => folder.id === itemId)
          : bookmarks.find((bookmark) => bookmark.id === itemId);
      if (!selectedItem) {
        clearContextMenu();
        return;
      }
      contextMenuFocusRef.current = itemElement;
      setContextMenu({
        kind: 'bookmark',
        target:
          'url' in selectedItem
            ? { kind: 'bookmark', value: selectedItem }
            : { kind: 'folder', value: selectedItem },
        x: event.clientX,
        y: event.clientY,
      });
      return;
    }

    if (bookmarkContent) {
      bookmarkContent.focus({ preventScroll: true });
      openEmptyAreaContextMenu({ x: event.clientX, y: event.clientY });
      return;
    }

    clearContextMenu();
  };

  const activeSettings =
    currentInitializationState.status === 'ready'
      ? currentInitializationState.settings
      : undefined;
  const customAccent =
    activeSettings?.accentColorMode === 'custom'
      ? activeSettings.customAccentColor
      : undefined;
  const scrollbarBehavior = activeSettings?.scrollbarBehavior ?? 'scrolling';
  const animationPreference = activeSettings?.animationPreference ?? 'system';
  const highContrast = activeSettings?.highContrast ?? false;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = animationPreference;
    root.classList.toggle('high-contrast', highContrast);
    window.dispatchEvent(new Event('bmp-motion-preference-change'));
    return () => {
      delete root.dataset.motion;
      root.classList.remove('high-contrast');
      window.dispatchEvent(new Event('bmp-motion-preference-change'));
    };
  }, [animationPreference, highContrast]);

  /** Keeps auto-hidden scrollbars visible briefly while any app region scrolls. */
  const showScrollbarWhileScrolling = useCallback(() => {
    if (scrollbarBehavior === 'always') return;
    setIsScrollbarActive(true);
    if (scrollbarIdleTimerRef.current) {
      clearTimeout(scrollbarIdleTimerRef.current);
    }
    scrollbarIdleTimerRef.current = setTimeout(() => {
      setIsScrollbarActive(false);
    }, 700);
  }, [scrollbarBehavior]);

  useEffect(() => {
    const root = document.documentElement;
    const behaviorClasses = [
      'scrollbars--system',
      'scrollbars--always',
      'scrollbars--scrolling',
    ];
    root.classList.remove(...behaviorClasses);
    root.classList.add(`scrollbars--${scrollbarBehavior}`);
    root.classList.toggle('scrollbars--active', isScrollbarActive);

    return () => {
      root.classList.remove(...behaviorClasses, 'scrollbars--active');
    };
  }, [isScrollbarActive, scrollbarBehavior]);

  useEffect(() => {
    window.addEventListener('scroll', showScrollbarWhileScrolling, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', showScrollbarWhileScrolling, true);
      if (scrollbarIdleTimerRef.current) {
        clearTimeout(scrollbarIdleTimerRef.current);
      }
    };
  }, [showScrollbarWhileScrolling]);

  return (
    <main
      aria-keyshortcuts={
        shortcutPreferences.enabled
          ? Object.values(shortcutPreferences.bindings).join(' ')
          : undefined
      }
      className={[
        currentFolder?.includeNavigationBackground
          ? 'app--navigation-background'
          : '',
        `scrollbars--${scrollbarBehavior}`,
        isScrollbarActive ? 'scrollbars--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-initialization-status={currentInitializationState.status}
      data-preflight-language={preflightSnapshot.language}
      data-preflight-operation={preflightSnapshot.operationId}
      onContextMenu={openContextMenu}
      onScrollCapture={showScrollbarWhileScrolling}
      style={
        {
          ...(currentFolder
            ? {
                ...folderBackgroundStyle(currentFolder.backgroundAppearance),
                '--navigation-overlay-opacity': String(
                  1 - currentFolder.navigationTransparency / 100,
                ),
              }
            : {}),
          ...(customAccent
            ? { '--accent': customAccent, '--focus': customAccent }
            : {}),
        } as CSSProperties
      }
    >
      <TopNavigation
        onNavigate={(index) => {
          if (!currentFolderId || !readyProfileId) return;
          const target = findFolderChain(allFolders, currentFolderId)[index];
          if (!target) return;
          void openFolder(target.id, 'Breadcrumb navigation').catch(
            () => undefined,
          );
        }}
        onOpenProfile={() => {
          clearContextMenu();
          setIsTreeOpen(false);
          setIsProfileMenuOpen(true);
        }}
        onOpenTree={() => {
          clearContextMenu();
          setIsProfileMenuOpen(false);
          setIsTreeOpen(true);
        }}
        path={currentPath}
        pathSeparator={pathSeparator}
        profileButtonRef={profileButtonRef}
        profile={
          currentInitializationState.status === 'ready'
            ? currentInitializationState.profile
            : undefined
        }
        profileIconFallback={
          currentInitializationState.status === 'ready'
            ? (currentInitializationState.settings.profilePreferences
                ?.defaultProfileIcon ?? 'built-in')
            : 'built-in'
        }
        treeButtonRef={treeButtonRef}
      />
      <ProfileMenuPanel
        initializationState={currentInitializationState}
        isOpen={isProfileMenuOpen}
        onAfterClose={() => {
          if (openSyncAfterMenuClose) {
            setOpenSyncAfterMenuClose(false);
            setProfileWindow('synchronization');
            return;
          }
          if (openActivityLogAfterMenuClose) {
            setOpenActivityLogAfterMenuClose(false);
            setProfileWindow('activity-log');
            return;
          }
          if (openUndoHistoryAfterMenuClose) {
            setOpenUndoHistoryAfterMenuClose(false);
            setProfileWindow('undo-history');
            return;
          }
          if (openSettingsAfterMenuClose) {
            setOpenSettingsAfterMenuClose(false);
            setProfileWindow('settings');
            return;
          }
          if (openAboutAfterMenuClose) {
            setOpenAboutAfterMenuClose(false);
            setProfileWindow('about');
            return;
          }
          if (openChangelogAfterMenuClose) {
            setOpenChangelogAfterMenuClose(false);
            setAutomaticChangelogContent(null);
            setProfileWindow('changelog');
            return;
          }
          if (openLegalAfterMenuClose) {
            setOpenLegalAfterMenuClose(false);
            setProfileWindow('legal');
            return;
          }
          if (openHelpAfterMenuClose) {
            setOpenHelpAfterMenuClose(false);
            setProfileWindow('help');
            return;
          }
          profileButtonRef.current?.focus();
        }}
        onClose={() => setIsProfileMenuOpen(false)}
        onManageProfiles={() =>
          void openProfileWindow('manage').catch(() => undefined)
        }
        onOpenAbout={() => {
          setOpenAboutAfterMenuClose(true);
          setIsProfileMenuOpen(false);
        }}
        onOpenBookmarkActivityLog={() => {
          // Native modal dialogs cannot overlap; wait for the side panel's
          // closing animation before opening the focused log window.
          setOpenActivityLogAfterMenuClose(true);
          setIsProfileMenuOpen(false);
        }}
        onOpenChangelog={() => {
          setAutomaticChangelogContent(null);
          setOpenChangelogAfterMenuClose(true);
          setIsProfileMenuOpen(false);
        }}
        onOpenLegal={() => {
          setOpenLegalAfterMenuClose(true);
          setIsProfileMenuOpen(false);
        }}
        onOpenHelp={() => {
          setOpenHelpAfterMenuClose(true);
          setIsProfileMenuOpen(false);
        }}
        onOpenUndoHistory={() => {
          setOpenUndoHistoryAfterMenuClose(true);
          setIsProfileMenuOpen(false);
        }}
        onOpenSynchronization={() => {
          setOpenSyncAfterMenuClose(true);
          setIsProfileMenuOpen(false);
        }}
        onOpenSettings={() => {
          void Promise.all([
            profileManager.getStorageUsage(),
            profileManager.list(),
            updateAnnouncements.getPreferences(),
          ])
            .then(([usage, profileList, updatePreferences]) => {
              setProfileStorageUsage(usage);
              setProfiles(profileList);
              setUpdateAnnouncementsEnabled(updatePreferences.showAfterUpdate);
            })
            .catch(() => {
              setProfileStorageUsage([]);
              notifyForActiveProfile({
                level: 'warning',
                message: t('activityLog.messages.profileStorageUnavailable'),
                title: t('notifications.limitedDataTitle'),
              });
              if (readyProfileId)
                void recordEventForProfile(readyProfileId, {
                  action: 'Estimate',
                  category: 'Profiles',
                  dataChanged: false,
                  durationMs: 0,
                  eventCode: 'PROFILE-STORAGE-ESTIMATE-UNAVAILABLE',
                  itemType: 'Profile storage',
                  itemsAffected: 0,
                  kind: 'DIAGNOSTIC',
                  level: 'WARN',
                  message: t('activityLog.messages.profileStorageUnavailable'),
                  outcome: 'Skipped',
                  source: 'Settings',
                });
            });
          if (readyProfileId)
            void activityLog
              .getSettings(readyProfileId)
              .then(setActivityLogSettings)
              .catch(() => {
                setActivityLogSettings(null);
                notifyForActiveProfile({
                  level: 'warning',
                  message: t('activityLog.messages.settingsLoadFailed'),
                  title: t('notifications.limitedDataTitle'),
                });
                void recordEventForProfile(readyProfileId, {
                  action: 'Load',
                  category: 'Application',
                  dataChanged: false,
                  durationMs: 0,
                  eventCode: 'ACTIVITY-LOG-SETTINGS-LOAD-FAILED',
                  itemType: 'Activity log settings',
                  itemsAffected: 0,
                  kind: 'DIAGNOSTIC',
                  level: 'WARN',
                  message: t('activityLog.messages.settingsLoadFailed'),
                  outcome: 'Skipped',
                  source: 'Settings',
                });
              });
          setOpenSettingsAfterMenuClose(true);
          setIsProfileMenuOpen(false);
        }}
        onSwitchProfile={() =>
          void openProfileWindow('switch').catch(() => undefined)
        }
      />
      {readyProfileId ? (
        <SyncFeedbackBridge
          profileId={readyProfileId}
          onEvent={(event) =>
            notifyForActiveProfile({
              level:
                event === 'failed'
                  ? 'error'
                  : [
                        'conflict',
                        'skipped',
                        'permission',
                        'missing-root',
                      ].includes(event)
                    ? 'warning'
                    : ['paused', 'disconnected'].includes(event)
                      ? 'information'
                      : 'success',
              title: t('sync.title'),
              message: t(`sync.serviceEvents.${event}`),
            })
          }
        />
      ) : null}
      {profileWindow === 'synchronization' && readyProfileId ? (
        <SynchronizationDialog
          key={readyProfileId}
          profileId={readyProfileId}
          adapter={syncAdapter}
          returnFocusRef={profileButtonRef}
          extensionFolders={allFolders.filter(
            (folder) => folder.profileId === readyProfileId,
          )}
          onClose={() => {
            setProfileWindow(null);
            profileButtonRef.current?.focus();
          }}
          readExtension={async () => {
            const [profileFolders, profileBookmarks] = await Promise.all([
              bookmarkManager.listFolders(readyProfileId),
              bookmarkManager.listBookmarks(readyProfileId),
            ]);
            return [...profileFolders, ...profileBookmarks].filter(
              (item) => item.profileId === readyProfileId,
            );
          }}
          onReport={(event) => {
            const failed =
              event === 'loadFailed' ||
              event === 'previewFailed' ||
              event === 'operationFailed';
            const degraded =
              event === 'unavailable' ||
              event === 'accessDenied' ||
              event === 'previewIncomplete';
            void recordEventForProfile(readyProfileId, {
              action: 'Preview',
              category: 'Bookmarks',
              dataChanged: false,
              durationMs: 0,
              eventCode: `SYNC-SETUP-${event.replace(/[A-Z]/g, (letter) => `-${letter}`).toUpperCase()}`,
              itemType: 'Synchronization',
              itemsAffected: 0,
              kind: failed ? 'DIAGNOSTIC' : 'ACTIVITY',
              level: failed ? 'ERROR' : degraded ? 'WARN' : 'INFO',
              message: t(`sync.events.${event}`),
              outcome: failed ? 'Failed' : degraded ? 'Skipped' : 'Succeeded',
              source: 'Synchronization setup',
            });
            if (shouldNotifyForSyncSetupEvent(event))
              notifyForActiveProfile({
                level: failed ? 'error' : degraded ? 'warning' : 'success',
                title: t('sync.title'),
                message: t(`sync.events.${event}`),
              });
          }}
        />
      ) : null}
      <AboutDialog
        isOpen={profileWindow === 'about'}
        onClose={() => setProfileWindow(null)}
      />
      <ChangelogDialog
        content={automaticChangelogContent ?? { kind: 'full' }}
        isOpen={profileWindow === 'changelog'}
        onClose={() => {
          setProfileWindow(null);
          setAutomaticChangelogContent(null);
        }}
        onOpenExternalLink={(url) => {
          void openExternalAppLink(url).catch(() =>
            console.error('external-app-link-open-failed'),
          );
        }}
        onAutomaticContentRendered={() => {
          const claim = updateAnnouncementClaimRef.current;
          if (!claim) return;
          updateAnnouncementClaimRef.current = null;
          const completion =
            automaticChangelogContent?.kind === 'unavailable'
              ? updateAnnouncements.markUnavailable(
                  claim.version,
                  claim.claimId,
                )
              : updateAnnouncements.markShown(claim.version, claim.claimId);
          void completion.catch(() =>
            console.error('update-announcement-complete-failed'),
          );
        }}
      />
      <LegalDialog
        isOpen={profileWindow === 'legal'}
        onClose={() => setProfileWindow(null)}
      />
      <HelpDialog
        isOpen={profileWindow === 'help'}
        onClose={() => setProfileWindow(null)}
        onOpenExternalLink={(url) => {
          void openExternalAppLink(url).catch(() =>
            console.error('external-app-link-open-failed'),
          );
        }}
      />
      {currentInitializationState.status === 'ready' ? (
        <>
          <BookmarkActivityLogDialog
            activityLog={activityLog}
            dateTimeFormat={
              currentInitializationState.settings.dateTimeFormat ?? 'browser'
            }
            isOpen={profileWindow === 'activity-log'}
            onClose={() => setProfileWindow(null)}
            onNotify={notifyForActiveProfile}
            profileId={currentInitializationState.profile.id}
          />
          <UndoHistoryDialog
            dateTimeFormat={
              currentInitializationState.settings.dateTimeFormat ?? 'browser'
            }
            isOpen={profileWindow === 'undo-history'}
            onClose={() => setProfileWindow(null)}
            onHistoryChanged={async (entry, direction) => {
              await publishLocalContentChange(
                currentInitializationState.profile.id,
                direction === 'undo' ? entry.after : entry.before,
                direction === 'undo' ? entry.before : entry.after,
              );
              if (currentFolderId)
                await loadFolderContent(
                  currentInitializationState.profile.id,
                  currentFolderId,
                );
            }}
            onHistoryClearCompleted={async () => {
              await recordEventForProfile(
                currentInitializationState.profile.id,
                {
                  action: 'Clear',
                  category: 'Bookmarks',
                  dataChanged: true,
                  durationMs: 0,
                  eventCode: 'HISTORY-CLEAR-COMPLETE',
                  itemType: 'Undo history',
                  itemsAffected: 0,
                  kind: 'ACTIVITY',
                  level: 'INFO',
                  message: t('undoHistory.clearSucceeded'),
                  outcome: 'Succeeded',
                  source: 'Undo history',
                },
              );
              notifyForActiveProfile({
                level: 'success',
                message: t('undoHistory.clearSucceeded'),
                title: t('notifications.operationCompletedTitle'),
              });
            }}
            onHistoryClearFailed={() => {
              void recordEventForProfile(
                currentInitializationState.profile.id,
                {
                  action: 'Clear',
                  category: 'Bookmarks',
                  dataChanged: false,
                  durationMs: 0,
                  eventCode: 'HISTORY-CLEAR-FAILED',
                  itemType: 'Undo history',
                  itemsAffected: 0,
                  kind: 'DIAGNOSTIC',
                  level: 'ERROR',
                  message: t('undoHistory.clearFailed'),
                  outcome: 'Failed',
                  source: 'Undo history',
                },
              );
              notifyOperationError(t('undoHistory.clearFailed'));
            }}
            onOperationCompleted={(direction, itemType) =>
              recordHistoryOutcome(direction, 'succeeded', itemType)
            }
            onOperationFailed={(direction) =>
              void recordHistoryOutcome(direction, 'failed')
            }
            profileId={currentInitializationState.profile.id}
            requestClearConfirmation={() =>
              requestConfirmation(t('undoHistory.clearConfirm'), 'clearAll')
            }
            service={undoHistory}
          />
          <BookmarkDisplaySettingsDialog
            activityLogSettings={
              activityLogSettings ??
              defaultActivityLogSettings(currentInitializationState.profile.id)
            }
            isOpen={profileWindow === 'settings'}
            onClose={() => setProfileWindow(null)}
            onSave={async (display) => {
              try {
                await runLoggedProfileAction(
                  async () => {
                    await profileManager.updateProfileSettings(
                      currentInitializationState.profile.id,
                      display,
                    );
                    setPreflightSnapshot(await resumePreflight());
                  },
                  'Update',
                  'SETTINGS-UPDATE',
                  t('notifications.settingsSavedMessage'),
                  t('activityLog.messages.profileUpdateFailed'),
                  false,
                );
                if (
                  (
                    display.notificationPreferences ??
                    defaultNotificationPreferences
                  ).enabled
                )
                  showNotification({
                    level: 'success',
                    message: t('notifications.settingsSavedMessage'),
                    title: t('notifications.settingsSavedTitle'),
                  });
              } catch (error) {
                notifyOperationError(
                  t('activityLog.messages.profileUpdateFailed'),
                );
                throw error;
              }
            }}
            onSaveActivitySettings={async (next) => {
              const {
                activityEnabled,
                autoDeleteOldest,
                diagnosticsEnabled,
                enabled,
                includeDiagnosticsExport,
                maximumStorageMb,
                minimumLevel,
                retentionCount,
              } = next;
              try {
                const saved = await activityLog.updateSettings(
                  currentInitializationState.profile.id,
                  {
                    activityEnabled,
                    autoDeleteOldest,
                    diagnosticsEnabled,
                    enabled,
                    includeDiagnosticsExport,
                    maximumStorageMb,
                    minimumLevel,
                    retentionCount,
                  },
                );
                setActivityLogSettings(saved);
                await recordEventForProfile(
                  currentInitializationState.profile.id,
                  {
                    action: 'Update',
                    category: 'Application',
                    dataChanged: true,
                    durationMs: 0,
                    eventCode: 'ACTIVITY-LOG-SERVICE-UPDATE-COMPLETE',
                    itemType: 'Activity log settings',
                    itemsAffected: 1,
                    kind: 'DIAGNOSTIC',
                    level: 'INFO',
                    message: t('activityLog.messages.settingsUpdated'),
                    outcome: 'Succeeded',
                    source: 'Settings',
                  },
                );
                notifyForActiveProfile({
                  level: 'success',
                  message: t('activityLog.messages.settingsUpdated'),
                  title: t('notifications.activityLogSettingsSavedTitle'),
                });
              } catch (error) {
                await recordEventForProfile(
                  currentInitializationState.profile.id,
                  {
                    action: 'Update',
                    category: 'Application',
                    dataChanged: false,
                    durationMs: 0,
                    eventCode: 'ACTIVITY-LOG-SERVICE-UPDATE-FAILED',
                    itemType: 'Activity log settings',
                    itemsAffected: 0,
                    kind: 'DIAGNOSTIC',
                    level: 'ERROR',
                    message: t('activityLog.messages.settingsUpdateFailed'),
                    outcome: 'Failed',
                    source: 'Settings',
                  },
                );
                notifyOperationError(
                  t('activityLog.messages.settingsUpdateFailed'),
                );
                throw error;
              }
            }}
            onSaveUpdateAnnouncements={async (enabled) => {
              await updateAnnouncements.updatePreferences(enabled);
              setUpdateAnnouncementsEnabled(enabled);
            }}
            onOpenExternalLink={(url) => {
              void openExternalAppLink(url).catch(() =>
                console.error('external-app-link-open-failed'),
              );
            }}
            profiles={profiles}
            settings={currentInitializationState.settings}
            storageUsage={profileStorageUsage}
            updateAnnouncementsEnabled={updateAnnouncementsEnabled}
          />
        </>
      ) : null}
      <ProfileSwitcherDialog
        dateTimeFormat={activeSettings?.dateTimeFormat ?? 'browser'}
        defaultProfileIcon={
          currentInitializationState.status === 'ready'
            ? (currentInitializationState.settings.profilePreferences
                ?.defaultProfileIcon ?? 'built-in')
            : 'built-in'
        }
        isOpen={profileWindow === 'switch'}
        onClose={() => setProfileWindow(null)}
        profiles={profiles}
        onSwitch={async (profileId) => {
          try {
            if (readyProfileId && currentFolderId)
              lastFolderByProfileRef.current.set(
                readyProfileId,
                currentFolderId,
              );
            const activation = await profileManager.switchTo(profileId);
            if (!activation.changed) {
              setProfileWindow(null);
              return;
            }
            forceHomeProfileIdRef.current = profileId;
            initializedProfileIdRef.current = undefined;
            closeProfileBoundState();
            clearProfileBoundContent();
            await publishProfileActivationSafely(activation);
            const resumed = await resumePreflight();
            setPreflightSnapshot(resumed);
            if (resumed.initialization.status === 'ready') {
              await recordEventForProfile(resumed.initialization.profile.id, {
                action: 'Switch',
                category: 'Profiles',
                dataChanged: true,
                durationMs: 0,
                eventCode: 'PROFILE-SWITCH-COMPLETE',
                itemType: 'Active profile',
                itemsAffected: 1,
                kind: 'ACTIVITY',
                level: 'INFO',
                message: t('activityLog.messages.profileSwitched'),
                outcome: 'Succeeded',
                source: 'Profile switcher',
              });
              const preferences =
                resumed.initialization.settings.notificationPreferences ??
                defaultNotificationPreferences;
              if (preferences.enabled)
                showNotification({
                  level: 'success',
                  message: t('activityLog.messages.profileSwitched'),
                  title: t('notifications.profileSwitchedTitle'),
                });
            }
            setProfileWindow(null);
          } catch (error) {
            await recordProfileEvent({
              action: 'Switch',
              category: 'Profiles',
              dataChanged: false,
              durationMs: 0,
              eventCode: 'PROFILE-SWITCH-FAILED',
              itemType: 'Active profile',
              itemsAffected: 0,
              kind: 'DIAGNOSTIC',
              level: 'ERROR',
              message: t('activityLog.messages.profileSwitchFailed'),
              outcome: 'Failed',
              source: 'Profile switcher',
            });
            notifyOperationError(t('activityLog.messages.profileSwitchFailed'));
            throw error;
          }
        }}
      />
      <ProfileManagerDialog
        confirmDeletion={
          currentInitializationState.status === 'ready'
            ? (currentInitializationState.settings.profilePreferences
                ?.confirmProfileDeletion ?? true)
            : true
        }
        defaultProfileIcon={
          currentInitializationState.status === 'ready'
            ? (currentInitializationState.settings.profilePreferences
                ?.defaultProfileIcon ?? 'built-in')
            : 'built-in'
        }
        isOpen={profileWindow === 'manage'}
        language={preflightSnapshot.language}
        dateTimeFormat={activeSettings?.dateTimeFormat ?? 'browser'}
        onClose={() => setProfileWindow(null)}
        onCreate={async (input) => {
          await runLoggedProfileAction(
            async () => {
              await profileManager.create(input);
              await refreshProfiles();
            },
            'Create',
            'CREATE',
            t('activityLog.messages.profileCreated'),
            t('activityLog.messages.profileCreateFailed'),
          );
        }}
        onDelete={async (profileId) => {
          await runLoggedProfileAction(
            async () => {
              await profileManager.delete(profileId);
              await refreshProfiles();
            },
            'Delete',
            'DELETE',
            t('activityLog.messages.profileDeleted'),
            t('activityLog.messages.profileDeleteFailed'),
          );
        }}
        onDuplicate={async (profileId) => {
          await runLoggedProfileAction(
            async () => {
              await profileManager.duplicate(profileId);
              await refreshProfiles();
            },
            'Duplicate',
            'DUPLICATE',
            t('activityLog.messages.profileDuplicated'),
            t('activityLog.messages.profileDuplicateFailed'),
          );
        }}
        onUpdate={async (profileId, input) => {
          await runLoggedProfileAction(
            async () => {
              await profileManager.update(profileId, input);
              await refreshProfiles();
              setPreflightSnapshot(await resumePreflight());
            },
            'Update',
            'UPDATE',
            t('activityLog.messages.profileUpdated'),
            t('activityLog.messages.profileUpdateFailed'),
          );
        }}
        profiles={profiles}
      />
      <BookmarkGrid
        bookmarkOpening={
          currentInitializationState.status === 'ready'
            ? (currentInitializationState.settings.bookmarkOpening ??
              'current-tab')
            : 'current-tab'
        }
        bookmarks={bookmarks}
        contentRef={bookmarkContentRef}
        folders={folders}
        currentFolderId={currentFolderId}
        folderOpening={
          currentInitializationState.status === 'ready'
            ? (currentInitializationState.settings.folderOpening ??
              'single-click')
            : 'single-click'
        }
        interactionLocked={undoHistoryState.busy}
        onOpenFolder={(folder) =>
          void openFolder(folder.id, 'Bookmark content').catch(() => undefined)
        }
        onOpenBookmark={(bookmark) =>
          void openBookmark(
            bookmark.url,
            currentInitializationState.status === 'ready'
              ? (currentInitializationState.settings.bookmarkOpening ??
                  'current-tab')
              : 'current-tab',
            'Bookmark content',
          ).catch(() => undefined)
        }
        requestConfirmation={requestConfirmation}
        onMoveItem={async ({
          destinationIndex,
          destinationParentId,
          itemId,
          onValidated,
          openDestination,
        }) => {
          if (!readyProfileId) throw new Error('active-profile-not-ready');
          const startedAt = performance.now();
          try {
            const movedItemType: UndoHistoryItemType = folders.some(
              ({ id }) => id === itemId,
            )
              ? 'folder'
              : 'bookmark';
            await runUndoable(
              readyProfileId,
              itemId,
              movedItemType,
              'moved',
              () =>
                bookmarkManager.moveItem(
                  readyProfileId,
                  itemId,
                  destinationParentId,
                  destinationIndex,
                  onValidated,
                ),
            );
            await loadFolderContent(
              readyProfileId,
              currentFolderId ?? destinationParentId,
            );
            await recordEventForProfile(readyProfileId, {
              action: 'Move',
              category: 'Bookmarks',
              dataChanged: true,
              durationMs: Math.round(performance.now() - startedAt),
              eventCode: 'ITEM-MOVE-COMPLETE',
              itemType: 'Bookmark or folder',
              itemsAffected: 1,
              kind: 'ACTIVITY',
              level: 'INFO',
              message: t('bookmarks.moveSucceeded'),
              outcome: 'Succeeded',
              source: 'Bookmark browser',
            });
            notifyForActiveProfile({
              level: 'success',
              message: t('bookmarks.moveSucceeded'),
              title: t('notifications.operationCompletedTitle'),
            });
            if (openDestination)
              await openFolder(destinationParentId, 'Drag and drop');
          } catch (error) {
            await recordEventForProfile(readyProfileId, {
              action: 'Move',
              category: 'Bookmarks',
              dataChanged: false,
              durationMs: Math.round(performance.now() - startedAt),
              eventCode: 'ITEM-MOVE-FAILED',
              itemType: 'Bookmark or folder',
              itemsAffected: 0,
              kind: 'DIAGNOSTIC',
              level: 'ERROR',
              message: t('bookmarks.moveFailed'),
              outcome: 'Failed',
              source: 'Bookmark browser',
            });
            notifyOperationError(t('bookmarks.moveFailed'));
            throw error;
          }
        }}
        view={
          currentInitializationState.status === 'ready'
            ? {
                ...currentInitializationState.settings,
                bookmarkView:
                  currentFolder?.bookmarkView ??
                  currentInitializationState.settings.bookmarkView,
                cardSpacing:
                  currentFolder?.cardSpacing ??
                  currentInitializationState.settings.cardSpacing ??
                  'comfortable',
                cardSize:
                  currentFolder?.cardSize ??
                  currentInitializationState.settings.cardSize,
                dateTimeFormat:
                  currentInitializationState.settings.dateTimeFormat ??
                  'browser',
                detailsTableTransparency:
                  currentFolder?.detailsTableTransparency ?? 0,
                bookmarkSortBy:
                  currentFolder?.bookmarkSortBy ??
                  currentInitializationState.settings.bookmarkSortBy ??
                  'manual',
                bookmarkSortDirection:
                  currentFolder?.bookmarkSortDirection ??
                  currentInitializationState.settings.bookmarkSortDirection ??
                  'ascending',
                bookmarkGroupBy:
                  currentFolder?.bookmarkGroupBy ??
                  currentInitializationState.settings.bookmarkGroupBy ??
                  'none',
              }
            : {
                bookmarkView: 'card',
                cardSize: 'medium',
                cardSpacing: 'comfortable',
                detailsTableTransparency: 0,
                dragAndDropEnabled: true,
                bookmarkSortBy: 'manual',
                bookmarkSortDirection: 'ascending',
                bookmarkGroupBy: 'none',
              }
        }
      />
      {currentFolder && isFolderStyleOpen ? (
        <FolderStyleDialog
          appearance={currentFolder.backgroundAppearance}
          bookmarkGroupBy={
            currentFolder.bookmarkGroupBy ??
            (currentInitializationState.status === 'ready'
              ? currentInitializationState.settings.bookmarkGroupBy
              : undefined) ??
            'none'
          }
          bookmarkSortBy={
            currentFolder.bookmarkSortBy ??
            (currentInitializationState.status === 'ready'
              ? currentInitializationState.settings.bookmarkSortBy
              : undefined) ??
            'manual'
          }
          bookmarkSortDirection={
            currentFolder.bookmarkSortDirection ??
            (currentInitializationState.status === 'ready'
              ? currentInitializationState.settings.bookmarkSortDirection
              : undefined) ??
            'ascending'
          }
          bookmarkView={currentFolder.bookmarkView}
          cardSize={
            currentFolder.cardSize ??
            (currentInitializationState.status === 'ready'
              ? currentInitializationState.settings.cardSize
              : 'medium')
          }
          cardSpacing={
            currentFolder.cardSpacing ??
            (currentInitializationState.status === 'ready'
              ? currentInitializationState.settings.cardSpacing
              : undefined) ??
            'comfortable'
          }
          detailsTableTransparency={currentFolder.detailsTableTransparency}
          folderName={currentFolder.title}
          isOpen={isFolderStyleOpen}
          includeNavigationBackground={
            currentFolder.includeNavigationBackground
          }
          key={currentFolder.id}
          navigationTransparency={currentFolder.navigationTransparency}
          onClose={() => setIsFolderStyleOpen(false)}
          onSave={async ({
            appearance,
            bookmarkGroupBy,
            bookmarkSortBy,
            bookmarkSortDirection,
            bookmarkView,
            cardSize,
            cardSpacing,
            detailsTableTransparency,
            includeNavigationBackground,
            navigationTransparency,
          }) => {
            if (!readyProfileId) throw new Error('active-profile-not-ready');
            const startedAt = performance.now();
            try {
              await runUndoable(
                readyProfileId,
                currentFolder.id,
                'folder',
                'styled',
                () =>
                  bookmarkManager.updateFolderStyle(
                    readyProfileId,
                    currentFolder.id,
                    {
                      backgroundAppearance: appearance,
                      bookmarkGroupBy,
                      bookmarkSortBy,
                      bookmarkSortDirection,
                      bookmarkView,
                      cardSize,
                      cardSpacing,
                      detailsTableTransparency,
                      includeNavigationBackground,
                      navigationTransparency,
                    },
                    currentFolder.updatedAt,
                  ),
              );
              await loadFolderContent(readyProfileId, currentFolder.id);
              await recordEventForProfile(readyProfileId, {
                action: 'Update',
                category: 'Bookmarks',
                dataChanged: true,
                durationMs: Math.round(performance.now() - startedAt),
                eventCode: 'FOLDER-STYLE-UPDATE-COMPLETE',
                itemType: 'Folder settings',
                itemsAffected: 1,
                kind: 'ACTIVITY',
                level: 'INFO',
                message: t('activityLog.messages.folderStyleUpdated'),
                outcome: 'Succeeded',
                source: 'Folder style editor',
              });
              notifyForActiveProfile({
                level: 'success',
                message: t('activityLog.messages.folderStyleUpdated'),
                title: t('notifications.folderStyleSavedTitle'),
              });
            } catch (error) {
              await recordEventForProfile(readyProfileId, {
                action: 'Update',
                category: 'Bookmarks',
                dataChanged: false,
                durationMs: Math.round(performance.now() - startedAt),
                eventCode: 'FOLDER-STYLE-UPDATE-FAILED',
                itemType: 'Folder settings',
                itemsAffected: 0,
                kind: 'DIAGNOSTIC',
                level: 'ERROR',
                message: t('activityLog.messages.folderStyleUpdateFailed'),
                outcome: 'Failed',
                source: 'Folder style editor',
              });
              notifyOperationError(
                t('activityLog.messages.folderStyleUpdateFailed'),
              );
              throw error;
            }
          }}
        />
      ) : null}
      <FolderTreePanel
        favorites={favoriteItems}
        folderTree={folderTree}
        isOpen={isTreeOpen}
        onAfterClose={() => treeButtonRef.current?.focus()}
        onClose={closeTree}
        onOpenItem={(item) =>
          void openNavigationItem(item).catch(() => undefined)
        }
        onRemoveFavorite={(item) =>
          void changeFavorite(item, false).catch(() => undefined)
        }
        onSelect={(_path, folderId) => {
          void openFolder(folderId, 'Folder tree').catch(() => undefined);
          closeTree();
        }}
        recent={recentItems}
      />
      {contextMenu ? (
        <ContextMenu
          {...(contextMenu.kind === 'empty-area' && pasteDisabled
            ? { disabledKeys: pasteDisabledKeys }
            : {})}
          isTargetFavorite={
            contextMenu.target
              ? favoriteItems.some(
                  (item) => item.value.id === contextMenu.target?.value.id,
                )
              : false
          }
          onAction={(key) => {
            if (key === 'newBookmark') setContentWindow({ kind: 'bookmark' });
            if (key === 'newFolder') setContentWindow({ kind: 'folder' });
            if (key === 'customizeFolderStyle') setIsFolderStyleOpen(true);
            if (key === 'paste') void pasteInternalClipboard();
            if (key === 'search') openSearchWindow();
            const target = contextMenu.target;
            if (!target) return;
            if (key === 'favorite') {
              const item: NavigationItem = target;
              const isFavorite = favoriteItems.some(
                (favorite) => favorite.value.id === item.value.id,
              );
              void changeFavorite(item, !isFavorite).catch(() => undefined);
            }
            if (key === 'open') {
              if (target.kind === 'folder') {
                void openFolder(target.value.id, 'Item context menu')
                  .then(() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('folder', target.value.id);
                    window.history.pushState({}, '', url);
                  })
                  .catch(() => undefined);
              } else {
                void openBookmark(
                  target.value.url,
                  'current-tab',
                  'Item context menu',
                ).catch(() => undefined);
              }
            }
            if (key === 'openNewTab') {
              if (target.kind === 'bookmark') {
                void openBookmark(
                  target.value.url,
                  'new-tab',
                  'Item context menu',
                ).catch(() => undefined);
                return;
              }
              const url = (() => {
                const folderUrl = new URL(window.location.href);
                folderUrl.searchParams.set('folder', target.value.id);
                return folderUrl.href;
              })();
              window.open(url, '_blank', 'noopener,noreferrer');
              if (readyProfileId) {
                void recordEventForProfile(readyProfileId, {
                  action: 'Open in new tab',
                  category: 'Bookmarks',
                  dataChanged: false,
                  durationMs: 0,
                  eventCode: 'FOLDER-OPEN-NEW-TAB-REQUESTED',
                  itemType: 'Folder',
                  itemsAffected: 1,
                  kind: 'ACTIVITY',
                  level: 'INFO',
                  message: t('activityLog.messages.folderOpenRequested'),
                  outcome: 'Succeeded',
                  source: 'Item context menu',
                });
              }
            }
            if (key === 'edit') {
              setContentWindow({
                kind: target.kind,
                target: target.value,
              });
            }
            if (key === 'copy') void selectInternalClipboard(target, 'copy');
            if (key === 'cut') void selectInternalClipboard(target, 'cut');
            if (key === 'duplicate') void duplicateItem(target);
            if (key === 'delete') {
              void (async () => {
                if (!readyProfileId || !currentFolderId) return;
                const confirmed = await requestConfirmation(
                  t(
                    target.kind === 'folder'
                      ? 'bookmarks.deleteConfirmFolder'
                      : 'bookmarks.deleteConfirmBookmark',
                  ),
                  'delete',
                );
                if (!confirmed) return;
                const startedAt = performance.now();
                try {
                  await runUndoable(
                    readyProfileId,
                    target.value.id,
                    target.kind,
                    'deleted',
                    () =>
                      bookmarkManager.deleteItem(
                        readyProfileId,
                        target.value.id,
                      ),
                  );
                  await loadFolderContent(readyProfileId, currentFolderId);
                  await recordEventForProfile(readyProfileId, {
                    action: 'Delete',
                    category: 'Bookmarks',
                    dataChanged: true,
                    durationMs: Math.round(performance.now() - startedAt),
                    eventCode: 'ITEM-DELETE-COMPLETE',
                    itemType: target.kind === 'folder' ? 'Folder' : 'Bookmark',
                    itemsAffected: 1,
                    kind: 'ACTIVITY',
                    level: 'INFO',
                    message: t('bookmarks.deleteSucceeded'),
                    outcome: 'Succeeded',
                    source: 'Item context menu',
                  });
                  notifyForActiveProfile({
                    level: 'success',
                    message: t('bookmarks.deleteSucceeded'),
                    title: t('notifications.operationCompletedTitle'),
                  });
                } catch {
                  await recordEventForProfile(readyProfileId, {
                    action: 'Delete',
                    category: 'Bookmarks',
                    dataChanged: false,
                    durationMs: Math.round(performance.now() - startedAt),
                    eventCode: 'ITEM-DELETE-FAILED',
                    itemType: target.kind === 'folder' ? 'Folder' : 'Bookmark',
                    itemsAffected: 0,
                    kind: 'DIAGNOSTIC',
                    level: 'ERROR',
                    message: t('bookmarks.deleteFailed'),
                    outcome: 'Failed',
                    source: 'Item context menu',
                  });
                  notifyOperationError(t('bookmarks.deleteFailed'));
                }
              })();
            }
            if (key === 'info') {
              setInfoItem(target);
            }
          }}
          onClose={closeContextMenu}
          request={contextMenu}
        />
      ) : null}
      {readyProfileId && currentFolderId && activeSettings ? (
        <SearchDialog
          activeProfileId={readyProfileId}
          bookmarkOpening={activeSettings.bookmarkOpening ?? 'current-tab'}
          currentFolderId={currentFolderId}
          initialPreferences={
            activeSettings.searchPreferences ?? defaultSearchPreferences
          }
          isLoading={isSearchLoading}
          isOpen={isSearchOpen}
          loadFailed={searchLoadFailed}
          onClose={() => setIsSearchOpen(false)}
          onOpenResult={async (result: BookmarkSearchResult) => {
            try {
              if (result.kind === 'bookmark' && 'url' in result.item) {
                await openBookmark(
                  result.item.url,
                  activeSettings.bookmarkOpening ?? 'current-tab',
                  'Search window',
                );
                setIsSearchOpen(false);
                return;
              }
              if (result.kind !== 'folder' || 'url' in result.item) return;
              if (result.profileId === readyProfileId) {
                await openFolder(result.item.id, 'Search window');
              } else {
                const activation = await profileManager.switchTo(
                  result.profileId,
                );
                if (activation.changed) {
                  forceHomeProfileIdRef.current = result.profileId;
                  initializedProfileIdRef.current = undefined;
                  closeProfileBoundState();
                  clearProfileBoundContent();
                  await publishProfileActivationSafely(activation);
                }
                const resumed = await resumePreflight();
                setPreflightSnapshot(resumed);
                await recordEventForProfile(result.profileId, {
                  action: 'Switch',
                  category: 'Profiles',
                  dataChanged: true,
                  durationMs: 0,
                  eventCode: 'PROFILE-SWITCH-COMPLETE',
                  itemType: 'Active profile',
                  itemsAffected: 1,
                  kind: 'ACTIVITY',
                  level: 'INFO',
                  message: t('activityLog.messages.profileSwitched'),
                  outcome: 'Succeeded',
                  source: 'Search window',
                });
              }
              setIsSearchOpen(false);
            } catch {
              await recordEventForProfile(readyProfileId, {
                action: 'Open',
                category: 'Bookmarks',
                dataChanged: false,
                durationMs: 0,
                eventCode: 'SEARCH-RESULT-OPEN-FAILED',
                itemType: result.kind === 'folder' ? 'Folder' : 'Bookmark',
                itemsAffected: 0,
                kind: 'DIAGNOSTIC',
                level: 'ERROR',
                message: t('searchWindow.resultOpenFailed'),
                outcome: 'Failed',
                source: 'Search window',
              });
              notifyOperationError(t('searchWindow.resultOpenFailed'));
            }
          }}
          onWebUnavailable={() => {
            notifyForActiveProfile({
              id: 'web-search-api-unavailable',
              level: 'information',
              message: t('searchWindow.webUnavailable'),
              title: t('searchWindow.webUnavailableTitle'),
            });
            void recordEventForProfile(readyProfileId, {
              action: 'Open',
              category: 'Bookmarks',
              dataChanged: false,
              durationMs: 0,
              eventCode: 'WEB-SEARCH-API-UNAVAILABLE',
              itemType: 'Web search capability',
              itemsAffected: 0,
              kind: 'DIAGNOSTIC',
              level: 'WARN',
              message: t('searchWindow.webUnavailable'),
              outcome: 'Skipped',
              source: 'Search window',
            });
          }}
          onWebSearch={async (query) => {
            try {
              await browserSearch.query(
                query,
                activeSettings.bookmarkOpening ?? 'current-tab',
              );
              setIsSearchOpen(false);
              await recordEventForProfile(readyProfileId, {
                action: 'Open',
                category: 'Bookmarks',
                dataChanged: false,
                durationMs: 0,
                eventCode: 'WEB-SEARCH-REQUESTED',
                itemType: 'Web search',
                itemsAffected: 1,
                kind: 'ACTIVITY',
                level: 'INFO',
                message: t('searchWindow.webSearchRequested'),
                outcome: 'Succeeded',
                source: 'Search window',
              });
            } catch {
              await recordEventForProfile(readyProfileId, {
                action: 'Open',
                category: 'Bookmarks',
                dataChanged: false,
                durationMs: 0,
                eventCode: 'WEB-SEARCH-FAILED',
                itemType: 'Web search',
                itemsAffected: 0,
                kind: 'DIAGNOSTIC',
                level: 'ERROR',
                message: t('searchWindow.webSearchFailed'),
                outcome: 'Failed',
                source: 'Search window',
              });
              notifyOperationError(t('searchWindow.webSearchFailed'));
            }
          }}
          sources={searchSources}
          webSearchAvailable={browserSearch.isAvailable()}
        />
      ) : null}
      {contentWindow ? (
        <CreateContentDialog
          defaultAppearance={
            contentWindow.target || !activeSettings?.rememberLastAppearance
              ? undefined
              : contentWindow.kind === 'bookmark'
                ? activeSettings.lastBookmarkAppearance
                : activeSettings.lastFolderAppearance
          }
          isOpen
          {...(contentWindow.target
            ? {
                initialValue: {
                  cardAppearance: contentWindow.target.cardAppearance,
                  note: contentWindow.target.note,
                  tags: contentWindow.target.tags,
                  title: contentWindow.target.title,
                  ...('url' in contentWindow.target
                    ? { url: contentWindow.target.url }
                    : {}),
                },
              }
            : {})}
          kind={contentWindow.kind}
          onClose={() => setContentWindow(null)}
          onCreate={(value) =>
            contentWindow.target
              ? updateContent(contentWindow.target, value)
              : createContent(contentWindow.kind, value)
          }
          parentName={
            contentWindow.target
              ? (findFolderPath(
                  allFolders,
                  contentWindow.target.parentId ?? currentFolderId ?? '',
                ).at(-1) ?? 'Home')
              : (currentPath.at(-1) ?? 'Home')
          }
        />
      ) : null}
      {infoItem ? (
        <ItemInfoDialog
          dateTimeFormat={activeSettings?.dateTimeFormat ?? 'browser'}
          item={infoItem}
          onClose={() => setInfoItem(null)}
          onCopy={async (_field: ItemInfoField, value) => {
            if (!readyProfileId) throw new Error('active-profile-not-ready');
            try {
              await writeClipboardText(value);
              await recordEventForProfile(readyProfileId, {
                action: 'Copy',
                category: 'Bookmarks',
                dataChanged: false,
                durationMs: 0,
                eventCode: 'ITEM-INFO-VALUE-COPY-COMPLETE',
                itemType: infoItem.kind === 'folder' ? 'Folder' : 'Bookmark',
                itemsAffected: 1,
                kind: 'ACTIVITY',
                level: 'INFO',
                message: t('activityLog.messages.itemInfoValueCopied'),
                outcome: 'Succeeded',
                source: 'Item information',
              });
              notifyForActiveProfile({
                level: 'success',
                message: t('activityLog.messages.itemInfoValueCopied'),
                title: t('notifications.copiedTitle'),
              });
            } catch (error) {
              await recordEventForProfile(readyProfileId, {
                action: 'Copy',
                category: 'Bookmarks',
                dataChanged: false,
                durationMs: 0,
                eventCode: 'ITEM-INFO-VALUE-COPY-FAILED',
                itemType: infoItem.kind === 'folder' ? 'Folder' : 'Bookmark',
                itemsAffected: 0,
                kind: 'DIAGNOSTIC',
                level: 'ERROR',
                message: t('activityLog.messages.itemInfoValueCopyFailed'),
                outcome: 'Failed',
                source: 'Item information',
              });
              notifyOperationError(
                t('activityLog.messages.itemInfoValueCopyFailed'),
              );
              throw error;
            }
          }}
          parentName={
            findFolderPath(allFolders, infoItem.value.parentId ?? '').at(-1) ??
            t('itemInfo.none')
          }
        />
      ) : null}
      <WelcomeDialog
        isOpen={isWelcomeOpen}
        onCreateProfile={async (input) => {
          const startedAt = performance.now();
          try {
            const resumedPreflight = await createProfileAndResumePreflight({
              ...input,
              language: preflightSnapshot.language,
            });
            setPreflightSnapshot(resumedPreflight);
            setIsWelcomeOpen(false);
            if (resumedPreflight.initialization.status === 'ready') {
              await recordEventForProfile(
                resumedPreflight.initialization.profile.id,
                {
                  action: 'Create',
                  category: 'Profiles',
                  dataChanged: true,
                  durationMs: Math.round(performance.now() - startedAt),
                  eventCode: 'PROFILE-FIRST-CREATE-COMPLETE',
                  itemType: 'Local profile',
                  itemsAffected: 1,
                  kind: 'ACTIVITY',
                  level: 'INFO',
                  message: t('activityLog.messages.firstProfileCreated'),
                  outcome: 'Succeeded',
                  source: 'Welcome window',
                },
              );
              const preferences =
                resumedPreflight.initialization.settings
                  .notificationPreferences ?? defaultNotificationPreferences;
              if (preferences.enabled)
                showNotification({
                  level: 'success',
                  message: t('activityLog.messages.firstProfileCreated'),
                  title: t('notifications.profileCreatedTitle'),
                });
            }
          } catch (error) {
            console.error('first-profile-create-failed');
            showNotification({
              level: 'error',
              message: t('activityLog.messages.profileCreateFailed'),
              title: t('notifications.errorTitle'),
            });
            throw error;
          }
        }}
      />
      <NotificationViewport
        preferences={
          activeSettings?.notificationPreferences ??
          defaultNotificationPreferences
        }
        service={notificationService}
      />
      <ConfirmationDialog service={confirmationService} />
    </main>
  );
}

function mergeContentChanges(
  current: ContentChange | undefined,
  incoming: ContentChange,
): ContentChange {
  if (!current || current.profileId !== incoming.profileId) return incoming;
  return {
    ...incoming,
    affectedParentIds: [
      ...new Set([...current.affectedParentIds, ...incoming.affectedParentIds]),
    ],
    changedFolderIds: [
      ...new Set([...current.changedFolderIds, ...incoming.changedFolderIds]),
    ],
    deletedFolderPaths: [
      ...new Map(
        [...current.deletedFolderPaths, ...incoming.deletedFolderPaths].map(
          (path) => [path.folderId, path],
        ),
      ).values(),
    ],
    fullRefresh: current.fullRefresh || incoming.fullRefresh,
    navigationChanged: current.navigationChanged || incoming.navigationChanged,
    revision: Math.max(current.revision, incoming.revision),
  };
}

/** Resolves a breadcrumb without storing transient navigation state durably. */
function findFolderPath(
  folders: readonly Folder[],
  folderId: string,
): readonly string[] {
  return findFolderChain(folders, folderId).map((folder) => folder.title);
}

/** Resolves stable folder identities for breadcrumb navigation. */
function findFolderChain(
  folders: readonly Folder[],
  folderId: string,
): readonly Folder[] {
  const chain: Folder[] = [];
  let current = folders.find((folder) => folder.id === folderId);
  while (current) {
    chain.unshift(current);
    current = current.parentId
      ? folders.find((folder) => folder.id === current?.parentId)
      : undefined;
  }
  return chain;
}

function isDuplicatePolicyOutcome(error: unknown): error is Error {
  return (
    error instanceof Error &&
    (error.message === 'duplicate-bookmark-cancelled' ||
      error.message === 'duplicate-bookmark-prevented' ||
      error.message === 'ftp-bookmark-cancelled')
  );
}

function duplicatePolicyEventCode(error: Error): string {
  if (error.message === 'ftp-bookmark-cancelled')
    return 'FTP-BOOKMARK-SAVE-CANCELLED';
  return error.message === 'duplicate-bookmark-prevented'
    ? 'BOOKMARK-DUPLICATE-PREVENTED'
    : 'BOOKMARK-DUPLICATE-CANCELLED';
}
