import type { Folder } from '../../domain/folder';

export interface FolderTreeNode {
  id: string;
  name: string;
  children?: readonly FolderTreeNode[];
}

/** Returns the newest non-root folder using a stable ID tie-breaker. */
export function findNewestNonRootFolder(
  folders: readonly Folder[],
): Folder | undefined {
  return folders.reduce<Folder | undefined>((newest, folder) => {
    if (folder.isRoot) return newest;
    if (!newest || folder.createdAt > newest.createdAt) return folder;
    if (folder.createdAt === newest.createdAt && folder.id > newest.id)
      return folder;
    return newest;
  }, undefined);
}

/** Returns only the ancestors needed to reveal a selected folder. */
export function findFolderAncestorIds(
  folders: readonly Folder[],
  folderId: string,
): ReadonlySet<string> {
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const ancestors = new Set<string>();
  const visited = new Set<string>([folderId]);
  let current = foldersById.get(folderId);
  while (current?.parentId && !visited.has(current.parentId)) {
    visited.add(current.parentId);
    ancestors.add(current.parentId);
    current = foldersById.get(current.parentId);
  }
  return ancestors;
}

/** Converts flat profile folders into the recursive navigation view model. */
export function buildFolderTree(folders: readonly Folder[]): FolderTreeNode {
  const root = folders.find((folder) => folder.isRoot);
  if (!root) return { id: 'loading', name: 'Home' };
  const build = (folder: Folder): FolderTreeNode => {
    const children = folders.filter(
      (candidate) => candidate.parentId === folder.id,
    );
    return {
      id: folder.id,
      name: folder.title,
      ...(children.length ? { children: children.map(build) } : {}),
    };
  };
  return build(root);
}

export const folderTree: FolderTreeNode = {
  id: 'home',
  name: 'Home',
  children: [
    {
      id: 'work',
      name: 'Work',
      children: [
        { id: 'project-docs', name: 'Project Docs' },
        { id: 'design-resources', name: 'Design Resources' },
        {
          id: 'research',
          name: 'Research',
          children: [
            { id: 'mdn-web-docs', name: 'MDN Web Docs' },
            { id: 'reference-library', name: 'Reference Library' },
          ],
        },
      ],
    },
    {
      id: 'personal',
      name: 'Personal',
      children: [
        { id: 'reading-list', name: 'Reading List' },
        { id: 'saved-articles', name: 'Saved Articles' },
      ],
    },
  ],
};
