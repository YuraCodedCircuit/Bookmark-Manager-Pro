import { z } from 'zod';
import { validateParentForest } from './parent-forest';
import { bookmarkSchema, type Bookmark } from './bookmark';
import { folderSchema, type Folder } from './folder';
import { backupPayloadSchema, type BackupPayload } from './backup';
import {
  defaultFolderAppearanceSettings,
  defaultFolderDisplaySettings,
  profileSettingsSchema,
  type ProfileSettings,
} from './profile-settings';
import type { ExportPayload } from './profile-export';
import type { PortableImportItem } from './portable-import';

const itemSchema = z.object({
  id: z.string().min(1).max(100),
  parentId: z.string().min(1).max(100).nullable(),
  title: bookmarkSchema.shape.title,
  kind: z.enum(['folder', 'bookmark']),
  index: z.number().int().nonnegative(),
  data: z.object({
    url: bookmarkSchema.shape.url.optional(),
    tags: bookmarkSchema.shape.tags,
    note: bookmarkSchema.shape.note,
  }),
});

/** Revalidates complete portable content at the write boundary, including all field lengths. */
export function validateImportItems(input: readonly PortableImportItem[]) {
  const items = z.array(itemSchema).min(1).max(1_000_000).parse(input);
  const ids = new Map(items.map((item) => [item.id, item]));
  if (ids.size !== items.length) throw new Error('import-duplicate-item');
  for (const item of items) {
    if (item.kind === 'bookmark' && !item.data.url)
      throw new Error('import-url-missing');
    if (item.kind === 'folder') {
      folderSchema.shape.title.parse(item.title);
      folderSchema.shape.note.parse(item.data.note);
    }
    if (item.parentId !== null && ids.get(item.parentId)?.kind !== 'folder')
      throw new Error('import-invalid-tree');
  }
  validateParentForest(items, 'import-invalid-tree');
  return items;
}

/** Resolves the same saved profile defaults used by new-item creation, never another profile's settings. */
export function importFolderDefaults(settings: ProfileSettings) {
  return {
    ...defaultFolderDisplaySettings,
    bookmarkView: settings.bookmarkView,
    cardSize: settings.cardSize,
    cardSpacing:
      settings.cardSpacing ?? defaultFolderDisplaySettings.cardSpacing,
    bookmarkSortBy:
      settings.bookmarkSortBy ?? defaultFolderDisplaySettings.bookmarkSortBy,
    bookmarkSortDirection:
      settings.bookmarkSortDirection ??
      defaultFolderDisplaySettings.bookmarkSortDirection,
    bookmarkGroupBy:
      settings.bookmarkGroupBy ?? defaultFolderDisplaySettings.bookmarkGroupBy,
    detailsColumnOrder: [
      ...(settings.detailsColumnOrder ??
        defaultFolderDisplaySettings.detailsColumnOrder),
    ],
    backgroundAppearance:
      settings.defaultFolderBackgroundAppearance ??
      defaultFolderAppearanceSettings.backgroundAppearance,
    detailsTableTransparency:
      settings.defaultFolderDetailsTableTransparency ??
      defaultFolderAppearanceSettings.detailsTableTransparency,
    includeNavigationBackground:
      settings.defaultFolderIncludeNavigationBackground ??
      defaultFolderAppearanceSettings.includeNavigationBackground,
    navigationTransparency:
      settings.defaultFolderNavigationTransparency ??
      defaultFolderAppearanceSettings.navigationTransparency,
  };
}

/** Materializes selected portable records with fresh identities and validated destination defaults. */
export function createPortableRecords(
  input: readonly PortableImportItem[],
  settings: ProfileSettings,
  parentId: string,
  startIndex: number,
  now: number,
) {
  const items = validateImportItems(input);
  const ids = new Map(items.map((item) => [item.id, crypto.randomUUID()]));
  const folders: Folder[] = [];
  const bookmarks: Bookmark[] = [];
  for (const item of items) {
    const common = {
      id: ids.get(item.id)!,
      profileId: settings.profileId,
      parentId: item.parentId === null ? parentId : ids.get(item.parentId)!,
      title: item.title,
      tags: item.data.tags,
      note: item.data.note,
      index: item.parentId === null ? startIndex + item.index : item.index,
      createdAt: now,
      updatedAt: now,
    };
    const appearance = settings.rememberLastAppearance
      ? item.kind === 'folder'
        ? settings.lastFolderAppearance
        : settings.lastBookmarkAppearance
      : undefined;
    if (item.kind === 'bookmark')
      bookmarks.push(
        bookmarkSchema.parse({
          ...common,
          url: item.data.url,
          cardAppearance: appearance ?? { kind: 'color', value: '#2f7de1' },
        }),
      );
    else
      folders.push(
        folderSchema.parse({
          ...common,
          ...importFolderDefaults(settings),
          cardAppearance: appearance ?? { kind: 'color', value: '#2f7de1' },
          isRoot: false,
        }),
      );
  }
  return { folders, bookmarks };
}

