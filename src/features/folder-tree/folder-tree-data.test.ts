import { describe, expect, it } from 'vitest';

import type { Folder } from '../../domain/folder';
import {
  findFolderAncestorIds,
  findNewestNonRootFolder,
} from './folder-tree-data';

const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';

function folder({
  createdAt,
  id,
  isRoot = false,
  parentId,
  title,
}: {
  createdAt: number;
  id: string;
  isRoot?: boolean;
  parentId: string | null;
  title: string;
}): Folder {
  return {
    backgroundAppearance: { kind: 'none' },
    bookmarkView: 'card',
    cardAppearance: { kind: 'color', value: '#123456' },
    createdAt,
    detailsTableTransparency: 0,
    id,
    includeNavigationBackground: false,
    index: 0,
    isRoot,
    navigationTransparency: 45,
    note: '',
    parentId,
    profileId,
    tags: [],
    title,
    updatedAt: createdAt,
  };
}

describe('popup folder-tree defaults', () => {
  const home = folder({
    createdAt: 1,
    id: '11111111-1111-4111-8111-111111111111',
    isRoot: true,
    parentId: null,
    title: 'Home',
  });
  const parent = folder({
    createdAt: 2,
    id: '22222222-2222-4222-8222-222222222222',
    parentId: home.id,
    title: 'Parent',
  });
  const newest = folder({
    createdAt: 3,
    id: '33333333-3333-4333-8333-333333333333',
    parentId: parent.id,
    title: 'Newest',
  });

  it('selects the newest non-root folder and falls back when none exists', () => {
    expect(findNewestNonRootFolder([newest, home, parent])).toBe(newest);
    expect(findNewestNonRootFolder([home])).toBeUndefined();
  });

  it('expands only the ancestors needed to reveal the selected folder', () => {
    expect([
      ...findFolderAncestorIds([home, parent, newest], newest.id),
    ]).toEqual([parent.id, home.id]);
    expect(findFolderAncestorIds([home, parent, newest], home.id).size).toBe(0);
  });
});
