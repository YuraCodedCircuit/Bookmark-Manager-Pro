import { z } from 'zod';

import {
  activityLogEntrySchema,
  activityLogSettingsSchema,
} from './activity-log';
import { bookmarkSchema } from './bookmark';
import { favoriteItemSchema } from './favorite-item';
import { folderSchema } from './folder';
import { profileSchema } from './profile';
import { profileSettingsSchema } from './profile-settings';
import { syncConnectionSchema } from './synchronization';
import { noteFolderSchema, noteSchema } from './note';
import { folderWallpaperSchema } from './folder-wallpaper';

export const BACKUP_FORMAT_VERSION = 3;
export const snapshotTypeSchema = z.enum([
  'manual',
  'automatic',
  'safety',
  'pre-upgrade',
  'deleted-profile',
]);
export const snapshotTriggerSchema = z.enum([
  'manual',
  'import',
  'synchronization',
  'profile-reset',
  'database-upgrade',
  'profile-deletion',
  'restore',
]);
export const backupPayloadSchema = z.object({
  formatVersion: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(BACKUP_FORMAT_VERSION),
  ]),
  databaseSchemaVersion: z.number().int().positive(),
  applicationVersion: z.string().trim().min(1).max(30),
  profile: profileSchema,
  settings: profileSettingsSchema,
  activityLogSettings: activityLogSettingsSchema.nullable(),
  bookmarks: z.array(bookmarkSchema).max(1_000_000),
  folders: z.array(folderSchema).max(1_000_000),
  favorites: z.array(favoriteItemSchema).max(1_000_000),
  activity: z.array(activityLogEntrySchema).max(1_000_000),
  synchronization: syncConnectionSchema.nullable(),
  notes: z.array(noteSchema).max(10_000).optional(),
  noteFolders: z.array(noteFolderSchema).max(1_000).optional(),
  folderWallpapers: z.array(folderWallpaperSchema).max(10_000).optional(),
});
export const backupSnapshotSchema = z.object({
  id: z.uuid(),
  profileId: z.uuid(),
  profileName: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(100),
  type: snapshotTypeSchema,
  trigger: snapshotTriggerSchema,
  createdAt: z.number().int().nonnegative(),
  verifiedAt: z.number().int().nonnegative(),
  sizeBytes: z.number().int().nonnegative(),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  payload: backupPayloadSchema,
});

export type BackupPayload = z.infer<typeof backupPayloadSchema>;
export type BackupSnapshot = z.infer<typeof backupSnapshotSchema>;
export type SnapshotType = z.infer<typeof snapshotTypeSchema>;
export type SnapshotTrigger = z.infer<typeof snapshotTriggerSchema>;

/** Returns the canonical bytes used for snapshot integrity verification. */
export function encodeBackupPayload(payload: BackupPayload): Uint8Array {
  const canonical = backupPayloadSchema.parse(payload);
  if (canonical.formatVersion === 1) {
    delete canonical.notes;
    delete canonical.noteFolders;
    const bindings = canonical.settings.shortcutPreferences?.bindings;
    if (bindings) {
      for (const action of [
        'noteNew',
        'noteSave',
        'notePreview',
        'noteImportant',
        'noteHeading',
        'noteBold',
        'noteItalic',
        'noteStrike',
        'noteBullet',
        'noteNumbered',
        'noteTask',
        'noteQuote',
        'noteInlineCode',
        'noteCodeBlock',
        'noteLink',
      ] as const)
        delete bindings[action];
    }
  }
  if (canonical.formatVersion < 3) delete canonical.folderWallpapers;
  return new TextEncoder().encode(JSON.stringify(canonical));
}

/** Computes a lowercase SHA-256 digest with the browser's Web Crypto implementation. */
export async function digestBackupPayload(
  payload: BackupPayload,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    Uint8Array.from(encodeBackupPayload(payload)).buffer,
  );
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}
