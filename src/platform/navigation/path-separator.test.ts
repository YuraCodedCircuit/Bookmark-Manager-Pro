import { describe, expect, it } from 'vitest';

import { getPathSeparator, formatFolderPath } from './path-separator';

describe('getPathSeparator', () => {
  it('formats display paths without changing folder names or roots', () => {
    expect(formatFolderPath(['Home', '123'], '\\')).toBe('Home \\ 123');
    expect(formatFolderPath(['Home', '123'], '/')).toBe('Home / 123');
    expect(formatFolderPath(['Home'], '\\')).toBe('Home');
    expect(formatFolderPath([], '/')).toBe('');
    expect(formatFolderPath(['Home', 'Name › a/b'], '\\')).toBe(
      'Home \\ Name › a/b',
    );
  });
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
