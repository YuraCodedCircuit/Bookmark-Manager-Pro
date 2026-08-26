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
    render(
      <ProfileMenuPanel
        initializationState={{
          profile: {
            createdAt: 1,
            id: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
            updatedAt: 1,
            username: 'Local user',
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
        onClose={vi.fn()}
        onManageProfiles={vi.fn()}
        onOpenAbout={vi.fn()}
        onOpenBookmarkActivityLog={vi.fn()}
        onOpenChangelog={vi.fn()}
        onOpenHelp={vi.fn()}
        onOpenLegal={vi.fn()}
        onOpenUndoHistory={vi.fn()}
        onOpenSettings={vi.fn()}
        onSwitchProfile={vi.fn()}
      />,
    );
    const menu = screen.getByRole('dialog', { name: 'Profile menu' });
    const enabled = within(menu).getByRole('button', { name: 'Settings' });
    const disabled = within(menu).getByRole('button', {
      name: 'ImportComing soon',
    });

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
        onOpenUndoHistory={vi.fn()}
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
  });
});
