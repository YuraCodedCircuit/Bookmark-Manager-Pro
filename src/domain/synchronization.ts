import { z } from 'zod';
import { safeBookmarkUrlSchema } from './bookmark-url';
import {
  syncNodeSchema,
  validateSyncTree,
  type SyncNode,
  type SyncPreview,
} from './sync-preview';

const sideSchema = z.enum(['extension', 'browser']);
export type SyncSide = z.infer<typeof sideSchema>;
export const syncLinkSchema = z.object({
  extension: z.string(),
  browser: z.string(),
  e: syncNodeSchema.nullable(),
  b: syncNodeSchema.nullable(),
});
export type SyncLink = z.infer<typeof syncLinkSchema>;
export const syncOperationSchema = z.object({
  side: sideSchema,
  kind: z.enum(['create', 'write', 'delete']),
  id: z.string(),
  before: syncNodeSchema.nullable(),
  after: syncNodeSchema.nullable(),
  source: syncNodeSchema.nullable().optional(),
  sourceId: z.string().optional(),
  started: z.boolean().default(false),
  existingIds: z.array(z.string()).optional(),
});
export type SyncOperation = z.infer<typeof syncOperationSchema>;
export const syncConnectionSchema = z.object({
  version: z.literal(1),
  profileId: z.uuid(),
  extensionRoot: z.string(),
  browserRoot: z.string(),
  direction: z.enum(['browser-to-extension', 'extension-to-browser', 'both']),
  status: z.enum([
    'connected',
    'paused',
    'conflict',
    'error',
    'missing-root',
    'permission',
  ]),
  links: z.array(syncLinkSchema),
  operations: z.array(syncOperationSchema),
  plannedLinks: z.array(syncLinkSchema).default([]),
  lastSuccess: z.number().nullable(),
  issue: z.string().default(''),
});
export type SyncConnection = z.infer<typeof syncConnectionSchema>;
export interface SyncConflict {
  id: string;
  kind: 'pair' | 'edit' | 'delete';
  extension: SyncNode[];
  browser: SyncNode[];
}
export const syncChoicesSchema = z.record(z.string(), z.string());
export type SyncChoices = z.infer<typeof syncChoicesSchema>;
export interface SyncPlan {
  links: SyncLink[];
  operations: SyncOperation[];
  conflicts: SyncConflict[];
  preview: SyncPreview;
}

/** Iterative scope traversal has no nesting-depth limit. */
export function syncSubtree(
  nodes: readonly SyncNode[],
  root: string,
): SyncNode[] {
  const children = new Map<string, SyncNode[]>();
  for (const node of nodes)
    if (node.parentId !== null) {
      const list = children.get(node.parentId) ?? [];
      list.push(node);
      children.set(node.parentId, list);
    }
  const first = nodes.find(
    (node) => node.id === root && node.url === undefined,
  );
  if (!first) throw new Error('missing-root');
  const result: SyncNode[] = [],
    pending = [first];
  while (pending.length) {
    const node = pending.pop()!;
    result.push(node);
    for (const child of children.get(node.id) ?? []) pending.push(child);
  }
  return result;
}

export function syncNodeEqual(
  a: SyncNode | null | undefined,
  b: SyncNode | null | undefined,
): boolean {
  return !a || !b
    ? !a && !b
    : a.title === b.title &&
        a.url === b.url &&
        a.parentId === b.parentId &&
        a.index === b.index;
}
const supported = (node: SyncNode) =>
  node.title.trim().length > 0 &&
  node.title.length <= 200 &&
  (node.url === undefined || safeBookmarkUrlSchema.safeParse(node.url).success);
const matchKey = (node: SyncNode) =>
  node.url === undefined
    ? `folder:${node.title}`
    : `url:${safeBookmarkUrlSchema.parse(node.url)}`;

