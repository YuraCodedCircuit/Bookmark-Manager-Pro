export type BookmarkClickOpening = 'current-tab' | 'new-tab' | 'new-window';

/** Returns the saved opening behavior with Ctrl pointer overrides applied. */
export function resolveBookmarkClickOpening(
  defaultOpening: 'current-tab' | 'new-tab',
  modifiers: { ctrlKey: boolean; shiftKey: boolean },
): BookmarkClickOpening {
  if (modifiers.ctrlKey && modifiers.shiftKey) return 'new-window';
  if (modifiers.ctrlKey) return 'new-tab';
  return defaultOpening;
}
