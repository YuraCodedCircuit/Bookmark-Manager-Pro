import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { BookmarkGrid } from './BookmarkGrid';

const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
const rootId = '11111111-1111-4111-8111-111111111111';

afterEach(cleanup);

describe('BookmarkGrid', () => {
  it('exposes the saved card size without a responsive size override', () => {
    const { container } = render(
      <BookmarkGrid
        bookmarks={[]}
        contentRef={{ current: null }}
        folders={[]}
        onOpenFolder={vi.fn()}
        view={{ bookmarkView: 'card', cardSize: 'large' }}
      />,
    );

    expect(container.querySelector('.bookmark-grid')).toHaveClass(
      'bookmark-grid--card',
      'bookmark-grid--large',
    );
  });

  it('uses the same card anatomy and title-derived icon for folders and bookmarks', () => {
    const { container } = render(
      <BookmarkGrid
        bookmarks={[
          {
            cardAppearance: { kind: 'color', value: '#123456' },
            createdAt: 1,
            id: '22222222-2222-4222-8222-222222222222',
            index: 1,
            note: '',
            parentId: rootId,
            profileId,
            tags: [],
            title: 'Example bookmark',
            updatedAt: 1,
            url: 'https://example.com/',
          },
        ]}
        contentRef={{ current: null }}
        folders={[
          {
            backgroundAppearance: { kind: 'color', value: '#000000' },
            bookmarkView: 'card',
            detailsTableTransparency: 0,
            includeNavigationBackground: false,
            navigationTransparency: 45,
            cardAppearance: { kind: 'color', value: '#654321' },
            createdAt: 1,
            id: '33333333-3333-4333-8333-333333333333',
            index: 0,
            isRoot: false,
            note: '',
            parentId: rootId,
            profileId,
            tags: [],
            title: 'Research',
            updatedAt: 1,
          },
        ]}
        onOpenFolder={vi.fn()}
        view={{ bookmarkView: 'card', cardSize: 'medium' }}
      />,
    );

    const folder = screen.getByRole('button', { name: /Research/ });
    const bookmark = screen.getByRole('link', {
      name: 'Open Example bookmark',
    });
    expect(within(folder).getByText('RE')).toHaveClass(
      'bookmark-card__favicon',
    );
    expect(within(bookmark).getByText('EX')).toHaveClass(
      'bookmark-card__favicon',
    );
    expect(folder.querySelector('.bookmark-card__details')).not.toBeNull();
    expect(bookmark.querySelector('.bookmark-card__details')).not.toBeNull();
    expect(folder).toHaveAttribute('data-context-menu', 'bookmark');
    expect(bookmark).toHaveAttribute('data-context-menu', 'bookmark');
    expect(container.querySelectorAll('.bookmark-card__media')).toHaveLength(2);
  });

  it('uses each card as the single keyboard focus and drag target', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <BookmarkGrid
        bookmarks={[
          {
            cardAppearance: { kind: 'color', value: '#123456' },
            createdAt: 1,
            id: '22222222-2222-4222-8222-222222222222',
            index: 1,
            note: '',
            parentId: rootId,
            profileId,
            tags: [],
            title: 'Example bookmark',
            updatedAt: 1,
            url: 'https://example.com/',
          },
        ]}
        contentRef={{ current: null }}
        folders={[
          {
            backgroundAppearance: { kind: 'color', value: '#000000' },
            bookmarkView: 'card',
            cardAppearance: { kind: 'color', value: '#654321' },
            createdAt: 1,
            detailsTableTransparency: 0,
            id: '33333333-3333-4333-8333-333333333333',
            includeNavigationBackground: false,
            index: 0,
            isRoot: false,
            navigationTransparency: 45,
            note: '',
            parentId: rootId,
            profileId,
            tags: [],
            title: 'Research',
            updatedAt: 1,
          },
        ]}
        onOpenFolder={vi.fn()}
        view={{ bookmarkView: 'card', cardSize: 'medium' }}
      />,
    );

    const grid = screen.getByRole('region', { name: 'Bookmarks' });
    const folder = screen.getByRole('button', { name: /Research/ });
    const bookmark = screen.getByRole('link', {
      name: 'Open Example bookmark',
    });
    expect(container.querySelector('.bookmark-drag-item')).not.toHaveAttribute(
      'tabindex',
    );
    expect(folder).toHaveAttribute('aria-describedby');
    expect(bookmark).toHaveAttribute('aria-describedby');

    await user.tab();
    expect(grid).toHaveFocus();
    await user.tab();
    expect(folder).toHaveFocus();
    await user.tab();
    expect(bookmark).toHaveFocus();
  });

  it('gives icon-free folder text the full details width', () => {
    render(
      <BookmarkGrid
        bookmarks={[]}
        contentRef={{ current: null }}
        folders={[
          {
            backgroundAppearance: { kind: 'color', value: '#000000' },
            bookmarkView: 'card',
            cardAppearance: { kind: 'color', value: '#654321' },
            createdAt: 1,
            detailsTableTransparency: 0,
            id: '33333333-3333-4333-8333-333333333333',
            includeNavigationBackground: false,
            index: 0,
            isRoot: false,
            navigationTransparency: 45,
            note: '',
            parentId: rootId,
            profileId,
            tags: [],
            title: 'Research',
            updatedAt: 1,
          },
        ]}
        onOpenFolder={vi.fn()}
        view={{
          bookmarkView: 'card',
          cardSize: 'medium',
          folderIcon: 'none',
        }}
      />,
    );

    const folder = screen.getByRole('button', { name: /Research/ });
    expect(folder.querySelector('.bookmark-card__favicon')).toBeNull();
    expect(folder.querySelector('.bookmark-card__details')).toHaveClass(
      'bookmark-card__details--without-icon',
    );
    expect(within(folder).getByText('Folder')).toBeVisible();
  });

  it('applies the configured bookmark and folder opening behavior', async () => {
    const user = userEvent.setup();
    const onOpenFolder = vi.fn();
    render(
      <BookmarkGrid
        bookmarkOpening="new-tab"
        bookmarks={[
          {
            cardAppearance: { kind: 'color', value: '#123456' },
            createdAt: 1,
            id: '22222222-2222-4222-8222-222222222222',
            index: 1,
            note: '',
            parentId: rootId,
            profileId,
            tags: [],
            title: 'Example bookmark',
            updatedAt: 1,
            url: 'https://example.com/',
          },
        ]}
        contentRef={{ current: null }}
        folderOpening="double-click"
        folders={[
          {
            backgroundAppearance: { kind: 'color', value: '#000000' },
            bookmarkView: 'card',
            detailsTableTransparency: 0,
            includeNavigationBackground: false,
            navigationTransparency: 45,
            cardAppearance: { kind: 'color', value: '#654321' },
            createdAt: 1,
            id: '33333333-3333-4333-8333-333333333333',
            index: 0,
            isRoot: false,
            note: '',
            parentId: rootId,
            profileId,
            tags: [],
            title: 'Research',
            updatedAt: 1,
          },
        ]}
        onOpenFolder={onOpenFolder}
        view={{ bookmarkView: 'card', cardSize: 'medium' }}
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Open Example bookmark' }),
    ).toHaveAttribute('target', '_blank');
    const folder = screen.getByRole('button', { name: /Research/ });
    await user.click(folder);
    expect(onOpenFolder).not.toHaveBeenCalled();
    await user.dblClick(folder);
    expect(onOpenFolder).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Research' }),
    );
  });
});
