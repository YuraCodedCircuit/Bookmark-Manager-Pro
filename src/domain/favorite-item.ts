import { z } from 'zod';

export const favoriteItemSchema = z.object({
  profileId: z.uuid(),
  itemId: z.uuid(),
  kind: z.enum(['bookmark', 'folder']),
  favoritedAt: z.number().int().nonnegative(),
});

export type FavoriteItem = z.infer<typeof favoriteItemSchema>;
