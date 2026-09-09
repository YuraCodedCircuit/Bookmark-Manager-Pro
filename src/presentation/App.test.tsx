import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { InitializationState } from '../application/initialization/initialization-state';
import type { WebPreflightSnapshot } from '../application/preflight/preflight-state';
import type { Bookmark } from '../domain/bookmark';
import { safeBookmarkUrlSchema } from '../domain/bookmark-url';
import type { Folder } from '../domain/folder';
import type { NavigationItems } from '../application/bookmark/manage-bookmarks';
import '../localization/i18n';
import { App } from './App';
import { defaultActivityLogSettings } from '../application/activity-log/manage-activity-log';
import { UndoHistoryService } from '../application/undo-history/undo-history-service';

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
const originalClipboard = navigator.clipboard;
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
  createBookmark: vi.fn(),
  createFolder: vi.fn(),
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
  updateFolderStyle: vi.fn(),
};
const profileManager = {
  create: vi.fn(),
  delete: vi.fn(),
  duplicate: vi.fn(),
  getStorageUsage: vi.fn().mockResolvedValue([]),
  list: vi.fn().mockResolvedValue([]),
  switchTo: vi.fn(),
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
) {
  return render(
    <App
      activityLog={activityLog}
      applicationVersion="0.1.1"
      bookmarkManager={bookmarkManager}
      createProfileAndResumePreflight={createProfileAndResumePreflight}
      initialPreflightSnapshot={{
        capabilities: [],
        initialization: initializationState,
        language: 'en-US',
        operationId: 'initial-operation',
      }}
      onUiReady={onUiReady}
      profileManager={profileManager}
      resumePreflight={vi.fn().mockResolvedValue({
        capabilities: [],
        initialization: resumedInitializationState,
        language: 'en-US',
        operationId: 'resumed-operation',
      })}
      undoHistory={undoHistory}
      updateAnnouncements={updateAnnouncements}
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
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
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: originalClipboard,
  });
});

describe('App', () => {
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

  it('uses the saved app-local search binding instead of its default', async () => {
    renderApp({
      status: 'ready',
      theme: 'dark',
      ...createdProfile,
      settings: {
        ...createdProfile.settings,
        shortcutPreferences: {
          bindings: {
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
    renderApp({ status: 'first-run', theme: 'dark' });

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
    expect(within(logWindow).getByText('Saved locally')).toBeVisible();
    expect(
      within(logWindow).getByRole('button', { name: 'Export' }),
    ).toBeEnabled();
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
      'details',
    );
    await user.selectOptions(
      within(settingsDialog).getByLabelText('Card size'),
      'large',
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

    expect(within(settingsDialog).getByRole('alert')).toBeVisible();
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
    expect(within(menu).getByRole('menuitem', { name: 'Open' })).toHaveFocus();
    expect(
      within(menu).getByRole('menuitem', { name: 'Edit bookmark' }),
    ).toBeVisible();
    expect(within(menu).getByRole('menuitem', { name: /^Copy/ })).toBeVisible();
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

  it('keeps paste visible and disabled until an item is copied', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
    const content = await screen.findByRole('region', { name: 'Bookmarks' });

    await user.pointer({ keys: '[MouseRight]', target: content });
    expect(screen.getByRole('menuitem', { name: /^Paste/ })).toBeDisabled();
    await user.keyboard('{Escape}');

    const bookmark = screen.getByRole('link', { name: 'Open Example' });
    await user.pointer({ keys: '[MouseRight]', target: bookmark });
    await user.click(screen.getByRole('menuitem', { name: /^Copy/ }));
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
    await user.click(screen.getByRole('menuitem', { name: /^Copy/ }));
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

    expect(await within(dialog).findByRole('alert')).toBeVisible();
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

    expect(within(dialog).getByRole('alert')).toHaveTextContent(
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
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
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
    );
    expect(activityLog.record).toHaveBeenCalledWith(
      createdProfile.profile.id,
      expect.objectContaining({
        eventCode: 'FOLDER-STYLE-UPDATE-COMPLETE',
        level: 'INFO',
      }),
    );
  });

  it('creates bookmarks and folders in the currently open folder', async () => {
    const user = userEvent.setup();
    renderApp({ status: 'ready', theme: 'dark', ...createdProfile });
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
    expect(screen.getByText('Bookmark created')).toBeInTheDocument();

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
      }),
    );
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
    expect(within(menu).getByRole('menuitem', { name: 'Open' })).toHaveFocus();
    expect(within(menu).queryByText('New bookmark')).not.toBeInTheDocument();
  });
});
