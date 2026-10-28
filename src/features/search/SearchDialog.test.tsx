import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { defaultSearchPreferences } from '../../domain/bookmark-search';
import { SearchDialog } from './SearchDialog';

afterEach(cleanup);

describe('SearchDialog', () => {
  it('keeps same-name profile groups separate and marks only the active profile', async () => {
    const user = userEvent.setup();
    const sources = ['active', 'other'].map((profileId) => ({
      profileId,
      profileName: 'Shared name',
      folders: [],
      bookmarks: [
        {
          id: `bookmark-${profileId}`,
          profileId,
          title: `Example ${profileId}`,
          url: 'https://example.com/',
          parentId: 'root',
          index: 0,
          tags: [],
          note: '',
          createdAt: 1,
          updatedAt: 1,
          cardAppearance: { kind: 'color' as const, value: '#123456' },
        },
      ],
    }));
    render(
      <SearchDialog
        activeProfileId="active"
        bookmarkOpening="new-tab"
        currentFolderId="root"
        initialPreferences={{ ...defaultSearchPreferences, allProfiles: true }}
        isLoading={false}
        isOpen
        loadFailed={false}
        onClose={vi.fn()}
        onOpenResult={vi.fn()}
        onWebSearch={vi.fn()}
        onWebUnavailable={vi.fn()}
        sources={sources}
        webSearchAvailable={false}
      />,
    );
    await user.type(screen.getByRole('searchbox'), 'Example');
    const headers = screen.getAllByRole('heading', { level: 3 });
    expect(headers).toHaveLength(2);
    expect(within(headers[0]!).getByText('Active')).toHaveClass(
      'profile-status',
    );
    expect(within(headers[1]!).queryByText('Active')).not.toBeInTheDocument();
  });
  it('keeps URL match choices and filter separate across modes and resets on close', async () => {
    const user = userEvent.setup();
    const onLoadUrlMatches = vi.fn().mockResolvedValue([]);
    const props = {
      activeProfileId: 'p',
      bookmarkOpening: 'new-tab' as const,
      currentFolderId: 'root',
      initialPreferences: defaultSearchPreferences,
      isLoading: false,
      loadFailed: false,
      sources: [],
      webSearchAvailable: true,
      onClose: vi.fn(),
      onOpenResult: vi.fn(),
      onWebSearch: vi.fn(),
      onWebUnavailable: vi.fn(),
      onLoadUrlMatches,
    };
    const { rerender } = render(<SearchDialog {...props} isOpen />);
    expect(
      screen.queryByRole('button', { name: 'About Experimental' }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'ordinary search');
    await user.click(screen.getByRole('button', { name: 'URL matches' }));
    const badge = screen.getByRole('button', { name: 'About Experimental' });
    expect(badge).toBeVisible();
    await user.click(badge);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'URL matching is experimental.',
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(
      screen.queryByRole('button', { name: 'Search options' }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(onLoadUrlMatches).toHaveBeenCalledTimes(1));
    await user.type(screen.getByRole('searchbox'), 'x');
    const matchOptions = screen.getByRole('button', {
      name: 'URL match options',
    });
    expect(
      screen.queryByRole('button', { name: 'Refresh' }),
    ).not.toBeInTheDocument();
    expect(matchOptions.closest('.search-window__query-row')).toContainElement(
      screen.getByRole('searchbox'),
    );
    await user.click(matchOptions);
    const child = screen.getByRole('dialog', { name: 'URL match options' });
    await user.selectOptions(screen.getByLabelText('Matching level'), 'path');
    await user.selectOptions(screen.getByLabelText('Scope'), 'all');
    fireEvent(child, new Event('cancel', { bubbles: true, cancelable: true }));
    await waitFor(() => expect(matchOptions).toHaveFocus());
    expect(screen.getByRole('dialog', { name: 'Search' })).toHaveAttribute(
      'open',
    );
    expect(onLoadUrlMatches).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Bookmarks' }));
    expect(
      screen.queryByRole('button', { name: 'About Experimental' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('ordinary search');
    await user.click(screen.getByRole('button', { name: 'URL matches' }));
    expect(screen.getByRole('searchbox')).toHaveValue('x');
    expect(screen.getByLabelText('Matching level')).toHaveValue('path');
    expect(screen.getByLabelText('Scope')).toHaveValue('all');
    await waitFor(() => expect(onLoadUrlMatches).toHaveBeenCalledTimes(2));
    rerender(<SearchDialog {...props} isOpen={false} />);
    rerender(<SearchDialog {...props} isOpen />);
    expect(screen.getByRole('button', { name: 'Bookmarks' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('searchbox')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'URL matches' }));
    expect(screen.getByLabelText('Matching level')).toHaveValue('exact');
    expect(screen.getByLabelText('Scope')).toHaveValue('current');
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });
  it('searches while typing and exposes bookmark options', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onOpenResult = vi.fn();
    const onInspectResult = vi.fn().mockResolvedValue(undefined);
    const onOpenUrlMatchFolder = vi.fn().mockResolvedValue(undefined);
    const onConfirmResultProfileChange = vi.fn().mockResolvedValue(false);
    const props = {
      activeProfileId: '11111111-1111-4111-8111-111111111111',
      bookmarkOpening: 'new-tab' as const,
      currentFolderId: '22222222-2222-4222-8222-222222222222',
      initialPreferences: { ...defaultSearchPreferences, allProfiles: true },
      isLoading: false,
      loadFailed: false,
      onClose,
      onOpenResult,
      onInspectResult,
      onOpenUrlMatchFolder,
      onConfirmResultProfileChange,
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
    await user.click(within(dialog).getByRole('button', { name: 'Get info' }));
    expect(onInspectResult).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'bookmark',
        profileId: props.activeProfileId,
      }),
      expect.any(HTMLButtonElement),
    );
    expect(onOpenResult).not.toHaveBeenCalled();
    await user.click(
      within(dialog).getByRole('button', { name: 'Open parent folder' }),
    );
    expect(onOpenUrlMatchFolder).toHaveBeenCalledTimes(1);
    expect(onConfirmResultProfileChange).not.toHaveBeenCalled();
    rerender(
      <SearchDialog {...props} activeProfileId="other-profile" isOpen />,
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Open parent folder' }),
    );
    expect(onConfirmResultProfileChange).toHaveBeenCalledTimes(1);
    expect(onOpenUrlMatchFolder).toHaveBeenCalledTimes(1);
    onConfirmResultProfileChange.mockResolvedValue(true);
    await user.click(
      within(dialog).getByRole('button', { name: 'Open parent folder' }),
    );
    expect(onOpenUrlMatchFolder).toHaveBeenCalledTimes(2);
    rerender(<SearchDialog {...props} isOpen />);
    expect(
      within(dialog).getByRole('button', { name: /React reference/ }),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole('button', { name: 'Search options' }),
    );
    const options = screen.getByRole('dialog', { name: 'Search options' });
    expect(
      within(options).getByLabelText('Search all profiles'),
    ).toBeDisabled();
    expect(within(options).getByText('Search fields')).toBeVisible();
    await waitFor(() =>
      expect(within(options).getByLabelText('Item type')).toHaveFocus(),
    );
    expect(
      within(options).queryByText('Remember these options'),
    ).not.toBeInTheDocument();
    expect(
      within(options).queryByRole('button', { name: 'Save options' }),
    ).not.toBeInTheDocument();
    await user.click(within(options).getByRole('button', { name: 'Close' }));
    expect(options).not.toHaveAttribute('open');
    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: 'Search options' }),
      ).toHaveFocus(),
    );

    await user.click(
      within(dialog).getByRole('button', { name: 'Search options' }),
    );
    expect(options).toHaveAttribute('open');
    await user.click(
      within(options).getByRole('button', { name: 'Close search options' }),
    );
    expect(options).not.toHaveAttribute('open');

    await user.click(
      within(dialog).getByRole('button', { name: 'Search options' }),
    );
    fireEvent(options, new Event('cancel', { cancelable: true }));
    expect(options).not.toHaveAttribute('open');
    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: 'Search options' }),
      ).toHaveFocus(),
    );

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
    expect(onOpenResult).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'bookmark' }),
      'new-tab',
    );
    rerender(<SearchDialog {...props} isOpen={false} />);
    rerender(<SearchDialog {...props} isOpen />);
    expect(within(dialog).getByRole('searchbox')).toHaveValue('');
    expect(
      within(dialog).getByRole('button', { name: 'Search options' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('overrides bookmark opening for Ctrl and Ctrl+Shift clicks', async () => {
    const onOpenResult = vi.fn();
    render(
      <SearchDialog
        activeProfileId="11111111-1111-4111-8111-111111111111"
        bookmarkOpening="current-tab"
        currentFolderId="22222222-2222-4222-8222-222222222222"
        initialPreferences={defaultSearchPreferences}
        isLoading={false}
        isOpen
        loadFailed={false}
        onClose={vi.fn()}
        onOpenResult={onOpenResult}
        onWebSearch={vi.fn()}
        onWebUnavailable={vi.fn()}
        sources={[
          {
            bookmarks: [
              {
                cardAppearance: { kind: 'color', value: '#123456' },
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
        ]}
        webSearchAvailable={false}
      />,
    );
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'React' },
    });
    const result = await screen.findByRole('button', {
      name: /React reference/,
    });

    fireEvent.click(result, { ctrlKey: true });
    expect(onOpenResult).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'bookmark' }),
      'new-tab',
    );
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'React' },
    });
    fireEvent.click(
      await screen.findByRole('button', { name: /React reference/ }),
      { ctrlKey: true, shiftKey: true },
    );
    expect(onOpenResult).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'bookmark' }),
      'new-window',
    );
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
