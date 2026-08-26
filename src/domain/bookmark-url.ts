import { z } from 'zod';

const allowedProtocols = new Set(['http:', 'https:', 'ftp:']);
const containsControlCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

/** Adds HTTPS only to a host-like value without a URI scheme or whitespace. */
export function addHttpsToHostLikeUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed.includes('://') ||
    /\s/.test(trimmed) ||
    !/^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#].*)?$/i.test(
      trimmed,
    )
  )
    return undefined;
  return `https://${trimmed}`;
}

/** Produces the canonical value used for profile-wide duplicate comparison. */
export function normalizeBookmarkUrl(value: string): string {
  return safeBookmarkUrlSchema.parse(value);
}

/**
 * Accepts only absolute web/FTP locations that cannot execute inline content or
 * address privileged browser pages. Credentials are rejected to avoid storing
 * secrets inside bookmark URLs.
 */
export const safeBookmarkUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(4096)
  .refine((value) => !containsControlCharacter(value), 'url-control-characters')
  .transform((value, context) => {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      context.addIssue({ code: 'custom', message: 'url-invalid' });
      return z.NEVER;
    }
    if (!allowedProtocols.has(parsed.protocol)) {
      context.addIssue({ code: 'custom', message: 'url-scheme-not-allowed' });
      return z.NEVER;
    }
    if (parsed.username || parsed.password) {
      context.addIssue({
        code: 'custom',
        message: 'url-credentials-not-allowed',
      });
      return z.NEVER;
    }
    return parsed.href;
  });
