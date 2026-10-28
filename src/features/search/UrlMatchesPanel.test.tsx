import { StrictMode } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../localization/i18n';
import type { SearchProfileSource } from '../../domain/bookmark-search';
import type { Bookmark } from '../../domain/bookmark';
import { UrlMatchesPanel } from './UrlMatchesPanel';

afterEach(cleanup);
const bookmark = (
  id: string,
  url = 'https://example.com/a',
  title = id,
): Bookmark => ({
  id,
  url,
  title,
  profileId: 'p',
  parentId: 'root',
  createdAt: 1,
  updatedAt: 1,
  index: 0,
  tags: [],
  note: '',
  cardAppearance: { kind: 'color', value: '#123456' },
});
const source = (
  bookmarks = [bookmark('Alpha'), bookmark('Beta')],
  profileId = 'p',
): SearchProfileSource => ({
  bookmarks,
  folders: [],
  profileId,
  profileName: profileId,
});
const setup = (loadSnapshot = vi.fn().mockResolvedValue([source()])) => ({
  active: true,
  activeProfileId: 'p',
  filter: '',
  bookmarkOpening: 'new-tab' as const,
  loadSnapshot,
  onScan: vi.fn(),
  onOpenResult: vi.fn(),
});
const pending = () => {
  let resolve!: (value: readonly SearchProfileSource[]) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<readonly SearchProfileSource[]>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

describe('URL matches snapshot review', () => {
  it('keeps results interactive and focused during an unchanged automatic reread', async () => {
    const user = userEvent.setup();
    const scan = pending();
    const load = vi
      .fn()
      .mockResolvedValueOnce([source()])
      .mockReturnValueOnce(scan.promise);
    let changed: () => void = () => undefined;
    const props = setup(load);
    render(
      <UrlMatchesPanel
        {...props}
        subscribeChanges={(listener) => {
          changed = listener;
          return () => undefined;
        }}
      />,
    );
    const group = await screen.findByRole('button', { name: /2 bookmarks/ });
    await user.click(group);
    const member = screen.getByRole('button', { name: /Alpha/ });
    member.focus();
    act(() => changed());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByText(
        'Reading saved bookmarks. Previous results remain visible.',
      ),
    ).not.toBeInTheDocument();
    expect(member).toBeEnabled();
    expect(member).toHaveFocus();
    await act(async () => scan.resolve([source()]));
    expect(screen.getByRole('button', { name: /Alpha/ })).toBe(member);
    expect(member).toHaveFocus();
    expect(group).toHaveAttribute('aria-expanded', 'true');
  });
  it('shows one empty-result message without redundant zero counts', async () => {
    render(<UrlMatchesPanel {...setup(vi.fn().mockResolvedValue([]))} />);
    expect(await screen.findByText('No matching groups.')).toBeVisible();
    expect(screen.queryByText(/0 groups/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 bookmarks/)).not.toBeInTheDocument();
  });
  it('shows progress for Retry queued behind a quiet automatic read', async () => {
    const user = userEvent.setup();
    const automatic = pending();
    const load = vi
      .fn()
      .mockResolvedValueOnce([source()])
      .mockRejectedValueOnce(new Error('synthetic-read-failure'))
      .mockReturnValueOnce(automatic.promise)
      .mockResolvedValue([source()]);
    let changed: () => void = () => undefined;
    render(
      <UrlMatchesPanel
        {...setup(load)}
        subscribeChanges={(listener) => {
          changed = listener;
          return () => undefined;
        }}
      />,
    );
    await screen.findByText('1 group · 2 bookmarks');
    act(() => changed());
    const retry = await screen.findByRole('button', { name: 'Retry' });
    act(() => changed());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(3));
    expect(retry).toBeEnabled();
    await user.click(retry);
    expect(
      screen.getByText(
        'Reading saved bookmarks. Previous results remain visible.',
      ),
    ).toBeVisible();
    await act(async () => automatic.resolve([source()]));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(4));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Retry' }),
      ).not.toBeInTheDocument(),
    );
  });
  it('preserves results and returns focus after Get info fails', async () => {
    const user = userEvent.setup();
    render(
      <UrlMatchesPanel
        {...setup()}
        onInspect={vi.fn().mockRejectedValue(new Error('private'))}
      />,
    );
    await user.click(
      await screen.findByRole('button', {
        name: 'https://example.com/a · 2 bookmarks',
      }),
    );
    const trigger = screen.getAllByRole('button', { name: 'Get info' })[0]!;
    await user.click(trigger);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bookmark details could not be loaded',
    );
    expect(screen.getByText('Alpha')).toBeVisible();
    expect(
      screen.queryByRole('dialog', { name: 'Get info' }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
  it('labels cross-profile ownership and keeps Get info above Delete outside the opening button', async () => {
    const user = userEvent.setup();
    const load = vi
      .fn()
      .mockResolvedValue([
        source([bookmark('Alpha')], 'p'),
        source([bookmark('Beta')], 'q'),
      ]);
    const props = { ...setup(load), onInspect: vi.fn(), onDelete: vi.fn() };
    render(<UrlMatchesPanel {...props} />);
    await screen.findByText('No matching groups.');
    await user.selectOptions(screen.getByLabelText('Scope'), 'all');
    await user.click(
      screen.getByRole('button', {
        name: 'https://example.com/a · 2 bookmarks',
      }),
    );
    expect(screen.getByText('Profile: p')).toBeVisible();
    expect(screen.getByText('Profile: q')).toBeVisible();
    expect(screen.queryByText('Other profile')).toBeNull();
    expect(screen.getByText('Active')).toHaveClass('profile-status');
    expect(screen.getByRole('button', { name: /Alpha/ })).toContainElement(
      screen.getByText('Active'),
    );
    const row = screen.getByRole('button', { name: /Beta/ }).closest('li');
    expect(row?.querySelectorAll('button')).toHaveLength(3);
    const buttons = row?.querySelectorAll('button');
    expect(buttons?.[1]).toHaveTextContent('Get info');
    expect(buttons?.[2]).toHaveTextContent('Delete');
    expect(
      screen.getByRole('button', { name: /Beta/ }).querySelector('button'),
    ).toBeNull();
  });
  it('opens fresh details and restores focus when they close', async () => {
    const user = userEvent.setup();
    const member = {
      item: bookmark('Alpha'),
      kind: 'bookmark' as const,
      profileId: 'p',
      profileName: 'Profile',
      parentPath: 'Fresh folder',
      score: 0,
      matchedField: 'url' as const,
    };
    const onInspect = vi.fn().mockResolvedValue({
      member,
      settings: { profileId: 'p', theme: 'dark', dateTimeFormat: 'browser' },
    });
    render(
      <UrlMatchesPanel
        {...setup()}
        onInspect={onInspect}
        onCopyInfo={vi.fn()}
      />,
    );
    await user.click(
      await screen.findByRole('button', {
        name: 'https://example.com/a · 2 bookmarks',
      }),
    );
    const trigger = screen.getAllByRole('button', { name: 'Get info' })[0];
    if (!trigger) throw new Error('missing-info-trigger');
    await user.click(trigger);
    expect(
      await screen.findByRole('dialog', { name: 'Get info' }),
    ).toBeVisible();
    expect(screen.getByText('Fresh folder')).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Close item information' }),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });
  it('keeps cancelled and failed deletion results, then automatically refreshes a successful deletion', async () => {
    const user = userEvent.setup();
    const load = vi
      .fn()
      .mockResolvedValueOnce([source()])
      .mockResolvedValue([]);
    const onDelete = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error('private'))
      .mockResolvedValueOnce(true);
    render(<UrlMatchesPanel {...setup(load)} onDelete={onDelete} />);
    await user.click(
      await screen.findByRole('button', {
        name: 'https://example.com/a · 2 bookmarks',
      }),
    );
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
    expect(load).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Alpha')).toBeVisible();
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The bookmark could not be deleted',
    );
    expect(screen.getByText('Alpha')).toBeVisible();
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
    expect(await screen.findByText('No matching groups.')).toBeVisible();
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });
  it('does not restore a committed deletion when automatic refresh fails', async () => {
    const user = userEvent.setup();
    const load = vi
      .fn()
      .mockResolvedValueOnce([
        source([bookmark('Alpha'), bookmark('Beta'), bookmark('Gamma')]),
      ])
      .mockRejectedValueOnce(new Error('private'));
    render(
      <UrlMatchesPanel
        {...setup(load)}
        onDelete={vi.fn().mockResolvedValue(true)}
      />,
    );
    await user.click(
      await screen.findByRole('button', {
        name: 'https://example.com/a · 3 bookmarks',
      }),
    );
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
    expect(await screen.findByText(/Results are outdated/)).toBeVisible();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeVisible();
    expect(screen.getByText('1 group · 2 bookmarks')).toBeVisible();
  });
  it('starts collapsed, preserves complete groups, and safely opens a member', async () => {
    const user = userEvent.setup();
    const props = setup();
    const { rerender } = render(
      <StrictMode>
        <UrlMatchesPanel {...props} />
      </StrictMode>,
    );
    expect(await screen.findByText('1 group · 2 bookmarks')).toBeVisible();
    expect(props.loadSnapshot).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: /Alpha/ }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /https:\/\/example.com\/a/ }),
    );
    expect(screen.getByRole('button', { name: /Alpha/ })).toBeVisible();
    rerender(
      <StrictMode>
        <UrlMatchesPanel {...props} filter=" a " />
      </StrictMode>,
    );
    expect(screen.getByRole('button', { name: /Beta/ })).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Scope'), 'all');
    await user.selectOptions(screen.getByLabelText('Matching level'), 'host');
    expect(props.loadSnapshot).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByRole('button', { name: 'https://example.com · 2 bookmarks' }),
    );
    await user.click(screen.getByRole('button', { name: /Alpha/ }));
    expect(props.onOpenResult).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'bookmark',
        profileId: 'p',
        item: expect.objectContaining({ url: 'https://example.com/a' }),
      }),
      'new-tab',
    );
  });
  it('keeps old results and expansion during refresh, marks failure outdated, and retries', async () => {
    const user = userEvent.setup();
    const refresh = pending();
    const load = vi
      .fn()
      .mockResolvedValueOnce([source()])
      .mockReturnValueOnce(refresh.promise)
      .mockResolvedValue([source()]);
    const props = setup(load);
    let changed: () => void = () => undefined;
    const subscribeChanges = (listener: () => void) => {
      changed = listener;
      return () => undefined;
    };
    render(<UrlMatchesPanel {...props} subscribeChanges={subscribeChanges} />);
    await user.click(
      await screen.findByRole('button', { name: /https:\/\/example.com\/a/ }),
    );
    act(() => changed());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: /Alpha/ })).toBeVisible();
    await act(async () => refresh.reject(new Error('private value')));
    expect(await screen.findByText(/Results are outdated/)).toBeVisible();
    expect(props.onScan).toHaveBeenLastCalledWith('outdated', false, true);
    expect(screen.getByRole('button', { name: /Alpha/ })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(
        screen.queryByText(/Results are outdated/),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Alpha/ })).toBeVisible();
  });
  it('shows initial failure and deduplicates repeated error feedback', async () => {
    const props = setup(vi.fn().mockRejectedValue(new Error('private data')));
    const user = userEvent.setup();
    render(<UrlMatchesPanel {...props} />);
    expect(
      await screen.findByText(/URL matches could not be loaded/),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(props.loadSnapshot).toHaveBeenCalledTimes(2));
    expect(props.onScan).toHaveBeenCalledTimes(2);
    expect(props.onScan).toHaveBeenLastCalledWith('failed', true, false);
    expect(screen.queryByText('private data')).not.toBeInTheDocument();
  });
  it('ignores superseded requests on mode changes and disposal', async () => {
    const first = pending();
    const second = pending();
    const props = setup(
      vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise),
    );
    const { rerender, unmount } = render(<UrlMatchesPanel {...props} />);
    await waitFor(() => expect(props.loadSnapshot).toHaveBeenCalledTimes(1));
    rerender(<UrlMatchesPanel {...props} active={false} />);
    rerender(<UrlMatchesPanel {...props} />);
    await waitFor(() => expect(props.loadSnapshot).toHaveBeenCalledTimes(2));
    await act(async () => second.resolve([source()]));
    expect(await screen.findByText('1 group · 2 bookmarks')).toBeVisible();
    await act(async () => first.resolve([]));
    expect(screen.getByText('1 group · 2 bookmarks')).toBeVisible();
    expect(props.onScan).toHaveBeenCalledTimes(1);
    unmount();
  });
  it('discards a pending scan after its Search session unmounts', async () => {
    const scan = pending();
    const props = setup(vi.fn().mockReturnValue(scan.promise));
    const { unmount } = render(<UrlMatchesPanel {...props} />);
    await waitFor(() => expect(props.loadSnapshot).toHaveBeenCalledOnce());
    unmount();
    await act(async () => scan.resolve([source()]));
    expect(props.onScan).not.toHaveBeenCalled();
    expect(screen.queryByText('1 group · 2 bookmarks')).not.toBeInTheDocument();
  });
  it('paginates groups and expanded members while retaining full totals', async () => {
    const user = userEvent.setup();
    const bookmarks = Array.from({ length: 51 }, (_, i) => [
      bookmark(`a${i}`, `https://example.com/${i}`),
      bookmark(`b${i}`, `https://example.com/${i}`),
    ]).flat();
    const props = setup(vi.fn().mockResolvedValue([source(bookmarks)]));
    render(<UrlMatchesPanel {...props} />);
    expect(await screen.findByText('51 groups · 102 bookmarks')).toBeVisible();
    expect(screen.getAllByRole('button', { expanded: false })).toHaveLength(50);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getAllByRole('button', { expanded: false })).toHaveLength(1);
    expect(screen.getByText('Page 2 of 2')).toBeVisible();
  });
  it('initially renders 50 members with Show more', async () => {
    const user = userEvent.setup();
    const props = setup(
      vi
        .fn()
        .mockResolvedValue([
          source(Array.from({ length: 51 }, (_, i) => bookmark(`member-${i}`))),
        ]),
    );
    render(<UrlMatchesPanel {...props} />);
    await user.click(
      await screen.findByRole('button', { name: /51 bookmarks/ }),
    );
    expect(screen.getAllByRole('button', { name: /member-/ })).toHaveLength(50);
    await user.click(screen.getByRole('button', { name: 'Show more' }));
    expect(screen.getAllByRole('button', { name: /member-/ })).toHaveLength(51);
  });
});
