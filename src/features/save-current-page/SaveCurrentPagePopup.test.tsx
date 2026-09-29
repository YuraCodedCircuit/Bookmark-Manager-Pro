import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import type { BookmarkUrlLocation } from '../../application/bookmark/manage-bookmarks';
import { profileSettingsSchema } from '../../domain/profile-settings';
import type { FolderTreeSummary } from '../../domain/folder';
import { isSaveableCurrentPageUrl } from './current-page-url';
import {
  FirstRunPopup,
  SaveCurrentPagePopup,
  UnsupportedCurrentPage,
} from './SaveCurrentPagePopup';

const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
const rootId = '11111111-1111-4111-8111-111111111111';
const bookmarkId = '22222222-2222-4222-8222-222222222222';
const root = {
  backgroundAppearance: {
    colors: ['#2f80c9', '#185a82', '#0b1f3a'] as [string, string, string],
    direction: 135,
    kind: 'gradient' as const,
  },
  bookmarkGroupBy: 'none' as const,
  bookmarkSortBy: 'manual' as const,
  bookmarkSortDirection: 'ascending' as const,
  bookmarkView: 'card' as const,
  cardAppearance: { kind: 'color' as const, value: '#2f7de1' },
  cardSize: 'small' as const,
  cardSpacing: 'comfortable' as const,
  createdAt: 10,
  detailsTableTransparency: 0,
  id: rootId,
  includeNavigationBackground: true,
  index: 0,
  isRoot: true,
  navigationTransparency: 70,
  note: '',
  parentId: null,
  profileId,
  tags: [],
  title: 'Home',
  updatedAt: 10,
};

