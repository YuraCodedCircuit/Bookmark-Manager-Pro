import { z } from 'zod';
import { itemAppearanceSchema } from './bookmark';
import { searchPreferencesSchema } from './bookmark-search';
import { shortcutPreferencesSchema } from './keyboard-shortcuts';

export const themePreferenceSchema = z.enum(['system', 'light', 'dark']);
export const bookmarkViewSchema = z.enum(['card', 'list', 'details']);
export const cardSizeSchema = z.enum(['small', 'medium', 'large']);
export const cardSpacingSchema = z.enum(['compact', 'comfortable', 'spacious']);
export const bookmarkSortBySchema = z.enum([
  'manual',
  'title',
  'createdAt',
  'updatedAt',
  'domain',
]);
export const bookmarkSortDirectionSchema = z.enum(['ascending', 'descending']);
export const bookmarkGroupBySchema = z.enum(['none', 'type', 'domain']);
export const folderDropHoverDelaySchema = z.union([
  z.literal(400),
  z.literal(600),
  z.literal(900),
]);
export const duplicateHandlingSchema = z.enum(['allow', 'warn', 'prevent']);
export const urlNormalizationSchema = z.enum(['ask', 'add']);
export const faviconDisplaySchema = z.enum(['available', 'initials']);
export const missingFaviconSchema = z.enum(['initials', 'built-in', 'none']);
export const folderIconSchema = z.enum(['initials', 'none']);
export const tagOrderSchema = z.enum(['preserve', 'alphabetical']);
export const bookmarkCopyBehaviorSchema = z.enum(['url', 'title-url']);
export const accentColorModeSchema = z.enum(['system', 'custom']);
export const scrollbarBehaviorSchema = z.enum([
  'system',
  'always',
  'scrolling',
]);
export const animationPreferenceSchema = z.enum(['system', 'reduced', 'none']);
export const startupLocationSchema = z.enum(['home', 'last']);
export const bookmarkOpeningSchema = z.enum(['current-tab', 'new-tab']);
export const folderOpeningSchema = z.enum(['single-click', 'double-click']);
export const dateTimeFormatSchema = z.enum([
  'browser',
  'american',
  'international',
  'iso',
]);
export const firstDayOfWeekSchema = z.enum([
  'browser',
  'sunday',
  'monday',
  'saturday',
]);
export const startupProfileModeSchema = z.enum(['active', 'ask']);
export const defaultProfileIconSchema = z.enum([
  'built-in',
  'initials',
  'none',
]);
export const notificationPositionSchema = z.enum([
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]);
export const notificationOrderSchema = z.enum(['newest', 'oldest']);
export const notificationStackLimitSchema = z.union([
  z.literal(3),
  z.literal(6),
  z.literal(9),
]);
export const notificationPreferencesSchema = z.object({
  enabled: z.boolean(),
  position: notificationPositionSchema,
  order: notificationOrderSchema,
  stackLimit: notificationStackLimitSchema,
});

export const defaultNotificationPreferences =
  notificationPreferencesSchema.parse({
    enabled: true,
    position: 'bottom-right',
    order: 'newest',
    stackLimit: 3,
  });

export const profilePreferencesSchema = z.object({
  appendCopyToDuplicateName: z.boolean(),
  confirmProfileDeletion: z.boolean(),
  defaultProfileIcon: defaultProfileIconSchema,
  duplicateActivityLogs: z.boolean(),
  duplicateAppearance: z.boolean(),
  duplicateBookmarks: z.boolean(),
  duplicateFavorites: z.boolean(),
  duplicateImages: z.boolean(),
  duplicateSettings: z.boolean(),
  maximumProfiles: z.number().int().min(1).max(1_000).nullable(),
  reopenLastFolderOnSwitch: z.boolean(),
  startupProfileMode: startupProfileModeSchema,
});

export const defaultProfilePreferences = profilePreferencesSchema.parse({
  appendCopyToDuplicateName: true,
  confirmProfileDeletion: true,
  defaultProfileIcon: 'built-in',
  duplicateActivityLogs: false,
  duplicateAppearance: true,
  duplicateBookmarks: true,
  duplicateFavorites: true,
  duplicateImages: true,
  duplicateSettings: true,
  maximumProfiles: null,
  reopenLastFolderOnSwitch: false,
  startupProfileMode: 'active',
});

export const profileSettingsSchema = z.object({
  profileId: z.uuid(),
  theme: themePreferenceSchema,
  language: z.string().trim().min(2).max(35).optional(),
  bookmarkView: bookmarkViewSchema.default('card'),
  cardSize: cardSizeSchema.default('medium'),
  cardSpacing: cardSpacingSchema.optional(),
  bookmarkSortBy: bookmarkSortBySchema.optional(),
  bookmarkSortDirection: bookmarkSortDirectionSchema.optional(),
  bookmarkGroupBy: bookmarkGroupBySchema.optional(),
  dragAndDropEnabled: z.boolean().optional(),
  dropIntoFoldersEnabled: z.boolean().optional(),
  folderDropHoverDelay: folderDropHoverDelaySchema.optional(),
  confirmFolderDrop: z.boolean().optional(),
  openFolderAfterDrop: z.boolean().optional(),
  duplicateHandling: duplicateHandlingSchema.optional(),
  urlNormalization: urlNormalizationSchema.optional(),
  faviconDisplay: faviconDisplaySchema.optional(),
  missingFavicon: missingFaviconSchema.optional(),
  folderIcon: folderIconSchema.optional(),
  rememberLastAppearance: z.boolean().optional(),
  tagOrder: tagOrderSchema.optional(),
  bookmarkCopyBehavior: bookmarkCopyBehaviorSchema.optional(),
  lastBookmarkAppearance: itemAppearanceSchema.optional(),
  lastFolderAppearance: itemAppearanceSchema.optional(),
  accentColorMode: accentColorModeSchema.optional(),
  customAccentColor: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  scrollbarBehavior: scrollbarBehaviorSchema.optional(),
  startupLocation: startupLocationSchema.optional(),
  lastOpenedFolderId: z.uuid().optional(),
  bookmarkOpening: bookmarkOpeningSchema.optional(),
  folderOpening: folderOpeningSchema.optional(),
  dateTimeFormat: dateTimeFormatSchema.optional(),
  firstDayOfWeek: firstDayOfWeekSchema.optional(),
  profilePreferences: profilePreferencesSchema.optional(),
  notificationPreferences: notificationPreferencesSchema.optional(),
  searchPreferences: searchPreferencesSchema.optional(),
  confirmExternalLinks: z.boolean().optional(),
  animationPreference: animationPreferenceSchema.optional(),
  highContrast: z.boolean().optional(),
  shortcutPreferences: shortcutPreferencesSchema.optional(),
});

export type ProfileSettings = z.infer<typeof profileSettingsSchema>;
export type ProfilePreferences = z.infer<typeof profilePreferencesSchema>;
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;
export type ThemePreference = z.infer<typeof themePreferenceSchema>;
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;
export type AnimationPreference = z.infer<typeof animationPreferenceSchema>;
