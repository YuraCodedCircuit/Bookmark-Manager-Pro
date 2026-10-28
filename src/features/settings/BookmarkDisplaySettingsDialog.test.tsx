import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { defaultActivityLogSettings } from '../../application/activity-log/manage-activity-log';
import { BookmarkDisplaySettingsDialog } from './BookmarkDisplaySettingsDialog';
import { ToolbarSavedStatusPermissionDeniedError } from '../../platform/browser/toolbar-saved-status-error';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const settings = {
  bookmarkView: 'list' as const,
  cardSize: 'small' as const,
  profileId: '258cc41e-0a85-4af3-8eb8-020d502e7501',
  theme: 'dark' as const,
};
const activityLogSettings = defaultActivityLogSettings(settings.profileId);

function renderActivitySettings(
  onSaveActivitySettings = vi.fn(async (value: typeof activityLogSettings) => {
    void value;
  }),
  activityOnly = false,
) {
  const onClose = vi.fn();
  render(
    <BookmarkDisplaySettingsDialog
      activityOnly={activityOnly}
      activityLogSettings={activityLogSettings}
      initialCategory="activity"
      isOpen
      onClose={onClose}
      onSave={vi.fn(async () => undefined)}
      onSaveActivitySettings={onSaveActivitySettings}
      profiles={[]}
      settings={settings}
      storageUsage={[]}
    />,
  );
  return { onClose, onSaveActivitySettings };
}

