import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BookmarkManagerDatabase } from '../../storage/database';
import { SyncRepository } from '../../storage/sync-repository';
import { folderSchema } from '../../domain/folder';
import type { SyncNode } from '../../domain/sync-preview';
import type { SyncRequest } from '../../messaging/sync-protocol';
import { SyncService, type SyncNativePort } from './sync-service';

const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
const rootId = '11111111-1111-4111-8111-111111111111';
const databases: BookmarkManagerDatabase[] = [];
afterEach(async () => {
  for (const db of databases.splice(0)) {
    db.close();
    await db.delete();
  }
});
async function fixture(
  direction: 'both' | 'browser-to-extension' | 'extension-to-browser' = 'both',
) {
  const db = new BookmarkManagerDatabase(`sync-test-${crypto.randomUUID()}`);
  databases.push(db);
  const repo = new SyncRepository(db);
  await db.metadata.put({ key: 'activeProfileId', value: profileId });
  await db.folders.put(
    folderSchema.parse({
      id: rootId,
      profileId,
      parentId: null,
      title: 'Home',
      index: 0,
      isRoot: true,
      tags: [],
      note: '',
      cardAppearance: { kind: 'color', value: '#123456' },
      backgroundAppearance: { kind: 'none' },
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  let nodes: SyncNode[] = [
    { id: '0', parentId: null, title: '', index: 0 },
    { id: 'bar', parentId: '0', title: 'Bar', index: 0 },
    {
      id: 'b1',
      parentId: 'bar',
      title: 'Example',
      index: 0,
      url: 'https://example.com/',
    },
  ];
  const place = (node: SyncNode) => {
    const siblings = nodes
      .filter((n) => n.parentId === node.parentId && n.id !== node.id)
      .sort((a, b) => a.index - b.index);
    const index = Math.min(node.index, siblings.length);
    siblings.splice(index, 0, { ...node, index });
    nodes = nodes
      .filter((n) => n.parentId !== node.parentId && n.id !== node.id)
      .concat(siblings.map((n, index) => ({ ...n, index })));
  };
  const native: SyncNativePort = {
    hasPermission: vi.fn(async () => true),
    readTree: vi.fn(async () => structuredClone(nodes)),
    create: vi.fn(async (node) => {
      const id = `native-${crypto.randomUUID()}`;
      place({ ...node, id });
      return id;
    }),
    write: vi.fn(async (node) => {
      place(node);
    }),
    remove: vi.fn(async (id) => {
      nodes = nodes.filter((n) => n.id !== id);
    }),
  };
  const report = vi.fn(async () => undefined);
  const publishContentChange = vi.fn(async () => undefined);
  let service = new SyncService(repo, native, report, publishContentChange);
  const command = (
    command: SyncRequest['command'],
    extra: Partial<SyncRequest> = {},
  ) =>
    service.command({
      type: 'sync.command',
      protocolVersion: 1,
      profileId,
      command,
      ...extra,
    });
  const preview = () =>
    command('preview', {
      setup: {
        extensionRoot: rootId,
        browserRoot: 'bar',
        direction,
        choices: {},
      },
    });
  const enable = async () => {
    const p = await preview();
    expect(p.error).toBeUndefined();
    expect(p.conflicts).toHaveLength(0);
    return command('enable', { token: p.token! });
  };
  return {
    db,
    repo,
    native,
    report,
    publishContentChange,
    command,
    preview,
    enable,
    nodes: () => nodes,
    setNodes: (value: SyncNode[]) => {
      nodes = value;
    },
    wake: () => service.wake(),
    restart: () => {
      service = new SyncService(repo, native, report, publishContentChange);
    },
  };
}
describe('durable synchronization', () => {
  it('publishes one profile-scoped change after extension mutations complete', async () => {
    const f = await fixture('browser-to-extension');

    await f.enable();

    expect(f.publishContentChange).toHaveBeenCalledOnce();
    expect(f.publishContentChange).toHaveBeenCalledWith({
      affectedParentIds: [rootId],
      changedFolderIds: [],
      deletedFolderPaths: [],
      fullRefresh: false,
      navigationChanged: true,
      profileId,
    });
  });

  it('retains a completed change summary until publication can be retried', async () => {
    const f = await fixture('browser-to-extension');
    const diagnostic = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    f.publishContentChange.mockRejectedValueOnce(new Error('unavailable'));
    try {
      await f.enable();
      expect((await f.repo.get(profileId))?.pendingContentChange).toBeDefined();
      await f.wake();
      expect(f.publishContentChange).toHaveBeenCalledTimes(2);
      expect(
        (await f.repo.get(profileId))?.pendingContentChange,
      ).toBeUndefined();
    } finally {
      diagnostic.mockRestore();
    }
  });

  it('keeps a stable baseline when native values normalize in extension storage', async () => {
    const f = await fixture('browser-to-extension');
    f.setNodes(
      f
        .nodes()
        .map((n) =>
          n.id === 'b1'
            ? { ...n, title: ' Example ', url: 'https://example.com' }
            : n,
        ),
    );
    await f.enable();
    const before = await f.db.bookmarks.toArray();
    await f.wake();
    await f.wake();
    expect(await f.db.bookmarks.toArray()).toEqual(before);
    expect(before[0]).toMatchObject({
      title: 'Example',
      url: 'https://example.com/',
    });
  });
  it('converges after merging different existing contents on both sides', async () => {
    const f = await fixture();
    await f.db.bookmarks.put({
      id: crypto.randomUUID(),
      profileId,
      parentId: rootId,
      title: 'Extension item',
      url: 'https://extension.example/',
      index: 0,
      tags: [],
      note: '',
      cardAppearance: { kind: 'color', value: '#123456' },
      createdAt: 1,
      updatedAt: 1,
    });
    expect((await f.enable()).connection?.status).toBe('connected');
    await f.wake();
    const before = JSON.stringify([await f.repo.tree(profileId), f.nodes()]);
    await f.wake();
    await f.wake();
    expect(JSON.stringify([await f.repo.tree(profileId), f.nodes()])).toBe(
      before,
    );
    expect((await f.repo.get(profileId))?.status).toBe('connected');
    expect(await f.db.bookmarks.count()).toBe(2);
  });
  it('requires a current preview, imports descendants, and keeps roots and local properties', async () => {
    const f = await fixture('browser-to-extension');
    const preview = await f.preview();
    f.setNodes(
      f.nodes().map((n) => (n.id === 'b1' ? { ...n, title: 'Changed' } : n)),
    );
    expect((await f.command('enable', { token: preview.token! })).error).toBe(
      'stale',
    );
    expect(await f.db.bookmarks.count()).toBe(0);
    expect((await f.enable()).connection?.status).toBe('connected');
    const bookmark = (await f.db.bookmarks.toArray())[0]!;
    await f.db.bookmarks.update(bookmark.id, {
      note: 'Local note',
      tags: ['local'],
    });
    f.setNodes(
      f.nodes().map((n) => (n.id === 'b1' ? { ...n, title: 'Updated' } : n)),
    );
    await f.wake();
    expect(await f.db.bookmarks.get(bookmark.id)).toMatchObject({
      title: 'Updated',
      note: 'Local note',
      tags: ['local'],
    });
    expect((await f.db.folders.get(rootId))?.title).toBe('Home');
    expect(await f.db.undoHistory.count()).toBe(0);
  });
  it('propagates edits both ways, pauses competing edits, and permits explicit resolution', async () => {
    const f = await fixture();
    await f.enable();
    const bookmark = (await f.db.bookmarks.toArray())[0]!;
    await f.db.bookmarks.update(bookmark.id, { title: 'Local edit' });
    await f.wake();
    expect(f.nodes().find((n) => n.id === 'b1')?.title).toBe('Local edit');
    await f.db.bookmarks.update(bookmark.id, { title: 'Extension choice' });
    f.setNodes(
      f
        .nodes()
        .map((n) => (n.id === 'b1' ? { ...n, title: 'Browser choice' } : n)),
    );
    await f.wake();
    expect((await f.repo.get(profileId))?.status).toBe('conflict');
    const preview = await f.preview();
    expect(preview.conflicts).toHaveLength(1);
    const resolved = await f.command('preview', {
      setup: {
        extensionRoot: rootId,
        browserRoot: 'bar',
        direction: 'both',
        choices: { [`edit:${bookmark.id}`]: 'extension' },
      },
    });
    await f.command('enable', { token: resolved.token! });
    expect(f.nodes().find((n) => n.id === 'b1')?.title).toBe(
      'Extension choice',
    );
  });
  it('propagates deletion, and pause and disconnect preserve content', async () => {
    const f = await fixture();
    await f.enable();
    await f.command('pause');
    f.setNodes(f.nodes().filter((n) => n.id !== 'b1'));
    await f.wake();
    expect(await f.db.bookmarks.count()).toBe(1);
    await f.command('resume');
    expect(await f.db.bookmarks.count()).toBe(0);
    f.setNodes([
      ...f.nodes(),
      {
        id: 'b2',
        parentId: 'bar',
        title: 'New',
        url: 'https://new.example/',
        index: 0,
      },
    ]);
    await f.wake();
    await f.command('disconnect');
    expect(await f.db.bookmarks.count()).toBe(1);
    expect(await f.repo.get(profileId)).toBeNull();
  });
  it('recovers an interrupted browser create without duplication', async () => {
    const f = await fixture();
    await f.enable();
    const original = (await f.db.bookmarks.toArray())[0]!;
    await f.db.bookmarks.put({
      ...original,
      id: crypto.randomUUID(),
      title: 'New',
      url: 'https://new.example/',
      index: 1,
    });
    const create = f.native.create;
    let interrupted = true;
    f.native.create = vi.fn(async (node) => {
      const id = await create(node);
      if (interrupted) {
        interrupted = false;
        throw new Error('worker interrupted');
      }
      return id;
    });
    await f.wake();
    expect((await f.repo.get(profileId))?.status).toBe('error');
    f.restart();
    await f.command('retry');
    expect((await f.repo.get(profileId))?.status).toBe('connected');
    expect(
      f.nodes().filter((n) => n.url === 'https://new.example/'),
    ).toHaveLength(1);
    expect(f.native.create).toHaveBeenCalledTimes(1);
  });
  it('revoked permission and missing roots stop safely, and inactive profiles cannot execute', async () => {
    const f = await fixture();
    await f.enable();
    vi.mocked(f.native.hasPermission).mockResolvedValue(false);
    await f.wake();
    expect((await f.repo.get(profileId))?.status).toBe('permission');
    expect(await f.db.bookmarks.count()).toBe(1);
    vi.mocked(f.native.hasPermission).mockResolvedValue(true);
    f.setNodes([{ id: '0', title: '', parentId: null, index: 0 }]);
    await f.command('retry');
    expect((await f.repo.get(profileId))?.status).toBe('missing-root');
    expect(await f.db.bookmarks.count()).toBe(1);
    await f.db.metadata.put({
      key: 'activeProfileId',
      value: crypto.randomUUID(),
    });
    expect((await f.command('retry')).error).toBe('inactive');
  });
  it('isolates logging and notification delivery failure from successful mutations', async () => {
    const f = await fixture();
    const diagnostic = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    f.report.mockRejectedValue(new Error('unavailable'));
    try {
      expect((await f.enable()).connection?.status).toBe('connected');
      expect(await f.db.bookmarks.count()).toBe(1);
    } finally {
      diagnostic.mockRestore();
    }
  });
});
