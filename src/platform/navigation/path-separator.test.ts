import { describe, expect, it } from 'vitest';

import { getPathSeparator } from './path-separator';

describe('getPathSeparator', () => {
  it('uses a backslash on Windows', () => {
    expect(getPathSeparator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(
      '\\',
    );
  });

  it.each([
    'Mozilla/5.0 (X11; Linux x86_64)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)',
  ])('uses a forward slash outside Windows', (userAgent) => {
    expect(getPathSeparator(userAgent)).toBe('/');
  });
});