describe('Activity recording settings', () => {
  it('restricts shortcut navigation and search to Activity', async () => {
    const user = userEvent.setup();
    const { onSaveActivitySettings } = renderActivitySettings(undefined, true);
    const navigation = screen.getByRole('navigation', {
      name: 'Settings categories',
    });
    expect(within(navigation).getAllByRole('button')).toHaveLength(1);
    expect(
      within(navigation).getByRole('button', { name: 'Activity' }),
    ).toHaveAttribute('aria-current', 'page');
    const search = screen.getByRole('searchbox', { name: 'Search settings' });
    await user.type(search, 'wallpaper');
    expect(
      screen.queryByRole('heading', { name: 'Appearance' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(within(navigation).getAllByRole('button')).toHaveLength(1);
    await user.clear(search);
    await user.type(search, 'retention');
    expect(screen.getByRole('heading', { name: 'Activity' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSaveActivitySettings).toHaveBeenCalledWith(activityLogSettings);
  });
  it('prevents saving settings that could not be loaded', () => {
    const save = vi.fn(async () => undefined);
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        activitySettingsAvailable={false}
        initialCategory="activity"
        isOpen
        onClose={vi.fn()}
        onSave={save}
        onSaveActivitySettings={save}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Activity settings are unavailable',
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(
      screen.queryByLabelText('Retention (records)'),
    ).not.toBeInTheDocument();
  });

  it('retains the draft after a failed save', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => {
      throw new Error('synthetic failure');
    });
    const { onClose } = renderActivitySettings(save);
    fireEvent.change(screen.getByLabelText('Retention (records)'), {
      target: { value: '500' },
    });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByLabelText('Retention (records)')).toHaveValue(500);
    expect(onClose).not.toHaveBeenCalled();
  });
  it('saves shared recording and retention options only on Save', async () => {
    const user = userEvent.setup();
    const { onSaveActivitySettings } = renderActivitySettings();
    expect(screen.getByRole('group', { name: 'This profile' })).toBeVisible();
    expect(
      screen.getByRole('group', { name: 'Shared activity log' }),
    ).toBeVisible();
    await user.clear(screen.getByLabelText('Retention (records)'));
    await user.type(screen.getByLabelText('Retention (records)'), '500');
    await user.click(screen.getByLabelText('Enable the log service'));
    await user.click(screen.getByLabelText('Record diagnostics'));
    await user.selectOptions(
      screen.getByLabelText('Minimum recording level'),
      'ERROR',
    );
    const categories = screen.getByRole('group', {
      name: 'Recorded categories',
    });
    await user.click(within(categories).getByLabelText('Notes'));
    expect(onSaveActivitySettings).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSaveActivitySettings).toHaveBeenCalledWith({
      ...activityLogSettings,
      enabled: false,
      diagnosticsEnabled: false,
      minimumLevel: 'ERROR',
      retentionCount: 500,
      enabledCategories: ['Application', 'Bookmarks', 'Profiles'],
    });
  });

  it('discards edits when canceled', async () => {
    const user = userEvent.setup();
    const { onSaveActivitySettings, onClose } = renderActivitySettings();
    await user.click(screen.getByLabelText('Record diagnostics'));
    expect(
      screen.queryByRole('button', { name: 'Reset settings' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onSaveActivitySettings).not.toHaveBeenCalled();
  });

  it('validates limits before saving and preserves the edited gate', async () => {
    const user = userEvent.setup();
    const { onSaveActivitySettings } = renderActivitySettings();
    fireEvent.change(screen.getByLabelText('Retention (records)'), {
      target: { value: '99' },
    });
    expect(screen.getByLabelText('Retention (records)')).toBeInvalid();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSaveActivitySettings).not.toHaveBeenCalled();
    await user.click(screen.getByLabelText('Enable the log service'));
    expect(screen.getByLabelText('Enable the log service')).not.toBeChecked();
    fireEvent.change(screen.getByLabelText('Retention (records)'), {
      target: { value: '10000' },
    });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSaveActivitySettings).toHaveBeenCalledWith({
      ...activityLogSettings,
      enabled: false,
    });
  });
});

describe('BookmarkDisplaySettingsDialog', () => {
  it('moves bookmark display to Appearance and saves it', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(
      within(dialog).getByRole('navigation', { name: 'Settings categories' }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole('button', { name: 'General' }),
    ).toHaveAttribute('aria-current', 'page');
    const categoryNavigation = within(dialog).getByRole('navigation', {
      name: 'Settings categories',
    });
    expect(categoryNavigation).toHaveTextContent(
      'GeneralAppearanceLanguageBookmarksSearchProfilesActivityNotificationsImportExportBackupSecurityAccessibilityShortcuts',
    );
    expect(within(categoryNavigation).getAllByRole('button')).toHaveLength(14);
    expect(categoryNavigation.querySelectorAll('button svg')).toHaveLength(14);
    expect(
      within(categoryNavigation)
        .getByRole('button', { name: 'General' })
        .querySelectorAll('circle'),
    ).toHaveLength(3);
    expect(
      within(categoryNavigation)
        .getByRole('button', { name: 'Appearance' })
        .querySelectorAll('circle'),
    ).toHaveLength(4);
    expect(
      within(categoryNavigation)
        .getByRole('button', { name: 'Accessibility' })
        .querySelectorAll('circle'),
    ).toHaveLength(2);
    expect(
      within(categoryNavigation).queryByRole('button', { name: 'Advanced' }),
    ).not.toBeInTheDocument();
    expect(
      within(categoryNavigation).getByRole('button', { name: 'Backup' }),
    ).toBeEnabled();
    expect(
      dialog.querySelector('.settings-dialog__sidebar-footer'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Made with ❤️ and magic'),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('heading', { name: 'Settings' }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Startup location')).toHaveValue(
      'home',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Appearance' }),
    );
    expect(within(dialog).getByLabelText('Theme')).toHaveValue('dark');
    expect(within(dialog).getByLabelText('Accent color')).toHaveValue('system');
    expect(within(dialog).getByLabelText('Scrollbars')).toHaveValue(
      'scrolling',
    );
    expect(within(dialog).getByLabelText('View')).toHaveValue('list');
    const cardSize = within(dialog).getByLabelText('Card size');
    const cardSpacing = within(dialog).getByLabelText('Card spacing');
    expect(cardSize).toHaveValue('small');
    expect(cardSpacing).toHaveValue('comfortable');
    expect(cardSize).toBeDisabled();
    expect(cardSpacing).toBeDisabled();
    expect(within(dialog).getByLabelText('Sort by')).toHaveValue('manual');
    expect(within(dialog).getByLabelText('Direction')).toBeDisabled();
    expect(
      within(dialog).getByRole('group', { name: 'Folder background' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('group', { name: 'Navigation panel' }),
    ).toBeInTheDocument();
    const largeWallpaperImports = within(dialog).getByLabelText(
      'Allow larger background images',
    );
    expect(largeWallpaperImports).not.toBeChecked();
    const hideEmptyDetailsHeader = within(dialog).getByLabelText(
      'Hide the Details table header when the folder is empty',
    );
    expect(hideEmptyDetailsHeader).toBeChecked();
    const largeWallpaperLabel = largeWallpaperImports.closest('label');
    expect(largeWallpaperLabel?.nextElementSibling).toHaveClass(
      'settings-dialog__help',
    );
    expect(
      largeWallpaperLabel?.nextElementSibling?.nextElementSibling,
    ).toContainElement(hideEmptyDetailsHeader);

    await user.selectOptions(within(dialog).getByLabelText('View'), 'card');
    expect(cardSize).toBeEnabled();
    expect(cardSpacing).toBeEnabled();
    await user.selectOptions(cardSize, 'large');
    await user.selectOptions(within(dialog).getByLabelText('Theme'), 'light');
    await user.selectOptions(
      within(dialog).getByLabelText('Accent color'),
      'custom',
    );
    expect(
      within(dialog).getByLabelText('Custom accent color'),
    ).toHaveAttribute('type', 'color');
    await user.selectOptions(cardSpacing, 'compact');
    await user.selectOptions(within(dialog).getByLabelText('View'), 'details');
    expect(
      within(dialog).getByLabelText('Default Details column order'),
    ).toHaveValue('title');
    await user.click(within(dialog).getByRole('button', { name: 'Move left' }));
    expect(cardSize).toBeDisabled();
    expect(cardSpacing).toBeDisabled();
    await user.selectOptions(within(dialog).getByLabelText('Sort by'), 'title');
    await user.selectOptions(
      within(dialog).getByLabelText('Direction'),
      'descending',
    );
    await user.selectOptions(
      within(dialog).getByLabelText('Group bookmarks by'),
      'type',
    );
    await user.selectOptions(
      within(dialog).getByLabelText('Scrollbars'),
      'always',
    );
    await user.click(largeWallpaperImports);
    await user.click(hideEmptyDetailsHeader);
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        bookmarkView: 'details',
        allowLargeWallpaperImports: true,
        defaultFolderBackgroundAppearance: {
          colors: ['#2f80c9', '#185a82', '#0b1f3a'],
          direction: 135,
          kind: 'gradient',
        },
        defaultFolderDetailsTableTransparency: 0,
        defaultFolderIncludeNavigationBackground: true,
        defaultFolderNavigationTransparency: 70,
        cardSize: 'large',
        accentColorMode: 'custom',
        cardSpacing: 'compact',
        bookmarkSortBy: 'title',
        bookmarkSortDirection: 'descending',
        bookmarkGroupBy: 'type',
        detailsColumnOrder: ['title', 'appearance', 'url', 'updatedAt', 'type'],
        hideEmptyDetailsTableHeader: false,
        scrollbarBehavior: 'always',
        theme: 'light',
      }),
    );
  }, 10_000);

  it('uses segmented background choices and generates random defaults', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    await user.click(
      within(dialog).getByRole('button', { name: 'Appearance' }),
    );
    const background = within(dialog).getByRole('group', {
      name: 'Folder background',
    });

    expect(within(background).getAllByRole('radio')).toHaveLength(4);
    await user.click(within(background).getByRole('radio', { name: 'Color' }));
    await user.click(
      within(background).getByRole('button', {
        name: 'Generate random color',
      }),
    );
    expect(within(background).getByLabelText('Background color')).toHaveValue(
      '#800000',
    );

    await user.click(
      within(background).getByRole('radio', { name: 'Gradient' }),
    );
    await user.click(
      within(background).getByRole('button', {
        name: 'Generate random gradient',
      }),
    );
    expect(
      within(background).getByText(/Random gradient generated/),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultFolderBackgroundAppearance: {
          colors: ['#800000', '#800000', '#800000'],
          direction: 180,
          kind: 'gradient',
        },
      }),
    );
  });

  it('keeps categories visible, disables nonmatches, and restores availability on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn(async () => undefined);
    const onOpenExternalLink = vi.fn();
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={onClose}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        onOpenExternalLink={onOpenExternalLink}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    const navigation = within(dialog).getByRole('navigation', {
      name: 'Settings categories',
    });
    const search = within(dialog).getByPlaceholderText('Search settings');
    await user.type(search, 'not-a-category');
    expect(within(navigation).getAllByRole('button')).toHaveLength(14);
    for (const category of within(navigation).getAllByRole('button'))
      expect(category).toBeDisabled();
    expect(
      within(dialog).getByRole('heading', { name: 'No settings found' }),
    ).toBeVisible();
    const suggestion = within(dialog).getByRole('link', {
      name: 'Suggest a feature.',
    });
    expect(suggestion).toHaveAttribute(
      'href',
      'https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro/issues/new',
    );
    expect(suggestion.closest('p')).toHaveTextContent(
      "Can't find the option you need? Suggest a feature. Opens GitHub, where you can suggest a new option.",
    );
    await user.click(suggestion);
    expect(onOpenExternalLink).toHaveBeenCalledWith(
      'https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro/issues/new',
    );
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.click(search);
    await user.keyboard('{Escape}');
    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
    expect(
      within(navigation).getByRole('button', { name: 'General' }),
    ).toBeEnabled();
    expect(
      within(navigation).getByRole('button', { name: 'Import' }),
    ).toBeEnabled();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('matches category content and marks only available matching categories', async () => {
    const user = userEvent.setup();
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn(async () => undefined)}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    const navigation = within(dialog).getByRole('navigation', {
      name: 'Settings categories',
    });

    await user.type(
      within(dialog).getByPlaceholderText('Search settings'),
      'duplicate handling',
    );

    const bookmarks = within(navigation).getByRole('button', {
      name: 'Bookmarks. Contains a search match',
    });
    expect(bookmarks).toBeEnabled();
    expect(bookmarks).toHaveAttribute('aria-current', 'page');
    expect(
      bookmarks.querySelector('.settings-dialog__match-dot'),
    ).toBeInTheDocument();
    expect(
      within(navigation).getByRole('button', { name: 'General' }),
    ).toBeDisabled();
    expect(
      within(navigation).getByRole('button', { name: 'Import' }),
    ).toBeDisabled();
    expect(within(navigation).getAllByRole('button')).toHaveLength(14);
    expect(
      within(dialog).getByRole('heading', { name: 'Bookmarks' }),
    ).toBeVisible();
    expect(within(dialog).getByText('Duplicate handling')).toBeVisible();
  });

  it('highlights a matching phrase in the currently displayed select choice', async () => {
    const user = userEvent.setup();
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn(async () => undefined)}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });

    await user.type(
      within(dialog).getByPlaceholderText('Search settings'),
      'bookmarks',
    );

    const choice = within(dialog).getByRole('combobox', {
      name: 'Opening behavior',
    });
    expect(choice).toHaveAttribute('data-settings-choice-highlight', 'true');
    expect(
      dialog.querySelector('.settings-dialog__choice-highlight mark'),
    ).toHaveTextContent('bookmarks');
  });

  it('enables Export while keeping Advanced hidden', async () => {
    const user = userEvent.setup();
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn(async () => undefined)}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    const general = within(dialog).getByRole('button', { name: 'General' });
    const exportCategory = within(dialog).getByRole('button', {
      name: 'Export',
    });

    await user.click(exportCategory);

    expect(exportCategory).toBeEnabled();
    expect(exportCategory).toHaveAttribute('aria-current', 'page');
    expect(general).not.toHaveAttribute('aria-current');
    expect(
      within(dialog).queryByRole('button', { name: 'Advanced' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole('heading', { name: 'Export' }),
    ).toBeVisible();
  });

  it('saves the Activity log-service master switch independently', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    const onSaveActivitySettings = vi.fn(async () => undefined);
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        onSaveActivitySettings={onSaveActivitySettings}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });

    await user.click(within(dialog).getByRole('button', { name: 'Activity' }));
    const enabled = within(dialog).getByLabelText('Enable the log service');
    expect(enabled).toBeChecked();
    await user.click(enabled);
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(onSaveActivitySettings).toHaveBeenCalledWith({
      ...activityLogSettings,
      enabled: false,
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves external-link confirmation in Security', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });

    await user.click(within(dialog).getByRole('button', { name: 'Security' }));
    await user.click(
      within(dialog).getByLabelText('Confirm before opening external links'),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ confirmExternalLinks: true }),
    );
  });

  it('saves animation, contrast, and Details control preferences in Accessibility', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });

    await user.click(
      within(dialog).getByRole('button', { name: 'Accessibility' }),
    );
    await user.selectOptions(
      within(dialog).getByLabelText('Animations'),
      'none',
    );
    await user.click(within(dialog).getByLabelText('Use high-contrast mode'));
    await user.click(
      within(dialog).getByLabelText('Show Details column reordering controls'),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        animationPreference: 'none',
        highContrast: true,
        showDetailsColumnReorderControls: true,
      }),
    );
  });

  it('saves file-manager drag and drop preferences in Bookmarks', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    const onRequestToolbarSavedStatusPermission = vi.fn(async () => undefined);
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        onRequestToolbarSavedStatusPermission={
          onRequestToolbarSavedStatusPermission
        }
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    await user.click(within(dialog).getByRole('button', { name: 'Bookmarks' }));
    expect(within(dialog).getByLabelText('Enable drag and drop')).toBeChecked();
    expect(within(dialog).getByLabelText('Duplicate handling')).toHaveValue(
      'allow',
    );
    const autoCrop = within(dialog).getByLabelText(
      'Automatically crop popup screenshots to Card',
    );
    expect(autoCrop).not.toBeChecked();
    expect(autoCrop).toHaveAccessibleDescription(
      /original remains available for editing until the bookmark is saved/i,
    );
    const permissionButton = within(dialog).getByRole('button', {
      name: 'Allow tab access',
    });
    expect(permissionButton).toHaveAccessibleDescription(
      /optional access to tab addresses is required/i,
    );
    expect(
      within(dialog).queryByLabelText('Show saved status on the toolbar'),
    ).not.toBeInTheDocument();
    const protocolSetting = within(dialog).getByLabelText(
      'Missing web protocol',
    );
    expect(protocolSetting).toHaveValue('ask');
    expect(within(protocolSetting).getAllByRole('option')).toHaveLength(2);
    expect(
      within(protocolSetting).queryByRole('option', {
        name: 'Do not add a protocol',
      }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Folder hover delay')).toHaveValue(
      '600',
    );
    await user.selectOptions(
      within(dialog).getByLabelText('Folder hover delay'),
      '900',
    );
    await user.click(
      within(dialog).getByLabelText(
        'Confirm before moving an item into a folder',
      ),
    );
    await user.selectOptions(
      within(dialog).getByLabelText('After moving an item'),
      'open',
    );
    await user.selectOptions(
      within(dialog).getByLabelText('Duplicate handling'),
      'prevent',
    );
    await user.click(autoCrop);
    await user.click(permissionButton);
    expect(onRequestToolbarSavedStatusPermission).toHaveBeenCalledOnce();
    expect(
      within(dialog).getByLabelText('Show saved status on the toolbar'),
    ).toBeChecked();
    await user.selectOptions(
      within(dialog).getByLabelText('Tag order'),
      'alphabetical',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmFolderDrop: true,
        autoCropPopupScreenshots: true,
        dragAndDropEnabled: true,
        dropIntoFoldersEnabled: true,
        duplicateHandling: 'prevent',
        showSavedStatusOnToolbar: true,
        folderDropHoverDelay: 900,
        openFolderAfterDrop: true,
        tagOrder: 'alphabetical',
      }),
    );
  });

  it('keeps Settings open and explains denied toolbar permission', async () => {
    const user = userEvent.setup();
    const onRequestToolbarSavedStatusPermission = vi.fn(async () => {
      throw new ToolbarSavedStatusPermissionDeniedError();
    });
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn(async () => undefined)}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        onRequestToolbarSavedStatusPermission={
          onRequestToolbarSavedStatusPermission
        }
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    await user.click(within(dialog).getByRole('button', { name: 'Bookmarks' }));
    await user.click(
      within(dialog).getByRole('button', { name: 'Allow tab access' }),
    );

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Tab-address access was not granted. The toolbar saved-status setting was not changed.',
    );
    expect(onRequestToolbarSavedStatusPermission).toHaveBeenCalledOnce();
    expect(
      within(dialog).queryByLabelText('Show saved status on the toolbar'),
    ).not.toBeInTheDocument();
    expect(dialog).toBeVisible();
  });

  it('saves the available Language preferences', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    await user.click(within(dialog).getByRole('button', { name: 'Language' }));
    const applicationLanguage = within(dialog).getByLabelText(
      'Application language',
    );
    expect(applicationLanguage).toBeDisabled();
    expect(
      within(applicationLanguage).getByRole('option', {
        name: 'English (United States)',
      }),
    ).toHaveValue('en-US');
    await user.selectOptions(
      within(dialog).getByLabelText('Date and time format'),
      'iso',
    );
    await user.selectOptions(
      within(dialog).getByLabelText('First day of the week'),
      'monday',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        dateTimeFormat: 'iso',
        firstDayOfWeek: 'monday',
        language: 'en-US',
      }),
    );
  });

  it('saves durable defaults from the Search category', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    await user.click(within(dialog).getByRole('button', { name: 'Search' }));

    await user.selectOptions(
      within(dialog).getByLabelText('Match method'),
      'exact',
    );
    await user.selectOptions(
      within(dialog).getByLabelText('Item type'),
      'folder',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        searchPreferences: expect.objectContaining({
          itemType: 'folder',
          match: 'exact',
        }),
      }),
    );
  });

  it('saves General startup and opening defaults', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    const startupLocation = within(dialog).getByLabelText('Startup location');
    expect(startupLocation.closest('label')).not.toHaveClass(
      'settings-checkbox-row',
    );
    expect(
      within(dialog).getByLabelText('Opening behavior').closest('label'),
    ).not.toHaveClass('settings-checkbox-row');
    expect(
      within(dialog).getByLabelText('Folder opening').closest('label'),
    ).not.toHaveClass('settings-checkbox-row');
    expect(within(startupLocation).getAllByRole('option')).toHaveLength(2);
    expect(within(startupLocation).queryByText(/selected folder/i)).toBeNull();
    await user.selectOptions(startupLocation, 'last');
    await user.selectOptions(
      within(dialog).getByLabelText('Opening behavior'),
      'new-tab',
    );
    await user.selectOptions(
      within(dialog).getByLabelText('Folder opening'),
      'double-click',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        bookmarkOpening: 'new-tab',
        folderOpening: 'double-click',
        startupLocation: 'last',
      }),
    );
  });

  it('shows storage estimates and saves Profiles category defaults', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        profiles={[
          {
            isActive: true,
            profile: {
              createdAt: 1,
              id: settings.profileId,
              updatedAt: 1,
              username: 'Primary',
            },
          },
        ]}
        settings={settings}
        storageUsage={[{ profileId: settings.profileId, sizeBytes: 2048 }]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    await user.click(within(dialog).getByRole('button', { name: 'Profiles' }));

    expect(
      within(dialog).getByRole('img', {
        name: 'Estimated profile storage total: 2 KB',
      }),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole('button', { name: 'Show profile sizes' }),
    );
    expect(within(dialog).getByText('Primary')).toBeVisible();
    expect(
      within(dialog).queryByLabelText('Activity logs'),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByLabelText('Bookmarks and folders'),
    ).toBeChecked();
    await user.click(within(dialog).getByLabelText('Unlimited profiles'));
    await user.clear(within(dialog).getByLabelText('Maximum profiles'));
    await user.type(within(dialog).getByLabelText('Maximum profiles'), '8');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        profilePreferences: expect.objectContaining({
          duplicateActivityLogs: false,
          duplicateBookmarks: true,
          maximumProfiles: 8,
          startupProfileMode: 'active',
        }),
      }),
    );
  });

  it('saves notification placement, ordering, stack, and line color preferences', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    await user.click(
      within(dialog).getByRole('button', { name: 'Notifications' }),
    );
    expect(within(dialog).getByLabelText('Enable notifications')).toBeChecked();
    await user.selectOptions(
      within(dialog).getByLabelText('Position'),
      'top-left',
    );
    await user.selectOptions(
      within(dialog).getByLabelText('Stack order'),
      'oldest',
    );
    await user.selectOptions(
      within(dialog).getByLabelText('Visible notifications'),
      '6',
    );
    const lineColor = within(dialog).getByLabelText('Countdown line color');
    expect(lineColor).toBeDisabled();
    await user.click(within(dialog).getByLabelText('Use app foreground color'));
    expect(lineColor).toBeEnabled();
    fireEvent.change(lineColor, { target: { value: '#4a90e2' } });
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationPreferences: {
          countdownLineColor: '#4a90e2',
          enabled: true,
          order: 'oldest',
          position: 'top-left',
          stackLimit: 6,
        },
      }),
    );
  });
  it('edits CSV export columns, restores defaults, and saves ordered profile preferences', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => {})}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
        initialCategory="export"
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(
      within(dialog).getByRole('checkbox', { name: 'URL' }),
    ).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox', { name: 'Note' }));
    await user.click(
      within(dialog).getByRole('button', { name: 'Move URL up' }),
    );
    expect(
      within(dialog).getByRole('textbox', { name: 'Header preview' }),
    ).toHaveValue('Profile ID,Profile,Folder path,URL,Title,Tags');
    expect(onSave).not.toHaveBeenCalled();
    await user.click(
      within(dialog).getByRole('button', { name: 'Restore defaults' }),
    );
    expect(
      within(dialog).getByRole('checkbox', { name: 'Note' }),
    ).toBeChecked();
    await user.click(within(dialog).getByRole('checkbox', { name: 'Note' }));
    await user.click(
      within(dialog).getByRole('button', { name: 'Move URL up' }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        exportPreferences: {
          csvColumnOrder: [
            'profileId',
            'profile',
            'folderPath',
            'url',
            'title',
            'tags',
            'note',
          ],
          csvEnabledColumns: [
            'profileId',
            'profile',
            'folderPath',
            'title',
            'url',
            'tags',
          ],
        },
      }),
    );
  });
  it('enables Import and saves its three off-by-default preferences for the current profile', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => {})}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    await user.click(within(dialog).getByRole('button', { name: 'Import' }));
    for (const label of [
      'Automatically open item review',
      'Remember destination folder',
      'Close Import after success',
    ]) {
      const option = within(dialog).getByRole('checkbox', {
        name: label,
      });
      expect(option).not.toBeChecked();
      await user.click(option);
    }
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: settings.profileId,
        importPreferences: {
          autoOpenReview: true,
          rememberDestination: true,
          closeAfterSuccess: true,
          rememberedFolders: {},
        },
      }),
    );
  });
  it.each([true, false])(
    'edits the shared snapshot-before-import preference from Import without changing the automatic setting (%s)',
    async (automaticEnabled) => {
      const user = userEvent.setup();
      const onSave = vi.fn(async () => {});
      render(
        <BookmarkDisplaySettingsDialog
          activityLogSettings={activityLogSettings}
          isOpen
          onClose={vi.fn()}
          onSave={onSave}
          onSaveActivitySettings={vi.fn(async () => {})}
          profiles={[]}
          settings={{
            ...settings,
            backupPreferences: {
              automaticEnabled,
              beforeImport: true,
              beforeDatabaseUpgrade: false,
              beforeProfileReset: true,
              beforeSynchronization: false,
              retentionPerTrigger: 10,
            },
          }}
          storageUsage={[]}
          initialCategory="import"
        />,
      );
      const dialog = screen.getByRole('dialog', { name: 'Settings' });
      const option = within(dialog).getByRole('checkbox', {
        name: 'Create a snapshot before importing',
      });
      expect(option).toBeChecked();
      await user.click(option);
      await user.click(within(dialog).getByRole('button', { name: 'Save' }));
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          backupPreferences: {
            automaticEnabled,
            beforeImport: false,
            beforeDatabaseUpgrade: false,
            beforeProfileReset: true,
            beforeSynchronization: false,
            retentionPerTrigger: 10,
          },
        }),
      );
    },
  );
  it('exposes the Import backup trigger and preserves hidden backup preferences', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => {})}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
        initialCategory="backup"
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    const option = within(dialog).getByRole('checkbox', {
      name: 'Import',
    });
    expect(option).toBeChecked();
    await user.click(option);
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        backupPreferences: expect.objectContaining({
          beforeImport: false,
          beforeDatabaseUpgrade: true,
          beforeProfileReset: true,
        }),
      }),
    );
  });
});
