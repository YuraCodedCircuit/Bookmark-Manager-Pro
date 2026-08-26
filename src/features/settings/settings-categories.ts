/** Ordered Settings navigation categories shared by the dialog and its icons. */
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

const disabledSettingsCategories = new Set<SettingsCategory>([
  'import',
  'export',
  'backup',
  'advanced',
]);

/** Identifies visible categories reserved for future implementation. */
export function isSettingsCategoryDisabled(
  category: SettingsCategory,
): boolean {
  return disabledSettingsCategories.has(category);
}
