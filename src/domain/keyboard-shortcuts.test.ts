import { describe, expect, it } from 'vitest';

import {
  bindingFromKeyboardEvent,
  defaultShortcutBindings,
  hasCustomizedShortcuts,
  isReservedShortcut,
  matchesShortcut,
} from './keyboard-shortcuts';

describe('keyboard shortcuts', () => {
  it('normalizes supported modified letter bindings', () => {
    const event = new KeyboardEvent('keydown', {
      altKey: true,
      key: 'k',
      shiftKey: true,
    });
    expect(bindingFromKeyboardEvent(event)).toBe('Alt+Shift+K');
    expect(matchesShortcut(event, 'Alt+Shift+K')).toBe(true);
  });

  it('rejects unmodified and reserved browser bindings', () => {
    expect(
      bindingFromKeyboardEvent(new KeyboardEvent('keydown', { key: 'k' })),
    ).toBeUndefined();
    expect(isReservedShortcut('Control+L')).toBe(true);
  });

  it('detects customization against defaults', () => {
    expect(hasCustomizedShortcuts(defaultShortcutBindings)).toBe(false);
    expect(
      hasCustomizedShortcuts({ ...defaultShortcutBindings, search: 'Alt+K' }),
    ).toBe(true);
  });
});
