import { z } from 'zod';

import { bookmarkSchema } from './bookmark';
import { favoriteItemSchema } from './favorite-item';
import { folderSchema } from './folder';

export const undoHistoryActionSchema = z.enum([
  'created',
  'deleted',
  'edited',
  'favorite',
  'moved',
  'styled',
]);
export const undoHistoryItemTypeSchema = z.enum(['bookmark', 'folder']);
export const undoHistoryStatusSchema = z.enum(['redo', 'undo', 'unavailable']);

export const undoProfileStateSchema = z.object({
  bookmarks: z.array(bookmarkSchema),
  favorites: z.array(favoriteItemSchema),
  folders: z.array(folderSchema),
});

export const undoHistoryEntrySchema = z.object({
  action: undoHistoryActionSchema,
  affectedBookmarkIds: z.array(z.uuid()),
  affectedFavoriteIds: z.array(z.uuid()),
  affectedFolderIds: z.array(z.uuid()),
  after: undoProfileStateSchema,
  before: undoProfileStateSchema,
  createdAt: z.number().int().nonnegative(),
  id: z.uuid(),
  itemId: z.uuid(),
  itemType: undoHistoryItemTypeSchema,
  parentTitle: z.string().trim().min(1).max(200).optional(),
  profileId: z.uuid(),
  siteHostname: z.string().trim().min(1).max(253).optional(),
  status: undoHistoryStatusSchema,
});

export type UndoHistoryAction = z.infer<typeof undoHistoryActionSchema>;
export type UndoHistoryEntry = z.infer<typeof undoHistoryEntrySchema>;
export type UndoHistoryItemType = z.infer<typeof undoHistoryItemTypeSchema>;
export type UndoProfileState = z.infer<typeof undoProfileStateSchema>;
