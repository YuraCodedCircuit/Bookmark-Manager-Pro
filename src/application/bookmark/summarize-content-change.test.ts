import { describe, expect, it } from 'vitest';

import type { UndoProfileState } from '../../domain/undo-history';
import { summarizeContentChange } from './summarize-content-change';

const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
const rootId = '11111111-1111-4111-8111-111111111111';
const sourceId = '22222222-2222-4222-8222-222222222222';
const destinationId = '33333333-3333-4333-8333-333333333333';
const folderId = '44444444-4444-4444-8444-444444444444';
const bookmarkId = '55555555-5555-4555-8555-555555555555';

describe('summarizeContentChange', () => {
  it('includes both parents for a moved item without exposing its content', () => {
    const before = state({ bookmarkParentId: sourceId });
    const after = state({ bookmarkParentId: destinationId, updatedAt: 2 });

    expect(summarizeContentChange(profileId, before, after)).toEqual({
      affectedParentIds: [sourceId, destinationId],
      changedFolderIds: [],
      deletedFolderPaths: [],
      fullRefresh: false,
      navigationChanged: true,
      profileId,
    });
  });

  it('records deleted-folder ancestry for descendant fallback', () => {
    const before = state();
    const after = {
      ...before,
      folders: before.folders.filter(({ id }) => id !== folderId),
    };

    expect(summarizeContentChange(profileId, before, after)).toMatchObject({
      affectedParentIds: [sourceId],
      changedFolderIds: [folderId],
      deletedFolderPaths: [{ ancestorIds: [rootId, sourceId], folderId }],
    });
  });

  it('returns no notification for an unchanged state', () => {
    const unchanged = state();
    expect(
      summarizeContentChange(profileId, unchanged, structuredClone(unchanged)),
    ).toBeUndefined();
  });
});

function state({
  bookmarkParentId = sourceId,
  updatedAt = 1,
}: {
  bookmarkParentId?: string;
  updatedAt?: number;
} = {}): UndoProfileState {
  const folder = (id: string, parentId: string | null, isRoot = false) => ({
    backgroundAppearance: { kind: 'color' as const, value: '#0b121a' },
    bookmarkView: 'card' as const,
    cardAppearance: { kind: 'color' as const, value: '#2f7de1' },
    createdAt: 1,
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
    title: 'Folder',
    updatedAt: 1,
  });
  return {
    bookmarks: [
      {
        cardAppearance: { kind: 'color', value: '#2f7de1' },
        createdAt: 1,
        id: bookmarkId,
        index: 0,
        note: '',
        parentId: bookmarkParentId,
        profileId,
        tags: [],
        title: 'Private title',
        updatedAt,
        url: 'https://private.example/',
      },
    ],
    favorites: [],
    folders: [
      folder(rootId, null, true),
      folder(sourceId, rootId),
      folder(destinationId, rootId),
      folder(folderId, sourceId),
    ],
  };
}
