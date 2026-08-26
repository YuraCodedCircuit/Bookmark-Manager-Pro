import { describe, expect, it, vi } from 'vitest';

import { DomThemeController } from './dom-theme-controller';

describe('DomThemeController', () => {
  function createSystemThemeQuery(matches: boolean) {
    let changeListener: ((event: MediaQueryListEvent) => void) | undefined;
    return {
      query: {
        matches,
        addEventListener: vi.fn(
          (_type: 'change', listener: (event: MediaQueryListEvent) => void) => {
            changeListener = listener;
          },
        ),
        removeEventListener: vi.fn(
          (_type: 'change', listener: (event: MediaQueryListEvent) => void) => {
            if (changeListener === listener) changeListener = undefined;
          },
        ),
      },
      emit(nextMatches: boolean) {
        changeListener?.({ matches: nextMatches } as MediaQueryListEvent);
      },
    };
  }

  it('applies an explicit light theme to the shared document root', () => {
    const root = document.createElement('html');
    const systemTheme = createSystemThemeQuery(true);
    const controller = new DomThemeController(root, systemTheme.query);

    expect(controller.apply('light')).toBe('light');
    expect(root.dataset.theme).toBe('light');
    expect(root.style.colorScheme).toBe('light');
  });

  it('resolves the system theme before applying it', () => {
    const root = document.createElement('html');
    const systemTheme = createSystemThemeQuery(false);
    const controller = new DomThemeController(root, systemTheme.query);

    expect(controller.apply('system')).toBe('light');
    expect(root.dataset.theme).toBe('light');
    expect(root.style.colorScheme).toBe('light');
  });

  it('follows system changes only while the system preference is active', () => {
    const root = document.createElement('html');
    const systemTheme = createSystemThemeQuery(false);
    const controller = new DomThemeController(root, systemTheme.query);

    controller.apply('system');
    systemTheme.emit(true);
    expect(root.dataset.theme).toBe('dark');

    controller.apply('light');
    expect(systemTheme.query.removeEventListener).toHaveBeenCalledOnce();
    systemTheme.emit(true);
    expect(root.dataset.theme).toBe('light');
  });
});
