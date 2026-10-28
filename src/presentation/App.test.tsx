import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import type { InitializationState } from '../application/initialization/initialization-state';
import type { WebPreflightSnapshot } from '../application/preflight/preflight-state';
import type { Bookmark } from '../domain/bookmark';
import { safeBookmarkUrlSchema } from '../domain/bookmark-url';
import type { Folder } from '../domain/folder';
import { defaultShortcutPreferences } from '../domain/keyboard-shortcuts';
import { defaultNotificationPreferences } from '../domain/profile-settings';
import type { NavigationItems } from '../application/bookmark/manage-bookmarks';
import '../localization/i18n';
import { App } from './App';
import { FolderTabMissingDestinationError } from '../platform/browser/folder-tabs';
const { claimFolderTab, openFolderTab } = vi.hoisted(() => ({
  claimFolderTab: vi.fn<() => Promise<string | undefined>>(
    async () => undefined,
  ),
  openFolderTab: vi.fn(async () => undefined),
}));
vi.mock('../platform/browser/folder-tabs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../platform/browser/folder-tabs')>()),
  claimFolderTab,
  openFolderTab,
}));
import { defaultActivityLogSettings } from '../application/activity-log/manage-activity-log';
import { UndoHistoryService } from '../application/undo-history/undo-history-service';
import type { ContentChange } from '../messaging/content-change-protocol';
import { ToolbarSavedStatusPermissionDeniedError } from '../platform/browser/toolbar-saved-status-error';
import { NotificationService } from '../application/notification/notification-service';

const createdProfile = {
  profile: {
    createdAt: 1,
    id: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
    updatedAt: 1,
    username: 'Local user',
  },
  settings: {
    bookmarkView: 'card' as const,
    cardSize: 'medium' as const,
    language: 'en-US',
    profileId: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
    theme: 'system' as const,
  },
};
const onUiReady = vi.fn();
const openBookmarkWindow = vi.fn(async () => undefined);
const originalClipboard = navigator.clipboard;

/** Distinguishes a form's own error from interactive notices portaled into its modal. */
function inlineAlert(dialog: HTMLElement): HTMLElement {
  const alerts = within(dialog)
    .getAllByRole('alert')
    .filter((element) => !element.closest('.notification-viewport'));
  expect(alerts).toHaveLength(1);
  return alerts[0]!;
}
const activityLog = {
  clear: vi.fn(),
  createExport: vi.fn(),
  getSettings: vi.fn(async () =>
    defaultActivityLogSettings(createdProfile.profile.id),
  ),
  list: vi.fn(async () => []),
  record: vi.fn(),
  updateSettings: vi.fn(),
};
const rootFolder: Folder = {
  backgroundAppearance: { kind: 'color' as const, value: '#0b121a' },
  bookmarkView: 'card' as const,
  detailsTableTransparency: 0,
  includeNavigationBackground: false,
  navigationTransparency: 45,
  cardAppearance: { kind: 'color' as const, value: '#2f7de1' },
  createdAt: 1,
  id: '11111111-1111-4111-8111-111111111111',
  isRoot: true,
  index: 0,
  note: '',
  parentId: null,
  profileId: createdProfile.profile.id,
  tags: [],
  title: 'Home',
  updatedAt: 1,
};
const storedBookmark: Bookmark = {
  cardAppearance: { kind: 'color' as const, value: '#35a775' },
  createdAt: 2,
  id: '22222222-2222-4222-8222-222222222222',
  index: 0,
  note: '',
  parentId: rootFolder.id,
  profileId: createdProfile.profile.id,
  title: 'Example',
  tags: [],
  updatedAt: 2,
  url: 'https://example.com/',
};
const bookmarkManager = {
  captureUndoState: vi.fn(async () => ({
    bookmarks: [storedBookmark],
    favorites: [],
    folders: [rootFolder],
  })),
  captureItemUndoState: vi.fn(() => bookmarkManager.captureUndoState()),
  captureUndoLineage: vi.fn(() => bookmarkManager.captureUndoState()),
  captureUndoStateByIds: vi.fn(() => bookmarkManager.captureUndoState()),
  createBookmark: vi.fn(async () => storedBookmark),
  createFolder: vi.fn(async () => ({
    ...rootFolder,
    id: '33333333-3333-4333-8333-333333333333',
    isRoot: false,
    parentId: rootFolder.id,
    title: 'Created folder',
  })),
  copyItem: vi.fn(async () => ({
    itemCount: 1,
    rootItemId: crypto.randomUUID(),
  })),
  deleteItem: vi.fn(),
  ensureRoot: vi.fn(async () => rootFolder),
  hasBookmarkWithUrl: vi.fn(async () => false),
  listContents: vi.fn<
    (
      profileId: string,
      folderId: string,
    ) => Promise<{
      bookmarks: readonly Bookmark[];
      folders: readonly Folder[];
    }>
  >(async () => ({ bookmarks: [storedBookmark], folders: [] })),
  listFolders: vi.fn<(profileId: string) => Promise<readonly Folder[]>>(
    async () => [rootFolder],
  ),
  listBookmarks: vi.fn<(profileId: string) => Promise<readonly Bookmark[]>>(
    async () => [],
  ),
  listNavigationItems: vi.fn<() => Promise<NavigationItems>>(async () => ({
    favorites: [],
    recent: [],
  })),
  moveItem: vi.fn(),
  restoreUndoState: vi.fn(),
  setFavorite: vi.fn(),
  updateBookmark: vi.fn(),
  updateFolder: vi.fn(),
  updateFolderDetailsColumnOrder: vi.fn(),
  updateFolderStyle: vi.fn(),
};
const profileManager = {
  getProfileSettings: vi.fn(async (profileId: string) => ({
    ...createdProfile.settings,
    profileId,
  })),
  create: vi.fn(),
  delete: vi.fn(),
  duplicate: vi.fn(),
  getDeletionImpact: vi.fn().mockResolvedValue({
    bookmarkCount: 0,
    folderCount: 1,
    noteCount: 0,
    noteFolderCount: 0,
    profileId: createdProfile.profile.id,
  }),
  getStorageUsage: vi.fn().mockResolvedValue([]),
  list: vi.fn().mockResolvedValue([]),
  switchTo: vi.fn(async (profileId: string) => ({
    changed: true,
    profileId,
    revision: 1,
  })),
  update: vi.fn(),
  updateBookmarkDisplay: vi.fn(),
  updateProfileSettings: vi.fn(),
  updateLastOpenedFolder: vi.fn(),
};
const updateAnnouncements = {
  claim: vi.fn(async () => null),
  getPreferences: vi.fn(async () => ({
    schemaVersion: 1 as const,
    showAfterUpdate: true,
  })),
  markShown: vi.fn(async () => undefined),
  markUnavailable: vi.fn(async () => undefined),
  updatePreferences: vi.fn(async () => undefined),
};
const createProfileAndResumePreflight = vi.fn().mockResolvedValue({
  operationId: 'resumed-operation',
  language: 'en-US',
  capabilities: [],
  initialization: {
    status: 'ready',
    theme: 'dark',
    ...createdProfile,
  },
} satisfies WebPreflightSnapshot);

function renderApp(
  initializationState: InitializationState,
  resumedInitializationState: InitializationState = initializationState,
  undoHistory = new UndoHistoryService(
    { load: async () => [], save: async () => undefined },
    bookmarkManager.restoreUndoState,
  ),
  contentChanges?: Partial<
    NonNullable<Parameters<typeof App>[0]['contentChanges']>
  >,
  toolbarSavedStatus?: NonNullable<
    Parameters<typeof App>[0]['toolbarSavedStatus']
  >,
  initialCapabilities: WebPreflightSnapshot['capabilities'] = [],
) {
  const changeBridge = {
    profileActivation: vi.fn(async () => ({
      profileId: createdProfile.profile.id,
      revision: 0,
    })),
    publish: vi.fn(async () => undefined),
    publishProfileActivation: vi.fn(),
    revision: vi.fn(async () => 0),
    subscribe: vi.fn(() => () => undefined),
    subscribeProfileActivation: vi.fn(() => () => undefined),
    ...contentChanges,
  };
  const rendered = render(
    <App
      activityLog={activityLog}
      applicationVersion="0.1.1"
      contentChanges={changeBridge}
      bookmarkManager={bookmarkManager}
      createProfileAndResumePreflight={createProfileAndResumePreflight}
      initialPreflightSnapshot={{
        capabilities: initialCapabilities,
        initialization: initializationState,
        language: 'en-US',
        operationId: 'initial-operation',
      }}
      onUiReady={onUiReady}
      openBookmarkWindow={openBookmarkWindow}
      profileManager={profileManager}
      resumePreflight={vi.fn().mockResolvedValue({
        capabilities: [],
        initialization: resumedInitializationState,
        language: 'en-US',
        operationId: 'resumed-operation',
      })}
      undoHistory={undoHistory}
      updateAnnouncements={updateAnnouncements}
      {...(toolbarSavedStatus ? { toolbarSavedStatus } : {})}
    />,
  );
  return { ...rendered, changeBridge };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  claimFolderTab.mockResolvedValue(undefined);
  openFolderTab.mockResolvedValue(undefined);
  bookmarkManager.listContents.mockImplementation(async () => ({
    bookmarks: [storedBookmark],
    folders: [],
  }));
  bookmarkManager.listFolders.mockImplementation(async () => [rootFolder]);
  bookmarkManager.listBookmarks.mockImplementation(async () => []);
  bookmarkManager.listNavigationItems.mockImplementation(async () => ({
    favorites: [],
    recent: [],
  }));
  bookmarkManager.setFavorite.mockResolvedValue(undefined);
  profileManager.list.mockResolvedValue([]);
  profileManager.getProfileSettings.mockImplementation(async (profileId) => ({
    ...createdProfile.settings,
    profileId,
  }));
  profileManager.getDeletionImpact.mockResolvedValue({
    bookmarkCount: 0,
    folderCount: 1,
    noteCount: 0,
    noteFolderCount: 0,
    profileId: createdProfile.profile.id,
  });
  openBookmarkWindow.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: originalClipboard,
  });
});

