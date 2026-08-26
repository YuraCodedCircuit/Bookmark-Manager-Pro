import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { LegalDialog } from './LegalDialog';

afterEach(cleanup);

describe('LegalDialog', () => {
  it('shows privacy first and switches between all bundled documents', async () => {
    const user = userEvent.setup();
    render(<LegalDialog isOpen onClose={vi.fn()} />);

    expect(
      screen.getByRole('heading', {
        name: 'Bookmark Manager Pro Privacy Policy',
      }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Terms of Use' }));
    expect(
      screen.getByRole('heading', {
        name: 'Bookmark Manager Pro Terms of Use',
      }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'App license' }));
    expect(
      screen.getByRole('heading', { name: 'GNU General Public License' }),
    ).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Third-party licenses' }),
    );
    expect(
      screen.getByRole('heading', {
        name: 'Third-party Licenses and Notices',
      }),
    ).toBeVisible();
  });
});
