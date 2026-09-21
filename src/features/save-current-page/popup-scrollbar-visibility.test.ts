import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPopupScrollbarVisibility } from './popup-scrollbar-visibility';

afterEach(() => vi.useRealTimers());

describe('createPopupScrollbarVisibility', () => {
  it('keeps the Always visible preference active without transient state', () => {
    const root = document.createElement('div');
    const scrollSource = new EventTarget();
    const visibility = createPopupScrollbarVisibility(root, scrollSource);

    visibility.setBehavior('always');
    scrollSource.dispatchEvent(new Event('scroll'));

    expect(root).toHaveClass('scrollbars--always');
    expect(root).not.toHaveClass('scrollbars--active');
    visibility.dispose();
  });

  it.each(['system', 'scrolling'] as const)(
    'shows %s scrollbars during scrolling and hides them after inactivity',
    (behavior) => {
      vi.useFakeTimers();
      const root = document.createElement('div');
      const scrollSource = new EventTarget();
      const visibility = createPopupScrollbarVisibility(
        root,
        scrollSource,
        700,
      );
      visibility.setBehavior(behavior);

      scrollSource.dispatchEvent(new Event('scroll'));
      expect(root).toHaveClass(`scrollbars--${behavior}`);
      expect(root).toHaveClass('scrollbars--active');

      vi.advanceTimersByTime(700);
      expect(root).not.toHaveClass('scrollbars--active');
      visibility.dispose();
    },
  );

  it('removes popup classes and pending activity when disposed', () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    const scrollSource = new EventTarget();
    const visibility = createPopupScrollbarVisibility(root, scrollSource);
    visibility.setBehavior('scrolling');
    scrollSource.dispatchEvent(new Event('scroll'));

    visibility.dispose();
    scrollSource.dispatchEvent(new Event('scroll'));
    vi.runAllTimers();

    expect(root.className).toBe('');
  });
});
