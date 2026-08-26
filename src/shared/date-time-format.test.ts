import { describe, expect, it } from 'vitest';

import { formatDateTime } from './date-time-format';

const timestamp = new Date(2026, 7, 13, 15, 30).getTime();

describe('formatDateTime', () => {
  it('formats American, international, and ISO preferences', () => {
    expect(formatDateTime(timestamp, 'american')).toContain('Aug 13, 2026');
    expect(formatDateTime(timestamp, 'international')).toContain('13/08/2026');
    expect(formatDateTime(timestamp, 'iso')).toBe('2026-08-13 15:30');
  });

  it('can omit time for date-only profile labels', () => {
    expect(formatDateTime(timestamp, 'iso', undefined, false)).toBe(
      '2026-08-13',
    );
  });
});
