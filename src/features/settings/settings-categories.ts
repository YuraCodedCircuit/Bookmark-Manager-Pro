/** Ordered Settings categories, including reserved definitions used by icons. */
export const settingsCategories = [
  'general',
  'appearance',
  'language',
  'bookmarks',
  'search',
  'profiles',
  'activity',
  'notifications',
  'import',
  'export',
  'backup',
  'security',
  'accessibility',
  'shortcuts',
  'advanced',
] as const;

export type SettingsCategory = (typeof settingsCategories)[number];

/** Advanced stays out of navigation and search until the owner requests it. */
export const visibleSettingsCategories: readonly SettingsCategory[] =
  settingsCategories.filter((category) => category !== 'advanced');

const disabledSettingsCategories = new Set<SettingsCategory>(['advanced']);

/** Identifies visible categories reserved for future implementation. */
export function isSettingsCategoryDisabled(
  category: SettingsCategory,
): boolean {
  return disabledSettingsCategories.has(category);
}
