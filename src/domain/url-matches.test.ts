import { describe, expect, it } from 'vitest';
import type { Bookmark } from './bookmark';
import type { SearchProfileSource } from './bookmark-search';
import {
  filterUrlMatches,
  groupUrlMatches,
  sameUrlMatchSources,
  urlMatchKey,
  urlMatchLevels,
} from './url-matches';

const bookmark = (url: string, id: string, title = id): Bookmark => ({
  id,
  url,
  title,
  profileId: 'p',
  parentId: 'root',
  index: 0,
  createdAt: 1,
  updatedAt: 1,
  note: '',
  tags: [],
  cardAppearance: { kind: 'color', value: '#123456' },
});
const source = (
  bookmarks: readonly Bookmark[],
  profileId = 'p',
  profileName = profileId,
): SearchProfileSource => ({ bookmarks, folders: [], profileId, profileName });
const key = (url: string, level: Parameters<typeof urlMatchKey>[1]) =>
  urlMatchKey(url, level).key;

describe('URL-match source equivalence', () => {
  it('ignores record order and metadata that actions read fresh', () => {
    const original = source([
      bookmark('https://example.com/a', 'a'),
      bookmark('https://example.com/a', 'b'),
    ]);
    const next = {
      ...original,
      bookmarks: [...original.bookmarks].reverse().map((item) => ({
        ...item,
        note: 'Changed note',
        updatedAt: 20,
        cardAppearance: { kind: 'color' as const, value: '#ffffff' },
      })),
    };
    expect(sameUrlMatchSources([original], [next])).toBe(true);
  });
  it('detects changed membership, ownership, titles, addresses and folder context', () => {
    const original = source([bookmark('https://example.com/a', 'a')]);
    for (const changed of [
      { ...original, profileName: 'Renamed' },
      { ...original, profileId: 'other' },
      { ...original, bookmarks: [] },
      ...['title', 'url', 'parentId', 'profileId'].map((field) => ({
        ...original,
        bookmarks: original.bookmarks.map((item) => ({
          ...item,
          [field]: 'changed',
        })),
      })),
    ])
      expect(sameUrlMatchSources([original], [changed])).toBe(false);
    const folder: SearchProfileSource['folders'][number] = {
      id: 'root',
      profileId: 'p',
      parentId: null,
      title: 'Home',
      isRoot: true,
      index: 0,
      tags: [],
      note: '',
      createdAt: 1,
      updatedAt: 1,
      cardAppearance: { kind: 'color', value: '#ffffff' },
      backgroundAppearance: { kind: 'none' },
      bookmarkView: 'card',
      detailsTableTransparency: 0,
      includeNavigationBackground: false,
      navigationTransparency: 0,
    };
    const withFolder = { ...original, folders: [folder] };
    expect(
      sameUrlMatchSources(
        [withFolder],
        [{ ...withFolder, folders: [{ ...folder, title: 'Renamed' }] }],
      ),
    ).toBe(false);
    expect(
      sameUrlMatchSources(
        [withFolder],
        [{ ...withFolder, folders: [{ ...folder, parentId: 'other' }] }],
      ),
    ).toBe(false);
  });
});

