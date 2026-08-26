import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { HelpDialog } from './HelpDialog';

afterEach(cleanup);

describe('HelpDialog', () => {
  it('renders at least 50 FAQ answers and delegates the project link', async () => {
    const user = userEvent.setup();
    const onOpenExternalLink = vi.fn();
    render(
      <HelpDialog
        isOpen
        onClose={vi.fn()}
        onOpenExternalLink={onOpenExternalLink}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Help & FAQ' })).toBeVisible();
    expect(screen.getAllByRole('heading').length).toBeGreaterThanOrEqual(50);
    const projectLink = screen.getByRole('link', { name: 'GitHub' });
    expect(projectLink).toHaveAttribute(
      'href',
      'https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro',
    );
    await user.click(projectLink);
    expect(onOpenExternalLink).toHaveBeenCalledWith(
      'https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro',
    );
  });
});
