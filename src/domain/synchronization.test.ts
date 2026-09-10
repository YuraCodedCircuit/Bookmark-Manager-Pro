import { describe, expect, it } from 'vitest';
import {
  planSynchronization,
  syncConnectionSchema,
  syncSubtree,
} from './synchronization';
import { validateSyncTree, type SyncNode } from './sync-preview';
const root = (id: string): SyncNode => ({
  id,
  parentId: null,
  title: id,
  index: 0,
});
const bookmark = (id: string, parentId: string, index = 0): SyncNode => ({
  id,
  parentId,
  title: 'Example',
  url: 'https://example.com/',
  index,
});
const connection = () =>
  syncConnectionSchema.parse({
    version: 1,
    profileId: crypto.randomUUID(),
    extensionRoot: 'e',
    browserRoot: 'b',
    direction: 'both',
    status: 'connected',
    links: [],
    operations: [],
    lastSuccess: null,
  });
describe('synchronization planner', () => {
  it('requires explicit pairing for duplicate candidates and accepts unequal leftovers', () => {
    const e = [root('e'), bookmark('e1', 'e'), bookmark('e2', 'e', 1)],
      b = [root('b'), bookmark('b1', 'b')];
    expect(planSynchronization(connection(), e, b).conflicts[0]?.kind).toBe(
      'pair',
    );
    const plan = planSynchronization(connection(), e, b, { 'pair:e1': 'b1' });
    expect(plan.conflicts).toHaveLength(0);
    expect(plan.preview.browser.add).toBe(1);
    expect(
      plan.links.some((l) => l.extension === 'e1' && l.browser === 'b1'),
    ).toBe(true);
  });
  it('treats moving out as deletion of the counterpart, without touching the moved original', () => {
    const c = connection(),
      e1 = bookmark('e1', 'e'),
      b1 = bookmark('b1', 'b');
    c.links = [
      { extension: 'e', browser: 'b', e: root('e'), b: root('b') },
      { extension: 'e1', browser: 'b1', e: e1, b: b1 },
    ];
    const plan = planSynchronization(
      c,
      [root('e'), root('outside'), { ...e1, parentId: 'outside' }],
      [root('b'), b1],
    );
    expect(plan.operations).toMatchObject([
      { side: 'browser', kind: 'delete', id: 'b1' },
    ]);
  });
  it('preserves unsupported linked items and their ancestors', () => {
    const c = connection(),
      ef = { ...root('ef'), parentId: 'e' },
      bf = { ...root('bf'), parentId: 'b' },
      e1 = bookmark('e1', 'ef'),
      b1 = bookmark('b1', 'bf');
    c.links = [
      { extension: 'e', browser: 'b', e: root('e'), b: root('b') },
      { extension: 'ef', browser: 'bf', e: ef, b: bf },
      { extension: 'e1', browser: 'b1', e: e1, b: b1 },
    ];
    const plan = planSynchronization(
      c,
      [root('e'), ef, e1],
      [root('b'), bf, { ...b1, url: 'javascript:alert(1)' }],
    );
    expect(plan.operations).toHaveLength(0);
    expect(plan.preview.skipped).toBe(1);
  });
  it('requires a decision for delete versus edit and never deletes on an initial merge', () => {
    const c = connection(),
      e1 = bookmark('e1', 'e'),
      b1 = bookmark('b1', 'b');
    const initial = planSynchronization(c, [root('e'), e1], [root('b')]);
    expect(
      initial.preview.extension.delete + initial.preview.browser.delete,
    ).toBe(0);
    c.links = [
      { extension: 'e', browser: 'b', e: root('e'), b: root('b') },
      { extension: 'e1', browser: 'b1', e: e1, b: b1 },
    ];
    const current = [root('b'), { ...b1, title: 'Edited' }];
    expect(
      planSynchronization(c, [root('e')], current).conflicts[0]?.kind,
    ).toBe('delete');
    expect(
      planSynchronization(c, [root('e')], current, { 'edit:e1': 'browser' })
        .operations[0]?.kind,
    ).toBe('create');
  });
  it('validates and traverses deeply nested trees without a fixed nesting limit', () => {
    const nodes: SyncNode[] = [root('e')];
    for (let i = 0; i < 12000; i++)
      nodes.push({
        id: `f${i}`,
        parentId: i ? `f${i - 1}` : 'e',
        title: 'Folder',
        index: 0,
      });
    expect(syncSubtree(validateSyncTree(nodes), 'e')).toHaveLength(12001);
  });
});
