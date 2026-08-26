import { ZodError } from 'zod';

export type BookmarkInputErrorKind = 'credentials' | 'invalid' | 'unsafeScheme';

/**
 * Converts validation diagnostics into a small, privacy-safe presentation key.
 * The invalid URL itself is never returned or recorded.
 */
export function classifyBookmarkInputError(
  error: unknown,
): BookmarkInputErrorKind | undefined {
  if (!(error instanceof ZodError)) return undefined;
  const messages = new Set(error.issues.map((issue) => issue.message));
  if (messages.has('url-scheme-not-allowed')) return 'unsafeScheme';
  if (messages.has('url-credentials-not-allowed')) return 'credentials';
  if (messages.has('url-invalid') || messages.has('url-control-characters'))
    return 'invalid';
  return undefined;
}
