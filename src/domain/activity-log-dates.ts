/** Local calendar-day unions. No UTC conversion or 24-hour arithmetic is used. */
export type ActivityDateRange = { from: string; to: string };
export type ActivityDateSelection = readonly ActivityDateRange[] | null;
export const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function dayDate(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year!, month! - 1, date!, 12);
}
export function moveDay(day: string, offset: number): string {
  const date = dayDate(day);
  date.setDate(date.getDate() + offset);
  return localDay(date);
}
/** Merges overlapping or adjacent day intervals without changing event timestamps. */
export function mergeActivityDates(
  ranges: readonly ActivityDateRange[],
): ActivityDateRange[] {
  const result: ActivityDateRange[] = [];
  for (const range of ranges
    .map(({ from, to }) => ({
      from: from < to ? from : to,
      to: from < to ? to : from,
    }))
    .sort((a, b) => a.from.localeCompare(b.from))) {
    const last = result.at(-1);
    if (last && range.from <= moveDay(last.to, 1))
      last.to = last.to > range.to ? last.to : range.to;
    else result.push({ ...range });
  }
  return result;
}
export function matchesActivityDate(
  timestamp: number,
  selection: ActivityDateSelection,
): boolean {
  const day = localDay(new Date(timestamp));
  return (
    selection === null ||
    selection.some(({ from, to }) => day >= from && day <= to)
  );
}
export const activityDatePresets = [
  'all',
  'today',
  'yesterday',
  'seven',
  'fourteen',
  'thirty',
  'month',
  'previousMonth',
] as const;
export function activityDatePreset(
  preset: (typeof activityDatePresets)[number],
  now = new Date(),
): ActivityDateSelection {
  const today = localDay(now);
  if (preset === 'all') return null;
  if (preset === 'today') return [{ from: today, to: today }];
  if (preset === 'yesterday') {
    const day = moveDay(today, -1);
    return [{ from: day, to: day }];
  }
  if (preset === 'month')
    return [
      {
        from: localDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: localDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      },
    ];
  if (preset === 'previousMonth')
    return [
      {
        from: localDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: localDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      },
    ];
  return [
    {
      from: moveDay(
        today,
        -(preset === 'seven' ? 6 : preset === 'fourteen' ? 13 : 29),
      ),
      to: today,
    },
  ];
}