/** Remaps one native profile (including historical records) without touching personal text. */
export function remapNativeProfile(
  source: ExportPayload['profiles'][number],
  profileId: string,
): BackupPayload {
  const ids = new Map<string, string>();
  const remap = (id: string, kind = 'folder'): string => {
    const key = `${kind}:${id}`;
    let value = ids.get(key);
    if (!value) {
      value = crypto.randomUUID();
      ids.set(key, value);
    }
    return value;
  };
  const rows = <T extends { id: string; profileId: string }>(
    values: readonly T[] | undefined,
    kind: string,
  ) =>
    (values ?? []).map((item) => ({
      ...item,
      id: remap(item.id, kind),
      profileId,
    }));
  const appearance = <T extends { kind: string }>(value: T): T =>
    value.kind === 'image' &&
    'imageId' in value &&
    typeof value.imageId === 'string'
      ? { ...value, imageId: remap(value.imageId, 'wallpaper') }
      : value;
  const sourceSettings =
    source.settings ??
    profileSettingsSchema.parse({
      profileId: source.profile.id,
      theme: 'system',
    });
  const settings = profileSettingsSchema.parse({
    ...sourceSettings,
    profileId,
    lastOpenedFolderId: sourceSettings.lastOpenedFolderId
      ? remap(sourceSettings.lastOpenedFolderId)
      : undefined,
    importPreferences: sourceSettings.importPreferences
      ? { ...sourceSettings.importPreferences, rememberedFolders: {} }
      : undefined,
    defaultFolderBackgroundAppearance:
      sourceSettings.defaultFolderBackgroundAppearance
        ? appearance(sourceSettings.defaultFolderBackgroundAppearance)
        : undefined,
  });
  const folders = rows(source.folders, 'folder').map((item) => ({
    ...item,
    parentId: item.parentId ? remap(item.parentId) : null,
    backgroundAppearance: appearance(item.backgroundAppearance),
  }));
  if (!folders.length)
    folders.push(
      folderSchema.parse({
        ...importFolderDefaults(settings),
        id: crypto.randomUUID(),
        profileId,
        parentId: null,
        title: 'Home',
        tags: [],
        note: '',
        cardAppearance: { kind: 'color', value: '#2f7de1' },
        index: 0,
        isRoot: true,
        createdAt: source.profile.createdAt,
        updatedAt: source.profile.updatedAt,
      }),
    );
  return backupPayloadSchema.parse({
    formatVersion: 3,
    databaseSchemaVersion: 38,
    applicationVersion: source.applicationVersion,
    profile: { ...source.profile, id: profileId },
    settings,
    activityLogSettings: source.activityLogSettings
      ? { ...source.activityLogSettings, profileId }
      : null,
    folders,
    bookmarks: rows(source.bookmarks, 'bookmark').map((item) => ({
      ...item,
      parentId: remap(item.parentId),
    })),
    favorites: (source.favorites ?? []).map((item) => ({
      ...item,
      profileId,
      itemId: remap(item.itemId, item.kind),
    })),
    activity: rows(source.activity, 'activity').map((item) => ({
      ...item,
      operationId: `op-${remap(item.operationId, 'operation')}`,
    })),
    notes: rows(source.notes, 'note').map((item) => ({
      ...item,
      folderId: remap(item.folderId, 'note-folder'),
    })),
    noteFolders: rows(source.noteFolders, 'note-folder').map((item) => ({
      ...item,
      parentId: item.parentId ? remap(item.parentId, 'note-folder') : null,
    })),
    folderWallpapers: rows(source.folderWallpapers, 'wallpaper'),
    synchronization: source.synchronization
      ? {
          ...source.synchronization,
          profileId,
          extensionRoot: remap(source.synchronization.extensionRoot),
          status: 'paused',
          links: [],
          plannedLinks: [],
          operations: [],
          pendingContentChange: undefined,
        }
      : null,
  });
}
