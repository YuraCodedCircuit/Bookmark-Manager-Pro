import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { AboutDialog } from './AboutDialog';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AboutDialog', () => {
  it('shows local application information and closes explicitly', async () => {
    const onClose = vi.fn();
    const onOpenExternalLink = vi.fn();
    const user = userEvent.setup();
    render(
      <AboutDialog
        isOpen
        onClose={onClose}
        onOpenExternalLink={onOpenExternalLink}
      />,
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Bookmark Manager Pro',
    });
    expect(within(dialog).getByText('Application version')).toBeVisible();
    expect(within(dialog).getByText('Release status')).toBeVisible();
    expect(within(dialog).getByText('Alpha')).toBeVisible();
    expect(dialog.querySelector('.about-window__footer')).toHaveTextContent(
      'Copyright © 2026 YuraCodedCircuit',
    );
    expect(
      within(dialog).getByRole('link', { name: 'YuraCodedCircuit' }),
    ).toHaveAttribute(
      'href',
      'https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro',
    );
    expect(within(dialog).queryByText(/^Review on /)).not.toBeInTheDocument();
    expect(dialog.querySelector('img')).toHaveAttribute('src', '/app-icon.png');

    const close = within(dialog).getByRole('button', { name: 'Close' });
    expect(close).toHaveFocus();
    await user.click(close);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each([
    [
      'Firefox/140.0',
      'Review on Firefox Add-ons',
      'https://addons.mozilla.org/en-US/firefox/addon/bookmark-manager-pro/',
    ],
    [
      'Chrome/140.0.0 Edg/140.0.2',
      'Review on Microsoft Edge Add-ons',
      'https://microsoftedge.microsoft.com/addons/detail/bookmark-manager-pro/kicpilbdojnnoemoeihibebccijpbidh',
    ],
  ])(
    'shows and delegates the matching browser review link',
    async (userAgent, label, url) => {
      vi.stubGlobal('navigator', { userAgent });
      const onOpenExternalLink = vi.fn();
      const user = userEvent.setup();
      render(
        <AboutDialog
          isOpen
          onClose={vi.fn()}
          onOpenExternalLink={onOpenExternalLink}
        />,
      );

      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('href', url);
      await user.click(link);
      expect(onOpenExternalLink).toHaveBeenCalledWith(url);
    },
  );

  it('delegates the project link through safe external navigation', async () => {
    const onOpenExternalLink = vi.fn();
    const user = userEvent.setup();
    render(
      <AboutDialog
        isOpen
        onClose={vi.fn()}
        onOpenExternalLink={onOpenExternalLink}
      />,
    );

    await user.click(screen.getByRole('link', { name: 'YuraCodedCircuit' }));
    expect(onOpenExternalLink).toHaveBeenCalledWith(
      'https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro',
    );
  });
});
