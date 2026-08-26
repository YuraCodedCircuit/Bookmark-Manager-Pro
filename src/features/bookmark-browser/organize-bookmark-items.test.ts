import { describe, expect, it } from 'vitest';

import type { Bookmark } from '../../domain/bookmark';
import type { Folder } from '../../domain/folder';
import { organizeBookmarkItems } from './organize-bookmark-items';

const base = {
  cardAppearance: { kind: 'color' as const, value: '#123456' },
  createdAt: 1,
  index: 0,
  note: '',
  parentId: '11111111-1111-4111-8111-111111111111',
  profileId: '22222222-2222-4222-8222-222222222222',
  tags: [],
  updatedAt: 1,
};
const folder = {
  ...base,
  backgroundAppearance: { kind: 'none' as const },
  bookmarkView: 'card' as const,
  detailsTableTransparency: 0,
  id: '33333333-3333-4333-8333-333333333333',
  includeNavigationBackground: false,
  isRoot: false,
  navigationTransparency: 45,
  title: 'Folder',
} satisfies Folder;
const bookmarks = [
  {
    ...base,
    createdAt: 2,
    id: '44444444-4444-4444-8444-444444444444',
    index: 2,
    title: 'Zebra',
    url: 'https://z.example/path',
  },
  {
    ...base,
    createdAt: 3,
    id: '55555555-5555-4555-8555-555555555555',
    index: 1,
    title: 'Alpha',
    url: 'https://a.example/path',
  },
] satisfies Bookmark[];
const labels = {
  bookmarks: 'Bookmarks',
  folders: 'Folders',
  noDomain: 'Other',
};

describe('organizeBookmarkItems', () => {
  it('keeps saved indexes for manual order regardless of direction', () => {
    const groups = organizeBookmarkItems(
      bookmarks,
      [folder],
      { bookmarkSortBy: 'manual', bookmarkSortDirection: 'descending' },
      'en-US',
      labels,
    );
    expect(groups[0]?.items.map((item) => item.value.index)).toEqual([0, 1, 2]);
  });

  it('groups by domain and sorts inside each group', () => {
    const groups = organizeBookmarkItems(
      bookmarks,
      [folder],
      {
        bookmarkGroupBy: 'domain',
        bookmarkSortBy: 'title',
        bookmarkSortDirection: 'ascending',
      },
      'en-US',
      labels,
    );
    expect(groups.map((group) => group.label)).toEqual([
      'a.example',
      'Folders',
      'z.example',
    ]);
  });
});
