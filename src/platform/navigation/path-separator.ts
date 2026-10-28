export type PathSeparator = '/' | '\\';

/** Returns the OS-specific display separator; callers can supply an explicit agent. */
export function getPathSeparator(
  userAgent = globalThis.navigator?.userAgent ?? '',
): PathSeparator {
  return /Windows/i.test(userAgent) ? '\\' : '/';
}

/** Joins intact folder names for display and copying without parsing their contents. */
export function formatFolderPath(
  parts: readonly string[],
  separator: PathSeparator = getPathSeparator(),
): string {
  return parts.join(` ${separator} `);
}
