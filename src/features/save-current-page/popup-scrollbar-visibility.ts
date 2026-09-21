import type { ProfileSettings } from '../../domain/profile-settings';

type ScrollbarBehavior = NonNullable<ProfileSettings['scrollbarBehavior']>;

const behaviorClasses = [
  'scrollbars--system',
  'scrollbars--always',
  'scrollbars--scrolling',
] as const;

/** Applies the saved scrollbar behavior to a short-lived extension popup. */
export function createPopupScrollbarVisibility(
  root: HTMLElement,
  scrollSource: EventTarget,
  idleDelayMs = 700,
) {
  let behavior: ScrollbarBehavior = 'scrolling';
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const setActive = (active: boolean) =>
    root.classList.toggle('scrollbars--active', active);

  const onScroll = () => {
    if (behavior === 'always') return;
    setActive(true);
    if (idleTimer !== undefined) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      setActive(false);
      idleTimer = undefined;
    }, idleDelayMs);
  };

  scrollSource.addEventListener('scroll', onScroll, { capture: true });

  return {
    dispose() {
      scrollSource.removeEventListener('scroll', onScroll, { capture: true });
      if (idleTimer !== undefined) clearTimeout(idleTimer);
      root.classList.remove(...behaviorClasses, 'scrollbars--active');
    },
    setBehavior(next: ScrollbarBehavior) {
      behavior = next;
      if (idleTimer !== undefined) {
        clearTimeout(idleTimer);
        idleTimer = undefined;
      }
      root.classList.remove(...behaviorClasses, 'scrollbars--active');
      root.classList.add(`scrollbars--${behavior}`);
    },
  };
}
