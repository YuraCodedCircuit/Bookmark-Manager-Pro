import { z } from 'zod';

export const NOTE_TITLE_MAX_LENGTH = 200;
export const NOTE_BODY_MAX_BYTES = 1024 * 1024;
export const NOTE_FOLDER_TITLE_MAX_LENGTH = 100;
export const NOTE_LIMIT = 10_000;
export const NOTE_FOLDER_LIMIT = 1_000;
export const NOTE_FOLDER_DEPTH_LIMIT = 20;

export const noteFolderSchema = z.object({
  id: z.uuid(),
  profileId: z.uuid(),
  parentId: z.uuid().nullable(),
  title: z.string().trim().min(1).max(NOTE_FOLDER_TITLE_MAX_LENGTH),
  createdAt: z.number().int().nonnegative(),
  isHome: z.boolean(),
});

export const noteSchema = z.object({
  id: z.uuid(),
  profileId: z.uuid(),
  folderId: z.uuid(),
  title: z.string().trim().min(1).max(NOTE_TITLE_MAX_LENGTH),
  body: z.string(),
  important: z.boolean(),
  createdAt: z.number().int().nonnegative(),
  modifiedAt: z.number().int().nonnegative(),
  revision: z.number().int().positive(),
});

export type Note = z.infer<typeof noteSchema>;
export type NoteFolder = z.infer<typeof noteFolderSchema>;

export function noteBodyByteLength(body: string): number {
  return new TextEncoder().encode(body).byteLength;
}
