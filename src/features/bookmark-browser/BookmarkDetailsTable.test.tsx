import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { BookmarkDetailsTable } from './BookmarkDetailsTable';

const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
const rootId = '11111111-1111-4111-8111-111111111111';
const folder = {
  backgroundAppearance: { kind: 'color' as const, value: '#000000' },
  bookmarkView: 'card' as const,
  detailsTableTransparency: 0,
  includeNavigationBackground: false,
  navigationTransparency: 45,
  cardAppearance: { kind: 'color' as const, value: '#654321' },
  createdAt: Date.parse('2026-08-01T12:00:00Z'),
  id: '33333333-3333-4333-8333-333333333333',
  index: 0,
  isRoot: false,
  note: '',
  parentId: rootId,
  profileId,
  tags: [],
  title: 'Zulu folder',
  updatedAt: Date.parse('2026-08-02T12:00:00Z'),
};
const bookmark = {
  cardAppearance: { kind: 'color' as const, value: '#123456' },
  createdAt: Date.parse('2026-08-03T12:00:00Z'),
  id: '22222222-2222-4222-8222-222222222222',
  index: 1,
  note: '',
  parentId: rootId,
  profileId,
  tags: [],
  title: 'Alpha bookmark',
  updatedAt: Date.parse('2026-08-04T12:00:00Z'),
  url: 'https://example.com/',
};

afterEach(cleanup);

