import type { FolderTreeNode } from './folder-tree-data';

export function filterFolderTree(
  node: FolderTreeNode,
  query: string,
): FolderTreeNode | null {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (normalizedQuery.length === 0) {
    return node;
  }

  const pending = [node],
    order: FolderTreeNode[] = [];
  while (pending.length) {
    const current = pending.pop()!;
    order.push(current);
    for (const child of current.children ?? []) pending.push(child);
  }
  const matches = new Map<FolderTreeNode, FolderTreeNode>();
  for (let index = order.length - 1; index >= 0; index--) {
    const current = order[index]!;
    const children = (current.children ?? []).flatMap((child) => {
      const match = matches.get(child);
      return match ? [match] : [];
    });
    if (
      children.length ||
      current.name.toLocaleLowerCase().includes(normalizedQuery)
    )
      matches.set(
        current,
        children.length
          ? { ...current, children }
          : { id: current.id, name: current.name },
      );
  }
  return matches.get(node) ?? null;
}
