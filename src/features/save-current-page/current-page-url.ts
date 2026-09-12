import { safeBookmarkUrlSchema } from '../../domain/bookmark-url';

export function isSaveableCurrentPageUrl(url: string): boolean {
  return safeBookmarkUrlSchema.safeParse(url).success;
}
