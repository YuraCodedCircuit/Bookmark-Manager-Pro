import { z } from 'zod';

import { itemAppearanceSchema } from './bookmark';
import {
  bookmarkGroupBySchema,
  bookmarkSortBySchema,
  bookmarkSortDirectionSchema,
  bookmarkViewSchema,
  cardSizeSchema,
  cardSpacingSchema,
} from './profile-settings';

export const navigationTransparencySchema = z.number().int().min(0).max(100);
export const detailsTableTransparencySchema = z.number().int().min(0).max(100);
export const folderBackgroundAppearanceSchema = z.union([
  itemAppearanceSchema,
  z.object({ kind: z.literal('none') }),
]);
export type FolderBackgroundAppearance = z.infer<
  typeof folderBackgroundAppearanceSchema
>;

export const folderSchema = z.object({
  id: z.uuid(),
  profileId: z.uuid(),
  parentId: z.uuid().nullable(),
  title: z.string().trim().min(1).max(200),
  tags: z.array(z.string().trim().min(1).max(80)).max(50),
  note: z.string().max(10_000),
  icon: z
    .string()
    .max(1_500_000)
    .regex(/^data:image\/(?:bmp|jpeg|png);base64,/)
    .optional(),
  cardAppearance: itemAppearanceSchema,
  backgroundAppearance: folderBackgroundAppearanceSchema,
  bookmarkView: bookmarkViewSchema.default('card'),
  cardSize: cardSizeSchema.optional(),
  cardSpacing: cardSpacingSchema.optional(),
  bookmarkSortBy: bookmarkSortBySchema.optional(),
  bookmarkSortDirection: bookmarkSortDirectionSchema.optional(),
  bookmarkGroupBy: bookmarkGroupBySchema.optional(),
  detailsTableTransparency: detailsTableTransparencySchema.default(0),
  includeNavigationBackground: z.boolean().default(false),
  navigationTransparency: navigationTransparencySchema.default(45),
  index: z.number().int().nonnegative(),
  isRoot: z.boolean(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export type Folder = z.infer<typeof folderSchema>;
