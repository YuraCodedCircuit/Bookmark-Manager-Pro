export type PathSeparator = '/' | '\\';

export function getPathSeparator(userAgent: string): PathSeparator {
  return /Windows/i.test(userAgent) ? '\\' : '/';
}
