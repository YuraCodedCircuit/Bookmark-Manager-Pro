import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { defaultActivityLogSettings } from '../../application/activity-log/manage-activity-log';
import { BookmarkDisplaySettingsDialog } from './BookmarkDisplaySettingsDialog';

afterEach(cleanup);

const settings = {
  bookmarkView: 'list' as const,
  cardSize: 'small' as const,
  profileId: '258cc41e-0a85-4af3-8eb8-020d502e7501',
  theme: 'dark' as const,
};
const activityLogSettings = defaultActivityLogSettings(settings.profileId);

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
      'GeneralAppearanceLanguageBookmarksSearchProfilesActivityNotificationsImportExportBackupSecurityAccessibilityShortcutsAdvanced',
    );
    expect(within(categoryNavigation).getAllByRole('button')).toHaveLength(15);
    expect(categoryNavigation.querySelectorAll('button svg')).toHaveLength(15);
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
      within(categoryNavigation)
        .getByRole('button', { name: 'Advanced' })
        .querySelectorAll('ellipse'),
    ).toHaveLength(1);
    for (const category of ['Import', 'Export', 'Backup', 'Advanced']) {
      const button = within(categoryNavigation).getByRole('button', {
        name: category,
      });
      expect(button).toBeDisabled();
      expect(button).not.toHaveAttribute('aria-current');
    }
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
    expect(within(dialog).getByLabelText('Card size')).toHaveValue('small');
    expect(within(dialog).getByLabelText('Sort by')).toHaveValue('manual');
    expect(within(dialog).getByLabelText('Direction')).toBeDisabled();

    await user.selectOptions(within(dialog).getByLabelText('View'), 'details');
    await user.selectOptions(
      within(dialog).getByLabelText('Card size'),
      'large',
    );
    await user.selectOptions(within(dialog).getByLabelText('Theme'), 'light');
    await user.selectOptions(
      within(dialog).getByLabelText('Accent color'),
      'custom',
    );
    expect(
      within(dialog).getByLabelText('Custom accent color'),
    ).toHaveAttribute('type', 'color');
    await user.selectOptions(
      within(dialog).getByLabelText('Card spacing'),
      'compact',
    );
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
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        bookmarkView: 'details',
        cardSize: 'large',
        accentColorMode: 'custom',
        cardSpacing: 'compact',
        bookmarkSortBy: 'title',
        bookmarkSortDirection: 'descending',
        bookmarkGroupBy: 'type',
        scrollbarBehavior: 'always',
        theme: 'light',
      }),
    );
  });

  it('filters categories without saving and Cancel closes the window', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn(async () => undefined);
    render(
      <BookmarkDisplaySettingsDialog
        activityLogSettings={activityLogSettings}
        isOpen
        onClose={onClose}
        onSave={onSave}
        onSaveActivitySettings={vi.fn(async () => undefined)}
        profiles={[]}
        settings={settings}
        storageUsage={[]}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    await user.type(
      within(dialog).getByPlaceholderText('Search settings'),
      'not-a-category',
    );
    expect(
      within(dialog).getByRole('heading', { name: 'No settings found' }),
    ).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('keeps future data categories visible but unavailable', async () => {
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
    const importCategory = within(dialog).getByRole('button', {
      name: 'Import',
    });

    await user.click(importCategory);

    expect(importCategory).toBeDisabled();
    expect(general).toHaveAttribute('aria-current', 'page');
    expect(
      within(dialog).getByRole('heading', { name: 'General' }),
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

  it('saves animation and contrast preferences in Accessibility', async () => {
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
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        animationPreference: 'none',
        highContrast: true,
      }),
    );
  });

  it('saves file-manager drag and drop preferences in Bookmarks', async () => {
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
    await user.click(within(dialog).getByRole('button', { name: 'Bookmarks' }));
    expect(within(dialog).getByLabelText('Enable drag and drop')).toBeChecked();
    expect(within(dialog).getByLabelText('Duplicate handling')).toHaveValue(
      'allow',
    );
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
    await user.selectOptions(
      within(dialog).getByLabelText('Tag order'),
      'alphabetical',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmFolderDrop: true,
        dragAndDropEnabled: true,
        dropIntoFoldersEnabled: true,
        duplicateHandling: 'prevent',
        folderDropHoverDelay: 900,
        openFolderAfterDrop: true,
        tagOrder: 'alphabetical',
      }),
    );
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
    expect(
      within(dialog).getByLabelText('Application language'),
    ).toBeDisabled();
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
    expect(within(dialog).getByLabelText('Activity logs')).not.toBeChecked();
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

  it('saves notification placement, ordering, and stack preferences', async () => {
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
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationPreferences: {
          enabled: true,
          order: 'oldest',
          position: 'top-left',
          stackLimit: 6,
        },
      }),
    );
  });
});
