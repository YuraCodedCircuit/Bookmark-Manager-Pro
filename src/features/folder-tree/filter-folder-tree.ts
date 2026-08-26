import type { FolderTreeNode } from './folder-tree-data';

export function filterFolderTree(
  node: FolderTreeNode,
  query: string,
): FolderTreeNode | null {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (normalizedQuery.length === 0) {
    return node;
  }

  const matchingChildren = node.children
    ?.map((child) => filterFolderTree(child, normalizedQuery))
    .filter((child): child is FolderTreeNode => child !== null);
  const isMatch = node.name.toLocaleLowerCase().includes(normalizedQuery);

  if (!isMatch && (matchingChildren?.length ?? 0) === 0) {
    return null;
  }

  return matchingChildren !== undefined && matchingChildren.length > 0
    ? { ...node, children: matchingChildren }
    : { id: node.id, name: node.name };
}
