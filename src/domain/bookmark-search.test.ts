import { describe, expect, it } from 'vitest';

import type { Bookmark } from './bookmark';
import type { Folder } from './folder';
import {
  defaultSearchPreferences,
  searchBookmarks,
  type SearchProfileSource,
} from './bookmark-search';

const profileId = '11111111-1111-4111-8111-111111111111';
const rootId = '22222222-2222-4222-8222-222222222222';
const folderId = '33333333-3333-4333-8333-333333333333';
const root: Folder = {
  backgroundAppearance: { kind: 'color', value: '#000000' },
  bookmarkView: 'card',
  cardAppearance: { kind: 'color', value: '#123456' },
  createdAt: 1,
  detailsTableTransparency: 0,
  id: rootId,
  includeNavigationBackground: false,
  index: 0,
  isRoot: true,
  navigationTransparency: 45,
  note: '',
  parentId: null,
  profileId,
  tags: [],
  title: 'Home',
  updatedAt: 1,
};
const folder: Folder = {
  ...root,
  id: folderId,
  isRoot: false,
  parentId: rootId,
  title: 'Research',
};
const bookmark: Bookmark = {
  cardAppearance: { kind: 'color', value: '#654321' },
  createdAt: 2,
  id: '44444444-4444-4444-8444-444444444444',
  index: 0,
  note: 'Frontend documentation',
  parentId: folderId,
  profileId,
  tags: ['typescript'],
  title: 'React reference',
  updatedAt: 3,
  url: 'https://react.dev/',
};
const source: SearchProfileSource = {
  bookmarks: [bookmark],
  folders: [root, folder],
  profileId,
  profileName: 'Personal',
};

describe('searchBookmarks', () => {
  it('searches supported fields and includes a folder path', () => {
    const results = searchBookmarks({
      activeProfileId: profileId,
      currentFolderId: rootId,
      preferences: defaultSearchPreferences,
      query: 'typescript',
      sources: [source],
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      kind: 'bookmark',
      matchedField: 'tags',
      parentPath: 'Home › Research',
      profileName: 'Personal',
    });
  });

  it('limits current-folder search and excludes one-character queries', () => {
    expect(
      searchBookmarks({
        activeProfileId: profileId,
        currentFolderId: rootId,
        preferences: {
          ...defaultSearchPreferences,
          location: 'current-folder',
        },
        query: 'React',
        sources: [source],
      }),
    ).toEqual([]);
    expect(
      searchBookmarks({
        activeProfileId: profileId,
        currentFolderId: rootId,
        preferences: defaultSearchPreferences,
        query: 'R',
        sources: [source],
      }),
    ).toEqual([]);
  });
});
