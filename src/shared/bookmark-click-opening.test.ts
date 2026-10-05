import { describe, expect, it } from 'vitest';

import { resolveBookmarkClickOpening } from './bookmark-click-opening';

describe('resolveBookmarkClickOpening', () => {
  it.each([
    ['current-tab', false, false, 'current-tab'],
    ['new-tab', false, false, 'new-tab'],
    ['current-tab', false, true, 'current-tab'],
    ['current-tab', true, false, 'new-tab'],
    ['new-tab', true, false, 'new-tab'],
    ['current-tab', true, true, 'new-window'],
    ['new-tab', true, true, 'new-window'],
  ] as const)(
    'resolves %s with Ctrl=%s and Shift=%s to %s',
    (defaultOpening, ctrlKey, shiftKey, expected) => {
      expect(
        resolveBookmarkClickOpening(defaultOpening, { ctrlKey, shiftKey }),
      ).toBe(expected);
    },
  );
});
