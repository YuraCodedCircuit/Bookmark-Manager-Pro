import { useSyncExternalStore } from 'react';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion() {
  const preference = document.documentElement.dataset.motion;
  if (preference === 'none' || preference === 'reduced') return true;
  return window.matchMedia?.(reducedMotionQuery).matches ?? false;
}

export function motionPreference() {
  return document.documentElement.dataset.motion ?? 'system';
}

function subscribe(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia?.(reducedMotionQuery);

  if (mediaQuery === undefined) {
    return () => undefined;
  }

  mediaQuery.addEventListener('change', onStoreChange);
  window.addEventListener('bmp-motion-preference-change', onStoreChange);
  return () => {
    mediaQuery.removeEventListener('change', onStoreChange);
    window.removeEventListener('bmp-motion-preference-change', onStoreChange);
  };
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}

export function useMotionPreference() {
  return useSyncExternalStore(subscribe, motionPreference, () => 'system');
}
