import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { defaultSearchPreferences } from '../../domain/bookmark-search';
import { SearchDialog } from './SearchDialog';

afterEach(cleanup);

describe('SearchDialog', () => {
  it('searches while typing and exposes bookmark options', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onOpenResult = vi.fn();
    const props = {
      activeProfileId: '11111111-1111-4111-8111-111111111111',
      bookmarkOpening: 'new-tab' as const,
      currentFolderId: '22222222-2222-4222-8222-222222222222',
      initialPreferences: defaultSearchPreferences,
      isLoading: false,
      loadFailed: false,
      onClose,
      onOpenResult,
      onWebSearch: vi.fn(),
      onWebUnavailable: vi.fn(),
      sources: [
        {
          bookmarks: [
            {
              cardAppearance: { kind: 'color' as const, value: '#123456' },
              createdAt: 1,
              id: '33333333-3333-4333-8333-333333333333',
              index: 0,
              note: '',
              parentId: '22222222-2222-4222-8222-222222222222',
              profileId: '11111111-1111-4111-8111-111111111111',
              tags: [],
              title: 'React reference',
              updatedAt: 1,
              url: 'https://react.dev/',
            },
          ],
          folders: [],
          profileId: '11111111-1111-4111-8111-111111111111',
          profileName: 'Personal',
        },
      ],
      webSearchAvailable: false,
    };
    const { rerender } = render(<SearchDialog {...props} isOpen />);

    const dialog = screen.getByRole('dialog', { name: 'Search' });
    await user.type(within(dialog).getByRole('searchbox'), 'React');
    expect(
      within(dialog).getByRole('button', { name: /React reference/ }),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole('button', { name: 'Search options' }),
    );
    expect(within(dialog).getByLabelText('Search all profiles')).toBeDisabled();
    expect(within(dialog).getByText('Search fields')).toBeVisible();
    expect(
      within(dialog).queryByText('Remember these options'),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Save options' }),
    ).not.toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: 'Close search' }),
    );
    expect(onClose).toHaveBeenCalledOnce();
    rerender(<SearchDialog {...props} isOpen={false} />);
    rerender(<SearchDialog {...props} isOpen />);
    expect(within(dialog).getByRole('searchbox')).toHaveValue('');
    expect(
      within(dialog).getByRole('button', { name: 'Search options' }),
    ).toHaveAttribute('aria-expanded', 'false');

    await user.type(within(dialog).getByRole('searchbox'), 'React');
    await user.click(
      within(dialog).getByRole('button', { name: 'Search options' }),
    );
    await user.click(
      within(dialog).getByRole('button', { name: /React reference/ }),
    );
    expect(onOpenResult).toHaveBeenCalledOnce();
    rerender(<SearchDialog {...props} isOpen={false} />);
    rerender(<SearchDialog {...props} isOpen />);
    expect(within(dialog).getByRole('searchbox')).toHaveValue('');
    expect(
      within(dialog).getByRole('button', { name: 'Search options' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('stays in Bookmarks when Web mode is unavailable', async () => {
    const user = userEvent.setup();
    const onWebSearch = vi.fn();
    const onWebUnavailable = vi.fn();
    const { rerender } = render(
      <SearchDialog
        activeProfileId="11111111-1111-4111-8111-111111111111"
        bookmarkOpening="current-tab"
        currentFolderId="22222222-2222-4222-8222-222222222222"
        initialPreferences={defaultSearchPreferences}
        isLoading={false}
        isOpen
        loadFailed={false}
        onClose={vi.fn()}
        onOpenResult={vi.fn()}
        onWebSearch={onWebSearch}
        onWebUnavailable={onWebUnavailable}
        sources={[]}
        webSearchAvailable={false}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Web' }));
    expect(onWebUnavailable).toHaveBeenCalledOnce();
    expect(onWebSearch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Bookmarks' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.queryByRole('button', { name: /Search the web for/ }),
    ).not.toBeInTheDocument();

    await user.type(screen.getByRole('searchbox'), 'privacy');

    rerender(
      <SearchDialog
        activeProfileId="11111111-1111-4111-8111-111111111111"
        bookmarkOpening="current-tab"
        currentFolderId="22222222-2222-4222-8222-222222222222"
        initialPreferences={defaultSearchPreferences}
        isLoading={false}
        isOpen
        loadFailed={false}
        onClose={vi.fn()}
        onOpenResult={vi.fn()}
        onWebSearch={onWebSearch}
        onWebUnavailable={onWebUnavailable}
        sources={[]}
        webSearchAvailable
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Web' }));
    const suggestion = screen.getByRole('button', {
      name: /Search the web for “privacy”/,
    });
    await user.click(suggestion);
    expect(onWebSearch).toHaveBeenCalledWith('privacy');
  });
});
