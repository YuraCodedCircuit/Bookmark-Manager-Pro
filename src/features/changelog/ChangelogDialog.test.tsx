import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { ChangelogDialog } from './ChangelogDialog';

afterEach(cleanup);

describe('ChangelogDialog', () => {
  it('renders bundled Markdown and closes from its accessible control', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onOpenExternalLink = vi.fn();
    render(
      <ChangelogDialog
        isOpen
        onClose={onClose}
        onOpenExternalLink={onOpenExternalLink}
      />,
    );

    expect(screen.getByRole('heading', { name: 'What’s new' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Unreleased' })).toBeVisible();
    const developerChangelog = screen.getByRole('link', {
      name: 'developer changelog',
    });
    expect(developerChangelog).toHaveAttribute(
      'href',
      'https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro/blob/main/CHANGELOG_DEV.md',
    );
    await user.click(developerChangelog);
    expect(onOpenExternalLink).toHaveBeenCalledWith(
      'https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro/blob/main/CHANGELOG_DEV.md',
    );
    await user.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
