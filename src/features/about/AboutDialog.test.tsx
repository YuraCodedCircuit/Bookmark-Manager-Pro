import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { AboutDialog } from './AboutDialog';

afterEach(cleanup);

describe('AboutDialog', () => {
  it('shows local application information and closes explicitly', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AboutDialog isOpen onClose={onClose} />);

    const dialog = screen.getByRole('dialog', {
      name: 'Bookmark Manager Pro',
    });
    expect(within(dialog).getByText('Application version')).toBeVisible();
    expect(within(dialog).getByText('Release status')).toBeVisible();
    expect(within(dialog).getByText('Alpha')).toBeVisible();
    expect(
      within(dialog).getByText('Copyright © 2026 YuraCodedCircuit'),
    ).toBeVisible();
    expect(dialog.querySelector('img')).toHaveAttribute('src', '/app-icon.png');

    const close = within(dialog).getByRole('button', { name: 'Close' });
    expect(close).toHaveFocus();
    await user.click(close);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
