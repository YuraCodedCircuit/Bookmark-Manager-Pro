import type { Bookmark } from '../../domain/bookmark';
import type { Folder } from '../../domain/folder';
import type { ProfileSettings } from '../../domain/profile-settings';

export type BookmarkBrowserItem =
  { kind: 'bookmark'; value: Bookmark } | { kind: 'folder'; value: Folder };

export interface BookmarkItemGroup {
  key: string;
  label: string;
  items: readonly BookmarkBrowserItem[];
}

interface OrganizationLabels {
  bookmarks: string;
  folders: string;
  noDomain: string;
}

/** Applies profile-owned organization without changing stored manual indexes. */
export function organizeBookmarkItems(
  bookmarks: readonly Bookmark[],
  folders: readonly Folder[],
  settings: Pick<
    ProfileSettings,
    'bookmarkGroupBy' | 'bookmarkSortBy' | 'bookmarkSortDirection'
  >,
  locale: string,
  labels: OrganizationLabels,
): readonly BookmarkItemGroup[] {
  const collator = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: 'base',
  });
  const sortBy = settings.bookmarkSortBy ?? 'manual';
  const direction = settings.bookmarkSortDirection ?? 'ascending';
  const items: BookmarkBrowserItem[] = [
    ...folders.map((value) => ({ kind: 'folder' as const, value })),
    ...bookmarks.map((value) => ({ kind: 'bookmark' as const, value })),
  ];
  items.sort((left, right) => {
    const result = compare(left, right, sortBy, collator);
    return sortBy !== 'manual' && direction === 'descending' ? -result : result;
  });
  const groupBy = settings.bookmarkGroupBy ?? 'none';
  if (groupBy === 'none') return [{ items, key: 'all', label: '' }];

  const groups = new Map<string, BookmarkItemGroup>();
  for (const item of items) {
    const key =
      groupBy === 'type'
        ? item.kind
        : item.kind === 'folder'
          ? 'folders'
          : bookmarkDomain(item.value.url) || 'no-domain';
    const label =
      key === 'folder' || key === 'folders'
        ? labels.folders
        : key === 'bookmark'
          ? labels.bookmarks
          : key === 'no-domain'
            ? labels.noDomain
            : key;
    const existing = groups.get(key);
    if (existing) (existing.items as BookmarkBrowserItem[]).push(item);
    else groups.set(key, { items: [item], key, label });
  }
  return [...groups.values()].sort((left, right) =>
    collator.compare(left.label, right.label),
  );
}

function compare(
  left: BookmarkBrowserItem,
  right: BookmarkBrowserItem,
  sortBy: NonNullable<ProfileSettings['bookmarkSortBy']>,
  collator: Intl.Collator,
): number {
  if (sortBy === 'createdAt')
    return left.value.createdAt - right.value.createdAt;
  if (sortBy === 'updatedAt')
    return left.value.updatedAt - right.value.updatedAt;
  if (sortBy === 'title')
    return collator.compare(left.value.title, right.value.title);
  if (sortBy === 'domain') {
    return collator.compare(
      left.kind === 'bookmark' ? bookmarkDomain(left.value.url) : '',
      right.kind === 'bookmark' ? bookmarkDomain(right.value.url) : '',
    );
  }
  return left.value.index - right.value.index;
}

function bookmarkDomain(url: string): string {
  try {
    return new URL(url).hostname.toLocaleLowerCase();
  } catch {
    return '';
  }
}
