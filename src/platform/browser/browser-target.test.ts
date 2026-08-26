import { describe, expect, it } from 'vitest';

import { getBrowserTarget, getOperatingSystemInfo } from './browser-target';

describe('getBrowserTarget', () => {
  it.each([
    ['Chrome/140.0.1 Safari/537.36', 'Chrome v.140.0.1'],
    ['Chrome/140.0.0 Edg/140.0.2', 'Edge v.140.0.2'],
    ['Firefox/140.0', 'Firefox v.140.0'],
  ])('reports only browser family and version', (userAgent, expected) => {
    expect(getBrowserTarget(userAgent)).toBe(expected);
  });

  it('extracts coarse operating-system metadata without retaining the user agent', () => {
    expect(
      getOperatingSystemInfo(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Win32',
      ),
    ).toEqual({ name: 'Windows', version: '10.0' });
  });
});
