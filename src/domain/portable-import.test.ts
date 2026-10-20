import { describe, expect, it } from 'vitest';
import { includedPortableItems, readPortableJson } from './portable-import';

const id = (value: number) =>
  `11111111-1111-4111-8111-${String(value).padStart(12, '0')}`;
function source() {
  return {
    format: 'bookmark-manager-pro-bookmarks',
    version: 1,
    profiles: [
      {
        id: id(1),
        name: 'Synthetic',
        folders: [
          { id: id(2), parentId: null, title: 'Source root', index: 0 },
          { id: id(3), parentId: id(2), title: 'Home', index: 1 },
          { id: id(4), parentId: id(2), title: 'Empty', index: 2 },
        ],
        bookmarks: [
          {
            id: id(5),
            parentId: id(3),
            title: '<script>Example</script>',
            url: 'https://example.com/',
            tags: [],
            note: '',
            index: 0,
          },
        ],
      },
    ],
  };
}
describe('own JSON import preview', () => {
  it('accepts deep nested v2 trees and rejects duplicate identities', () => {
    const folders: Array<{
      id: string;
      parentId: string | null;
      title: string;
      index: number;
      tags: string[];
      note: string;
      content: unknown[];
    }> = Array.from({ length: 130 }, (_, index) => ({
      id: id(index + 2),
      parentId: index ? id(index + 1) : null,
      title: 'Folder',
      index: 0,
      tags: [],
      note: '',
      content: [],
    }));
    for (let index = 1; index < folders.length; index++)
      folders[index - 1]!.content.push(folders[index]!);
    const input = {
      format: 'bookmark-manager-pro-bookmarks',
      version: 2,
      profiles: [{ id: id(1), name: 'Synthetic', content: [folders[0]!] }],
    };
    expect(readPortableJson(JSON.stringify(input))).toHaveLength(129);
    folders[0]!.content = [
      { ...folders[1]!, content: [] },
      { ...folders[1]!, content: [] },
    ];
    expect(() => readPortableJson(JSON.stringify(input))).toThrow(
      'import-duplicate-item',
    );
  });
  it('accepts tree v2 and rejects mismatched parents, unsafe URLs, metadata, and unknown versions', () => {
    const old = source().profiles[0]!;
    const root = {
      ...old.folders[0]!,
      tags: ['one'],
      note: 'Root note',
      content: [
        {
          ...old.folders[1]!,
          tags: [],
          note: '',
          content: [old.bookmarks[0]!],
        },
      ],
    };
    const input = {
      format: 'bookmark-manager-pro-bookmarks',
      version: 2,
      profiles: [{ id: old.id, name: old.name, content: [root] }],
    };
    expect(
      readPortableJson(JSON.stringify(input)).map((item) => item.title),
    ).toEqual(['Home', '<script>Example</script>']);
    for (const mutate of [
      (value: typeof input) => {
        value.profiles[0]!.content[0]!.content[0]!.parentId = id(99);
      },
      (value: typeof input) => {
        value.profiles[0]!.content[0]!.content[0]!.content[0]!.url =
          'javascript:alert(1)';
      },
      (value: typeof input) => {
        value.profiles[0]!.content[0]!.tags = Array(51).fill('tag');
      },
      (value: typeof input) => {
        value.version = 3;
      },
    ]) {
      const invalid = structuredClone(input);
      mutate(invalid);
      expect(() => readPortableJson(JSON.stringify(invalid))).toThrow();
    }
  });
  it('omits the structural root, preserves ordinary Home folders and empty folders, and exposes no URL or note', () => {
    const input = source();
    const before = JSON.stringify(input);
    const items = readPortableJson(before);
    expect(items.map((item) => item.title)).toEqual([
      'Home',
      'Empty',
      '<script>Example</script>',
    ]);
    expect(items[0]!.parentId).toBeNull();
    expect(items[2]!.parentId).toBe(items[0]!.id);
    expect(JSON.stringify(items)).not.toContain('https://example.com');
    expect(JSON.stringify(input)).toBe(before);
  });
  it.each([
    'version',
    'format',
    'duplicate',
    'orphan',
    'cycle',
    'unsafe-url',
    'multiple-roots',
    'unknown-field',
    'missing-field',
  ] as const)('rejects %s before returning any preview', (fault) => {
    const input = source();
    const profile = input.profiles[0]!;
    switch (fault) {
      case 'version':
        input.version = 3;
        break;
      case 'format':
        input.format = 'third-party';
        break;
      case 'duplicate':
        profile.bookmarks[0]!.id = id(3);
        break;
      case 'orphan':
        profile.bookmarks[0]!.parentId = id(99);
        break;
      case 'cycle':
        profile.folders[1]!.parentId = id(3);
        break;
      case 'unsafe-url':
        profile.bookmarks[0]!.url = 'javascript:alert(1)';
        break;
      case 'multiple-roots':
        profile.folders[1]!.parentId = null;
        break;
      case 'unknown-field':
        Object.assign(profile, { settings: {} });
        break;
      case 'missing-field':
        Reflect.deleteProperty(profile, 'bookmarks');
        break;
    }
    expect(() => readPortableJson(JSON.stringify(input))).toThrow();
  });
  it('accepts deep flat hierarchies and rejects truncated input', () => {
    const input = source();
    const profile = input.profiles[0]!;
    profile.bookmarks = [];
    profile.folders = Array.from({ length: 130 }, (_, index) => ({
      id: id(index + 2),
      parentId: index === 0 ? null : id(index + 1),
      title: `Folder ${index}`,
      index,
    }));
    expect(readPortableJson(JSON.stringify(input))).toHaveLength(129);
    expect(() => readPortableJson('{')).toThrow();
  });
  it('counts required ancestors and selected empty folders without including excluded siblings', () => {
    const items = readPortableJson(JSON.stringify(source()));
    expect(
      includedPortableItems(items, new Set([items[2]!.id])).map(
        (item) => item.title,
      ),
    ).toEqual(['Home', '<script>Example</script>']);
    expect(
      includedPortableItems(items, new Set([items[1]!.id])).map(
        (item) => item.title,
      ),
    ).toEqual(['Empty']);
    expect(includedPortableItems(items, new Set())).toEqual([]);
  });
  it('keeps source identities separate across profiles', () => {
    const input = source();
    input.profiles.push({ ...structuredClone(input.profiles[0]!), id: id(99) });
    const items = readPortableJson(JSON.stringify(input));
    expect(new Set(items.map((item) => item.id)).size).toBe(6);
  });
});