/** Pure three-way reconciliation. Roots retain their names and identities; initial merges never delete. */
export function planSynchronization(
  connection: SyncConnection,
  extensionInput: unknown,
  browserInput: unknown,
  choices: SyncChoices = {},
  createId: () => string = () => crypto.randomUUID(),
): SyncPlan {
  const extension = syncSubtree(
    validateSyncTree(extensionInput),
    connection.extensionRoot,
  );
  const browser = syncSubtree(
    validateSyncTree(browserInput),
    connection.browserRoot,
  );
  const maps = {
    extension: new Map(extension.map((n) => [n.id, n])),
    browser: new Map(browser.map((n) => [n.id, n])),
  };
  const children = {
    extension: new Map<string, SyncNode[]>(),
    browser: new Map<string, SyncNode[]>(),
  };
  for (const side of ['extension', 'browser'] as const)
    for (const node of maps[side].values()) {
      if (node.parentId === null) continue;
      const siblings = children[side].get(node.parentId) ?? [];
      siblings.push(node);
      children[side].set(node.parentId, siblings);
    }
  const result: SyncPlan = {
    links: structuredClone(connection.links),
    operations: [],
    conflicts: [],
    preview: {
      extension: { add: 0, update: 0, delete: 0 },
      browser: { add: 0, update: 0, delete: 0 },
      conflicts: 0,
      skipped: 0,
    },
  };
  const initial = !connection.links.length;
  if (initial)
    result.links.push({
      extension: connection.extensionRoot,
      browser: connection.browserRoot,
      e: null,
      b: null,
    });
  const used = {
    extension: new Set(result.links.map((l) => l.extension)),
    browser: new Set(result.links.map((l) => l.browser)),
  };
  const blocked = new Set<string>();
  for (const side of ['extension', 'browser'] as const)
    for (const node of maps[side].values()) {
      if (
        node.id ===
          connection[side === 'extension' ? 'extensionRoot' : 'browserRoot'] ||
        supported(node)
      )
        continue;
      result.preview.skipped++;
      let current: SyncNode | undefined = node;
      while (current) {
        blocked.add(`${side}:${current.id}`);
        current = current.parentId
          ? maps[side].get(current.parentId)
          : undefined;
      }
    }
  // Discover matches only inside already paired parents, including newly paired folders.
  for (let cursor = 0; cursor < result.links.length; cursor++) {
    const parent = result.links[cursor]!;
    const groups = new Map<
      string,
      { extension: SyncNode[]; browser: SyncNode[] }
    >();
    for (const side of ['extension', 'browser'] as const)
      for (const node of children[side].get(parent[side]) ?? []) {
        if (
          node.parentId !== parent[side] ||
          used[side].has(node.id) ||
          !supported(node)
        )
          continue;
        const key = matchKey(node),
          group = groups.get(key) ?? { extension: [], browser: [] };
        group[side].push(node);
        groups.set(key, group);
      }
    for (const group of groups.values()) {
      const e = [...group.extension],
        b = [...group.browser];
      if (e.length && b.length && (e.length > 1 || b.length > 1)) {
        for (const node of [...e]) {
          const paired = b.find((n) => n.id === choices[`pair:${node.id}`]);
          if (!paired) continue;
          result.links.push({
            extension: node.id,
            browser: paired.id,
            e: null,
            b: null,
          });
          used.extension.add(node.id);
          used.browser.add(paired.id);
          e.splice(e.indexOf(node), 1);
          b.splice(b.indexOf(paired), 1);
        }
        if (e.length && b.length) {
          result.conflicts.push({
            id: `pair:${e[0]!.id}`,
            kind: 'pair',
            extension: e,
            browser: b,
          });
          continue;
        }
      } else if (e.length && b.length) {
        const en = e.shift()!,
          bn = b.shift()!;
        result.links.push({
          extension: en.id,
          browser: bn.id,
          e: null,
          b: null,
        });
        used.extension.add(en.id);
        used.browser.add(bn.id);
      }
      for (const side of ['extension', 'browser'] as const) {
        if (
          (side === 'extension' &&
            connection.direction === 'browser-to-extension') ||
          (side === 'browser' &&
            connection.direction === 'extension-to-browser')
        )
          continue;
        for (const node of side === 'extension' ? e : b) {
          const other: SyncSide =
            side === 'extension' ? 'browser' : 'extension';
          const id =
            other === 'extension' ? createId() : `pending:${createId()}`;
          const link: SyncLink = {
            extension: side === 'extension' ? node.id : id,
            browser: side === 'browser' ? node.id : id,
            e: null,
            b: null,
          };
          result.links.push(link);
          used[side].add(node.id);
          used[other].add(id);
        }
      }
    }
  }
  const byE = new Map(result.links.map((l) => [l.extension, l])),
    byB = new Map(result.links.map((l) => [l.browser, l]));
  const translate = (
    node: SyncNode,
    side: SyncSide,
    id: string,
  ): SyncNode | null => {
    const parent =
      side === 'extension'
        ? byB.get(node.parentId ?? '')?.extension
        : byE.get(node.parentId ?? '')?.browser;
    return parent
      ? {
          ...node,
          id,
          parentId: parent,
          title: node.title.trim(),
          ...(node.url === undefined
            ? {}
            : { url: safeBookmarkUrlSchema.parse(node.url) }),
        }
      : null;
  };
  for (const link of result.links) {
    const e = maps.extension.get(link.extension),
      b = maps.browser.get(link.browser);
    if (link.extension === connection.extensionRoot) {
      link.e = e!;
      link.b = b!;
      continue;
    }
    if (
      blocked.has(`extension:${link.extension}`) ||
      blocked.has(`browser:${link.browser}`)
    )
      continue;
    const newLink = !link.e && !link.b;
    let source: SyncSide =
      connection.direction === 'extension-to-browser' ? 'extension' : 'browser';
    if (connection.direction === 'both') {
      const ec = !syncNodeEqual(e, link.e),
        bc = !syncNodeEqual(b, link.b);
      const equivalent =
        e && b && syncNodeEqual(e, translate(b, 'extension', e.id));
      if (ec && bc && !equivalent) {
        const id = `edit:${link.extension}`;
        const choice = choices[id];
        if (choice === 'extension' || choice === 'browser') source = choice;
        else {
          result.conflicts.push({
            id,
            kind: !e || !b ? 'delete' : 'edit',
            extension: e ? [e] : [],
            browser: b ? [b] : [],
          });
          continue;
        }
      } else source = ec ? 'extension' : 'browser';
      if (newLink && (!e || !b)) source = e ? 'extension' : 'browser';
    }
    const target: SyncSide = source === 'extension' ? 'browser' : 'extension';
    const from = source === 'extension' ? e : b,
      to = target === 'extension' ? e : b;
    if (from && !supported(from)) continue;
    if (!from) {
      if (!newLink && to) {
        result.operations.push({
          side: target,
          kind: 'delete',
          id: to.id,
          before: to,
          after: null,
          source: null,
          sourceId: link[source],
          started: false,
        });
        result.preview[target].delete++;
      }
      link.e = null;
      link.b = null;
      continue;
    }
    const after = translate(from, target, link[target]);
    if (!after) continue;
    if (!to || !syncNodeEqual(to, after)) {
      result.operations.push({
        side: target,
        kind: to ? 'write' : 'create',
        id: link[target],
        before: to ?? null,
        after,
        source: from,
        sourceId: from.id,
        started: false,
      });
      result.preview[target][to ? 'update' : 'add']++;
    }
    link.e = target === 'extension' ? after : from;
    link.b = target === 'browser' ? after : from;
  }
  // Concurrent additions need one shared order, otherwise each side's insertion
  // shifts the other side and subsequent wakes continually swap their positions.
  if (connection.direction === 'both' && !result.conflicts.length) {
    const groups = new Map<string, SyncLink[]>();
    for (const link of result.links) {
      if (
        !link.e?.parentId ||
        !link.b?.parentId ||
        link.extension === connection.extensionRoot
      )
        continue;
      const group = groups.get(link.e.parentId) ?? [];
      group.push(link);
      groups.set(link.e.parentId, group);
    }
    for (const group of groups.values()) {
      const newOnExtension = group.some(
        (link) => !maps.extension.has(link.extension),
      );
      const newOnBrowser = group.some(
        (link) => !maps.browser.has(link.browser),
      );
      if (!newOnExtension || !newOnBrowser) continue;
      group.sort(
        (a, b) =>
          Number(!maps.extension.has(a.extension)) -
            Number(!maps.extension.has(b.extension)) ||
          a.e!.index - b.e!.index ||
          a.extension.localeCompare(b.extension),
      );
      group.forEach((link, index) => {
        for (const side of ['extension', 'browser'] as const) {
          const key = side === 'extension' ? 'e' : 'b';
          const after = { ...link[key]!, index };
          link[key] = after;
          const existing = result.operations.find(
            (op) => op.side === side && op.id === link[side],
          );
          if (existing) existing.after = after;
          else {
            const before = maps[side].get(link[side]);
            if (before && !syncNodeEqual(before, after)) {
              result.operations.push({
                side,
                kind: 'write',
                id: after.id,
                before,
                after,
                started: false,
              });
              result.preview[side].update++;
            }
          }
        }
      });
    }
  }
  // Delete leaves first, and preserve any folder containing unlinked/blocked content.
  const deletions = new Set(
    result.operations
      .filter((o) => o.kind === 'delete')
      .map((o) => `${o.side}:${o.id}`),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const op of result.operations)
      if (op.kind === 'delete' && deletions.has(`${op.side}:${op.id}`)) {
        if (
          [...maps[op.side].values()].some(
            (n) => n.parentId === op.id && !deletions.has(`${op.side}:${n.id}`),
          )
        ) {
          deletions.delete(`${op.side}:${op.id}`);
          changed = true;
        }
      }
  }
  result.operations = result.operations.filter(
    (op) => op.kind !== 'delete' || deletions.has(`${op.side}:${op.id}`),
  );
  const depth = (op: SyncOperation) => {
    let n = op.before,
      d = 0;
    while (n?.parentId) {
      d++;
      n = maps[op.side].get(n.parentId) ?? null;
    }
    return d;
  };
  const plannedNodes = new Map(
    result.links.flatMap((link) =>
      [link.e, link.b]
        .filter((node): node is SyncNode => !!node)
        .map((node) => [node.id, node] as const),
    ),
  );
  const targetDepth = (op: SyncOperation) => {
    let node = op.after,
      count = 0;
    const visited = new Set<string>();
    while (node?.parentId && !visited.has(node.id)) {
      visited.add(node.id);
      count++;
      node = plannedNodes.get(node.parentId) ?? null;
    }
    return count;
  };
  result.operations.sort((a, b) =>
    a.kind === 'delete'
      ? b.kind === 'delete'
        ? depth(b) - depth(a)
        : 1
      : b.kind === 'delete'
        ? -1
        : targetDepth(a) - targetDepth(b) ||
          (a.after?.index ?? 0) - (b.after?.index ?? 0),
  );
  result.links = result.links.filter(
    (l) =>
      l.e ||
      l.b ||
      blocked.has(`extension:${l.extension}`) ||
      blocked.has(`browser:${l.browser}`),
  );
  for (const side of ['extension', 'browser'] as const)
    result.preview[side].delete = result.operations.filter(
      (o) => o.side === side && o.kind === 'delete',
    ).length;
  result.preview.conflicts = result.conflicts.length;
  return result;
}
