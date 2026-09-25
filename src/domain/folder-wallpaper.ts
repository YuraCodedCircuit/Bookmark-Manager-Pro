import { z } from 'zod';

export const folderWallpaperSchema = z.object({
  createdAt: z.number().int().nonnegative(),
  dataUrl: z
    .string()
    .max(6_000_000)
    .regex(/^data:image\/(?:bmp|jpeg|png|webp);base64,/),
  id: z.uuid(),
  profileId: z.uuid(),
});

export type FolderWallpaper = z.infer<typeof folderWallpaperSchema>;
