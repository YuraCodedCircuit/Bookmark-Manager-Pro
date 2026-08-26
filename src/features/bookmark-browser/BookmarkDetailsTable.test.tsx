import { cleanup, render, screen, within } from '@testing-library/react';
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
    render(
      <BookmarkDetailsTable
        bookmarks={[bookmark]}
        folders={[folder]}
        onOpenFolder={vi.fn()}
      />,
    );

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(5);
    expect(headers[0]).toHaveAccessibleName('Appearance');
    expect(headers[0]).not.toContainElement(
      within(headers[0]!).queryByRole('button'),
    );
    expect(screen.getByRole('columnheader', { name: /Title/ })).toHaveAttribute(
      'aria-sort',
      'none',
    );
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Zulu folder');
    expect(screen.getAllByRole('row')[2]).toHaveTextContent('Alpha bookmark');
    expect(screen.getByText('https://example.com/')).toBeVisible();
    expect(screen.getByText('Bookmark')).toBeVisible();
    expect(screen.getByText('Folder')).toBeVisible();
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
