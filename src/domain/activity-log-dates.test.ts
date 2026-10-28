import { describe, expect, it } from 'vitest';
import {
  activityDatePreset,
  dayDate,
  localDay,
  matchesActivityDate,
  mergeActivityDates,
  moveDay,
} from './activity-log-dates';
describe('activity calendar dates', () => {
  it('merges overlapping and adjacent ranges, including reversed endpoints', () => {
    expect(
      mergeActivityDates([
        { from: '2026-10-22', to: '2026-10-20' },
        { from: '2026-10-21', to: '2026-10-24' },
        { from: '2026-10-25', to: '2026-10-25' },
        { from: '2026-11-01', to: '2026-11-02' },
      ]),
    ).toEqual([
      { from: '2026-10-20', to: '2026-10-25' },
      { from: '2026-11-01', to: '2026-11-02' },
    ]);
  });
  it('matches whole local days and excludes the following local midnight', () => {
    const selection = [{ from: '2026-11-01', to: '2026-11-01' }];
    expect(
      matchesActivityDate(new Date(2026, 10, 1, 0).getTime(), selection),
    ).toBe(true);
    expect(
      matchesActivityDate(
        new Date(2026, 10, 1, 23, 59, 59, 999).getTime(),
        selection,
      ),
    ).toBe(true);
    expect(
      matchesActivityDate(new Date(2026, 10, 2, 0).getTime(), selection),
    ).toBe(false);
    expect(matchesActivityDate(Date.now(), null)).toBe(true);
    expect(matchesActivityDate(Date.now(), [])).toBe(false);
  });
  it('uses calendar arithmetic over DST and year boundaries', () => {
    expect(moveDay('2026-03-08', 1)).toBe('2026-03-09');
    expect(moveDay('2026-11-01', 1)).toBe('2026-11-02');
    expect(moveDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(localDay(dayDate('2026-03-08'))).toBe('2026-03-08');
  });
  it.each([
    ['all', null],
    ['today', [{ from: '2026-10-22', to: '2026-10-22' }]],
    ['yesterday', [{ from: '2026-10-21', to: '2026-10-21' }]],
    ['seven', [{ from: '2026-10-16', to: '2026-10-22' }]],
    ['fourteen', [{ from: '2026-10-09', to: '2026-10-22' }]],
    ['thirty', [{ from: '2026-09-23', to: '2026-10-22' }]],
    ['month', [{ from: '2026-10-01', to: '2026-10-31' }]],
    ['previousMonth', [{ from: '2026-09-01', to: '2026-09-30' }]],
  ] as const)('builds %s preset', (preset, expected) => {
    expect(activityDatePreset(preset, new Date(2026, 9, 22, 12))).toEqual(
      expected,
    );
  });
});
