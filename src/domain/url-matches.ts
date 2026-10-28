import { parse } from 'tldts';

import type { Bookmark } from './bookmark';
import type {
  BookmarkSearchResult,
  SearchProfileSource,
} from './bookmark-search';
import { safeBookmarkUrlSchema } from './bookmark-url';

export const urlMatchLevels = [
  'site',
  'host',
  'path',
  'parameters',
  'exact',
] as const;
export type UrlMatchLevel = (typeof urlMatchLevels)[number];

/**
 * Compares only grouping/display inputs, independent of storage record order.
 * Metadata and image changes are read fresh by item actions, not rendered here.
 */
export function sameUrlMatchSources(
  previous: readonly SearchProfileSource[],
  next: readonly SearchProfileSource[],
): boolean {
  if (previous.length !== next.length) return false;
  const profiles = new Map(
    previous.map((source) => [source.profileId, source]),
  );
  return next.every((source) => {
    const old = profiles.get(source.profileId);
    if (
      !old ||
      old.profileName !== source.profileName ||
      old.bookmarks.length !== source.bookmarks.length ||
      old.folders.length !== source.folders.length
    )
      return false;
    const bookmarks = new Map(old.bookmarks.map((item) => [item.id, item]));
    const folders = new Map(old.folders.map((item) => [item.id, item]));
    return (
      source.bookmarks.every((item) => {
        const prior = bookmarks.get(item.id);
        return (
          prior !== undefined &&
          prior.profileId === item.profileId &&
          prior.parentId === item.parentId &&
          prior.title === item.title &&
          prior.url === item.url
        );
      }) &&
      source.folders.every((item) => {
        const prior = folders.get(item.id);
        return (
          prior !== undefined &&
          prior.profileId === item.profileId &&
          prior.parentId === item.parentId &&
          prior.title === item.title
        );
      })
    );
  });
}

/** A saved bookmark plus the context captured by one complete local scan. */
export interface UrlMatchMember extends BookmarkSearchResult {
  item: Bookmark;
  kind: 'bookmark';
}

/** The opaque key is collision-safe; the label is display-only and never parsed. */
export interface UrlMatchGroup {
  key: string;
  label: string;
  members: readonly UrlMatchMember[];
}

/**
 * Compares safe stored locations without rewriting them. Exact retains the
 * original string; broader keys use URL parsing and separate protocol/port.
 * Invalid stored input fails the scan rather than silently omitting records.
 */
export function urlMatchKey(
  value: string,
  level: UrlMatchLevel,
): { key: string; label: string } {
  safeBookmarkUrlSchema.parse(value);
  if (level === 'exact')
    return { key: JSON.stringify([level, value]), label: value };
  const url = new URL(value);
  let host = url.hostname;
  if (level === 'site') {
    const result = parse(host, { allowPrivateDomains: true });
    if ((result.isIcann || result.isPrivate) && result.domain)
      host = result.domain;
  }
  const authority = `${url.protocol}//${host}${url.port ? `:${url.port}` : ''}`;
  const parts: unknown[] = [level, url.protocol, url.port, host];
  let label = authority;
  if (level === 'path' || level === 'parameters') {
    parts.push(url.pathname);
    label += url.pathname;
  }
  if (level === 'parameters') {
    const pairs = [...url.searchParams.entries()].sort(
      ([an, av], [bn, bv]) => compare(an, bn) || compare(av, bv),
    );
    parts.push(pairs);
    const query = new URLSearchParams(pairs).toString();
    if (query) label += `?${query}`;
  }
  return { key: JSON.stringify(parts), label };
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Groups a complete snapshot; the injected separator formats display paths only. */
export function groupUrlMatches(
  sources: readonly SearchProfileSource[],
  level: UrlMatchLevel,
  activeProfileId: string,
  allProfiles: boolean,
  pathSeparator: '/' | '\\' = '/',
): readonly UrlMatchGroup[] {
  const groups = new Map<
    string,
    { key: string; label: string; members: UrlMatchMember[] }
  >();
  for (const source of sources) {
    if (!allProfiles && source.profileId !== activeProfileId) continue;
    const folders = new Map(
      source.folders.map((folder) => [folder.id, folder]),
    );
    const paths = new Map<string, string>();
    for (const item of source.bookmarks) {
      const comparison = urlMatchKey(item.url, level);
      let parentPath = paths.get(item.parentId);
      if (parentPath === undefined) {
        const names: string[] = [];
        const visited = new Set<string>();
        let id: string | null = item.parentId;
        while (id && !visited.has(id)) {
          visited.add(id);
          const folder = folders.get(id);
          if (!folder) break;
          names.push(folder.title);
          id = folder.parentId;
        }
        parentPath = names.reverse().join(` ${pathSeparator} `);
        paths.set(item.parentId, parentPath);
      }
      const group = groups.get(comparison.key) ?? {
        ...comparison,
        members: [],
      };
      group.members.push({
        item,
        kind: 'bookmark',
        matchedField: 'url',
        score: 0,
        parentPath,
        profileId: source.profileId,
        profileName: source.profileName,
      });
      groups.set(group.key, group);
    }
  }
  return [...groups.values()]
    .filter((group) => group.members.length >= 2)
    .map((group) => ({
      ...group,
      members: group.members.sort(
        (a, b) =>
          compare(a.profileName, b.profileName) ||
          compare(a.parentPath, b.parentPath) ||
          compare(a.item.title, b.item.title) ||
          compare(a.item.url, b.item.url) ||
          compare(a.profileId, b.profileId) ||
          compare(a.item.id, b.item.id),
      ),
    }))
    .sort(
      (a, b) =>
        b.members.length - a.members.length ||
        compare(a.label, b.label) ||
        compare(a.key, b.key),
    );
}

/** Retains complete groups when any member matches a literal title/URL filter. */
export function filterUrlMatches(
  groups: readonly UrlMatchGroup[],
  filter: string,
): readonly UrlMatchGroup[] {
  const query = filter.trim().toLowerCase();
  return query
    ? groups.filter((group) =>
        group.members.some(
          ({ item }) =>
            item.title.toLowerCase().includes(query) ||
            item.url.toLowerCase().includes(query),
        ),
      )
    : groups;
}
