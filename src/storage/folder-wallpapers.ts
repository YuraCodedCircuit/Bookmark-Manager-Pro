import type { FolderBackgroundAppearance } from '../domain/folder';
import { folderWallpaperSchema } from '../domain/folder-wallpaper';
import type { BookmarkManagerDatabase } from './database';

/** Resolves a persisted wallpaper reference for presentation without changing storage. */
export async function hydrateFolderBackground(
  database: BookmarkManagerDatabase,
  profileId: string,
  appearance: FolderBackgroundAppearance,
): Promise<FolderBackgroundAppearance> {
  if (appearance.kind !== 'image' || appearance.value) return appearance;
  if (!appearance.imageId)
    throw new Error('folder-wallpaper-reference-missing');
  const wallpaper = folderWallpaperSchema.parse(
    await database.folderWallpapers.get(appearance.imageId),
  );
  if (wallpaper.profileId !== profileId)
    throw new Error('folder-wallpaper-profile-mismatch');
  return { ...appearance, value: wallpaper.dataUrl };
}

/** Stores new image data once and returns the reference-only appearance. */
export async function persistFolderBackground(
  database: BookmarkManagerDatabase,
  profileId: string,
  appearance: FolderBackgroundAppearance,
  now = Date.now(),
): Promise<FolderBackgroundAppearance> {
  if (appearance.kind !== 'image') return appearance;
  if (appearance.imageId) {
    const existing = await database.folderWallpapers.get(appearance.imageId);
    if (existing?.profileId === profileId)
      return {
        fit: appearance.fit,
        imageId: appearance.imageId,
        kind: 'image',
      };
    if (!appearance.value)
      throw new Error('folder-wallpaper-reference-invalid');
  }
  if (!appearance.value) throw new Error('folder-wallpaper-data-missing');
  const duplicate = await database.folderWallpapers
    .where('profileId')
    .equals(profileId)
    .filter(({ dataUrl }) => dataUrl === appearance.value)
    .first();
  const imageId = duplicate?.id ?? crypto.randomUUID();
  if (!duplicate)
    await database.folderWallpapers.add(
      folderWallpaperSchema.parse({
        createdAt: now,
        dataUrl: appearance.value,
        id: imageId,
        profileId,
      }),
    );
  return { fit: appearance.fit, imageId, kind: 'image' };
}

/** Removes profile wallpapers that are no longer referenced by folders or defaults. */
export async function deleteUnusedFolderWallpapers(
  database: BookmarkManagerDatabase,
  profileId: string,
): Promise<void> {
  const [folders, settings, wallpapers] = await Promise.all([
    database.folders.where('profileId').equals(profileId).toArray(),
    database.profileSettings.get(profileId),
    database.folderWallpapers.where('profileId').equals(profileId).toArray(),
  ]);
  const referenced = new Set<string>();
  for (const folder of folders) {
    const appearance = folder.backgroundAppearance;
    if (appearance.kind === 'image' && appearance.imageId)
      referenced.add(appearance.imageId);
  }
  const defaultAppearance = settings?.defaultFolderBackgroundAppearance;
  if (defaultAppearance?.kind === 'image' && defaultAppearance.imageId)
    referenced.add(defaultAppearance.imageId);
  await database.folderWallpapers.bulkDelete(
    wallpapers.filter(({ id }) => !referenced.has(id)).map(({ id }) => id),
  );
}