describe('BookmarkDetailsTable', () => {
  it('applies the validated table background transparency', () => {
    const { container } = render(
      <BookmarkDetailsTable
        bookmarks={[]}
        folders={[]}
        hideHeaderWhenEmpty={false}
        onOpenFolder={vi.fn()}
        transparency={35}
      />,
    );
    expect(
      container.querySelector('.bookmark-details-table__scroller'),
    ).toHaveStyle({
      '--details-table-background-opacity': '65%',
      '--details-table-header-opacity': '7.8%',
    });
  });

  it('removes both body and header backgrounds at full transparency', () => {
    const { container } = render(
      <BookmarkDetailsTable
        bookmarks={[]}
        folders={[]}
        hideHeaderWhenEmpty={false}
        onOpenFolder={vi.fn()}
        transparency={100}
      />,
    );
    expect(
      container.querySelector('.bookmark-details-table__scroller'),
    ).toHaveStyle({
      '--details-table-background-opacity': '0%',
      '--details-table-header-opacity': '0%',
    });
  });

  it('renders the requested columns and defaults to saved manual order', () => {
    const { container } = render(
      <BookmarkDetailsTable
        bookmarks={[bookmark]}
        folders={[folder]}
        onOpenFolder={vi.fn()}
      />,
    );

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(5);
    expect(headers[0]).toHaveAccessibleName('Appearance');
    expect(
      screen.getByRole('button', { name: 'Reorder Appearance column' }),
    ).toHaveAttribute('aria-keyshortcuts', 'Alt+ArrowLeft Alt+ArrowRight');
    for (const label of [
      'Appearance',
      'Title',
      'URL',
      'Date modified',
      'Type',
    ]) {
      expect(
        screen.getByRole('button', { name: `Reorder ${label} column` }),
      ).toBeEnabled();
    }
    expect(screen.getByRole('columnheader', { name: /Title/ })).toHaveAttribute(
      'aria-sort',
      'none',
    );
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Zulu folder');
    expect(screen.getAllByRole('row')[2]).toHaveTextContent('Alpha bookmark');
    expect(screen.getByText('https://example.com/')).toBeVisible();
    expect(screen.getByText('Bookmark')).toBeVisible();
    expect(screen.getByText('Folder')).toBeVisible();
    expect(
      container.querySelectorAll('col.bookmark-details-table__flexible-column'),
    ).toHaveLength(2);
    expect(
      container.querySelector('col.bookmark-details-table__appearance-column'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('col.bookmark-details-table__date-column'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('col.bookmark-details-table__type-column'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: folder.title })).toHaveAttribute(
      'title',
      folder.title,
    );
    expect(screen.getByRole('link', { name: bookmark.title })).toHaveAttribute(
      'title',
      bookmark.title,
    );
    expect(screen.getByText(bookmark.url)).toHaveAttribute(
      'title',
      bookmark.url,
    );
    expect(screen.queryByLabelText('Selected column')).not.toBeInTheDocument();
  });

  it('shows the visible reorder controls only when enabled', () => {
    const { rerender } = render(
      <BookmarkDetailsTable
        bookmarks={[]}
        folders={[]}
        onOpenFolder={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Selected column')).not.toBeInTheDocument();
    rerender(
      <BookmarkDetailsTable
        bookmarks={[]}
        folders={[]}
        hideHeaderWhenEmpty={false}
        onOpenFolder={vi.fn()}
        showColumnOrderControls
      />,
    );
    expect(screen.getByLabelText('Selected column')).toBeVisible();
  });

  it('hides an empty header by default and keeps a shown empty header reorderable', () => {
    const { container, rerender } = render(
      <BookmarkDetailsTable
        bookmarks={[]}
        folders={[]}
        onOpenFolder={vi.fn()}
      />,
    );

    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
    expect(
      container.querySelector('.bookmark-details-table__scroller'),
    ).not.toBeInTheDocument();
    rerender(
      <BookmarkDetailsTable
        bookmarks={[]}
        folders={[]}
        hideHeaderWhenEmpty={false}
        onOpenFolder={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('columnheader')).toHaveLength(5);
    expect(
      container.querySelector('.bookmark-details-table__scroller'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reorder Appearance column' }),
    ).toBeEnabled();
  });

  it('sorts every labeled column in both directions', async () => {
    const user = userEvent.setup();
    render(
      <BookmarkDetailsTable
        bookmarks={[bookmark]}
        folders={[folder]}
        onOpenFolder={vi.fn()}
      />,
    );

    for (const label of ['Title', 'URL', 'Date modified', 'Type']) {
      const button = screen.getByRole('button', { name: label });
      const header = screen.getByRole('columnheader', {
        name: new RegExp(label),
      });
      if (header.getAttribute('aria-sort') === 'ascending') {
        await user.click(button);
      } else {
        await user.click(button);
        expect(header).toHaveAttribute('aria-sort', 'ascending');
        await user.click(button);
      }
      expect(header).toHaveAttribute('aria-sort', 'descending');
      await user.click(button);
      expect(header).toHaveAttribute('aria-sort', 'ascending');
    }
  });

  it('moves the selected column and persists the complete folder order', async () => {
    const user = userEvent.setup();
    const onColumnOrderChange = vi.fn(async () => undefined);
    render(
      <BookmarkDetailsTable
        bookmarks={[bookmark]}
        folders={[folder]}
        onColumnOrderChange={onColumnOrderChange}
        onOpenFolder={vi.fn()}
        showColumnOrderControls
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Move left' }));

    expect(onColumnOrderChange).toHaveBeenCalledWith([
      'title',
      'appearance',
      'url',
      'updatedAt',
      'type',
    ]);
    expect(
      await screen.findByText('The column order was saved for this folder.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')[0]).toHaveAccessibleName(
      /Title/,
    );
  });

  it('supports Alt+Arrow keyboard movement and reset', async () => {
    const user = userEvent.setup();
    const onColumnOrderChange = vi.fn(async () => undefined);
    render(
      <BookmarkDetailsTable
        bookmarks={[]}
        columnOrder={['title', 'appearance', 'url', 'updatedAt', 'type']}
        folders={[]}
        hideHeaderWhenEmpty={false}
        onColumnOrderChange={onColumnOrderChange}
        onOpenFolder={vi.fn()}
        showColumnOrderControls
      />,
    );

    const handle = screen.getByRole('button', {
      name: 'Reorder Appearance column',
    });
    handle.focus();
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(onColumnOrderChange).toHaveBeenLastCalledWith([
      'title',
      'url',
      'appearance',
      'updatedAt',
      'type',
    ]);

    await user.click(
      screen.getByRole('button', { name: 'Reset column order' }),
    );
    expect(onColumnOrderChange).toHaveBeenLastCalledWith([
      'appearance',
      'title',
      'url',
      'updatedAt',
      'type',
    ]);
  });

  it('restores the previous order when persistence fails', async () => {
    const user = userEvent.setup();
    render(
      <BookmarkDetailsTable
        bookmarks={[]}
        folders={[]}
        hideHeaderWhenEmpty={false}
        onColumnOrderChange={vi.fn(async () => {
          throw new Error('write-failed');
        })}
        onOpenFolder={vi.fn()}
        showColumnOrderControls
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Move left' }));

    expect(
      await screen.findByText(/previous order was restored/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')[0]).toHaveAccessibleName(
      'Appearance',
    );
  });

  it('adopts a newer persisted order after an optimistic save', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <BookmarkDetailsTable
        bookmarks={[]}
        folders={[]}
        hideHeaderWhenEmpty={false}
        onColumnOrderChange={vi.fn(async () => undefined)}
        onOpenFolder={vi.fn()}
        showColumnOrderControls
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Move left' }));
    expect(screen.getAllByRole('columnheader')[0]).toHaveAccessibleName(
      /Title/,
    );

    rerender(
      <BookmarkDetailsTable
        bookmarks={[]}
        columnOrder={['url', 'title', 'appearance', 'updatedAt', 'type']}
        folders={[]}
        hideHeaderWhenEmpty={false}
        onColumnOrderChange={vi.fn(async () => undefined)}
        onOpenFolder={vi.fn()}
        showColumnOrderControls
      />,
    );

    await waitFor(() =>
      expect(screen.getAllByRole('columnheader')[0]).toHaveAccessibleName(
        /URL/,
      ),
    );
  });

  it('opens folders from their title control', async () => {
    const user = userEvent.setup();
    const onOpenFolder = vi.fn();
    render(
      <BookmarkDetailsTable
        bookmarks={[]}
        folders={[folder]}
        onOpenFolder={onOpenFolder}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Zulu folder' }));
    expect(onOpenFolder).toHaveBeenCalledWith(folder);
  });
});
