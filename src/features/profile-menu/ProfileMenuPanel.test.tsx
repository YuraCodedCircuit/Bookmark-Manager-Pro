import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { ProfileMenuPanel } from './ProfileMenuPanel';

afterEach(cleanup);

describe('ProfileMenuPanel', () => {
  it('highlights enabled commands only while the mouse is over them', () => {
    const profileName = 'ProfileNameWithoutSpaces'.repeat(3);
    const onClose = vi.fn();
    const onOpenSynchronization = vi.fn();
    const onOpenSearch = vi.fn();
    const onOpenExport = vi.fn();
    render(
      <ProfileMenuPanel
        initializationState={{
          profile: {
            createdAt: 1,
            id: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
            updatedAt: 1,
            username: profileName,
          },
          settings: {
            bookmarkView: 'card',
            cardSize: 'medium',
            language: 'en-US',
            profileId: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
            theme: 'dark',
          },
          status: 'ready',
          theme: 'dark',
        }}
        isOpen
        onAfterClose={vi.fn()}
        onClose={onClose}
        onManageProfiles={vi.fn()}
        onOpenAbout={vi.fn()}
        onOpenBookmarkActivityLog={vi.fn()}
        onOpenChangelog={vi.fn()}
        onOpenHelp={vi.fn()}
        onOpenLegal={vi.fn()}
        onOpenNotes={vi.fn()}
        onOpenPasswordGenerator={vi.fn()}
        onOpenSearch={onOpenSearch}
        onOpenExport={onOpenExport}
        onOpenUndoHistory={vi.fn()}
        onOpenSynchronization={onOpenSynchronization}
        onOpenSettings={vi.fn()}
        onSwitchProfile={vi.fn()}
      />,
    );
    const menu = screen.getByRole('dialog', { name: 'Profile menu' });
    const name = within(menu).getByText(profileName, { selector: 'strong' });
    const fullName = within(menu).getByText(profileName, {
      selector: '.profile-menu__full-name',
    });
    expect(name).toHaveAttribute('tabindex', '0');
    expect(fullName).not.toBeVisible();
    Object.defineProperties(name, {
      clientHeight: { configurable: true, value: 44 },
      scrollHeight: { configurable: true, value: 44 },
    });
    fireEvent.mouseEnter(name.parentElement!);
    expect(fullName).not.toBeVisible();
    fireEvent.focus(name);
    expect(fullName).not.toBeVisible();
    Object.defineProperty(name, 'scrollHeight', {
      configurable: true,
      value: 88,
    });
    fireEvent.mouseEnter(name.parentElement!);
    expect(fullName).toBeVisible();
    fireEvent.mouseLeave(name.parentElement!);
    expect(fullName).not.toBeVisible();
    fireEvent.focus(name);
    expect(fullName).toBeVisible();
    fireEvent.keyDown(name, { key: 'Escape' });
    expect(fullName).not.toBeVisible();
    expect(onClose).not.toHaveBeenCalled();
    expect(name).toHaveTextContent(profileName);
    const synchronization = within(menu).getByRole('button', {
      name: 'Bookmark synchronization',
    });
    expect(synchronization.previousElementSibling).toHaveTextContent('Backup');
    fireEvent.click(synchronization);
    expect(onOpenSynchronization).toHaveBeenCalledOnce();
    fireEvent.click(within(menu).getByRole('button', { name: 'Export' }));
    expect(onOpenExport).toHaveBeenCalledOnce();
    const enabled = within(menu).getByRole('button', { name: 'Settings' });
    expect(within(menu).getByRole('button', { name: 'Notes' })).toBeEnabled();
    const disabled = within(menu).getByRole('button', {
      name: 'ImportComing soon',
    });
    const commands = within(menu)
      .getAllByRole('button')
      .filter((button) => !button.getAttribute('aria-label'));
    expect(commands).toHaveLength(16);
    commands.forEach((command) => {
      expect(command.querySelector('svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    });
    expect(
      within(menu).getByRole('button', { name: 'Settings' }),
    ).toContainHTML('<circle');
    const search = within(menu).getByRole('button', { name: 'Search' });
    expect(search.parentElement?.firstElementChild).toBe(search);
    fireEvent.click(search);
    expect(onOpenSearch).toHaveBeenCalledOnce();
    expect(within(menu).getByRole('button', { name: 'Backup' })).toContainHTML(
      '<ellipse',
    );
    expect(
      within(menu).getByRole('button', { name: 'Undo and redo history' }),
    ).toContainHTML('M5.3 7.2');
    expect(
      within(menu).getByRole('button', { name: 'Bookmark activity log' }),
    ).toHaveTextContent('LOG');
    expect(
      within(menu).getByRole('button', { name: /^What/ }),
    ).toHaveTextContent('NEW');

    fireEvent.mouseEnter(enabled);
    expect(enabled).toHaveAttribute('data-highlighted', 'true');
    fireEvent.mouseLeave(enabled);
    expect(enabled).not.toHaveAttribute('data-highlighted');

    fireEvent.mouseEnter(disabled);
    expect(disabled).not.toHaveAttribute('data-highlighted');
  });

  it('shows information destinations and opens the changelog command', () => {
    const onOpenChangelog = vi.fn();
    const onOpenHelp = vi.fn();
    const onOpenLegal = vi.fn();
    render(
      <ProfileMenuPanel
        initializationState={{ status: 'first-run', theme: 'dark' }}
        isOpen
        onAfterClose={vi.fn()}
        onClose={vi.fn()}
        onManageProfiles={vi.fn()}
        onOpenAbout={vi.fn()}
        onOpenBookmarkActivityLog={vi.fn()}
        onOpenChangelog={onOpenChangelog}
        onOpenHelp={onOpenHelp}
        onOpenLegal={onOpenLegal}
        onOpenNotes={vi.fn()}
        onOpenPasswordGenerator={vi.fn()}
        onOpenSearch={vi.fn()}
        onOpenUndoHistory={vi.fn()}
        onOpenSynchronization={vi.fn()}
        onOpenSettings={vi.fn()}
        onSwitchProfile={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'What’s new' }));
    expect(onOpenChangelog).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Help & FAQ' }));
    expect(onOpenHelp).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Legal & privacy' }));
    expect(onOpenLegal).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', { name: 'NotesComing soon' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'SearchComing soon' }),
    ).toBeDisabled();
  });
});
