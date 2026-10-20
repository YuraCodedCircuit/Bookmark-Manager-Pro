import { z } from 'zod';
import { validateParentForest } from './parent-forest';
import { bookmarkSchema } from './bookmark';
import { folderSchema } from './folder';
import { MAX_NATIVE_EXPORT_FILE_BYTES } from './profile-export';
import type { CsvColumn } from './csv-export';

const portableFolder = folderSchema
  .pick({ id: true, parentId: true, title: true, index: true })
  .extend({
    tags: folderSchema.shape.tags.optional(),
    note: folderSchema.shape.note.optional(),
  })
  .strict();
const portableBookmark = bookmarkSchema
  .pick({
    id: true,
    parentId: true,
    title: true,
    url: true,
    tags: true,
    note: true,
    index: true,
  })
  .strict();
const portableSchema = z
  .object({
    format: z.literal('bookmark-manager-pro-bookmarks'),
    version: z.literal(1),
    profiles: z
      .array(
        z
          .object({
            id: z.uuid(),
            name: z.string().trim().min(1).max(80),
            folders: z.array(portableFolder).max(1_000_000),
            bookmarks: z.array(portableBookmark).max(1_000_000),
          })
          .strict(),
      )
      .min(1)
      .max(1000),
  })
  .strict();

const treeFolder = folderSchema
  .pick({
    id: true,
    parentId: true,
    title: true,
    index: true,
    tags: true,
    note: true,
  })
  .extend({ content: z.array(z.unknown()).max(1_000_000) })
  .strict();
const treeSchema = z
  .object({
    format: z.literal('bookmark-manager-pro-bookmarks'),
    version: z.literal(2),
    profiles: z
      .array(
        z
          .object({
            id: z.uuid(),
            name: z.string().trim().min(1).max(80),
            content: z.array(z.unknown()).max(1_000_000),
          })
          .strict(),
      )
      .min(1)
      .max(1000),
  })
  .strict();

/** Validates nested nodes iteratively before sharing v1 relationship checks. */
function flattenTree(input: unknown): z.infer<typeof portableSchema> {
  const tree = treeSchema.parse(input);
  let records = 0;
  return {
    format: tree.format,
    version: 1,
    profiles: tree.profiles.map((profile) => {
      const folders: z.infer<typeof portableFolder>[] = [];
      const bookmarks: z.infer<typeof portableBookmark>[] = [];
      const stack = profile.content.map((item) => ({
        item,
        parentId: null as string | null,
      }));
      while (stack.length) {
        const { item, parentId } = stack.pop()!;
        if (++records > 1_000_000) throw new Error('import-record-limit');
        if (typeof item === 'object' && item !== null && 'content' in item) {
          const folder = treeFolder.parse(item);
          if (folder.parentId !== parentId)
            throw new Error('import-invalid-tree');
          folders.push(
            portableFolder.parse({
              id: folder.id,
              parentId: folder.parentId,
              title: folder.title,
              index: folder.index,
              tags: folder.tags,
              note: folder.note,
            }),
          );
          for (const child of folder.content)
            stack.push({ item: child, parentId: folder.id });
        } else {
          const bookmark = portableBookmark.parse(item);
          if (bookmark.parentId !== parentId)
            throw new Error('import-invalid-tree');
          bookmarks.push(bookmark);
        }
      }
      return { id: profile.id, name: profile.name, folders, bookmarks };
    }),
  };
}

/** Verified preview hierarchy and optional inert CSV cells; IDs stay local to the preview. */
export interface PortableImportItem {
  id: string;
  parentId: string | null;
  title: string;
  kind: 'folder' | 'bookmark';
  index: number;
  csvValues?: Partial<Record<CsvColumn, string>>;
  /** Complete validated content is retained only by the foreground import owner. */
  data?: { url?: string | undefined; tags: string[]; note: string };
}

/** Validates own flat v1 or tree v2 JSON without executing content or mutating storage. */
export function readPortableJson(
  content: string,
  retainContent = false,
): PortableImportItem[] {
  if (
    content.length > MAX_NATIVE_EXPORT_FILE_BYTES ||
    new TextEncoder().encode(content).byteLength > MAX_NATIVE_EXPORT_FILE_BYTES
  )
    throw new Error('import-file-size');
  const input: unknown = JSON.parse(content);
  const parsed = portableSchema.parse(
    typeof input === 'object' &&
      input !== null &&
      'version' in input &&
      input.version === 2
      ? flattenTree(input)
      : input,
  );
  const profileIds = new Set<string>();
  const result: PortableImportItem[] = [];
  let records = 0;
  for (const [profileIndex, profile] of parsed.profiles.entries()) {
    if (profileIds.has(profile.id)) throw new Error('import-duplicate-profile');
    profileIds.add(profile.id);
    records += profile.folders.length + profile.bookmarks.length;
    if (records > 1_000_000) throw new Error('import-record-limit');
    const folders = new Map(
      profile.folders.map((folder) => [folder.id, folder]),
    );
    const ids = new Set(
      [...profile.folders, ...profile.bookmarks].map((item) => item.id),
    );
    if (ids.size !== profile.folders.length + profile.bookmarks.length)
      throw new Error('import-duplicate-item');
    const roots = profile.folders.filter((folder) => folder.parentId === null);
    if (profile.folders.length && roots.length !== 1)
      throw new Error('import-invalid-root');
    const root = roots[0];
    validateParentForest(profile.folders, 'import-invalid-tree');
    const localId = (id: string) => `${profileIndex}:${id}`;
    for (const folder of profile.folders) {
      if (folder.id === root?.id) continue;
      result.push({
        id: localId(folder.id),
        parentId:
          folder.parentId === root?.id ? null : localId(folder.parentId!),
        title: folder.title,
        kind: 'folder',
        index: folder.index,
        ...(retainContent
          ? { data: { tags: folder.tags ?? [], note: folder.note ?? '' } }
          : {}),
      });
    }
    for (const bookmark of profile.bookmarks) {
      if (!folders.has(bookmark.parentId))
        throw new Error('import-missing-folder');
      result.push({
        id: localId(bookmark.id),
        parentId:
          bookmark.parentId === root?.id ? null : localId(bookmark.parentId),
        title: bookmark.title,
        kind: 'bookmark',
        index: bookmark.index,
        ...(retainContent
          ? {
              data: {
                url: bookmark.url,
                tags: bookmark.tags,
                note: bookmark.note,
              },
            }
          : {}),
      });
    }
  }
  return result;
}

/** Includes required ancestors in counts while retaining explicitly selected empty folders. */
export function includedPortableItems(
  items: readonly PortableImportItem[],
  selected: ReadonlySet<string>,
): PortableImportItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const included = new Set(selected);
  for (const id of selected) {
    let parent = byId.get(id)?.parentId;
    while (parent) {
      if (included.has(parent)) break;
      included.add(parent);
      parent = byId.get(parent)?.parentId;
    }
  }
  return items.filter((item) => included.has(item.id));
}
