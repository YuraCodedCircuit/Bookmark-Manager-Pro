import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { ProfileSwitcherDialog } from './ProfileSwitcherDialog';

afterEach(cleanup);

describe('ProfileSwitcherDialog', () => {
  it('shows profile content counts without exposing the profile ID', () => {
    render(
      <ProfileSwitcherDialog
        isOpen
        onClose={vi.fn()}
        onSwitch={vi.fn()}
        profiles={[
          {
            bookmarkCount: 8,
            folderCount: 2,
            isActive: true,
            profile: {
              createdAt: 1,
              id: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
              updatedAt: 1,
              username: 'Local profile',
            },
          },
        ]}
      />,
    );

    expect(screen.getByText('8 bookmarks · 2 folders')).toHaveAccessibleName(
      '8 bookmarks, 2 folders',
    );
    expect(
      screen.queryByText('df6f88b6-10c7-43d7-b516-a063b77db6c6'),
    ).not.toBeInTheDocument();
  });
});
