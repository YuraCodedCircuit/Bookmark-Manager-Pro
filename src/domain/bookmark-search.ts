import { z } from 'zod';

import type { Bookmark } from './bookmark';
import type { Folder } from './folder';

export const searchFieldSchema = z.enum([
  'title',
  'url',
  'tags',
  'note',
  'folderTitle',
]);
export const searchItemTypeSchema = z.enum(['all', 'bookmark', 'folder']);
export const searchLocationSchema = z.enum([
  'current-folder',
  'descendants',
  'current-profile',
]);
export const searchMatchSchema = z.enum(['best', 'contains', 'exact']);
export const searchSortSchema = z.enum([
  'best',
  'title',
  'url',
  'createdAt',
  'updatedAt',
]);
export const searchPreferencesSchema = z.object({
  allProfiles: z.boolean(),
  fields: z.array(searchFieldSchema).min(1),
  itemType: searchItemTypeSchema,
  location: searchLocationSchema,
  match: searchMatchSchema,
  sort: searchSortSchema,
  sortDirection: z.enum(['ascending', 'descending']),
});

export type SearchPreferences = z.infer<typeof searchPreferencesSchema>;
export type SearchField = z.infer<typeof searchFieldSchema>;

export const defaultSearchPreferences: SearchPreferences =
  searchPreferencesSchema.parse({
    allProfiles: false,
    fields: ['title', 'url', 'tags', 'note', 'folderTitle'],
    itemType: 'all',
    location: 'current-profile',
    match: 'best',
    sort: 'best',
    sortDirection: 'ascending',
  });

export interface SearchProfileSource {
  bookmarks: readonly Bookmark[];
  folders: readonly Folder[];
  profileId: string;
  profileName: string;
}

export interface BookmarkSearchResult {
  item: Bookmark | Folder;
  kind: 'bookmark' | 'folder';
  matchedField: SearchField;
  parentPath: string;
  profileId: string;
  profileName: string;
  score: number;
}

/** Searches validated local profile content without browser or storage dependencies. */
export function searchBookmarks(input: {
  activeProfileId: string;
  currentFolderId: string;
  preferences: SearchPreferences;
  query: string;
  sources: readonly SearchProfileSource[];
}): readonly BookmarkSearchResult[] {
  const query = normalize(input.query);
  if (query.length < 2) return [];
  const preferences = searchPreferencesSchema.parse(input.preferences);
  const sources = preferences.allProfiles
    ? input.sources
    : input.sources.filter(
        ({ profileId }) => profileId === input.activeProfileId,
      );
  const results: BookmarkSearchResult[] = [];

  for (const source of sources) {
    const foldersById = new Map(
      source.folders.map((folder) => [folder.id, folder]),
    );
    const allowedFolderIds = preferences.allProfiles
      ? undefined
      : resolveAllowedFolders(
          source.folders,
          input.currentFolderId,
          preferences.location,
        );
    const items = [
      ...(preferences.itemType === 'folder' ? [] : source.bookmarks),
      ...(preferences.itemType === 'bookmark'
        ? []
        : source.folders.filter((folder) => !folder.isRoot)),
    ];
    for (const item of items) {
      const containingFolderId = 'url' in item ? item.parentId : item.parentId;
      if (
        allowedFolderIds &&
        (!containingFolderId || !allowedFolderIds.has(containingFolderId))
      )
        continue;
      const candidate = bestFieldMatch(item, query, preferences);
      if (!candidate) continue;
      results.push({
        item,
        kind: 'url' in item ? 'bookmark' : 'folder',
        matchedField: candidate.field,
        parentPath: folderPath(foldersById, item.parentId),
        profileId: source.profileId,
        profileName: source.profileName,
        score: candidate.score,
      });
    }
  }

  return [...results].sort((left, right) =>
    compareResults(left, right, preferences),
  );
}

function bestFieldMatch(
  item: Bookmark | Folder,
  query: string,
  preferences: SearchPreferences,
): { field: SearchField; score: number } | undefined {
  const fields: Array<{ field: SearchField; value: string; weight: number }> = [
    { field: 'title', value: item.title, weight: 50 },
    { field: 'url', value: 'url' in item ? item.url : '', weight: 30 },
    { field: 'tags', value: item.tags.join(' '), weight: 25 },
    { field: 'note', value: item.note, weight: 10 },
    {
      field: 'folderTitle',
      value: 'url' in item ? '' : item.title,
      weight: 45,
    },
  ];
  let best: { field: SearchField; score: number } | undefined;
  for (const candidate of fields) {
    if (!preferences.fields.includes(candidate.field) || !candidate.value)
      continue;
    const value = normalize(candidate.value);
    const matches =
      preferences.match === 'exact' ? value === query : value.includes(query);
    if (!matches) continue;
    const score =
      candidate.weight +
      (value === query ? 100 : value.startsWith(query) ? 50 : 10);
    if (!best || score > best.score) best = { field: candidate.field, score };
  }
  return best;
}

function resolveAllowedFolders(
  folders: readonly Folder[],
  currentFolderId: string,
  location: SearchPreferences['location'],
): Set<string> | undefined {
  if (location === 'current-profile') return undefined;
  const allowed = new Set([currentFolderId]);
  if (location === 'current-folder') return allowed;
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of folders)
      if (
        folder.parentId &&
        allowed.has(folder.parentId) &&
        !allowed.has(folder.id)
      ) {
        allowed.add(folder.id);
        changed = true;
      }
  }
  return allowed;
}

function folderPath(
  folders: ReadonlyMap<string, Folder>,
  parentId: string | null,
): string {
  const names: string[] = [];
  const visited = new Set<string>();
  let currentId = parentId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const folder = folders.get(currentId);
    if (!folder) break;
    names.unshift(folder.title);
    currentId = folder.parentId;
  }
  return names.join(' › ');
}

function compareResults(
  left: BookmarkSearchResult,
  right: BookmarkSearchResult,
  preferences: SearchPreferences,
): number {
  const comparison =
    preferences.sort === 'best'
      ? right.score - left.score
      : preferences.sort === 'title'
        ? left.item.title.localeCompare(right.item.title)
        : preferences.sort === 'url'
          ? ('url' in left.item ? left.item.url : '').localeCompare(
              'url' in right.item ? right.item.url : '',
            )
          : left.item[preferences.sort] - right.item[preferences.sort];
  return preferences.sort !== 'best' &&
    preferences.sortDirection === 'descending'
    ? -comparison
    : comparison;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}
