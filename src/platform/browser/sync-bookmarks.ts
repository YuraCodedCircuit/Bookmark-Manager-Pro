import { z } from 'zod';
import {
  syncResponseSchema,
  type SyncRequest,
  type SyncResponse,
} from '../../messaging/sync-protocol';

import { validateSyncTree, type SyncNode } from '../../domain/sync-preview';

/** Typed browser boundary; permission requests must originate in a user gesture. */
export interface SyncBookmarksAdapter {
  ready(): Promise<void>;
  requestAccess(): Promise<boolean>;
  readTree(): Promise<SyncNode[]>;
  hasPermission?(): Promise<boolean>;
  command?(request: SyncRequest): Promise<SyncResponse>;
}

interface SyncBrowserApi {
  runtime?: { sendMessage(message: unknown): Promise<unknown> };
  permissions: {
    request(input: { permissions: ['bookmarks'] }): Promise<boolean>;
    contains(input: { permissions: ['bookmarks'] }): Promise<boolean>;
  };
  bookmarks: { getTree(): Promise<unknown> };
}

const nativeNodeSchema = z.object({
  id: z.string().min(1).max(256),
  title: z.string().max(10000),
  url: z.string().max(10000).optional(),
  children: z.array(z.unknown()).optional(),
});

/** Flattens and validates untrusted browser trees without recursive parsing. */
export function parseNativeBookmarkTree(input: unknown): SyncNode[] {
  const roots = z.array(z.unknown()).parse(input);
  const pending = roots.map((value, index) => ({
    value,
    index,
    parentId: null as string | null,
  }));
  const nodes: SyncNode[] = [];
  while (pending.length) {
    const entry = pending.pop();
    if (!entry) break;
    const node = nativeNodeSchema.parse(entry.value);
    if (node.url !== undefined && node.children?.length)
      throw new Error('sync-tree-invalid-bookmark');
    nodes.push({
      id: node.id,
      title: node.title,
      parentId: entry.parentId,
      index: entry.index,
      ...(node.url === undefined ? {} : { url: node.url }),
    });
    node.children?.forEach((value, index) =>
      pending.push({ value, index, parentId: node.id }),
    );
  }
  return validateSyncTree(nodes);
}

/** Creates a per-surface adapter; a missing extension API is supported degradation. */
export function createSyncBookmarksAdapter(
  api?: SyncBrowserApi,
): SyncBookmarksAdapter {
  // Start the import ahead of the click so Firefox keeps the permission request
  // inside the user gesture once the setup window is visible.
  let resolved = api;
  let initializationError: unknown;
  const host = globalThis as typeof globalThis & {
    chrome?: { runtime?: { id?: string } };
    browser?: { runtime?: { id?: string } };
  };
  const ready = api
    ? Promise.resolve()
    : host.chrome?.runtime?.id || host.browser?.runtime?.id
      ? import('webextension-polyfill')
          .then((module) => {
            resolved = module.default;
          })
          .catch((error: unknown) => {
            initializationError = error;
          })
      : Promise.resolve();
  return {
    async hasPermission() {
      await ready;
      return resolved
        ? resolved.permissions.contains({ permissions: ['bookmarks'] })
        : false;
    },
    async command(request) {
      await ready;
      if (!resolved?.runtime) throw new Error('sync-api-unavailable');
      return syncResponseSchema.parse(
        await resolved.runtime.sendMessage(request),
      );
    },
    ready: async () => {
      await ready;
      if (initializationError)
        throw new Error('sync-api-unavailable', { cause: initializationError });
    },
    requestAccess() {
      if (resolved)
        return resolved.permissions.request({ permissions: ['bookmarks'] });
      return ready.then(() => {
        if (!resolved) throw new Error('sync-api-unavailable');
        return resolved.permissions.request({ permissions: ['bookmarks'] });
      });
    },
    async readTree() {
      await ready;
      if (!resolved) throw new Error('sync-api-unavailable');
      if (
        !(await resolved.permissions.contains({ permissions: ['bookmarks'] }))
      )
        throw new Error('sync-permission-required');
      return parseNativeBookmarkTree(await resolved.bookmarks.getTree());
    },
  };
}
