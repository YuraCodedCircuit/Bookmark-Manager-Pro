import { describe, expect, it } from 'vitest';

import { safeBookmarkUrlSchema } from '../../domain/bookmark-url';
import { classifyBookmarkInputError } from './bookmark-input-error';

describe('classifyBookmarkInputError', () => {
  it.each([
    ['javascript:alert(1)', 'unsafeScheme'],
    ['not a complete URL', 'invalid'],
    ['https://user:secret@example.com', 'credentials'],
  ] as const)('classifies %s without exposing its value', (value, expected) => {
    const result = safeBookmarkUrlSchema.safeParse(value);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(classifyBookmarkInputError(result.error)).toBe(expected);
  });

  it('leaves unrelated failures unclassified', () => {
    expect(
      classifyBookmarkInputError(new Error('storage-failed')),
    ).toBeUndefined();
  });
});
