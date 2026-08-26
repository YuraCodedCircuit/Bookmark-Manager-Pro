import type { ProfileSettings } from '../domain/profile-settings';

export type DateTimeFormatPreference = NonNullable<
  ProfileSettings['dateTimeFormat']
>;

/** Formats dates consistently according to the active profile preference. */
export function formatDateTime(
  timestamp: number,
  preference: DateTimeFormatPreference = 'browser',
  _interfaceLocale?: string,
  includeTime = true,
): string {
  const date = new Date(timestamp);
  if (preference === 'iso') {
    const datePart = [
      date.getFullYear().toString().padStart(4, '0'),
      (date.getMonth() + 1).toString().padStart(2, '0'),
      date.getDate().toString().padStart(2, '0'),
    ].join('-');
    if (!includeTime) return datePart;
    return `${datePart} ${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }

  const locale =
    preference === 'american'
      ? 'en-US'
      : preference === 'international'
        ? 'en-GB'
        : undefined;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: preference === 'international' ? 'short' : 'medium',
    ...(includeTime ? { timeStyle: 'short' as const } : {}),
    ...(preference === 'international' ? { hour12: false } : {}),
  }).format(date);
}
