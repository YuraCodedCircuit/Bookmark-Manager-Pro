import { describe, expect, it } from 'vitest';

import {
  resolveDropZone,
  isSamePositionDrop,
  isSameVisiblePositionDrop,
  resolveReorderIndex,
  resolveTargetRatio,
} from './drag-drop-intent';

describe('drag drop intent', () => {
  it('uses three exclusive zones for folders and two for bookmarks', () => {
    expect(resolveDropZone(0.1, true)).toBe('before');
    expect(resolveDropZone(0.5, true)).toBe('inside');
    expect(resolveDropZone(0.9, true)).toBe('after');
    expect(resolveDropZone(0.25, true)).toBe('inside');
    expect(resolveDropZone(0.75, true)).toBe('inside');
    expect(resolveDropZone(0.49, false)).toBe('before');
    expect(resolveDropZone(0.5, false)).toBe('after');
  });

  it('accounts for source removal in every before and after direction', () => {
    expect(resolveReorderIndex(0, 2, 'before')).toBe(1);
    expect(resolveReorderIndex(2, 0, 'before')).toBe(0);
    expect(resolveReorderIndex(0, 2, 'after')).toBe(2);
    expect(resolveReorderIndex(2, 0, 'after')).toBe(1);
  });

  it('keeps edge zones reachable from the pointer independently of the preview', () => {
    expect(resolveDropZone(resolveTargetRatio(105, 100, 200), true)).toBe(
      'before',
    );
    expect(resolveDropZone(resolveTargetRatio(295, 100, 200), true)).toBe(
      'after',
    );
  });

  it('identifies before and after drops that would not change the order', () => {
    expect(isSamePositionDrop(2, 1, 'after')).toBe(true);
    expect(isSamePositionDrop(2, 3, 'before')).toBe(true);
    expect(isSamePositionDrop(2, 0, 'before')).toBe(false);
    expect(isSamePositionDrop(2, 0, 'after')).toBe(false);
  });

  it('identifies grouped no-op drops from visible positions', () => {
    expect(isSameVisiblePositionDrop(2, 1, 'after')).toBe(true);
    expect(isSameVisiblePositionDrop(2, 3, 'before')).toBe(true);
    expect(isSameVisiblePositionDrop(2, 0, 'after')).toBe(false);
    expect(isSameVisiblePositionDrop(2, 4, 'before')).toBe(false);
  });
});
