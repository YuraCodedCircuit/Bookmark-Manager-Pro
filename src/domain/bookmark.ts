import { z } from 'zod';
import { safeBookmarkUrlSchema } from './bookmark-url';

/** Validated CSS gradient direction stored as whole degrees. */
export const gradientDirectionSchema = z.number().int().min(0).max(359);
export const imageFitSchema = z.enum([
  'fill',
  'fit',
  'stretch',
  'tile',
  'center',
  'span',
]);
export type ImageFit = z.infer<typeof imageFitSchema>;

/** Local-only presentation applied to a bookmark or folder card. */
export const itemAppearanceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('color'),
    value: z.string().regex(/^#[0-9a-f]{6}$/i),
  }),
  z.object({
    kind: z.literal('gradient'),
    colors: z.tuple([
      z.string().regex(/^#[0-9a-f]{6}$/i),
      z.string().regex(/^#[0-9a-f]{6}$/i),
      z.string().regex(/^#[0-9a-f]{6}$/i),
    ]),
    direction: gradientDirectionSchema,
  }),
  z.object({
    kind: z.literal('image'),
    value: z
      .string()
      .max(1_500_000)
      .regex(/^data:image\/(?:bmp|jpeg|png);base64,/),
    fit: imageFitSchema.default('fill'),
  }),
]);

export type ItemAppearance = z.infer<typeof itemAppearanceSchema>;

export const bookmarkSchema = z.object({
  id: z.uuid(),
  profileId: z.uuid(),
  parentId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  url: safeBookmarkUrlSchema,
  tags: z.array(z.string().trim().min(1).max(80)).max(50),
  note: z.string().max(10_000),
  favicon: z
    .string()
    .max(1_500_000)
    .regex(/^data:image\/(?:bmp|jpeg|png);base64,/)
    .optional(),
  cardAppearance: itemAppearanceSchema,
  index: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export type Bookmark = z.infer<typeof bookmarkSchema>;
