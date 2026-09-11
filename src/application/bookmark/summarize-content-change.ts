import type { UndoProfileState } from '../../domain/undo-history';
import type { ContentChangeInput } from '../../messaging/content-change-protocol';

/** Summarizes a committed profile mutation without exposing bookmark content. */
export function summarizeContentChange(
  profileId: string,
  before: UndoProfileState,
  after: UndoProfileState,
): ContentChangeInput | undefined {
  const affectedParentIds = new Set<string>();
  const changedFolderIds = new Set<string>();
  const beforeBookmarks = new Map(
    before.bookmarks.map((item) => [item.id, item]),
  );
  const afterBookmarks = new Map(
    after.bookmarks.map((item) => [item.id, item]),
  );
  const beforeFolders = new Map(before.folders.map((item) => [item.id, item]));
  const afterFolders = new Map(after.folders.map((item) => [item.id, item]));

  for (const id of new Set([
    ...beforeBookmarks.keys(),
    ...afterBookmarks.keys(),
  ])) {
    const previous = beforeBookmarks.get(id);
    const current = afterBookmarks.get(id);
    if (sameRecord(previous, current)) continue;
    if (previous) affectedParentIds.add(previous.parentId);
    if (current) affectedParentIds.add(current.parentId);
  }

  for (const id of new Set([...beforeFolders.keys(), ...afterFolders.keys()])) {
    const previous = beforeFolders.get(id);
    const current = afterFolders.get(id);
    if (sameRecord(previous, current)) continue;
    changedFolderIds.add(id);
    if (previous?.parentId) affectedParentIds.add(previous.parentId);
    if (current?.parentId) affectedParentIds.add(current.parentId);
  }

  const favoritesChanged = !sameRecord(before.favorites, after.favorites);
  if (!affectedParentIds.size && !changedFolderIds.size && !favoritesChanged)
    return undefined;

  const deletedFolderPaths = before.folders
    .filter(({ id }) => !afterFolders.has(id))
    .map(({ id }) => ({
      ancestorIds: folderAncestorIds(beforeFolders, id),
      folderId: id,
    }));

  return {
    affectedParentIds: [...affectedParentIds],
    changedFolderIds: [...changedFolderIds],
    deletedFolderPaths,
    fullRefresh: false,
    navigationChanged: true,
    profileId,
  };
}

function sameRecord(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function folderAncestorIds(
  folders: ReadonlyMap<string, UndoProfileState['folders'][number]>,
  folderId: string,
): string[] {
  const ancestors: string[] = [];
  const visited = new Set<string>([folderId]);
  let parentId = folders.get(folderId)?.parentId ?? null;
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    ancestors.unshift(parentId);
    parentId = folders.get(parentId)?.parentId ?? null;
  }
  return ancestors;
}
