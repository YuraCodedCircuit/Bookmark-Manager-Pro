import { z } from 'zod';

import { safeBookmarkUrlSchema } from './bookmark-url';

/** Validated flat tree data shared by previews and durable reconciliation baselines. */
export const syncNodeSchema = z.object({
  id: z.string().min(1).max(256),
  parentId: z.string().min(1).max(256).nullable(),
  title: z.string().max(10000),
  url: z.string().max(10000).optional(),
  index: z.number().int().nonnegative(),
});
export type SyncNode = z.infer<typeof syncNodeSchema>;
export type SyncDirection =
  'browser-to-extension' | 'extension-to-browser' | 'both';
export interface SyncPreview {
  extension: { add: number; update: number; delete: number };
  browser: { add: number; update: number; delete: number };
  conflicts: number;
  skipped: number;
}

/** Validates tree identity and ancestry before any matching or folder selection. */
export function validateSyncTree(input: unknown): SyncNode[] {
  const nodes = z.array(syncNodeSchema).parse(input);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (byId.size !== nodes.length) throw new Error('sync-tree-duplicate-id');
  const completed = new Set<string>();
  for (const node of nodes) {
    let current: SyncNode | undefined = node;
    const ancestors = new Set<string>();
    while (current && !completed.has(current.id)) {
      if (ancestors.has(current.id)) throw new Error('sync-tree-cycle');
      ancestors.add(current.id);
      if (current.parentId === null) break;
      const parent: SyncNode | undefined = byId.get(current.parentId);
      if (!parent || parent.url !== undefined)
        throw new Error('sync-tree-invalid-parent');
      current = parent;
    }
    for (const id of ancestors) completed.add(id);
  }
  return nodes;
}

/** Returns folder paths for native selection controls without exposing bookmark URLs. */
export function syncFolderOptions(nodes: readonly SyncNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return nodes
    .filter((node) => node.url === undefined)
    .map((node) => {
      const parts = [node.title];
      let parent = node.parentId === null ? undefined : byId.get(node.parentId);
      while (parent) {
        if (parent.title) parts.unshift(parent.title);
        parent =
          parent.parentId === null ? undefined : byId.get(parent.parentId);
      }
      return { id: node.id, label: parts.filter(Boolean).join(' / ') };
    })
    .filter((option) => option.label.length > 0);
}

/** Builds only the selected path, avoiding a full path copy for every descendant. */
export function syncSelectedPath(
  nodes: readonly SyncNode[],
  id: string,
): string {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const parts: string[] = [],
    visited = new Set<string>();
  let node = byId.get(id);
  while (node && !visited.has(node.id)) {
    visited.add(node.id);
    if (node.title) parts.push(node.title);
    node = node.parentId ? byId.get(node.parentId) : undefined;
  }
  return parts.reverse().join(' / ');
}

/**
 * Calculates a conservative first-connection merge. Never proposes initial
 * deletions or resolves ambiguous matches. Counts below ambiguous folders are
 * withheld until explicit pairing exists; this result is not an executable plan.
 */
export function previewInitialSync(
  extensionInput: unknown,
  browserInput: unknown,
  extensionRoot: string,
  browserRoot: string,
  direction: SyncDirection,
): SyncPreview {
  const extension = validateSyncTree(extensionInput);
  const browser = validateSyncTree(browserInput);
  for (const [nodes, id] of [
    [extension, extensionRoot],
    [browser, browserRoot],
  ] as const) {
    if (!nodes.some((node) => node.id === id && node.url === undefined))
      throw new Error('sync-folder-unavailable');
  }
  const result: SyncPreview = {
    extension: { add: 0, update: 0, delete: 0 },
    browser: { add: 0, update: 0, delete: 0 },
    conflicts: 0,
    skipped: 0,
  };
  const children = (nodes: SyncNode[]) => {
    const map = new Map<string, SyncNode[]>();
    for (const node of nodes) {
      if (node.parentId === null) continue;
      const siblings = map.get(node.parentId) ?? [];
      siblings.push(node);
      map.set(node.parentId, siblings);
    }
    return map;
  };
  const extChildren = children(extension);
  const browserChildren = children(browser);
  const group = (nodes: readonly SyncNode[]) => {
    const groups = new Map<string, SyncNode[]>();
    for (const node of nodes) {
      const parsed =
        node.url === undefined
          ? undefined
          : safeBookmarkUrlSchema.safeParse(node.url);
      if (parsed && !parsed.success) {
        result.skipped++;
        continue;
      }
      const key = parsed?.success
        ? `url:${parsed.data}`
        : `folder:${node.title}`;
      const matches = groups.get(key) ?? [];
      matches.push(node);
      groups.set(key, matches);
    }
    return groups;
  };
  const countSubtree = (root: SyncNode, map: Map<string, SyncNode[]>) => {
    let count = 0;
    const pending = [root];
    while (pending.length) {
      const node = pending.pop();
      if (!node) break;
      if (
        node.url !== undefined &&
        !safeBookmarkUrlSchema.safeParse(node.url).success
      ) {
        result.skipped++;
        continue;
      }
      count++;
      pending.push(...(map.get(node.id) ?? []));
    }
    return count;
  };
  const pairs: [string, string][] = [[extensionRoot, browserRoot]];
  while (pairs.length) {
    const pair = pairs.pop();
    if (!pair) break;
    const eg = group(extChildren.get(pair[0]) ?? []);
    const bg = group(browserChildren.get(pair[1]) ?? []);
    for (const key of new Set([...eg.keys(), ...bg.keys()])) {
      const left = eg.get(key) ?? [];
      const right = bg.get(key) ?? [];
      if (
        left.length &&
        right.length &&
        (left.length > 1 || right.length > 1)
      ) {
        result.conflicts++;
        continue;
      }
      const e = left[0];
      const b = right[0];
      if (e && b) {
        if (e.url === undefined && b.url === undefined)
          pairs.push([e.id, b.id]);
        if (e.title !== b.title || e.index !== b.index) {
          if (direction === 'browser-to-extension') result.extension.update++;
          else if (direction === 'extension-to-browser')
            result.browser.update++;
          else result.conflicts++;
        }
      } else if (direction !== 'browser-to-extension') {
        for (const node of left)
          result.browser.add += countSubtree(node, extChildren);
      }
      if (!e && direction !== 'extension-to-browser') {
        for (const node of right)
          result.extension.add += countSubtree(node, browserChildren);
      }
    }
  }
  return result;
}