describe('App', () => {
  it.each([true, false])(
    'keeps local Home usable and honors notification enablement=%s when background checks are unavailable',
    async (enabled) => {
      renderApp(
        {
          status: 'ready',
          theme: 'dark',
          ...createdProfile,
          settings: {
            ...createdProfile.settings,
            notificationPreferences: {
              ...defaultNotificationPreferences,
              enabled,
            },
          },
        },
        undefined,
        undefined,
        undefined,
        undefined,
        [
          {
            id: 'runtime-messaging',
            status: 'unavailable',
            reason: 'background-unavailable',
          },
        ],
      );
      expect(
        await screen.findByRole('button', { name: 'Open search' }),
      ).toBeVisible();
      const message =
        'Background startup checks are unavailable. Local profile data remains available. Reopen the application to retry.';
      if (enabled) expect(await screen.findByText(message)).toBeVisible();
      else expect(screen.queryByText(message)).not.toBeInTheDocument();
    },
  );
  it.each(['content', 'tree', 'error'] as const)(
    'ignores previous-profile %s completion after URL-match navigation and Home',
    async (stage) => {
      const user = userEvent.setup();
      const otherId = '44444444-4444-4444-8444-444444444444';
      const otherProfile = {
        ...createdProfile.profile,
        id: otherId,
        username: 'Other owner',
      };
      const otherSettings = { ...createdProfile.settings, profileId: otherId };
      const otherRoot = {
        ...rootFolder,
        id: '55555555-5555-4555-8555-555555555555',
        profileId: otherId,
      };
      const child = {
        ...otherRoot,
        id: '66666666-6666-4666-8666-666666666666',
        parentId: otherRoot.id,
        isRoot: false,
        title: 'Destination',
      };
      const match = {
        ...storedBookmark,
        id: '77777777-7777-4777-8777-777777777777',
        profileId: otherId,
        parentId: child.id,
        title: 'Destination match',
      };
      const homeItem = {
        ...match,
        id: '88888888-8888-4888-8888-888888888888',
        parentId: otherRoot.id,
        title: 'Destination Home content',
      };
      profileManager.list.mockResolvedValue([
        { ...createdProfile, isActive: true, bookmarkCount: 1, folderCount: 1 },
        {
          profile: otherProfile,
          isActive: false,
          bookmarkCount: 2,
          folderCount: 2,
        },
      ]);
      bookmarkManager.listFolders.mockImplementation(async (id) =>
        id === otherId ? [otherRoot, child] : [rootFolder],
      );
      bookmarkManager.listBookmarks.mockImplementation(async (id) =>
        id === otherId ? [match, homeItem] : [storedBookmark],
      );
      const contents = async (profileId: string, folderId: string) => ({
        bookmarks:
          profileId === otherId
            ? [folderId === child.id ? match : homeItem]
            : [storedBookmark],
        folders: [],
      });
      bookmarkManager.listContents.mockImplementation(contents);
      let receive: ((change: ContentChange) => void) | undefined;
      renderApp(
        { status: 'ready', theme: 'dark', ...createdProfile },
        {
          status: 'ready',
          theme: 'dark',
          profile: otherProfile,
          settings: otherSettings,
        },
        undefined,
        {
          subscribe: (next) => {
            receive = next;
            return () => undefined;
          },
        },
      );
      await screen.findByText('Example');
      let finish:
        ((value: Awaited<ReturnType<typeof contents>>) => void) | undefined;
      let fail: ((cause: Error) => void) | undefined;
      const delayed = new Promise<Awaited<ReturnType<typeof contents>>>(
        (resolve, reject) => {
          finish = resolve;
          fail = reject;
        },
      );
      let finishTree: ((value: readonly Folder[]) => void) | undefined;
      const delayedTree = new Promise<readonly Folder[]>((resolve) => {
        finishTree = resolve;
      });
      const treeReads = bookmarkManager.listFolders.mock.calls.length;
      if (stage === 'tree')
        bookmarkManager.listFolders.mockImplementationOnce(() => delayedTree);
      else bookmarkManager.listContents.mockImplementationOnce(() => delayed);
      receive?.({
        affectedParentIds: [rootFolder.id],
        changedFolderIds: [],
        deletedFolderPaths: [],
        fullRefresh: true,
        navigationChanged: false,
        profileId: createdProfile.profile.id,
        protocolVersion: 1,
        revision: 1,
        type: 'content.changed',
      });
      await waitFor(() =>
        stage === 'tree'
          ? expect(bookmarkManager.listFolders).toHaveBeenCalledTimes(
              treeReads + 1,
            )
          : expect(bookmarkManager.listContents).toHaveBeenCalledTimes(2),
      );
      await user.click(screen.getByRole('button', { name: 'Open search' }));
      const search = screen.getByRole('dialog', { name: 'Search' });
      await user.click(
        within(search).getByRole('button', { name: 'URL matches' }),
      );
      await user.click(
        within(search).getByRole('button', { name: 'URL match options' }),
      );
      await user.selectOptions(within(search).getByLabelText('Scope'), 'all');
      fireEvent(
        within(search).getByRole('dialog', { name: 'URL match options' }),
        new Event('cancel', { bubbles: true, cancelable: true }),
      );
      await user.click(
        await within(search).findByRole('button', {
          name: `${storedBookmark.url} · 3 bookmarks`,
        }),
      );
      const row = within(search).getByText('Destination match').closest('li');
      if (!row) throw new Error('missing-row');
      await user.click(
        within(row).getByRole('button', { name: 'Open folder' }),
      );
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: 'Search' }),
        ).not.toBeInTheDocument(),
      );
      await user.click(screen.getByRole('button', { name: 'Home' }));
      expect(await screen.findByText('Destination Home content')).toBeVisible();
      await act(async () => {
        if (stage === 'tree') finishTree?.([rootFolder]);
        else if (stage === 'error') fail?.(new Error('superseded-read-failed'));
        else finish?.(await contents(createdProfile.profile.id, rootFolder.id));
      });
      expect(screen.queryByText('Loading folder...')).not.toBeInTheDocument();
      expect(screen.getByText('Destination Home content')).toBeVisible();
      expect(activityLog.record).not.toHaveBeenCalledWith(
        createdProfile.profile.id,
        expect.objectContaining({
          eventCode: 'EXTERNAL-CONTENT-REFRESH-FAILED',
        }),
      );
    },
  );
  it.each([
    'current',
    'other',
    'missing',
    'other-disabled',
    'other-from-disabled',
    'other-feedback-failed',
  ] as const)(
    'opens the fresh containing folder for a %s URL-match target',
    async (scenario) => {
      const user = userEvent.setup();
      const notice =
        "Switched to the bookmark's profile and opened its containing folder.";
      const originalShow = NotificationService.prototype.show;
      const show = vi
        .spyOn(NotificationService.prototype, 'show')
        .mockImplementation(function (this: NotificationService, input) {
          if (scenario === 'other-feedback-failed' && input.message === notice)
            throw new Error('synthetic-notification-failure');
          return originalShow.call(this, input);
        });
      onTestFinished(() => show.mockRestore());
      const otherId = '44444444-4444-4444-8444-444444444444';
      const otherProfile = {
        ...createdProfile.profile,
        id: otherId,
        username: 'Other owner',
      };
      const otherSettings = {
        ...createdProfile.settings,
        profileId: otherId,
        notificationPreferences: {
          ...defaultNotificationPreferences,
          enabled: scenario !== 'other-disabled',
        },
      };
      const otherRoot = {
        ...rootFolder,
        id: '55555555-5555-4555-8555-555555555555',
        profileId: otherId,
        title: 'Other home',
      };
      const destination = {
        ...otherRoot,
        id: '66666666-6666-4666-8666-666666666666',
        parentId: otherRoot.id,
        isRoot: false,
        title: 'Moved destination',
      };
      const otherBookmark = {
        ...storedBookmark,
        id: '77777777-7777-4777-8777-777777777777',
        profileId: otherId,
        parentId: otherRoot.id,
        title: 'Other bookmark',
      };
      let clicked = false;
      profileManager.list.mockResolvedValue([
        { ...createdProfile, isActive: true, bookmarkCount: 1, folderCount: 1 },
        {
          profile: otherProfile,
          isActive: false,
          bookmarkCount: 1,
          folderCount: 2,
        },
      ]);
      bookmarkManager.listFolders.mockImplementation(async (id) =>
        id === otherId ? [otherRoot, destination] : [rootFolder],
      );
      bookmarkManager.listBookmarks.mockImplementation(async (id) =>
        id === otherId
          ? clicked && scenario === 'missing'
            ? []
            : [
                {
                  ...otherBookmark,
                  parentId: clicked ? destination.id : otherRoot.id,
                },
              ]
          : [storedBookmark],
      );
      renderApp(
        {
          status: 'ready',
          theme: 'dark',
          ...createdProfile,
          settings: {
            ...createdProfile.settings,
            notificationPreferences: {
              ...defaultNotificationPreferences,
              enabled: scenario !== 'other-from-disabled',
            },
          },
        },
        {
          status: 'ready',
          theme: 'dark',
          profile: otherProfile,
          settings: otherSettings,
        },
      );
      await screen.findByText('Example');
      await user.click(screen.getByRole('button', { name: 'Open search' }));
      const search = screen.getByRole('dialog', { name: 'Search' });
      await user.click(
        within(search).getByRole('button', { name: 'URL matches' }),
      );
      await user.selectOptions(within(search).getByLabelText('Scope'), 'all');
      await user.click(
        await within(search).findByRole('button', {
          name: `${storedBookmark.url} · 2 bookmarks`,
        }),
      );
      const row = within(search)
        .getByText(scenario === 'current' ? 'Example' : 'Other bookmark')
        .closest('li');
      if (!row) throw new Error('missing-row');
      clicked = true;
      await user.click(
        within(row).getByRole('button', { name: 'Open folder' }),
      );
      if (scenario === 'missing') {
        expect(search).toHaveAttribute('open');
        expect(
          await within(
            within(search).getByRole('region', { name: 'URL matches' }),
          ).findByRole('alert'),
        ).toHaveTextContent(
          'The containing folder could not be opened. Try again.',
        );
        expect(profileManager.switchTo).not.toHaveBeenCalled();
        expect(activityLog.record).toHaveBeenCalledWith(
          otherId,
          expect.objectContaining({
            eventCode: 'URL-MATCH-FOLDER-OPEN-FAILED',
            level: 'ERROR',
          }),
        );
      } else {
        await waitFor(() =>
          expect(
            screen.queryByRole('dialog', { name: 'Search' }),
          ).not.toBeInTheDocument(),
        );
        expect(bookmarkManager.listContents).toHaveBeenCalledWith(
          scenario === 'current' ? createdProfile.profile.id : otherId,
          scenario === 'current' ? rootFolder.id : destination.id,
        );
        if (scenario !== 'current')
          expect(profileManager.switchTo).toHaveBeenCalledWith(otherId);
        else expect(profileManager.switchTo).not.toHaveBeenCalled();
      }
      if (
        scenario === 'other' ||
        scenario === 'other-feedback-failed' ||
        scenario === 'other-from-disabled'
      ) {
        expect(show).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'information',
            message: notice,
            title: 'Profile switched',
          }),
        );
        if (scenario !== 'other-feedback-failed')
          expect(await screen.findByText(notice)).toBeVisible();
        expect(activityLog.record).not.toHaveBeenCalledWith(
          otherId,
          expect.objectContaining({
            eventCode: 'URL-MATCH-FOLDER-OPEN-FAILED',
          }),
        );
      } else {
        expect(show).not.toHaveBeenCalledWith(
          expect.objectContaining({ message: notice }),
        );
      }
    },
  );
  it('inspects and deletes an other-profile URL match without activation and owns Undo in that profile', async () => {
    const user = userEvent.setup();
    const sourceProfileId = '11111111-1111-4111-8111-111111111111';
    const sourceRoot = {
      ...rootFolder,
      id: '22222222-2222-4222-8222-222222222222',
      profileId: sourceProfileId,
      title: 'Other home',
    };
    const sourceBookmark = {
      ...storedBookmark,
      id: '33333333-3333-4333-8333-333333333333',
      profileId: sourceProfileId,
      parentId: sourceRoot.id,
      title: 'Other profile bookmark',
    };
    let deleted = false;
    profileManager.list.mockResolvedValue([
      { ...createdProfile, isActive: true, bookmarkCount: 1, folderCount: 1 },
      {
        profile: {
          ...createdProfile.profile,
          id: sourceProfileId,
          username: 'Other owner',
        },
        isActive: false,
        bookmarkCount: 1,
        folderCount: 1,
      },
    ]);
    bookmarkManager.listBookmarks.mockImplementation(async (id) =>
      id === sourceProfileId
        ? deleted
          ? []
          : [sourceBookmark]
        : [storedBookmark],
    );
    bookmarkManager.listFolders.mockImplementation(async (id) =>
      id === sourceProfileId ? [sourceRoot] : [rootFolder],
    );
    bookmarkManager.captureItemUndoState.mockResolvedValueOnce({
      bookmarks: [sourceBookmark],
      favorites: [],
      folders: [sourceRoot],
    });
    bookmarkManager.captureUndoStateByIds.mockResolvedValueOnce({
      bookmarks: [],
      favorites: [],
      folders: [sourceRoot],
    });
    bookmarkManager.deleteItem.mockImplementationOnce(async () => {
      deleted = true;
    });
    const undo = new UndoHistoryService(
      { load: async () => [], save: async () => undefined },
      bookmarkManager.restoreUndoState,
    );
    renderApp(
      { status: 'ready', theme: 'dark', ...createdProfile },
      undefined,
      undo,
    );
    await screen.findByText('Example');
    await user.click(screen.getByRole('button', { name: 'Open search' }));
    const search = screen.getByRole('dialog', { name: 'Search' });
    await user.click(
      within(search).getByRole('button', { name: 'URL matches' }),
    );
    await user.selectOptions(within(search).getByLabelText('Scope'), 'all');
    await user.click(
      await within(search).findByRole('button', {
        name: `${storedBookmark.url} · 2 bookmarks`,
      }),
    );
    const row = within(search)
      .getByText('Other profile bookmark')
      .closest('li');
    if (!row) throw new Error('missing-member-row');
    await user.click(within(row).getByRole('button', { name: 'Get info' }));
    const info = await screen.findByRole('dialog', { name: 'Get info' });
    expect(within(info).getByText('Other home')).toBeVisible();
    fireEvent(info, new Event('cancel', { bubbles: true, cancelable: true }));
    expect(search).toHaveAttribute('open');
    await user.click(within(row).getByRole('button', { name: 'Delete' }));
    const confirmation = await screen.findByRole('dialog', {
      name: 'Confirm action',
    });
    expect(
      within(confirmation).getByText(
        'Delete this bookmark from profile "Other owner"?',
      ),
    ).toBeVisible();
    await user.click(
      within(confirmation).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() =>
      expect(bookmarkManager.deleteItem).toHaveBeenCalledWith(
        sourceProfileId,
        sourceBookmark.id,
        'bookmark',
      ),
    );
    expect(
      await within(search).findByText('No matching groups.'),
    ).toBeVisible();
    expect(within(search).queryByText('Other profile bookmark')).toBeNull();
    expect(within(search).queryByText('0 groups · 0 bookmarks')).toBeNull();
    expect(profileManager.switchTo).not.toHaveBeenCalled();
    expect(undo.store.getState().entries).toEqual([
      expect.objectContaining({
        profileId: sourceProfileId,
        itemId: sourceBookmark.id,
        action: 'deleted',
      }),
    ]);
    expect(activityLog.record).toHaveBeenCalledWith(
      sourceProfileId,
      expect.objectContaining({
        eventCode: 'URL-MATCH-DELETE-COMPLETE',
        level: 'INFO',
      }),
    );
  });
  it('keeps ordinary startup available when a bound destination was deleted', async () => {
    claimFolderTab.mockRejectedValueOnce(
      new FolderTabMissingDestinationError(),
    );
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    await screen.findByText('Example');
    expect(
      await screen.findByText(
        'The requested folder is unavailable. Startup settings were used.',
      ),
    ).toBeVisible();
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'FOLDER-TAB-DESTINATION-MISSING',
        level: 'WARN',
      }),
    );
  });

  it('offers Retry instead of treating session failure as ordinary startup', async () => {
    claimFolderTab.mockRejectedValueOnce(new Error('session-unavailable'));
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    expect(
      await screen.findByText(
        'The initial folder contents could not be loaded.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
    expect(bookmarkManager.listContents).not.toHaveBeenCalled();
  });

  it('opens from the keyboard even when activity recording fails', async () => {
    const folder = {
      ...rootFolder,
      id: '33333333-3333-4333-8333-333333333333',
      isRoot: false,
      parentId: rootFolder.id,
      title: 'Destination',
    };
    bookmarkManager.listFolders.mockResolvedValue([rootFolder, folder]);
    bookmarkManager.listContents.mockResolvedValue({
      bookmarks: [],
      folders: [folder],
    });
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    fireEvent.contextMenu(await screen.findByText('Destination'), {
      clientX: 100,
      clientY: 100,
    });
    activityLog.record.mockRejectedValueOnce(
      new Error('recording-unavailable'),
    );
    const diagnostic = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      await userEvent.keyboard('{ArrowDown}{Enter}');
      await waitFor(() =>
        expect(openFolderTab).toHaveBeenCalledWith(
          createdProfile.profile.id,
          folder.id,
        ),
      );
      await waitFor(() =>
        expect(diagnostic).toHaveBeenCalledWith(
          'profile-activity-log-write-failed',
        ),
      );
      expect(activityLog.record).not.toHaveBeenCalledWith(
        createdProfile.profile.id,
        expect.objectContaining({ eventCode: 'FOLDER-OPEN-NEW-TAB-FAILED' }),
      );
      expect(
        screen.queryByText('A folder could not be opened.'),
      ).not.toBeInTheDocument();
    } finally {
      diagnostic.mockRestore();
    }
  });

  it('loads the background destination without writing browser history', async () => {
    const folder = {
      ...rootFolder,
      id: '33333333-3333-4333-8333-333333333333',
      isRoot: false,
      parentId: rootFolder.id,
      title: 'Destination',
    };
    bookmarkManager.listFolders.mockResolvedValue([rootFolder, folder]);
    claimFolderTab.mockResolvedValue(folder.id);
    const push = vi.spyOn(window.history, 'pushState');
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    await screen.findByRole('button', { name: 'Destination' });
    expect(claimFolderTab).toHaveBeenCalledWith(createdProfile.profile.id);
    expect(bookmarkManager.listContents).toHaveBeenCalledWith(
      createdProfile.profile.id,
      folder.id,
    );
    expect(push).not.toHaveBeenCalled();
    push.mockRestore();
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'FOLDER-TAB-LOAD-COMPLETE',
        level: 'INFO',
      }),
    );
  });

  it.each([true, false])(
    'reports folder-tab failure and honors notifications enabled=%s',
    async (enabled) => {
      const folder = {
        ...rootFolder,
        id: '33333333-3333-4333-8333-333333333333',
        isRoot: false,
        parentId: rootFolder.id,
        title: 'Destination',
      };
      bookmarkManager.listFolders.mockResolvedValue([rootFolder, folder]);
      bookmarkManager.listContents.mockResolvedValue({
        bookmarks: [],
        folders: [folder],
      });
      openFolderTab.mockRejectedValue(new Error('unavailable'));
      renderApp({
        status: 'ready',
        theme: 'dark',
        ...createdProfile,
        settings: {
          ...createdProfile.settings,
          notificationPreferences: {
            ...defaultNotificationPreferences,
            enabled,
          },
        },
      });
      fireEvent.contextMenu(await screen.findByText('Destination'), {
        clientX: 100,
        clientY: 100,
      });
      await userEvent.click(
        await screen.findByRole('menuitem', { name: 'Open folder in new tab' }),
      );
      await waitFor(() =>
        expect(openFolderTab).toHaveBeenCalledWith(
          createdProfile.profile.id,
          folder.id,
        ),
      );
      await waitFor(() =>
        expect(activityLog.record).toHaveBeenCalledWith(
          createdProfile.profile.id,
          expect.objectContaining({
            eventCode: 'FOLDER-OPEN-NEW-TAB-FAILED',
            level: 'ERROR',
          }),
        ),
      );
      if (enabled)
        expect(
          await screen.findByText('A folder could not be opened.'),
        ).toBeVisible();
      else
        expect(
          screen.queryByText('A folder could not be opened.'),
        ).not.toBeInTheDocument();
    },
  );

  it('re-reads only the visible affected folder after a cross-context change', async () => {
    let receive: ((change: ContentChange) => void) | undefined;
    const contentChanges = {
      revision: vi.fn(async () => 0),
      subscribe: vi.fn((next: (change: ContentChange) => void) => {
        receive = next;
        return () => undefined;
      }),
    };
    renderApp(
      { status: 'ready', theme: 'dark', ...createdProfile },
      undefined,
      undefined,
      contentChanges,
    );
    await screen.findByText('Example');
    bookmarkManager.listContents.mockResolvedValue({
      bookmarks: [{ ...storedBookmark, title: 'Added from popup' }],
      folders: [],
    });

    receive?.({
      affectedParentIds: [rootFolder.id],
      changedFolderIds: [],
      deletedFolderPaths: [],
      fullRefresh: false,
      navigationChanged: true,
      profileId: createdProfile.profile.id,
      protocolVersion: 1,
      revision: 1,
      type: 'content.changed',
    });

    expect(await screen.findByText('Added from popup')).toBeVisible();
  });

  it('reports a current folder refresh failure while preserving its content', async () => {
    let receive: ((change: ContentChange) => void) | undefined;
    renderApp(
      { status: 'ready', theme: 'dark', ...createdProfile },
      undefined,
      undefined,
      {
        subscribe: (next) => {
          receive = next;
          return () => undefined;
        },
      },
    );
    await screen.findByText('Example');
    bookmarkManager.listContents.mockRejectedValueOnce(
      new Error('synthetic-current-read-failure'),
    );
    receive?.({
      affectedParentIds: [rootFolder.id],
      changedFolderIds: [],
      deletedFolderPaths: [],
      fullRefresh: true,
      navigationChanged: false,
      profileId: createdProfile.profile.id,
      protocolVersion: 1,
      revision: 1,
      type: 'content.changed',
    });
    await waitFor(() =>
      expect(activityLog.record).toHaveBeenCalledWith(
        createdProfile.profile.id,
        expect.objectContaining({
          eventCode: 'EXTERNAL-CONTENT-REFRESH-FAILED',
          level: 'ERROR',
        }),
      ),
    );
    expect(screen.getByText('Example')).toBeVisible();
  });

  it('opens the closest surviving ancestor when sync removes the displayed folder', async () => {
    let receive: ((change: ContentChange) => void) | undefined;
    const folder = (id: string, parentId: string, title: string): Folder => ({
      ...rootFolder,
      id,
      isRoot: false,
      parentId,
      title,
    });
    const action = folder(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      rootFolder.id,
      'Action',
    );
    const nested = folder(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      action.id,
      'New',
    );
    const year = folder(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      nested.id,
      '2026',
    );
    bookmarkManager.listFolders.mockResolvedValue([
      rootFolder,
      action,
      nested,
      year,
    ]);
    bookmarkManager.listContents.mockResolvedValue({
      bookmarks: [],
      folders: [],
    });
    renderApp(
      {
        status: 'ready',
        theme: 'dark',
        ...createdProfile,
        settings: {
          ...createdProfile.settings,
          lastOpenedFolderId: year.id,
          startupLocation: 'last',
        },
      },
      undefined,
      undefined,
      {
        revision: vi.fn(async () => 0),
        subscribe: (next) => {
          receive = next;
          return () => undefined;
        },
      },
    );
    await screen.findByRole('button', { name: '2026' });
    bookmarkManager.listFolders.mockResolvedValue([rootFolder, action]);

    receive?.({
      affectedParentIds: [action.id],
      changedFolderIds: [nested.id, year.id],
      deletedFolderPaths: [
        {
          folderId: year.id,
          ancestorIds: [nested.id, action.id, rootFolder.id],
        },
      ],
      fullRefresh: false,
      navigationChanged: true,
      profileId: createdProfile.profile.id,
      protocolVersion: 1,
      revision: 1,
      type: 'content.changed',
    });

    expect(
      (await screen.findByRole('button', { name: 'Action' })).closest('li'),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      await screen.findByText(
        'The open folder was removed. Its closest available parent is now open.',
      ),
    ).toBeInTheDocument();
    expect(profileManager.updateLastOpenedFolder).toHaveBeenCalledWith(
      createdProfile.profile.id,
      action.id,
    );
  });

  it('defers affected folder reads while the app tab is hidden', async () => {
    let receive: ((change: ContentChange) => void) | undefined;
    let revision = 0;
    const originalVisibility = document.visibilityState;
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    try {
      renderApp(
        { status: 'ready', theme: 'dark', ...createdProfile },
        undefined,
        undefined,
        {
          revision: vi.fn(async () => revision),
          subscribe: (next) => {
            receive = next;
            return () => undefined;
          },
        },
      );
      await screen.findByText('Example');
      const initialReads = bookmarkManager.listContents.mock.calls.length;
      bookmarkManager.listContents.mockResolvedValue({
        bookmarks: [{ ...storedBookmark, title: 'Deferred update' }],
        folders: [],
      });
      revision = 1;
      receive?.({
        affectedParentIds: [rootFolder.id],
        changedFolderIds: [],
        deletedFolderPaths: [],
        fullRefresh: false,
        navigationChanged: true,
        profileId: createdProfile.profile.id,
        protocolVersion: 1,
        revision,
        type: 'content.changed',
      });
      expect(bookmarkManager.listContents).toHaveBeenCalledTimes(initialReads);

      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(await screen.findByText('Deferred update')).toBeVisible();
    } finally {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: originalVisibility,
      });
    }
  });

  it('opens Home when another surface activates a different profile', async () => {
    let receiveActivation:
      | ((activation: {
          profileId: string;
          protocolVersion: 1;
          revision: number;
          type: 'profile.activated';
        }) => void)
      | undefined;
    const secondProfileId = '85923bcb-cfd7-45a4-bf10-12f6162cad44';
    const secondRoot = { ...rootFolder, profileId: secondProfileId };
    bookmarkManager.ensureRoot
      .mockResolvedValueOnce(rootFolder)
      .mockResolvedValue(secondRoot);
    bookmarkManager.listFolders.mockImplementation(async (profileId) =>
      profileId === secondProfileId ? [secondRoot] : [rootFolder],
    );
    bookmarkManager.listContents.mockImplementation(async (profileId) => ({
      bookmarks: profileId === secondProfileId ? [] : [storedBookmark],
      folders: [],
    }));
    renderApp(
      { status: 'ready', theme: 'dark', ...createdProfile },
      {
        status: 'ready',
        theme: 'dark',
        profile: {
          createdAt: 2,
          id: secondProfileId,
          updatedAt: 2,
          username: 'Second profile',
        },
        settings: {
          ...createdProfile.settings,
          profileId: secondProfileId,
          startupLocation: 'last',
          lastOpenedFolderId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        },
      },
      undefined,
      {
        profileActivation: vi.fn(async () => ({
          profileId: secondProfileId,
          revision: 2,
        })),
        subscribeProfileActivation: vi.fn((receive) => {
          receiveActivation = receive;
          return () => undefined;
        }),
      },
    );
    await screen.findByText('Example');

    receiveActivation?.({
      profileId: secondProfileId,
      protocolVersion: 1,
      revision: 2,
      type: 'profile.activated',
    });

    expect(
      await screen.findByText(
        'The active profile changed in another app window. Home is now open.',
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(bookmarkManager.listContents).toHaveBeenCalledWith(
        secondProfileId,
        secondRoot.id,
      ),
    );
  });

  it('notifies when undo history cannot initialize safely', async () => {
    const undoHistory = new UndoHistoryService(
      {
        load: async () => Promise.reject(new Error('marker read failed')),
        save: async () => undefined,
      },
      bookmarkManager.restoreUndoState,
    );
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    await undoHistory.initialize();

    renderApp(
      { status: 'ready', theme: 'dark', ...createdProfile },
      undefined,
      undoHistory,
    );

    expect(
      await screen.findByText(
        'Undo history could not be initialized for this browser session.',
      ),
    ).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it.each([
    ['complete', 'INFO', 'Succeeded', 3],
    ['deferred', 'WARN', 'Skipped', 0],
    ['failed', 'ERROR', 'Failed', 0],
  ] as const)(
    'reports %s session maintenance with privacy-safe diagnostics',
    async (status, level, outcome, count) => {
      const service = new UndoHistoryService(
        { load: async () => [], save: async () => undefined },
        bookmarkManager.restoreUndoState,
      );
      service.store.setState({
        cleanupStatus: status,
        removedObsoleteEntries: count,
      });
      const show = vi.spyOn(NotificationService.prototype, 'show');
      renderApp(
        { status: 'ready', theme: 'dark', ...createdProfile },
        undefined,
        service,
      );
      await waitFor(() =>
        expect(activityLog.record).toHaveBeenCalledWith(
          createdProfile.profile.id,
          expect.objectContaining({
            eventCode: `UNDO-HISTORY-SESSION-CLEANUP-${status.toUpperCase()}`,
            level,
            outcome,
            itemsAffected: count,
          }),
        ),
      );
      if (status === 'complete') expect(show).not.toHaveBeenCalled();
      else
        expect(show).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'undo-history-session-cleanup',
            level: status === 'failed' ? 'error' : 'warning',
          }),
        );
      show.mockRestore();
    },
  );

  it('keeps cleanup failures isolated when logging fails and notifications are disabled', async () => {
    const service = new UndoHistoryService(
      { load: async () => [], save: async () => undefined },
      bookmarkManager.restoreUndoState,
    );
    service.store.setState({ cleanupStatus: 'failed' });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    activityLog.record.mockRejectedValueOnce(new Error('log unavailable'));
    const show = vi.spyOn(NotificationService.prototype, 'show');
    renderApp(
      {
        status: 'ready',
        theme: 'dark',
        ...createdProfile,
        settings: {
          ...createdProfile.settings,
          notificationPreferences: {
            ...defaultNotificationPreferences,
            enabled: false,
          },
        },
      },
      undefined,
      service,
    );
    await screen.findByRole('link', { name: 'Open Example' });
    expect(show).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      'profile-activity-log-write-failed',
    );
    expect(service.store.getState().entries).toEqual([]);
    show.mockRestore();
    consoleError.mockRestore();
  });

  it('preserves cleanup results when notification delivery fails', async () => {
    const service = new UndoHistoryService(
      { load: async () => [], save: async () => undefined },
      bookmarkManager.restoreUndoState,
    );
    service.store.setState({ cleanupStatus: 'failed' });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const show = vi
      .spyOn(NotificationService.prototype, 'show')
      .mockImplementationOnce(() => {
        throw new Error('notification unavailable');
      });
    renderApp(
      { status: 'ready', theme: 'dark', ...createdProfile },
      undefined,
      service,
    );
    await screen.findByRole('link', { name: 'Open Example' });
    expect(consoleError).toHaveBeenCalledWith(
      'A privacy-safe notification could not be displayed.',
    );
    expect(service.store.getState().cleanupStatus).toBe('failed');
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'UNDO-HISTORY-SESSION-CLEANUP-FAILED',
      }),
    );
    show.mockRestore();
    consoleError.mockRestore();
  });

  it('records an error when undo history cannot be written to session storage', async () => {
    const undoHistory = new UndoHistoryService(
      {
        load: async () => [],
        save: async () => Promise.reject(new Error('quota')),
      },
      bookmarkManager.restoreUndoState,
    );
    renderApp(
      { status: 'ready', theme: 'dark', ...createdProfile },
      undefined,
      undoHistory,
    );
    await screen.findByRole('link', { name: 'Open Example' });

    await undoHistory.record({
      action: 'created',
      after: {
        bookmarks: [storedBookmark],
        favorites: [],
        folders: [rootFolder],
      },
      before: { bookmarks: [], favorites: [], folders: [rootFolder] },
      itemId: storedBookmark.id,
      itemType: 'bookmark',
      profileId: createdProfile.profile.id,
    });

    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'UNDO-HISTORY-STORAGE-WRITE-FAILED',
        kind: 'DIAGNOSTIC',
        level: 'ERROR',
        outcome: 'Failed',
      }),
    );
  });

  it('warns when storage pressure removes only older undo history', async () => {
    const originalBroadcastChannel = window.BroadcastChannel;
    Object.defineProperty(window, 'BroadcastChannel', {
      configurable: true,
      value: undefined,
    });
    const undoHistory = new UndoHistoryService(
      {
        load: async () => [],
        save: async (entries) => {
          if (entries.length > 1)
            throw new DOMException(
              'Storage quota exceeded',
              'QuotaExceededError',
            );
        },
      },
      bookmarkManager.restoreUndoState,
    );
    Object.defineProperty(window, 'BroadcastChannel', {
      configurable: true,
      value: originalBroadcastChannel,
    });
    renderApp(
      { status: 'ready', theme: 'dark', ...createdProfile },
      undefined,
      undoHistory,
    );
    await screen.findByRole('link', { name: 'Open Example' });

    const stateWithBookmark = {
      bookmarks: [storedBookmark],
      favorites: [],
      folders: [rootFolder],
    };
    await undoHistory.record({
      action: 'created',
      after: stateWithBookmark,
      before: { bookmarks: [], favorites: [], folders: [rootFolder] },
      itemId: storedBookmark.id,
      itemType: 'bookmark',
      profileId: createdProfile.profile.id,
    });
    await undoHistory.record({
      action: 'edited',
      after: {
        ...stateWithBookmark,
        folders: [{ ...rootFolder, title: 'Updated Home', updatedAt: 2 }],
      },
      before: stateWithBookmark,
      itemId: rootFolder.id,
      itemType: 'folder',
      profileId: createdProfile.profile.id,
    });

    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'UNDO-HISTORY-OLDER-ENTRIES-REMOVED',
        itemsAffected: 1,
        level: 'WARN',
        outcome: 'Skipped',
      }),
    );
    expect(
      await screen.findByText(
        'The oldest undo history was removed because session storage was full.',
      ),
    ).toBeInTheDocument();
  });

  it('applies cross-browser scrollbar classes to the document root', async () => {
    renderApp({
      status: 'ready',
      theme: 'dark',
      ...createdProfile,
      settings: {
        ...createdProfile.settings,
        scrollbarBehavior: 'always',
      },
    });

    await waitFor(() =>
      expect(document.documentElement).toHaveClass('scrollbars--always'),
    );
  });

  it('applies saved motion and high-contrast preferences to the document root', async () => {
    renderApp({
      status: 'ready',
      theme: 'dark',
      ...createdProfile,
      settings: {
        ...createdProfile.settings,
        animationPreference: 'none',
        highContrast: true,
      },
    });

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-motion', 'none');
      expect(document.documentElement).toHaveClass('high-contrast');
    });
  });

  it('confirms external bookmark navigation when the Security option is enabled', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderApp({
      status: 'ready',
      theme: 'dark',
      ...createdProfile,
      settings: {
        ...createdProfile.settings,
        bookmarkOpening: 'new-tab',
        confirmExternalLinks: true,
      },
    });
    await screen.findByRole('link', { name: 'Open Example' });

    await user.click(screen.getByRole('link', { name: 'Open Example' }));
    const confirmation = await screen.findByRole('dialog', {
      name: 'Confirm action',
    });
    expect(open).not.toHaveBeenCalled();
    await user.click(
      within(confirmation).getByRole('button', { name: 'Open' }),
    );

    expect(open).toHaveBeenCalledWith(
      'https://example.com/',
      '_blank',
      'noopener,noreferrer',
    );
    open.mockRestore();
  });

  it('opens Search with Ctrl+F and filters local items while typing', async () => {
    const user = userEvent.setup();
    profileManager.list.mockResolvedValue([
      { isActive: true, profile: createdProfile.profile },
    ]);
    bookmarkManager.listBookmarks.mockResolvedValue([storedBookmark]);
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    await waitFor(() =>
      expect(bookmarkManager.listContents).toHaveBeenCalledWith(
        createdProfile.profile.id,
        rootFolder.id,
      ),
    );

    fireEvent.keyDown(window, { ctrlKey: true, key: 'f' });
    const search = await screen.findByRole('dialog', { name: 'Search' });
    await user.type(within(search).getByRole('searchbox'), 'Example');

    expect(
      within(search).getByRole('button', { name: /Example/ }),
    ).toBeVisible();
    expect(bookmarkManager.listBookmarks).toHaveBeenCalledWith(
      createdProfile.profile.id,
    );

    await user.click(within(search).getByRole('button', { name: 'Web' }));
    expect(
      within(search).getByRole('button', { name: 'Bookmarks' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Web search unavailable')).toBeInTheDocument();
    await waitFor(() =>
      expect(activityLog.record).toHaveBeenCalledWith(
        createdProfile.profile.id,
        expect.objectContaining({
          eventCode: 'WEB-SEARCH-API-UNAVAILABLE',
          level: 'WARN',
        }),
      ),
    );
  });

  it('opens the same focused Search window from the header and profile menu', async () => {
    const user = userEvent.setup();
    profileManager.list.mockResolvedValue([
      { isActive: true, profile: createdProfile.profile },
    ]);
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    await screen.findByRole('link', { name: 'Open Example' });

    const headerSearch = screen.getByRole('button', { name: 'Open search' });
    const profileButton = screen.getByRole('button', {
      name: 'Open profile menu',
    });
    expect(headerSearch.nextElementSibling).toBe(profileButton);

    await user.click(headerSearch);
    let searchDialog = await screen.findByRole('dialog', { name: 'Search' });
    expect(within(searchDialog).getByRole('searchbox')).toHaveFocus();
    await user.click(
      within(searchDialog).getByRole('button', { name: 'Close search' }),
    );

    await user.click(profileButton);
    const profileMenu = await screen.findByRole('dialog', {
      name: 'Profile menu',
    });
    const applicationHeading = within(profileMenu).getByRole('heading', {
      name: 'Application',
    });
    const applicationItems = applicationHeading.nextElementSibling;
    const menuSearch = within(applicationItems as HTMLElement).getByRole(
      'button',
      { name: 'Search' },
    );
    expect(applicationItems?.firstElementChild).toBe(menuSearch);

    await user.click(menuSearch);
    searchDialog = await screen.findByRole('dialog', { name: 'Search' });
    expect(within(searchDialog).getByRole('searchbox')).toHaveFocus();
  });

  it('shows fresh Search item information and opens its containing folder', async () => {
    const user = userEvent.setup();
    profileManager.list.mockResolvedValue([
      { isActive: true, profile: createdProfile.profile },
    ]);
    bookmarkManager.listBookmarks.mockResolvedValue([storedBookmark]);
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    await screen.findByRole('link', { name: 'Open Example' });
    await user.click(screen.getByRole('button', { name: 'Open search' }));
    const search = await screen.findByRole('dialog', {
      name: 'Search',
    });
    await user.type(within(search).getByRole('searchbox'), 'Example');
    const infoButton = await within(search).findByRole('button', {
      name: 'Get info',
    });
    bookmarkManager.listBookmarks.mockResolvedValue([
      { ...storedBookmark, title: 'Fresh Example' },
    ]);
    await user.click(infoButton);
    const info = await screen.findByRole('dialog', { name: /Get info/ });
    expect(
      within(info).getByText('Fresh Example', { exact: true }),
    ).toBeVisible();
    expect(search).toBeVisible();
    await user.click(
      within(info).getByRole('button', {
        name: 'Close item information',
      }),
    );
    await waitFor(() => expect(infoButton).toHaveFocus());
    expect(within(search).getByRole('searchbox')).toHaveValue('Example');
    await user.click(
      within(search).getByRole('button', { name: 'Open parent folder' }),
    );
    await waitFor(() => expect(search).not.toHaveAttribute('open'));
    expect(profileManager.switchTo).not.toHaveBeenCalled();
    expect(bookmarkManager.listContents).toHaveBeenCalledWith(
      createdProfile.profile.id,
      rootFolder.id,
    );
  });

  it.each([true, false])(
    'reports stale Search actions with notifications enabled=%s',
    async (enabled) => {
      const user = userEvent.setup();
      profileManager.list.mockResolvedValue([
        { isActive: true, profile: createdProfile.profile },
      ]);
      bookmarkManager.listBookmarks.mockResolvedValue([storedBookmark]);
      renderApp({
        status: 'ready',
        theme: 'dark',
        ...createdProfile,
        settings: {
          ...createdProfile.settings,
          notificationPreferences: {
            ...defaultNotificationPreferences,
            enabled,
          },
        },
      });
      await screen.findByRole('link', { name: 'Open Example' });
      await user.click(screen.getByRole('button', { name: 'Open search' }));
      const search = await screen.findByRole('dialog', {
        name: 'Search',
      });
      await user.type(within(search).getByRole('searchbox'), 'Example');
      await within(search).findByRole('button', { name: 'Get info' });
      bookmarkManager.listBookmarks.mockResolvedValue([]);
      if (!enabled)
        activityLog.record.mockRejectedValueOnce(
          new Error('synthetic-log-failure'),
        );
      await user.click(
        within(search).getByRole('button', { name: 'Get info' }),
      );
      await waitFor(() =>
        expect(activityLog.record).toHaveBeenCalledWith(
          createdProfile.profile.id,
          expect.objectContaining({
            eventCode: 'SEARCH-ITEM-INFO-FAILED',
            level: 'ERROR',
          }),
        ),
      );
      expect(search).toBeVisible();
      await user.click(
        within(search).getByRole('button', { name: 'Open parent folder' }),
      );
      await waitFor(() =>
        expect(activityLog.record).toHaveBeenCalledWith(
          createdProfile.profile.id,
          expect.objectContaining({
            eventCode: 'SEARCH-PARENT-FOLDER-OPEN-FAILED',
            level: 'ERROR',
          }),
        ),
      );
      expect(
        within(search).getByText(
          'The selected search result could not be opened.',
          { exact: true },
        ),
      ).toHaveAttribute('role', 'alert');
      if (!enabled)
        expect(
          screen.queryByText(
            'The containing folder could not be opened. Try again.',
          ),
        ).not.toBeInTheDocument();
      expect(profileManager.switchTo).not.toHaveBeenCalled();
    },
  );

  it('uses the saved app-local search binding instead of its default', async () => {
    renderApp({
      status: 'ready',
      theme: 'dark',
      ...createdProfile,
      settings: {
        ...createdProfile.settings,
        shortcutPreferences: {
          bindings: {
            ...defaultShortcutPreferences.bindings,
            copy: 'Control+C',
            cut: 'Control+X',
            history: 'Control+Shift+Z',
            paste: 'Control+V',
            redo: 'Control+Y',
            search: 'Alt+K',
            undo: 'Control+Z',
          },
          enabled: true,
        },
      },
    });
    await waitFor(() =>
      expect(bookmarkManager.listContents).toHaveBeenCalledWith(
        createdProfile.profile.id,
        rootFolder.id,
      ),
    );

    fireEvent.keyDown(window, { ctrlKey: true, key: 'f' });
    expect(
      screen.queryByRole('dialog', { name: 'Search' }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(window, { altKey: true, key: 'k' });
    expect(await screen.findByRole('dialog', { name: 'Search' })).toBeVisible();
  });

  it('shows and operates the first-run welcome window', async () => {
    const user = userEvent.setup();
    const { changeBridge } = renderApp({ status: 'first-run', theme: 'dark' });

    const welcome = screen.getByRole('dialog', {
      name: 'Welcome to Bookmark Manager Pro',
    });
    const getStarted = within(welcome).getByRole('button', {
      name: 'Get started',
    });

    expect(welcome).toHaveAttribute('open');
    expect(getStarted).toHaveFocus();
    expect(document.documentElement.style.overflowY).toBe('hidden');
    expect(
      within(welcome).getByText('Your bookmarks remain on this device.'),
    ).toBeVisible();

    await user.click(
      within(welcome).getByRole('button', { name: 'Learn more' }),
    );
    expect(
      within(welcome).getByText(/does not require an online account/),
    ).toBeVisible();
    expect(within(welcome).getByText(/one active local profile/)).toBeVisible();
    expect(
      within(welcome).getByText(/Switching profiles saves the current profile/),
    ).toBeVisible();

    await user.click(getStarted);

    expect(
      within(welcome).getByRole('heading', {
        name: 'Create your first profile',
      }),
    ).toBeVisible();
    const username = within(welcome).getByRole('textbox', {
      name: 'Username',
    });
    expect(username).toHaveFocus();
    expect(
      within(welcome).queryByLabelText(/password/i),
    ).not.toBeInTheDocument();
    expect(
      within(welcome).getByText(/can be changed later in Profile Manager/),
    ).toBeVisible();

    await user.type(username, '  Local user  ');
    await user.upload(
      within(welcome).getByLabelText('Choose image'),
      new File(['icon'], 'profile.png', { type: 'image/png' }),
    );
    await user.click(
      within(welcome).getByRole('button', { name: 'Create profile' }),
    );

    expect(createProfileAndResumePreflight).toHaveBeenCalledWith({
      icon: 'data:image/png;base64,aWNvbg==',
      language: 'en-US',
      username: 'Local user',
    });
    expect(welcome).not.toHaveAttribute('open');
    expect(changeBridge.publishProfileActivation).toHaveBeenCalledWith({
      profileId: createdProfile.profile.id,
      revision: 0,
    });
    expect(document.documentElement.style.overflowY).toBe('');
    expect(onUiReady).toHaveBeenCalledWith('resumed-operation');
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'PROFILE-FIRST-CREATE-COMPLETE',
        level: 'INFO',
      }),
    );
    expect(screen.getByText('Profile created')).toBeInTheDocument();
  });

  it('closes Welcome and loads a profile created in another app tab', async () => {
    let receiveActivation:
      | ((activation: {
          profileId: string;
          protocolVersion: 1;
          revision: number;
          type: 'profile.activated';
        }) => void)
      | undefined;
    renderApp(
      { status: 'first-run', theme: 'dark' },
      { status: 'ready', theme: 'dark', ...createdProfile },
      undefined,
      {
        profileActivation: vi.fn(async () => ({
          profileId: createdProfile.profile.id,
          revision: 1,
        })),
        subscribeProfileActivation: vi.fn((receive) => {
          receiveActivation = receive;
          return () => undefined;
        }),
      },
    );
    const welcome = screen.getByRole('dialog', {
      name: 'Welcome to Bookmark Manager Pro',
    });
    expect(welcome).toHaveAttribute('open');

    receiveActivation?.({
      profileId: createdProfile.profile.id,
      protocolVersion: 1,
      revision: 1,
      type: 'profile.activated',
    });

    await waitFor(() => expect(welcome).not.toHaveAttribute('open'));
    expect(await screen.findByText('Example')).toBeVisible();
  });

  it('does not show the welcome window outside first run', () => {
    renderApp({ status: 'storage-unavailable' });

    expect(
      screen.queryByRole('dialog', {
        name: 'Welcome to Bookmark Manager Pro',
      }),
    ).not.toBeInTheDocument();
  });

  it('renders the navigation and bookmark layout', () => {
    renderApp({ status: 'storage-unavailable' });

    expect(
      screen.getByRole('button', { name: 'Open folder tree' }),
    ).toBeVisible();
    expect(
      screen.getByRole('navigation', { name: 'Current folder path' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Open profile menu' }),
    ).toBeVisible();

    const bookmarkRegion = screen.getByRole('region', { name: 'Bookmarks' });
    expect(within(bookmarkRegion).queryAllByRole('link')).toHaveLength(0);
  });

  it('shows a neutral loading state and reuses the startup folder list', async () => {
    let finishContents:
      | ((value: {
          bookmarks: readonly Bookmark[];
          folders: readonly Folder[];
        }) => void)
      | undefined;
    bookmarkManager.listContents.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishContents = resolve;
        }),
    );
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });

    expect(screen.getByRole('status')).toHaveTextContent('Loading folder...');
    expect(
      screen.queryByRole('region', { name: 'Bookmarks' }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(finishContents).toBeTypeOf('function'));
    finishContents?.({ bookmarks: [storedBookmark], folders: [] });

    expect(
      await screen.findByRole('region', { name: 'Bookmarks' }),
    ).toBeVisible();
    expect(bookmarkManager.listFolders).toHaveBeenCalledOnce();
    expect(bookmarkManager.listNavigationItems).toHaveBeenCalledWith(
      createdProfile.profile.id,
      [rootFolder],
    );
  });

  it('keeps folder content available when secondary navigation loading fails', async () => {
    bookmarkManager.listNavigationItems.mockRejectedValueOnce(
      new Error('navigation-unavailable'),
    );
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });

    expect(await screen.findByText('Example')).toBeVisible();
    await waitFor(() =>
      expect(activityLog.record).toHaveBeenCalledWith(
        createdProfile.profile.id,
        expect.objectContaining({
          eventCode: 'NAVIGATION-ITEMS-LOAD-FAILED',
          level: 'WARN',
        }),
      ),
    );
  });

  it('displays the active profile image in the top-right control', () => {
    renderApp({
      status: 'ready',
      profile: {
        createdAt: 1,
        icon: 'data:image/png;base64,aWNvbg==',
        id: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
        updatedAt: 1,
        username: 'Local profile',
      },
      settings: {
        bookmarkView: 'card',
        cardSize: 'medium',
        language: 'en-US',
        profileId: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
        theme: 'dark',
      },
      theme: 'dark',
    });

    const profileButton = screen.getByRole('button', {
      name: 'Open profile menu',
    });
    expect(profileButton.querySelector('img')).toHaveAttribute(
      'src',
      'data:image/png;base64,aWNvbg==',
    );
  });

  it('opens the complete folder tree and returns focus when it closes', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'storage-unavailable' });

    const treeButton = screen.getByRole('button', { name: 'Open folder tree' });
    await user.click(treeButton);

    const treePanel = screen.getByRole('dialog', { name: 'Folder tree' });
    const tree = within(treePanel).getByRole('tree');

    expect(treePanel).toBeVisible();
    expect(within(tree).getByRole('treeitem', { name: /Home/ })).toBeVisible();
    expect(within(tree).getAllByRole('treeitem')).toHaveLength(1);

    await user.keyboard('{Escape}');

    expect(treePanel).not.toHaveAttribute('open');
    expect(treeButton).toHaveFocus();
  });

  it('loads a tree-selected folder and keeps breadcrumb navigation working', async () => {
    const user = userEvent.setup();
    const workFolder: Folder = {
      ...rootFolder,
      createdAt: 2,
      id: '33333333-3333-4333-8333-333333333333',
      isRoot: false,
      parentId: rootFolder.id,
      title: 'Work',
      updatedAt: 2,
    };
    const childFolder: Folder = {
      ...workFolder,
      createdAt: 3,
      id: '44444444-4444-4444-8444-444444444444',
      parentId: workFolder.id,
      title: 'Project docs',
      updatedAt: 3,
    };
    const profileFolders = [rootFolder, workFolder, childFolder];
    bookmarkManager.listFolders.mockResolvedValue(profileFolders);
    bookmarkManager.listContents.mockImplementation(
      async (_profileId: string, folderId: string) => ({
        bookmarks: [],
        folders:
          folderId === rootFolder.id
            ? [workFolder]
            : folderId === workFolder.id
              ? [childFolder]
              : [],
      }),
    );

    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    await waitFor(() =>
      expect(bookmarkManager.listContents).toHaveBeenCalledWith(
        createdProfile.profile.id,
        rootFolder.id,
      ),
    );
    expect(screen.getByRole('region', { name: 'Bookmarks' })).toHaveTextContent(
      'Work',
    );

    await user.click(screen.getByRole('button', { name: 'Open folder tree' }));
    const treePanel = screen.getByRole('dialog', { name: 'Folder tree' });
    await user.click(
      within(treePanel).getByRole('button', { name: 'Expand Home' }),
    );
    await user.click(within(treePanel).getByRole('button', { name: 'Work' }));

    await waitFor(() =>
      expect(bookmarkManager.listContents).toHaveBeenLastCalledWith(
        createdProfile.profile.id,
        workFolder.id,
      ),
    );
    expect(
      screen.getByRole('navigation', { name: 'Current folder path' }),
    ).toHaveTextContent(/Home[\\/]Work/);
    expect(bookmarkManager.listContents).toHaveBeenCalledWith(
      createdProfile.profile.id,
      workFolder.id,
    );
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'FOLDER-OPEN-COMPLETE',
        level: 'INFO',
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Home' }));

    await waitFor(() =>
      expect(bookmarkManager.listContents).toHaveBeenLastCalledWith(
        createdProfile.profile.id,
        rootFolder.id,
      ),
    );
    expect(
      screen.getByRole('navigation', { name: 'Current folder path' }),
    ).toHaveTextContent('Home');
    expect(bookmarkManager.listContents).toHaveBeenCalledWith(
      createdProfile.profile.id,
      rootFolder.id,
    );
  });

  it('filters folders with ancestor context and uses two-stage Escape', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'storage-unavailable' });

    const treeButton = screen.getByRole('button', { name: 'Open folder tree' });
    await user.click(treeButton);

    const treePanel = screen.getByRole('dialog', { name: 'Folder tree' });
    const filter = within(treePanel).getByRole('searchbox', {
      name: 'Filter folders',
    });

    expect(filter).toHaveFocus();
    await user.type(filter, 'home');

    expect(
      within(treePanel).getByRole('button', { name: 'Home' }),
    ).toBeVisible();
    expect(
      within(treePanel).getByText('Home', { selector: 'mark' }),
    ).toBeVisible();

    await user.keyboard('{Escape}');

    expect(filter).toHaveValue('');
    expect(treePanel).toHaveAttribute('open');
    expect(
      within(treePanel).getByRole('button', { name: 'Home' }),
    ).toBeVisible();

    await user.keyboard('{Escape}');

    expect(treePanel).not.toHaveAttribute('open');
    expect(treeButton).toHaveFocus();
  });

  it('shows an empty state and clears the folder filter', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'storage-unavailable' });

    await user.click(screen.getByRole('button', { name: 'Open folder tree' }));
    const treePanel = screen.getByRole('dialog', { name: 'Folder tree' });
    const filter = within(treePanel).getByRole('searchbox', {
      name: 'Filter folders',
    });
    await user.type(filter, 'not a folder');

    expect(within(treePanel).getByRole('status')).toHaveTextContent(
      'No folders found',
    );
    await user.click(
      within(treePanel).getByRole('button', { name: 'Clear folder filter' }),
    );

    expect(filter).toHaveValue('');
    expect(filter).toHaveFocus();
    expect(within(treePanel).getByRole('tree')).toBeVisible();
  });

  it('opens a flat profile menu and restores focus after closing', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'storage-unavailable' });

    const profileButton = screen.getByRole('button', {
      name: 'Open profile menu',
    });
    await user.click(profileButton);

    const profileMenu = screen.getByRole('dialog', { name: 'Profile menu' });
    const closeButton = within(profileMenu).getByRole('button', {
      name: 'Close profile menu',
    });

    expect(profileMenu).toBeVisible();
    expect(profileMenu).toHaveAttribute('open');
    expect(closeButton).toHaveFocus();
    expect(within(profileMenu).queryByRole('tree')).not.toBeInTheDocument();
    expect(
      within(profileMenu).getByRole('heading', { name: 'Application' }),
    ).toBeVisible();
    expect(
      within(profileMenu).getByRole('button', { name: /Settings/ }),
    ).toBeDisabled();
    expect(
      within(profileMenu).queryByText('Appearance'),
    ).not.toBeInTheDocument();
    expect(
      within(profileMenu).queryByText('Bookmark display'),
    ).not.toBeInTheDocument();
    expect(
      within(profileMenu).queryByText('Keyboard shortcuts'),
    ).not.toBeInTheDocument();
    expect(
      within(profileMenu).getByRole('button', { name: /^Import/ }),
    ).toBeDisabled();
    expect(
      within(profileMenu).getByRole('button', { name: /^Export/ }),
    ).toBeDisabled();
    expect(
      within(profileMenu).getByRole('button', { name: /^Backup/ }),
    ).toBeDisabled();
    expect(
      within(profileMenu).getByRole('button', {
        name: /^Bookmark activity log/,
      }),
    ).toBeDisabled();

    await user.keyboard('{Escape}');

    expect(profileMenu).not.toHaveAttribute('open');
    expect(document.documentElement.style.overflowY).toBe('');
    expect(profileButton).toHaveFocus();
  });

  it('opens sync setup and records unavailable capability without notifying when disabled', async () => {
    const user = userEvent.setup();
    renderApp({
      status: 'ready',
      theme: 'dark',
      ...createdProfile,
      settings: {
        ...createdProfile.settings,
        notificationPreferences: {
          enabled: false,
          position: 'bottom-right',
          order: 'newest',
          stackLimit: 3,
          countdownLineColor: null,
        },
      },
    });
    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(
      screen.getByRole('button', { name: 'Bookmark synchronization' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Bookmark synchronization',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Allow bookmark access' }),
    );
    await waitFor(() =>
      expect(activityLog.record).toHaveBeenCalledWith(
        createdProfile.profile.id,
        expect.objectContaining({
          eventCode: 'SYNC-SETUP-UNAVAILABLE',
          level: 'WARN',
          dataChanged: false,
        }),
      ),
    );
    expect(
      screen.queryByRole('region', { name: 'Notifications' }),
    ).not.toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: 'Close synchronization' }),
    );
    expect(
      screen.queryByRole('dialog', { name: 'Bookmark synchronization' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open profile menu' }),
    ).toHaveFocus();
  });

  it('opens distinct switch and management profile windows', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'storage-unavailable' });
    const openMenu = async () =>
      user.click(screen.getByRole('button', { name: 'Open profile menu' }));

    await openMenu();
    await user.click(screen.getByRole('button', { name: 'Manage profiles' }));
    expect(
      await screen.findByRole('dialog', { name: 'Manage profiles' }),
    ).toBeVisible();
    expect(document.documentElement.style.overflowY).toBe('hidden');
    await user.click(
      screen.getByRole('button', { name: 'Close profile window' }),
    );
    expect(document.documentElement.style.overflowY).toBe('');

    await openMenu();
    await user.click(screen.getByRole('button', { name: 'Switch profile' }));
    expect(
      await screen.findByRole('dialog', { name: 'Switch profile' }),
    ).toBeVisible();
  });

  it('shows profile content counts in a top-layer deletion confirmation', async () => {
    const user = userEvent.setup();
    const inactiveProfile = {
      createdAt: 2,
      id: '85923bcb-cfd7-45a4-bf10-12f6162cad44',
      updatedAt: 2,
      username: 'Archive',
    };
    profileManager.list.mockResolvedValue([
      { isActive: true, profile: createdProfile.profile },
      { isActive: false, profile: inactiveProfile },
    ]);
    profileManager.getDeletionImpact.mockResolvedValue({
      bookmarkCount: 12,
      folderCount: 4,
      noteCount: 3,
      noteFolderCount: 2,
      profileId: inactiveProfile.id,
    });
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });

    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(screen.getByRole('button', { name: 'Manage profiles' }));
    const manager = await screen.findByRole('dialog', {
      name: 'Manage profiles',
    });
    const row = within(manager).getByText('Archive').closest('article');
    if (!row) throw new Error('profile-row-not-found');
    const deleteButton = within(row).getByRole('button', { name: 'Delete' });
    await user.click(deleteButton);

    const confirmation = await screen.findByRole('dialog', {
      name: 'Delete profile?',
    });
    expect(confirmation).toHaveTextContent(
      '12 bookmarks, 4 folders, 3 notes, and 2 note folders',
    );
    expect(
      within(confirmation).getByRole('button', { name: 'Cancel' }),
    ).toHaveFocus();
    expect(manager).toBeVisible();

    await user.click(
      within(confirmation).getByRole('button', { name: 'Cancel' }),
    );
    expect(deleteButton).toHaveFocus();
    expect(profileManager.delete).not.toHaveBeenCalled();
  });

  it('fails closed when profile deletion counts cannot be loaded', async () => {
    const user = userEvent.setup();
    const inactiveProfile = {
      createdAt: 2,
      id: '85923bcb-cfd7-45a4-bf10-12f6162cad44',
      updatedAt: 2,
      username: 'Archive',
    };
    profileManager.list.mockResolvedValue([
      { isActive: true, profile: createdProfile.profile },
      { isActive: false, profile: inactiveProfile },
    ]);
    profileManager.getDeletionImpact.mockRejectedValue(
      new Error('storage-unavailable'),
    );
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });

    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(screen.getByRole('button', { name: 'Manage profiles' }));
    const manager = await screen.findByRole('dialog', {
      name: 'Manage profiles',
    });
    const row = within(manager).getByText('Archive').closest('article');
    if (!row) throw new Error('profile-row-not-found');
    await user.click(within(row).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(activityLog.record).toHaveBeenCalledWith(
        createdProfile.profile.id,
        expect.objectContaining({
          dataChanged: false,
          eventCode: 'PROFILE-DELETE-PREVIEW-FAILED',
          level: 'ERROR',
        }),
      ),
    );
    expect(
      await screen.findByText(
        'The profile contents could not be counted, so deletion was canceled.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Delete profile?' }),
    ).not.toBeInTheDocument();
    expect(profileManager.delete).not.toHaveBeenCalled();
  });

  it('opens application information from the profile menu', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'storage-unavailable' });

    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(
      screen.getByRole('button', { name: 'About Bookmark Manager Pro' }),
    );

    const about = await screen.findByRole('dialog', {
      name: 'Bookmark Manager Pro',
    });
    expect(about).toBeVisible();
    expect(within(about).getByText('Alpha')).toBeVisible();
    expect(within(about).getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('opens and closes the temporary Notes workspace from the active profile menu', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });

    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(screen.getByRole('button', { name: 'Notes' }));

    expect(
      await screen.findByRole('heading', { name: 'Notes', level: 1 }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Open profile menu' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to bookmarks' }));
    expect(
      await screen.findByRole('button', { name: 'Open profile menu' }),
    ).toHaveFocus();
    expect(
      screen.queryByRole('heading', { name: 'Notes', level: 1 }),
    ).not.toBeInTheDocument();
  });

  it('opens the transient password generator and closes without reopening the profile menu', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });

    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(
      screen.getByRole('button', { name: 'Password generator' }),
    );

    const generator = await screen.findByRole('dialog', {
      name: 'Password generator',
    });
    const output = within(generator).getByRole('textbox', {
      name: 'Generated password',
    });
    const copyButton = within(generator).getByRole('button', {
      name: 'Copy password',
    });
    await waitFor(() => expect(copyButton).toBeEnabled());
    expect(
      screen.queryByText('A new random password was generated.'),
    ).not.toBeInTheDocument();

    const length = within(generator).getByRole('spinbutton', {
      name: 'Password length',
    });
    fireEvent.change(length, { target: { value: '3' } });
    await user.click(
      within(generator).getByRole('button', { name: 'Generate' }),
    );
    await waitFor(() =>
      expect(
        screen.getAllByText(
          'Choose at least 4 characters for the selected character sets.',
        ),
      ).toHaveLength(3),
    );

    fireEvent.change(length, { target: { value: '16' } });
    await user.click(
      within(generator).getByRole('button', { name: 'Generate' }),
    );
    expect(
      await screen.findByText('A new random password was generated.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(copyButton).toBeEnabled());
    await user.click(copyButton);
    expect(writeText).toHaveBeenCalledWith(output.textContent);
    expect(
      await screen.findByText('Password copied to your clipboard.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('A new random password was generated.'),
    ).toBeInTheDocument();

    await user.click(within(generator).getByRole('button', { name: 'Cancel' }));
    expect(
      await screen.findByRole('button', { name: 'Open profile menu' }),
    ).toHaveFocus();
    expect(
      screen.queryByRole('dialog', { name: 'Password generator' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Password generator' }),
    ).not.toBeInTheDocument();
  });

  it('opens the activity-log preview from the profile menu', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });

    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(
      screen.getByRole('button', { name: 'Bookmark activity log' }),
    );

    const logWindow = await screen.findByRole('dialog', {
      name: 'Bookmark activity log',
    });
    expect(logWindow).toBeVisible();
    expect(
      within(logWindow).getByText(
        'Shared local activity history, grouped by browser session.',
      ),
    ).toBeVisible();
    expect(
      within(logWindow).queryByRole('button', { name: 'Export' }),
    ).not.toBeInTheDocument();
  });

  it('saves profile display defaults without changing the current folder', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const settingsDialog = await screen.findByRole('dialog', {
      name: 'Settings',
    });
    await user.click(
      within(settingsDialog).getByRole('button', { name: 'Appearance' }),
    );
    await user.selectOptions(
      within(settingsDialog).getByLabelText('View'),
      'card',
    );
    await user.selectOptions(
      within(settingsDialog).getByLabelText('Card size'),
      'large',
    );
    await user.selectOptions(
      within(settingsDialog).getByLabelText('View'),
      'details',
    );
    await user.click(
      within(settingsDialog).getByRole('button', { name: 'Save' }),
    );
    expect(profileManager.updateProfileSettings).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({ bookmarkView: 'details', cardSize: 'large' }),
    );
    expect(bookmarkManager.updateFolderStyle).not.toHaveBeenCalled();
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'PROFILE-SETTINGS-UPDATE-COMPLETE',
        level: 'INFO',
        outcome: 'Succeeded',
      }),
    );
    expect(activityLog.record).not.toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({ eventCode: 'SETTINGS-WINDOW-OPENED' }),
    );
    expect(screen.getByText('Settings saved')).toBeInTheDocument();
  });

  it('notifies when toolbar tab access is granted', async () => {
    const user = userEvent.setup();
    const toolbarSavedStatus = {
      refresh: vi.fn(async () => undefined),
      removePermissionIfUnused: vi.fn(async () => undefined),
      requestPermission: vi.fn(async () => undefined),
    };
    renderApp(
      { status: 'ready', theme: 'dark', ...createdProfile },
      undefined,
      undefined,
      undefined,
      toolbarSavedStatus,
    );
    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const dialog = await screen.findByRole('dialog', { name: 'Settings' });
    await user.click(within(dialog).getByRole('button', { name: 'Bookmarks' }));
    await user.click(
      within(dialog).getByRole('button', { name: 'Allow tab access' }),
    );

    expect(toolbarSavedStatus.requestPermission).toHaveBeenCalledOnce();
    expect(
      await within(dialog).findByLabelText('Show saved status on the toolbar'),
    ).toBeChecked();
    expect(screen.getByText('Tab access allowed')).toBeInTheDocument();
    expect(
      screen.getByText('Saved-page status can now appear on the toolbar.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tab access allowed').closest('[role="status"]'),
    ).toBeInTheDocument();
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'TOOLBAR-SAVED-STATUS-PERMISSION-GRANTED',
        level: 'INFO',
        outcome: 'Succeeded',
      }),
    );
  });

  it('notifies and preserves recovery when toolbar tab access is denied', async () => {
    const user = userEvent.setup();
    const toolbarSavedStatus = {
      refresh: vi.fn(async () => undefined),
      removePermissionIfUnused: vi.fn(async () => undefined),
      requestPermission: vi.fn(async () => {
        throw new ToolbarSavedStatusPermissionDeniedError();
      }),
    };
    renderApp(
      { status: 'ready', theme: 'dark', ...createdProfile },
      undefined,
      undefined,
      undefined,
      toolbarSavedStatus,
    );
    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const dialog = await screen.findByRole('dialog', { name: 'Settings' });
    await user.click(within(dialog).getByRole('button', { name: 'Bookmarks' }));
    await user.click(
      within(dialog).getByRole('button', { name: 'Allow tab access' }),
    );

    await waitFor(() =>
      expect(inlineAlert(dialog)).toHaveTextContent(
        'Tab-address access was not granted.',
      ),
    );
    expect(screen.getByText('Tab access not granted')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tab access was not granted. Saved-page status remains disabled.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tab access not granted').closest('[role="alert"]'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Allow tab access' }),
    ).toBeEnabled();
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'TOOLBAR-SAVED-STATUS-PERMISSION-DENIED',
        level: 'WARN',
        outcome: 'Skipped',
      }),
    );
  });

  it('honors disabled notifications when toolbar tab access is granted', async () => {
    const user = userEvent.setup();
    const toolbarSavedStatus = {
      refresh: vi.fn(async () => undefined),
      removePermissionIfUnused: vi.fn(async () => undefined),
      requestPermission: vi.fn(async () => undefined),
    };
    renderApp(
      {
        status: 'ready',
        theme: 'dark',
        ...createdProfile,
        settings: {
          ...createdProfile.settings,
          notificationPreferences: {
            countdownLineColor: null,
            enabled: false,
            order: 'newest',
            position: 'bottom-right',
            stackLimit: 3,
          },
        },
      },
      undefined,
      undefined,
      undefined,
      toolbarSavedStatus,
    );
    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const dialog = await screen.findByRole('dialog', { name: 'Settings' });
    await user.click(within(dialog).getByRole('button', { name: 'Bookmarks' }));
    await user.click(
      within(dialog).getByRole('button', { name: 'Allow tab access' }),
    );

    expect(
      await within(dialog).findByLabelText('Show saved status on the toolbar'),
    ).toBeChecked();
    expect(
      screen.queryByRole('region', { name: 'Notifications' }),
    ).not.toBeInTheDocument();
  });

  it('keeps granted tab access usable when notification delivery fails', async () => {
    const user = userEvent.setup();
    activityLog.record.mockRejectedValueOnce(new Error('activity-log-failed'));
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const notificationShow = vi
      .spyOn(NotificationService.prototype, 'show')
      .mockImplementationOnce(() => {
        throw new Error('notification-failed');
      });
    const toolbarSavedStatus = {
      refresh: vi.fn(async () => undefined),
      removePermissionIfUnused: vi.fn(async () => undefined),
      requestPermission: vi.fn(async () => undefined),
    };
    renderApp(
      { status: 'ready', theme: 'dark', ...createdProfile },
      undefined,
      undefined,
      undefined,
      toolbarSavedStatus,
    );
    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const dialog = await screen.findByRole('dialog', { name: 'Settings' });
    await user.click(within(dialog).getByRole('button', { name: 'Bookmarks' }));
    await user.click(
      within(dialog).getByRole('button', { name: 'Allow tab access' }),
    );

    expect(
      await within(dialog).findByLabelText('Show saved status on the toolbar'),
    ).toBeChecked();
    expect(consoleError).toHaveBeenCalledWith(
      'A privacy-safe notification could not be displayed.',
    );
    expect(consoleError).toHaveBeenCalledWith(
      'profile-activity-log-write-failed',
    );
    notificationShow.mockRestore();
    consoleError.mockRestore();
  });

  it('records an error when bookmark display settings cannot be saved', async () => {
    const user = userEvent.setup();
    profileManager.updateProfileSettings.mockRejectedValueOnce(
      new Error('settings-write-failed'),
    );
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    await user.click(screen.getByRole('button', { name: 'Open profile menu' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const settingsDialog = await screen.findByRole('dialog', {
      name: 'Settings',
    });
    await user.click(
      within(settingsDialog).getByRole('button', { name: 'Appearance' }),
    );
    await user.selectOptions(
      within(settingsDialog).getByLabelText('View'),
      'details',
    );
    await user.click(
      within(settingsDialog).getByRole('button', { name: 'Save' }),
    );

    expect(inlineAlert(settingsDialog)).toBeVisible();
    expect(screen.getByText('Operation failed')).toBeInTheDocument();
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'PROFILE-SETTINGS-UPDATE-FAILED',
        level: 'ERROR',
        outcome: 'Failed',
      }),
    );
  });

  it('replaces the native context menu with themed bookmark actions', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });

    await user.pointer({
      keys: '[MouseRight]',
      target: await screen.findByRole('link', { name: 'Open Example' }),
    });

    const menu = screen.getByRole('menu', { name: 'Bookmark actions' });
    expect(
      within(menu).getByRole('menuitem', { name: 'Open link' }),
    ).toHaveFocus();
    expect(
      within(menu).getByRole('menuitem', { name: 'Edit bookmark' }),
    ).toBeVisible();
    expect(
      within(menu).getByRole('menuitem', { name: /^CopyCtrl\+C$/ }),
    ).toBeVisible();
    expect(
      within(menu).getByRole('menuitem', { name: 'Open in new window' }),
    ).toBeVisible();
    expect(
      within(menu).getByRole('menuitem', { name: 'Copy URL' }),
    ).toBeVisible();
    expect(
      within(menu).getByRole('menuitem', { name: 'Delete' }),
    ).toBeVisible();
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .every((item) => item.querySelector('.context-menu__icon')),
    ).toBe(true);

    await user.keyboard('{Escape}');
    expect(menu).not.toBeInTheDocument();
  });

  it('opens a bookmark URL in a new browser window', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });

    await user.pointer({
      keys: '[MouseRight]',
      target: await screen.findByRole('link', { name: 'Open Example' }),
    });
    await user.click(
      screen.getByRole('menuitem', { name: 'Open in new window' }),
    );

    await waitFor(() =>
      expect(openBookmarkWindow).toHaveBeenCalledWith(storedBookmark.url),
    );
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'BOOKMARK-OPEN-NEW-WINDOW-COMPLETE',
        level: 'INFO',
        outcome: 'Succeeded',
      }),
    );
  });

  it('reports a browser-window creation failure', async () => {
    const user = userEvent.setup();
    openBookmarkWindow.mockRejectedValueOnce(new Error('window-create-failed'));
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });

    await user.pointer({
      keys: '[MouseRight]',
      target: await screen.findByRole('link', { name: 'Open Example' }),
    });
    await user.click(
      screen.getByRole('menuitem', { name: 'Open in new window' }),
    );

    expect(
      await screen.findByText('A bookmark could not be opened.'),
    ).toBeInTheDocument();
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'BOOKMARK-OPEN-FAILED',
        level: 'ERROR',
        outcome: 'Failed',
      }),
    );
  });

  it('copies only the bookmark URL after explicit activation', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });

    await user.pointer({
      keys: '[MouseRight]',
      target: await screen.findByRole('link', { name: 'Open Example' }),
    });
    await user.click(screen.getByRole('menuitem', { name: 'Copy URL' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(storedBookmark.url),
    );
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'BOOKMARK-URL-COPY-COMPLETE',
        level: 'INFO',
        outcome: 'Succeeded',
      }),
    );
    expect(await screen.findByText('Link copied.')).toBeInTheDocument();
  });

  it('reports a failed URL copy without exposing the URL', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });

    await user.pointer({
      keys: '[MouseRight]',
      target: await screen.findByRole('link', { name: 'Open Example' }),
    });
    await user.click(screen.getByRole('menuitem', { name: 'Copy URL' }));

    expect(
      await screen.findByText('The link could not be copied.'),
    ).toBeInTheDocument();
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'BOOKMARK-URL-COPY-FAILED',
        level: 'ERROR',
        message: 'A bookmark URL could not be copied.',
        outcome: 'Failed',
      }),
    );
    expect(JSON.stringify(activityLog.record.mock.calls)).not.toContain(
      storedBookmark.url,
    );
  });

  it('keeps paste visible and disabled until an item is copied', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    const content = await screen.findByRole('region', { name: 'Bookmarks' });

    await user.pointer({ keys: '[MouseRight]', target: content });
    expect(screen.getByRole('menuitem', { name: /^Paste/ })).toBeDisabled();
    await user.keyboard('{Escape}');

    const bookmark = screen.getByRole('link', { name: 'Open Example' });
    await user.pointer({ keys: '[MouseRight]', target: bookmark });
    await user.click(screen.getByRole('menuitem', { name: /^CopyCtrl\+C$/ }));
    await user.pointer({ keys: '[MouseRight]', target: content });
    const paste = screen.getByRole('menuitem', { name: /^Paste/ });
    expect(paste).toBeEnabled();
    await user.click(paste);

    await waitFor(() =>
      expect(bookmarkManager.copyItem).toHaveBeenCalledWith(
        createdProfile.profile.id,
        storedBookmark.id,
        rootFolder.id,
      ),
    );
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'ITEM-PASTE-COMPLETE',
        level: 'INFO',
      }),
    );
    await user.pointer({ keys: '[MouseRight]', target: content });
    expect(screen.getByRole('menuitem', { name: /^Paste/ })).toBeDisabled();
  });

  it('keeps a copied item available when paste persistence fails', async () => {
    const user = userEvent.setup();
    bookmarkManager.copyItem.mockRejectedValueOnce(new Error('copy-failed'));
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    const content = await screen.findByRole('region', { name: 'Bookmarks' });
    const bookmark = screen.getByRole('link', { name: 'Open Example' });

    await user.pointer({ keys: '[MouseRight]', target: bookmark });
    await user.click(screen.getByRole('menuitem', { name: /^CopyCtrl\+C$/ }));
    await user.pointer({ keys: '[MouseRight]', target: content });
    await user.click(screen.getByRole('menuitem', { name: /^Paste/ }));
    await waitFor(() =>
      expect(activityLog.record).toHaveBeenCalledWith(
        createdProfile.profile.id,
        expect.objectContaining({
          eventCode: 'ITEM-PASTE-FAILED',
          level: 'ERROR',
        }),
      ),
    );

    await user.pointer({ keys: '[MouseRight]', target: content });
    expect(screen.getByRole('menuitem', { name: /^Paste/ })).toBeEnabled();
  });

  it('duplicates immediately without enabling paste', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    const bookmark = await screen.findByRole('link', { name: 'Open Example' });

    await user.pointer({ keys: '[MouseRight]', target: bookmark });
    await user.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    await waitFor(() =>
      expect(bookmarkManager.copyItem).toHaveBeenCalledWith(
        createdProfile.profile.id,
        storedBookmark.id,
        rootFolder.id,
      ),
    );

    const content = screen.getByRole('region', { name: 'Bookmarks' });
    await user.pointer({ keys: '[MouseRight]', target: content });
    expect(screen.getByRole('menuitem', { name: /^Paste/ })).toBeDisabled();
  });

  it('disables pasting a cut item back into its current parent', async () => {
    const user = userEvent.setup();
    const destination = {
      ...rootFolder,
      id: '33333333-3333-4333-8333-333333333333',
      isRoot: false,
      parentId: rootFolder.id,
      title: 'Destination',
    };
    bookmarkManager.listFolders.mockResolvedValue([rootFolder, destination]);
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    const bookmark = await screen.findByRole('link', { name: 'Open Example' });

    await user.pointer({ keys: '[MouseRight]', target: bookmark });
    await user.click(screen.getByRole('menuitem', { name: /^Cut/ }));
    const content = screen.getByRole('region', { name: 'Bookmarks' });
    await user.pointer({ keys: '[MouseRight]', target: content });
    expect(screen.getByRole('menuitem', { name: /^Paste/ })).toBeDisabled();
    expect(bookmarkManager.moveItem).not.toHaveBeenCalled();
  });

  it('supports focused-card copy and focused-panel paste shortcuts', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    const bookmark = await screen.findByRole('link', { name: 'Open Example' });
    const content = screen.getByRole('region', { name: 'Bookmarks' });

    bookmark.focus();
    await user.keyboard('{Control>}c{/Control}');
    content.focus();
    await user.keyboard('{Control>}v{/Control}');

    await waitFor(() =>
      expect(bookmarkManager.copyItem).toHaveBeenCalledWith(
        createdProfile.profile.id,
        storedBookmark.id,
        rootFolder.id,
      ),
    );
  });

  it('adds and removes a bookmark favorite from the context menu and tree panel', async () => {
    const user = userEvent.setup();
    let isFavorite = false;
    bookmarkManager.listNavigationItems.mockImplementation(async () => ({
      favorites: isFavorite
        ? [{ kind: 'bookmark' as const, value: storedBookmark }]
        : [],
      recent: [],
    }));
    bookmarkManager.setFavorite.mockImplementation(
      async (_profileId, _itemId, favorite) => {
        isFavorite = favorite;
      },
    );
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    const bookmark = await screen.findByRole('link', { name: 'Open Example' });

    await user.pointer({ keys: '[MouseRight]', target: bookmark });
    await user.click(
      screen.getByRole('menuitem', { name: 'Add to favorites' }),
    );
    await waitFor(() =>
      expect(bookmarkManager.setFavorite).toHaveBeenCalledWith(
        createdProfile.profile.id,
        storedBookmark.id,
        true,
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Open folder tree' }));
    const panel = screen.getByRole('dialog', { name: 'Folder tree' });
    const removeButton = await within(panel).findByRole('button', {
      name: 'Remove Example from favorites',
    });
    await user.click(removeButton);

    await waitFor(() =>
      expect(bookmarkManager.setFavorite).toHaveBeenLastCalledWith(
        createdProfile.profile.id,
        storedBookmark.id,
        false,
      ),
    );
    await waitFor(() =>
      expect(
        within(panel).queryByRole('button', {
          name: 'Remove Example from favorites',
        }),
      ).not.toBeInTheDocument(),
    );
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'FAVORITE-ITEM-REMOVE-COMPLETE',
        level: 'INFO',
      }),
    );
  });

  it('opens the selected bookmark in the shared prefilled editor', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    const bookmark = await screen.findByRole('link', { name: 'Open Example' });

    await user.pointer({ keys: '[MouseRight]', target: bookmark });
    await user.click(screen.getByRole('menuitem', { name: 'Edit bookmark' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit bookmark' });
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Example');
    expect(within(dialog).getByLabelText('URL')).toHaveValue(
      'https://example.com/',
    );
    expect(within(dialog).getByLabelText('Tags')).toHaveValue('');
    expect(within(dialog).getByLabelText('Note')).toHaveValue('');
    expect(within(dialog).getByLabelText('Card color')).toHaveValue('#35a775');

    await user.click(
      within(dialog).getByRole('button', { name: 'Save bookmark' }),
    );
    expect(bookmarkManager.updateBookmark).toHaveBeenCalledWith(
      createdProfile.profile.id,
      storedBookmark.id,
      {
        cardAppearance: storedBookmark.cardAppearance,
        note: '',
        tags: [],
        title: 'Example',
        url: 'https://example.com/',
      },
      storedBookmark.updatedAt,
    );
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'BOOKMARK-UPDATE-COMPLETE',
        level: 'INFO',
      }),
    );
  });

  it('records an error when an existing bookmark cannot be updated', async () => {
    const user = userEvent.setup();
    bookmarkManager.updateBookmark.mockRejectedValueOnce(
      new Error('bookmark-update-failed'),
    );
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    const bookmark = await screen.findByRole('link', { name: 'Open Example' });

    await user.pointer({ keys: '[MouseRight]', target: bookmark });
    await user.click(screen.getByRole('menuitem', { name: 'Edit bookmark' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit bookmark' });
    await user.click(
      within(dialog).getByRole('button', { name: 'Save bookmark' }),
    );

    await waitFor(() => expect(inlineAlert(dialog)).toBeVisible());
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'BOOKMARK-UPDATE-FAILED',
        level: 'ERROR',
      }),
    );
  });

  it('opens compact information and logs an explicit value copy', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    const bookmark = await screen.findByRole('link', { name: 'Open Example' });

    await user.pointer({ keys: '[MouseRight]', target: bookmark });
    await user.click(screen.getByRole('menuitem', { name: 'Get info' }));

    const dialog = screen.getByRole('dialog', { name: 'Get info' });
    expect(within(dialog).getByText(storedBookmark.url)).toBeVisible();
    expect(activityLog.record).not.toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({ eventCode: 'ITEM-INFO-OPENED' }),
    );
    await user.click(within(dialog).getByText('More details'));
    expect(
      within(dialog).getByRole('button', { name: 'Copy ID' }),
    ).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Copy ID' }));
    expect(writeText).toHaveBeenCalledWith(storedBookmark.id);
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'ITEM-INFO-VALUE-COPY-COMPLETE',
        level: 'INFO',
      }),
    );
  });

  it('shows and logs a safe failure when an info value cannot be copied', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    const bookmark = await screen.findByRole('link', { name: 'Open Example' });
    await user.pointer({ keys: '[MouseRight]', target: bookmark });
    await user.click(screen.getByRole('menuitem', { name: 'Get info' }));
    const dialog = screen.getByRole('dialog', { name: 'Get info' });
    await user.click(within(dialog).getByText('More details'));
    await user.click(within(dialog).getByRole('button', { name: 'Copy ID' }));

    expect(inlineAlert(dialog)).toHaveTextContent(
      'The value could not be copied.',
    );
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'ITEM-INFO-VALUE-COPY-FAILED',
        level: 'ERROR',
      }),
    );
  });

  it('shows creation actions when the empty bookmark area is right-clicked', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'storage-unavailable' });

    await user.pointer({
      keys: '[MouseRight]',
      target: screen.getByRole('region', { name: 'Bookmarks' }),
    });

    const menu = screen.getByRole('menu', { name: 'Bookmark actions' });
    expect(
      within(menu).getByRole('menuitem', { name: 'New bookmark' }),
    ).toBeVisible();
    expect(
      within(menu).getByRole('menuitem', { name: 'New folder' }),
    ).toBeVisible();
    expect(
      within(menu).getByRole('menuitem', { name: 'Customize folder style' }),
    ).toBeVisible();
    expect(
      within(menu).queryByRole('menuitem', { name: 'Save open tabs' }),
    ).not.toBeInTheDocument();
    expect(within(menu).queryByText('Edit bookmark')).not.toBeInTheDocument();
  });

  it('opens the current-folder style editor and saves its background', async () => {
    const user = userEvent.setup();
    bookmarkManager.captureUndoState
      .mockResolvedValueOnce({
        bookmarks: [storedBookmark],
        favorites: [],
        folders: [rootFolder],
      })
      .mockResolvedValueOnce({
        bookmarks: [storedBookmark],
        favorites: [],
        folders: [{ ...rootFolder, updatedAt: 2 }],
      });
    const { changeBridge } = renderApp({
      status: 'ready',
      theme: 'dark',
      ...createdProfile,
    });
    const region = await screen.findByRole('region', { name: 'Bookmarks' });

    await user.pointer({ keys: '[MouseRight]', target: region });
    await user.click(
      screen.getByRole('menuitem', { name: 'Customize folder style' }),
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Customize folder style',
    });
    fireEvent.change(within(dialog).getByLabelText('Background color'), {
      target: { value: '#123456' },
    });
    await user.selectOptions(within(dialog).getByLabelText('View'), 'details');
    fireEvent.change(
      within(dialog).getByLabelText('Table background transparency: 0%'),
      { target: { value: '35' } },
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Save style' }),
    );

    expect(bookmarkManager.updateFolderStyle).toHaveBeenCalledWith(
      createdProfile.profile.id,
      rootFolder.id,
      {
        backgroundAppearance: { kind: 'color', value: '#123456' },
        bookmarkGroupBy: 'none',
        bookmarkSortBy: 'manual',
        bookmarkSortDirection: 'ascending',
        bookmarkView: 'details',
        cardSize: 'medium',
        cardSpacing: 'comfortable',
        detailsTableTransparency: 35,
        includeNavigationBackground: false,
        navigationTransparency: 45,
      },
      rootFolder.updatedAt,
    );
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'FOLDER-STYLE-UPDATE-COMPLETE',
        level: 'INFO',
      }),
    );
    expect(changeBridge.publish).toHaveBeenCalledWith({
      affectedParentIds: [],
      changedFolderIds: [rootFolder.id],
      deletedFolderPaths: [],
      fullRefresh: false,
      navigationChanged: true,
      profileId: createdProfile.profile.id,
    });
  });

  it('persists a Details column move with privacy-safe activity and notification', async () => {
    const user = userEvent.setup();
    const detailsRoot = { ...rootFolder, bookmarkView: 'details' as const };
    bookmarkManager.ensureRoot.mockResolvedValueOnce(detailsRoot);
    bookmarkManager.listFolders.mockResolvedValueOnce([detailsRoot]);
    bookmarkManager.updateFolderDetailsColumnOrder.mockResolvedValueOnce(
      undefined,
    );
    renderApp({
      status: 'ready',
      theme: 'dark',
      ...createdProfile,
      settings: {
        ...createdProfile.settings,
        showDetailsColumnReorderControls: true,
      },
    });

    await user.click(await screen.findByRole('button', { name: 'Move left' }));

    expect(bookmarkManager.updateFolderDetailsColumnOrder).toHaveBeenCalledWith(
      createdProfile.profile.id,
      rootFolder.id,
      ['title', 'appearance', 'url', 'updatedAt', 'type'],
    );
    await waitFor(() =>
      expect(activityLog.record).toHaveBeenCalledWith(
        createdProfile.profile.id,
        expect.objectContaining({
          eventCode: 'DETAILS-COLUMN-ORDER-UPDATE-COMPLETE',
          level: 'INFO',
        }),
      ),
    );
    expect(
      await screen.findByText('The column order was saved for this folder.'),
    ).toBeInTheDocument();
  });

  it('logs a failed Details column move and restores the displayed order', async () => {
    const user = userEvent.setup();
    const detailsRoot = { ...rootFolder, bookmarkView: 'details' as const };
    bookmarkManager.ensureRoot.mockResolvedValueOnce(detailsRoot);
    bookmarkManager.listFolders.mockResolvedValueOnce([detailsRoot]);
    bookmarkManager.updateFolderDetailsColumnOrder.mockRejectedValueOnce(
      new Error('write-failed'),
    );
    renderApp({
      status: 'ready',
      theme: 'dark',
      ...createdProfile,
      settings: {
        ...createdProfile.settings,
        showDetailsColumnReorderControls: true,
      },
    });

    await user.click(await screen.findByRole('button', { name: 'Move left' }));

    await waitFor(() =>
      expect(activityLog.record).toHaveBeenCalledWith(
        createdProfile.profile.id,
        expect.objectContaining({
          eventCode: 'DETAILS-COLUMN-ORDER-UPDATE-FAILED',
          level: 'ERROR',
        }),
      ),
    );
    expect(
      await screen.findAllByText(/previous order was restored/i),
    ).toHaveLength(2);
    expect(screen.getAllByRole('columnheader')[0]).toHaveAccessibleName(
      'Appearance',
    );
  });

  it('shows an app notification when a folder background image is rejected', async () => {
    const user = userEvent.setup();
    renderApp({
      status: 'ready',
      theme: 'dark',
      ...createdProfile,
    });
    const region = await screen.findByRole('region', { name: 'Bookmarks' });

    await user.pointer({ keys: '[MouseRight]', target: region });
    await user.click(
      screen.getByRole('menuitem', { name: 'Customize folder style' }),
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Customize folder style',
    });
    await user.click(within(dialog).getByText('Folder background'));
    await user.click(within(dialog).getByLabelText('Image'));
    fireEvent.change(within(dialog).getByLabelText('Choose background image'), {
      target: {
        files: [
          new File([new Uint8Array(1_000_001)], 'large.png', {
            type: 'image/png',
          }),
        ],
      },
    });

    expect(await screen.findByText('Image not selected')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Choose a valid PNG, JPEG, or BMP image no larger than 1 MB and 7680 by 4320 pixels.',
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog)
        .queryAllByRole('alert')
        .filter((element) => !element.closest('.notification-viewport')),
    ).toHaveLength(0);
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'FOLDER-WALLPAPER-IMPORT-REJECTED',
        level: 'WARN',
      }),
    );
  });

  it('creates bookmarks and folders in the currently open folder', async () => {
    const user = userEvent.setup();
    const customizedProfile = {
      ...createdProfile,
      settings: {
        ...createdProfile.settings,
        bookmarkGroupBy: 'domain' as const,
        bookmarkSortBy: 'updatedAt' as const,
        bookmarkSortDirection: 'descending' as const,
        bookmarkView: 'details' as const,
        cardSize: 'large' as const,
        cardSpacing: 'spacious' as const,
      },
    };
    renderApp({ status: 'ready', theme: 'dark', ...customizedProfile });
    await screen.findByRole('link', { name: 'Open Example' });
    const region = screen.getByRole('region', { name: 'Bookmarks' });

    await user.pointer({ keys: '[MouseRight]', target: region });
    await user.click(screen.getByRole('menuitem', { name: 'New bookmark' }));
    const bookmarkDialog = screen.getByRole('dialog', { name: 'New bookmark' });
    await user.type(within(bookmarkDialog).getByLabelText('Title'), 'Docs');
    await user.type(
      within(bookmarkDialog).getByLabelText('URL'),
      'https://docs.example.com/',
    );
    await user.type(
      within(bookmarkDialog).getByLabelText('Tags'),
      'docs, work',
    );
    await user.type(
      within(bookmarkDialog).getByLabelText('Note'),
      'Reference material',
    );
    await user.click(
      within(bookmarkDialog).getByRole('button', { name: 'Create bookmark' }),
    );
    expect(bookmarkManager.createBookmark).toHaveBeenCalledWith(
      expect.objectContaining({
        parentId: rootFolder.id,
        profileId: createdProfile.profile.id,
        title: 'Docs',
        tags: ['docs', 'work'],
        note: 'Reference material',
        url: 'https://docs.example.com/',
      }),
    );
    expect(await screen.findByText('Bookmark created')).toBeInTheDocument();

    await user.pointer({ keys: '[MouseRight]', target: region });
    await user.click(screen.getByRole('menuitem', { name: 'New folder' }));
    const folderDialog = screen.getByRole('dialog', { name: 'New folder' });
    await user.type(within(folderDialog).getByLabelText('Title'), 'Research');
    await user.click(
      within(folderDialog).getByRole('radio', { name: 'Gradient' }),
    );
    fireEvent.change(within(folderDialog).getByLabelText('Gradient color 1'), {
      target: { value: '#112233' },
    });
    fireEvent.change(within(folderDialog).getByLabelText('Gradient color 2'), {
      target: { value: '#445566' },
    });
    fireEvent.change(within(folderDialog).getByLabelText('Gradient color 3'), {
      target: { value: '#778899' },
    });
    fireEvent.change(
      within(folderDialog).getByLabelText('Gradient direction'),
      { target: { value: '90' } },
    );
    await user.click(
      within(folderDialog).getByRole('button', { name: 'Create folder' }),
    );
    expect(bookmarkManager.createFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        parentId: rootFolder.id,
        profileId: createdProfile.profile.id,
        title: 'Research',
        cardAppearance: {
          colors: ['#112233', '#445566', '#778899'],
          direction: 90,
          kind: 'gradient',
        },
        note: '',
        tags: [],
        bookmarkGroupBy: 'domain',
        bookmarkSortBy: 'updatedAt',
        bookmarkSortDirection: 'descending',
        bookmarkView: 'details',
        cardSize: 'large',
        cardSpacing: 'spacious',
        detailsColumnOrder: ['appearance', 'title', 'url', 'updatedAt', 'type'],
      }),
    );
  });

  it('opens text editing actions for an editable field inside a dialog', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    await screen.findByRole('link', { name: 'Open Example' });

    await user.pointer({
      keys: '[MouseRight]',
      target: screen.getByRole('region', { name: 'Bookmarks' }),
    });
    await user.click(screen.getByRole('menuitem', { name: 'New folder' }));
    const folderDialog = screen.getByRole('dialog', { name: 'New folder' });
    const title = within(folderDialog).getByLabelText(
      'Title',
    ) as HTMLInputElement;
    await user.type(title, 'Research');
    title.setSelectionRange(0, 8);

    fireEvent.contextMenu(title, { clientX: 80, clientY: 120 });

    const menu = within(folderDialog).getByRole('menu', {
      name: 'Text editing actions',
    });
    expect(within(menu).getByRole('menuitem', { name: /^Cut/ })).toBeEnabled();
    expect(within(menu).getByRole('menuitem', { name: /^Copy/ })).toBeEnabled();
    expect(
      within(menu).getByRole('menuitem', { name: /^Paste/ }),
    ).toBeEnabled();
    expect(
      within(menu).getByRole('menuitem', { name: /^Select all/ }),
    ).toBeEnabled();
    expect(within(menu).getByRole('menuitem', { name: 'Clear' })).toBeEnabled();
  });

  it('keeps the nested folder open after creating an item and refreshing remembered appearance', async () => {
    const user = userEvent.setup();
    const workFolder: Folder = {
      ...rootFolder,
      createdAt: 2,
      id: '33333333-3333-4333-8333-333333333333',
      isRoot: false,
      parentId: rootFolder.id,
      title: 'Work',
      updatedAt: 2,
    };
    bookmarkManager.listFolders.mockResolvedValue([rootFolder, workFolder]);
    bookmarkManager.listContents.mockImplementation(
      async (_profileId: string, folderId: string) => ({
        bookmarks: [],
        folders: folderId === rootFolder.id ? [workFolder] : [],
      }),
    );
    const initializationState = {
      status: 'ready',
      theme: 'dark',
      ...createdProfile,
      settings: {
        ...createdProfile.settings,
        rememberLastAppearance: true,
        startupLocation: 'home' as const,
      },
    } satisfies InitializationState;
    const resumedInitializationState = {
      ...initializationState,
      settings: { ...initializationState.settings },
    } satisfies InitializationState;

    renderApp(initializationState, resumedInitializationState);
    await user.click(
      await screen.findByRole('button', { name: 'Open folder tree' }),
    );
    const treePanel = screen.getByRole('dialog', { name: 'Folder tree' });
    await user.click(
      within(treePanel).getByRole('button', { name: 'Expand Home' }),
    );
    await user.click(within(treePanel).getByRole('button', { name: 'Work' }));
    await waitFor(() =>
      expect(bookmarkManager.listContents).toHaveBeenLastCalledWith(
        createdProfile.profile.id,
        workFolder.id,
      ),
    );

    const region = screen.getByRole('region', { name: 'Bookmarks' });
    await user.pointer({ keys: '[MouseRight]', target: region });
    await user.click(screen.getByRole('menuitem', { name: 'New bookmark' }));
    const dialog = screen.getByRole('dialog', { name: 'New bookmark' });
    await user.type(within(dialog).getByLabelText('Title'), 'Nested bookmark');
    await user.type(
      within(dialog).getByLabelText('URL'),
      'https://nested.example.com/',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Create bookmark' }),
    );

    expect(bookmarkManager.createBookmark).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: workFolder.id }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('navigation', { name: 'Current folder path' }),
      ).toHaveTextContent(/Home[\\/]Work/),
    );
    expect(bookmarkManager.listContents).toHaveBeenLastCalledWith(
      createdProfile.profile.id,
      workFolder.id,
    );
  });

  it('opens history by shortcut only when no application window is open', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    await screen.findByRole('link', { name: 'Open Example' });
    const region = screen.getByRole('region', { name: 'Bookmarks' });

    await user.pointer({ keys: '[MouseRight]', target: region });
    await user.click(screen.getByRole('menuitem', { name: 'New bookmark' }));
    fireEvent.keyDown(window, { ctrlKey: true, key: 'Z', shiftKey: true });
    expect(
      screen.queryByRole('dialog', { name: 'Undo and redo history' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Close bookmark or folder editor' }),
    );
    fireEvent.keyDown(window, { ctrlKey: true, key: 'Z', shiftKey: true });
    expect(
      screen.getByRole('dialog', { name: 'Undo and redo history' }),
    ).toBeVisible();
  });

  it('explains an unsafe bookmark URL without showing a notification action', async () => {
    const user = userEvent.setup();
    const unsafeResult = safeBookmarkUrlSchema.safeParse('javascript:alert(1)');
    if (unsafeResult.success) throw new Error('unsafe-url-test-setup-failed');
    bookmarkManager.createBookmark.mockRejectedValueOnce(unsafeResult.error);
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    const region = await screen.findByRole('region', { name: 'Bookmarks' });

    await user.pointer({ keys: '[MouseRight]', target: region });
    await user.click(screen.getByRole('menuitem', { name: 'New bookmark' }));
    const dialog = screen.getByRole('dialog', { name: 'New bookmark' });
    await user.type(within(dialog).getByLabelText('Title'), 'Unsafe');
    await user.type(
      within(dialog).getByLabelText('URL'),
      'javascript:alert(1)',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Create bookmark' }),
    );

    expect(
      screen.getByText(
        "This bookmark wasn't saved because that type of URL can be unsafe. Use an address that starts with http://, https://, or ftp://.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Check the bookmark URL')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'View activity log' }),
    ).not.toBeInTheDocument();
  });

  it('focuses the content panel before cards and opens its menu from the keyboard', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'storage-unavailable' });

    const bookmarkRegion = screen.getByRole('region', { name: 'Bookmarks' });
    bookmarkRegion.focus();
    expect(bookmarkRegion).toHaveFocus();

    fireEvent.contextMenu(bookmarkRegion, { clientX: 24, clientY: 112 });

    const menu = screen.getByRole('menu', { name: 'Bookmark actions' });
    expect(
      within(menu).getByRole('menuitem', { name: 'New bookmark' }),
    ).toHaveFocus();

    await user.keyboard('{Escape}');
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    expect(menu).not.toBeInTheDocument();
    expect(bookmarkRegion).toHaveFocus();
  });

  it('uses only the browser context-menu event when the key targets a bookmark', async () => {
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });

    const bookmark = await screen.findByRole('link', { name: 'Open Example' });
    bookmark.focus();
    fireEvent.keyDown(bookmark, { key: 'ContextMenu' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.contextMenu(bookmark, { clientX: 120, clientY: 180 });

    const menu = screen.getByRole('menu', { name: 'Bookmark actions' });
    expect(
      within(menu).getByRole('menuitem', { name: 'Open link' }),
    ).toHaveFocus();
    expect(within(menu).queryByText('New bookmark')).not.toBeInTheDocument();
  });
});