describe('first-run popup', () => {
  it('opens profile creation instead of offering Retry', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const openProfileCreation = vi.fn(async () => undefined);
    render(
      <FirstRunPopup
        onClose={onClose}
        openProfileCreation={openProfileCreation}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    const createProfile = screen.getByRole('button', {
      name: 'Create profile',
    });
    expect(createProfile).toHaveFocus();

    await user.click(createProfile);

    expect(openProfileCreation).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps recovery available when the app tab cannot be opened', async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const onClose = vi.fn();
    const openProfileCreation = vi.fn(async () => {
      throw new Error('tab-create-failed');
    });
    render(
      <FirstRunPopup
        onClose={onClose}
        openProfileCreation={openProfileCreation}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Create profile' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bookmark Manager Pro could not be opened. Try again.',
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      'profile-creation-tab-open-failed',
    );
    expect(
      screen.getByRole('button', { name: 'Create profile' }),
    ).toBeEnabled();
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setup(
  duplicateHandling: 'allow' | 'warn' | 'prevent',
  initialDuplicate:
    boolean | readonly { folderId: string; folderTitle: string }[],
  listBookmarkLocationsByUrl: (
    profileId: string,
    url: string,
  ) => Promise<readonly BookmarkUrlLocation[]> = vi.fn(async () => []),
  loadFolderTree: () => Promise<readonly FolderTreeSummary[]> = vi.fn(
    async () => [root],
  ),
  initializeUndo = vi.fn(async () => true),
  autoCropPopupScreenshots = false,
) {
  const createdBookmark = {
    cardAppearance: { kind: 'color' as const, value: '#2f7de1' },
    createdAt: 11,
    id: bookmarkId,
    index: 0,
    note: '',
    parentId: rootId,
    profileId,
    tags: [],
    title: 'Current page',
    updatedAt: 11,
    url: 'https://example.com/',
  };
  const before = { bookmarks: [], favorites: [], folders: [root] };
  const after = {
    bookmarks: [createdBookmark],
    favorites: [],
    folders: [root],
  };
  const dependencies = {
    activityLog: { record: vi.fn(async () => undefined) },
    bookmarkManager: {
      captureUndoState: vi
        .fn()
        .mockResolvedValueOnce(before)
        .mockResolvedValueOnce(after),
      createBookmark: vi.fn(async () => undefined),
      listBookmarkLocationsByUrl,
    },
    captureCurrentTab: vi.fn(async () => 'data:image/jpeg;base64,dGVzdA=='),
    close: vi.fn(),
    contentChanges: {
      profileActivation: vi.fn(async () => ({ profileId, revision: 0 })),
      publish: vi.fn(async (input) => ({
        ...input,
        protocolVersion: 1 as const,
        revision: 1,
        type: 'content.changed' as const,
      })),
      subscribeProfileActivation: vi.fn(() => () => undefined),
    },
    initializeUndo,
    loadDuplicateLocations: vi.fn(async () =>
      typeof initialDuplicate !== 'boolean'
        ? initialDuplicate
        : initialDuplicate
          ? [{ folderId: rootId, folderTitle: root.title }]
          : [],
    ),
    loadFolderTree,
    undoHistory: {
      record: vi.fn(async () => undefined),
      runMutation: vi.fn(async <T,>(operation: () => Promise<T>): Promise<T> =>
        operation(),
      ) as <T>(operation: () => Promise<T>) => Promise<T>,
    },
  };
  render(
    <SaveCurrentPagePopup
      dependencies={dependencies}
      ready={{
        profileId,
        root,
        settings: profileSettingsSchema.parse({
          autoCropPopupScreenshots,
          duplicateHandling,
          profileId,
          tagOrder: 'preserve',
          theme: 'dark',
        }),
        tab: {
          title: 'Current page',
          url: 'https://example.com/',
          windowId: 1,
        },
      }}
    />,
  );
  return dependencies;
}

describe('SaveCurrentPagePopup screenshot auto-crop', () => {
  it('falls back to the original and records a warning when local auto-crop fails', async () => {
    const user = userEvent.setup();
    const dependencies = setup(
      'allow',
      false,
      undefined,
      undefined,
      undefined,
      true,
    );
    dependencies.captureCurrentTab.mockResolvedValueOnce(
      'data:image/gif;base64,dGVzdA==',
    );
    const editor = await screen.findByRole('dialog', {
      name: 'Save current URL',
    });
    await user.click(within(editor).getByLabelText('Screenshot'));
    await user.click(
      within(editor).getByRole('button', { name: 'Capture current page' }),
    );

    expect(await within(editor).findByRole('alert')).toHaveTextContent(
      'Automatic crop could not be applied. The original screenshot is still available.',
    );
    expect(
      within(editor).getByRole('img', { name: 'Captured visible tab' }),
    ).toBeVisible();
    expect(dependencies.activityLog.record).toHaveBeenCalledWith(
      profileId,
      expect.objectContaining({
        eventCode: 'CURRENT-TAB-SCREENSHOT-AUTO-CROP-FALLBACK',
        level: 'WARN',
      }),
    );
  });
});

describe('unsupported current pages', () => {
  it('rejects browser-internal URLs before duplicate lookup', () => {
    expect(
      isSaveableCurrentPageUrl('edge://extensions/?errors=synthetic'),
    ).toBe(false);
    expect(isSaveableCurrentPageUrl('https://example.com/')).toBe(true);
  });

  it('shows a non-retryable, keyboard-dismissible explanation', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<UnsupportedCurrentPage onClose={onClose} />);

    expect(
      screen.getByRole('heading', { name: 'This page cannot be saved' }),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    const closeButton = screen.getByRole('button', { name: 'Close' });
    expect(closeButton).toHaveFocus();
    expect(closeButton.closest('footer')).not.toBeNull();
    expect(
      screen
        .getByRole('heading', { name: 'This page cannot be saved' })
        .closest('.save-current-page__decision-content'),
    ).not.toBeNull();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('SaveCurrentPagePopup duplicate handling', () => {
  it('shows up to three complete matching folder names and summarizes the rest', async () => {
    const longFolderName = `Reference ${'collection '.repeat(15)}`.trim();
    setup('warn', [
      { folderId: rootId, folderTitle: longFolderName },
      {
        folderId: '33333333-3333-4333-8333-333333333333',
        folderTitle: 'Research',
      },
      {
        folderId: '44444444-4444-4444-8444-444444444444',
        folderTitle: 'Reading list',
      },
      {
        folderId: '55555555-5555-4555-8555-555555555555',
        folderTitle: 'Archive',
      },
    ]);

    expect(await screen.findByText('Saved in:')).toBeVisible();
    expect(screen.getByText(longFolderName)).toHaveAttribute(
      'title',
      longFolderName,
    );
    expect(screen.getByText('Research')).toBeVisible();
    expect(screen.getByText('Reading list')).toBeVisible();
    expect(screen.queryByText('Archive')).toBeNull();
    expect(screen.getByText('and 1 more')).toBeVisible();
  });

  it('warns before rendering the editor and does not ask twice for the approved URL', async () => {
    const user = userEvent.setup();
    const listBookmarkLocationsByUrl = vi.fn(async () => []);
    const dependencies = setup('warn', true, listBookmarkLocationsByUrl);

    expect(
      screen.queryByRole('dialog', { name: 'Save current URL' }),
    ).not.toBeInTheDocument();
    const closeButton = await screen.findByRole('button', { name: 'Close' });
    expect(closeButton).toHaveFocus();
    expect(closeButton.closest('footer')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Save another copy' }));
    const editor = screen.getByRole('dialog', { name: 'Save current URL' });
    expect(within(editor).getByLabelText('Title')).toHaveFocus();
    await user.click(
      within(editor).getByRole('button', { name: 'Save bookmark' }),
    );

    await waitFor(() =>
      expect(
        dependencies.bookmarkManager.createBookmark,
      ).toHaveBeenCalledOnce(),
    );
    expect(listBookmarkLocationsByUrl).toHaveBeenCalledOnce();
  });

  it('blocks an initial duplicate when the profile prevents copies', async () => {
    setup('prevent', true);

    expect(
      await screen.findByText(
        'Your duplicate settings prevent another copy from being saved.',
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Save another copy' }),
    ).not.toBeInTheDocument();
  });

  it('preserves edited fields when a late duplicate decision returns to the form', async () => {
    const user = userEvent.setup();
    setup(
      'warn',
      false,
      vi.fn(async () => [{ folderId: rootId, folderTitle: root.title }]),
    );
    const editor = await screen.findByRole('dialog', {
      name: 'Save current URL',
    });

    await user.clear(within(editor).getByLabelText('Title'));
    await user.type(within(editor).getByLabelText('Title'), 'Edited title');
    await user.type(within(editor).getByLabelText('Tags'), 'one, two');
    await user.type(within(editor).getByLabelText('Note'), 'Preserved note');
    await user.click(
      within(editor).getByRole('button', { name: 'Save bookmark' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Go back' }),
    ).toHaveFocus();
    await user.keyboard('{Escape}');

    const restored = screen.getByRole('dialog', { name: 'Save current URL' });
    expect(within(restored).getByLabelText('Title')).toHaveValue(
      'Edited title',
    );
    expect(within(restored).getByLabelText('Tags')).toHaveValue('one, two');
    expect(within(restored).getByLabelText('Note')).toHaveValue(
      'Preserved note',
    );
  });

  it('saves a concurrently discovered duplicate after explicit approval', async () => {
    const user = userEvent.setup();
    const dependencies = setup(
      'warn',
      false,
      vi.fn(async () => [{ folderId: rootId, folderTitle: root.title }]),
    );
    const editor = await screen.findByRole('dialog', {
      name: 'Save current URL',
    });

    await user.click(
      within(editor).getByRole('button', { name: 'Save bookmark' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Save another copy' }),
    );

    await waitFor(() => {
      expect(
        dependencies.bookmarkManager.createBookmark,
      ).toHaveBeenCalledOnce();
      expect(dependencies.close).toHaveBeenCalledOnce();
    });
  });

  it('lets the user return to an edited URL that prevent mode blocks', async () => {
    const user = userEvent.setup();
    setup(
      'prevent',
      false,
      vi.fn(async () => [{ folderId: rootId, folderTitle: root.title }]),
    );
    const editor = await screen.findByRole('dialog', {
      name: 'Save current URL',
    });

    await user.click(
      within(editor).getByRole('button', { name: 'Save bookmark' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Go back' }),
    ).toHaveFocus();
    expect(
      screen.queryByRole('button', { name: 'Save another copy' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go back' }));
    expect(
      screen.getByRole('dialog', { name: 'Save current URL' }),
    ).toBeVisible();
  });

  it('skips duplicate lookup when the profile allows copies', async () => {
    const user = userEvent.setup();
    const listBookmarkLocationsByUrl = vi.fn(async () => [
      { folderId: rootId, folderTitle: root.title },
    ]);
    const dependencies = setup('allow', true, listBookmarkLocationsByUrl);

    const editor = await screen.findByRole('dialog', {
      name: 'Save current URL',
    });
    await user.click(
      within(editor).getByRole('button', { name: 'Save bookmark' }),
    );

    await waitFor(() =>
      expect(
        dependencies.bookmarkManager.createBookmark,
      ).toHaveBeenCalledOnce(),
    );
    expect(listBookmarkLocationsByUrl).not.toHaveBeenCalled();
  });
});

describe('SaveCurrentPagePopup folder loading', () => {
  const recentFolder = {
    createdAt: 20,
    id: '33333333-3333-4333-8333-333333333333',
    isRoot: false,
    parentId: rootId,
    profileId,
    title: 'Recent',
  };

  it('selects the newest non-Home folder after summaries load', async () => {
    setup(
      'allow',
      false,
      undefined,
      vi.fn(async () => [root, recentFolder]),
    );

    const editor = await screen.findByRole('dialog', {
      name: 'Save current URL',
    });
    expect(await within(editor).findByText('Stored in Recent.')).toBeVisible();
    expect(
      within(editor).getByRole('button', { name: 'Recent' }),
    ).toHaveAttribute('aria-current', 'true');
  });

  it('keeps Home usable and records a privacy-safe warning when the tree fails', async () => {
    const dependencies = setup(
      'allow',
      false,
      undefined,
      vi.fn(async () => {
        throw new Error('synthetic private folder title');
      }),
    );

    expect(
      await screen.findByText(
        'Other folders could not be loaded. This bookmark can still be saved to Home.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(dependencies.activityLog.record).toHaveBeenCalledWith(
      profileId,
      expect.objectContaining({
        eventCode: 'POPUP-FOLDER-TREE-LOAD-DEGRADED',
        level: 'WARN',
        message: 'Popup folder tree was unavailable. Home remains available.',
      }),
    );
    expect(
      JSON.stringify(dependencies.activityLog.record.mock.calls),
    ).not.toContain('synthetic private folder title');
  });

  it('retries a failed folder-tree load', async () => {
    const user = userEvent.setup();
    const loadFolderTree = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce([root, recentFolder]);
    setup('allow', false, undefined, loadFolderTree);

    await user.click(
      await screen.findByRole('button', { name: 'Retry loading folders' }),
    );

    expect(await screen.findByRole('button', { name: 'Recent' })).toBeVisible();
    expect(loadFolderTree).toHaveBeenCalledTimes(2);
  });

  it('saves without undo when undo initialization fails and records degradation', async () => {
    const user = userEvent.setup();
    const dependencies = setup(
      'allow',
      false,
      undefined,
      undefined,
      vi.fn(async () => false),
    );
    const editor = await screen.findByRole('dialog', {
      name: 'Save current URL',
    });

    await user.click(
      within(editor).getByRole('button', { name: 'Save bookmark' }),
    );

    await waitFor(() =>
      expect(
        dependencies.bookmarkManager.createBookmark,
      ).toHaveBeenCalledOnce(),
    );
    expect(dependencies.undoHistory.runMutation).not.toHaveBeenCalled();
    expect(dependencies.activityLog.record).toHaveBeenCalledWith(
      profileId,
      expect.objectContaining({
        eventCode: 'CURRENT-TAB-UNDO-HISTORY-DEGRADED',
        level: 'WARN',
      }),
    );
  });
});
