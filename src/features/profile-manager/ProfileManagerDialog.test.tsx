import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { ProfileManagerDialog } from './ProfileManagerDialog';

afterEach(cleanup);

describe('ProfileManagerDialog', () => {
  it('requests deletion without replacing the row actions inline', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => undefined);

    render(
      <ProfileManagerDialog
        isOpen
        language="en-US"
        onClose={vi.fn()}
        onCreate={vi.fn()}
        onDelete={onDelete}
        onDuplicate={vi.fn()}
        onUpdate={vi.fn()}
        profiles={[
          {
            bookmarkCount: 12,
            folderCount: 3,
            isActive: false,
            profile: {
              createdAt: 1,
              id: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
              updatedAt: 1,
              username: 'Deletable profile',
            },
          },
          {
            bookmarkCount: 0,
            folderCount: 0,
            isActive: true,
            profile: {
              createdAt: 2,
              id: '85923bcb-cfd7-45a4-bf10-12f6162cad44',
              updatedAt: 2,
              username: 'Active profile',
            },
          },
        ]}
      />,
    );

    const row = screen.getByText('Deletable profile').closest('article');
    if (!row) throw new Error('profile-row-not-found');
    await user.click(within(row).getByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith(
      'df6f88b6-10c7-43d7-b516-a063b77db6c6',
    );
    expect(
      within(row).queryByRole('button', { name: 'Confirm delete' }),
    ).not.toBeInTheDocument();
    expect(
      within(row).getByText('12 bookmarks · 3 folders'),
    ).toHaveAccessibleName('12 bookmarks, 3 folders');
    expect(
      within(row).queryByText('df6f88b6-10c7-43d7-b516-a063b77db6c6'),
    ).not.toBeInTheDocument();
    const activeRow = screen.getByText('Active profile').closest('article');
    if (!activeRow) throw new Error('active-profile-row-not-found');
    expect(
      within(activeRow).getByText('0 bookmarks · 0 folders'),
    ).toBeVisible();
  });

  it('removes an existing profile icon before saving an edit', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn(async () => undefined);

    render(
      <ProfileManagerDialog
        isOpen
        language="en-US"
        onClose={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        onUpdate={onUpdate}
        profiles={[
          {
            bookmarkCount: 0,
            folderCount: 0,
            isActive: true,
            profile: {
              createdAt: 1,
              icon: 'data:image/png;base64,aWNvbg==',
              id: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
              updatedAt: 1,
              username: 'Local profile',
            },
          },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeVisible();
    const removeImage = screen.getByRole('button', { name: 'Remove image' });
    expect(removeImage).toBeVisible();

    await user.click(removeImage);
    expect(
      screen.queryByRole('button', { name: 'Remove image' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onUpdate).toHaveBeenCalledWith(
      'df6f88b6-10c7-43d7-b516-a063b77db6c6',
      { icon: undefined, language: 'en-US', username: 'Local profile' },
    );
  });
});