describe('URL comparison', () => {
  it.each(urlMatchLevels)(
    'separates protocols and nondefault ports at %s',
    (level) => {
      expect(key('https://example.com/a', level)).not.toBe(
        key('http://example.com/a', level),
      );
      expect(key('https://example.com:444/a', level)).not.toBe(
        key('https://example.com:445/a', level),
      );
      expect(key('ftp://example.com/a', level)).not.toBe(
        key('https://example.com/a', level),
      );
    },
  );
  it('uses public and private suffixes but keeps unknown hosts and IPs intact', () => {
    expect(key('https://one.example.co.uk/a', 'site')).toBe(
      key('https://two.example.co.uk/b', 'site'),
    );
    expect(key('https://alice.github.io/a', 'site')).not.toBe(
      key('https://bob.github.io/b', 'site'),
    );
    expect(key('https://one.alice.github.io/a', 'site')).toBe(
      key('https://alice.github.io/b', 'site'),
    );
    for (const [a, b] of [
      ['one.internal', 'two.internal'],
      ['localhost', 'other.localhost'],
      ['127.0.0.1', '127.0.0.2'],
      ['[::1]', '[::2]'],
    ])
      expect(key(`http://${a}/`, 'site')).not.toBe(key(`http://${b}/`, 'site'));
  });
  it('keeps full hosts, path case, slashes, and encoded paths', () => {
    expect(key('https://one.example.com/a', 'host')).not.toBe(
      key('https://two.example.com/a', 'host'),
    );
    expect(key('https://example.com/a?x=1#one', 'path')).toBe(
      key('https://example.com/a?y=2#two', 'path'),
    );
    for (const path of ['/A', '/a/', '/%61'])
      expect(key(`https://example.com${path}`, 'path')).not.toBe(
        key('https://example.com/a', 'path'),
      );
  });
  it.each([
    ['?a=1&b=2', '?b=2&a=1', true],
    ['?a=1&a=1', '?a=1', false],
    ['?a=1&a=2', '?a=2&a=1', true],
    ['?q=hello+world', '?q=hello%20world', true],
    ['?A=1', '?a=1', false],
    ['?a=X', '?a=x', false],
    ['?a', '?a=', true],
    ['?%61=%26', '?a=%26', true],
    ['?utm_source=x', '', false],
    ['?a=1#one', '?a=1#two', true],
    ['?a=b%26c%3Dd', '?a=b&c=d', false],
  ])('compares decoded query multisets: %s / %s', (a, b, equal) => {
    expect(
      key(`https://example.com/a${a}`, 'parameters') ===
        key(`https://example.com/a${b}`, 'parameters'),
    ).toBe(equal);
  });
  it('compares exact stored strings without canonicalizing away differences', () => {
    expect(key('https://example.com/?a=1&b=2', 'exact')).not.toBe(
      key('https://example.com/?b=2&a=1', 'exact'),
    );
    expect(key('https://example.com/#a', 'exact')).not.toBe(
      key('https://example.com/#b', 'exact'),
    );
    expect(key('https://EXAMPLE.com/', 'exact')).not.toBe(
      key('https://example.com/', 'exact'),
    );
  });
  it.each([
    'javascript:alert(1)',
    'https://name:secret@example.com/',
    'not a URL',
  ])('rejects unsafe input without returning its content: %s', (url) => {
    expect(() => key(url, 'exact')).toThrow();
  });
});

describe('grouping and filtering', () => {
  const a = bookmark('https://example.com/a', 'a', 'Special [x]');
  const b = bookmark('https://example.com/a', 'b', 'Other');
  const c = bookmark('https://example.com/b', 'c');
  it('requires two members and combines profiles only when requested', () => {
    const sources = [source([a, c]), source([b], 'q', 'Other profile')];
    expect(groupUrlMatches(sources, 'exact', 'p', false)).toEqual([]);
    const groups = groupUrlMatches(sources, 'exact', 'p', true);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.members).toHaveLength(2);
    expect(groups[0]?.members.map((member) => member.profileId).sort()).toEqual(
      ['p', 'q'],
    );
  });
  it('retains whole groups for literal, trimmed, case-insensitive first-character filters', () => {
    const groups = groupUrlMatches([source([a, b, c])], 'exact', 'p', false);
    for (const filter of [
      '',
      '  ',
      's',
      '  SPECIAL  ',
      '[x]',
      'example.com/a',
    ]) {
      expect(filterUrlMatches(groups, filter)[0]?.members).toHaveLength(2);
    }
    expect(filterUrlMatches(groups, '*')).toEqual([]);
    expect(filterUrlMatches(groups, 'example.com/b')).toEqual([]);
  });
  it('orders by count then key and members by visible context and identifier', () => {
    const sources = [
      source([b, a, bookmark(a.url, '0', 'Other'), c, bookmark(c.url, 'd')]),
    ];
    const groups = groupUrlMatches(sources, 'exact', 'p', false);
    expect(groups.map((group) => group.members.length)).toEqual([3, 2]);
    expect(groups[0]?.members.map((member) => member.item.id)).toEqual([
      '0',
      'b',
      'a',
    ]);
    expect(sources[0]?.bookmarks[0]).toBe(b);
  });
});
