import { afterEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { ExportProfiles } from './export-profiles';
import { readPortableJson } from '../../domain/portable-import';
import { readBookmarkHtml } from '../../domain/portable-text-import';
import {
  backupPayloadSchema,
  digestBackupPayload,
  encodeBackupPayload,
  type BackupSnapshot,
} from '../../domain/backup';
import {
  decodeNativeExport,
  exportCategories,
} from '../../domain/profile-export';
import { activityLogEntrySchema } from '../../domain/activity-log';

const id = '11111111-1111-4111-8111-111111111111';
const root = '22222222-2222-4222-8222-222222222222';
function source() {
  return backupPayloadSchema.parse({
    formatVersion: 3,
    databaseSchemaVersion: 32,
    applicationVersion: '0.6.2',
    profile: { id, username: 'Synthetic profile', createdAt: 1, updatedAt: 1 },
    settings: {
      profileId: id,
      theme: 'dark',
      bookmarkView: 'card',
      cardSize: 'small',
    },
    activityLogSettings: null,
    bookmarks: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        profileId: id,
        parentId: root,
        title: '=HYPERLINK("unsafe")',
        url: 'https://example.com/?a=1&b=2',
        tags: ['synthetic'],
        note: '<script>alert(1)</script>',
        cardAppearance: {
          kind: 'image',
          value: 'data:image/png;base64,YQ==',
          fit: 'fill',
        },
        index: 0,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    folders: [
      {
        id: root,
        profileId: id,
        parentId: null,
        title: '<Home>',
        tags: [],
        note: '',
        cardAppearance: { kind: 'color', value: '#123456' },
        backgroundAppearance: { kind: 'none' },
        bookmarkView: 'card',
        detailsTableTransparency: 0,
        includeNavigationBackground: false,
        navigationTransparency: 0,
        index: 0,
        isRoot: true,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    favorites: [],
    activity: [],
    synchronization: null,
    notes: [],
    noteFolders: [],
    folderWallpapers: [],
  });
}
afterEach(() => vi.unstubAllGlobals());
describe('ExportProfiles', () => {
  it.each([false, true])(
    'excludes current and nested legacy activity from encrypted=%s exports',
    async (encrypted) => {
      vi.stubGlobal('crypto', webcrypto);
      const original = source();
      original.activity.push({
        ...activityLogEntrySchema.parse({
          id: crypto.randomUUID(),
          profileId: id,
          action: 'Import',
          applicationVersion: '0.7.0',
          browserTarget: 'Test',
          category: 'Application',
          dataChanged: false,
          durationMs: 0,
          eventCode: 'IMPORT-SAVE-COMPLETE',
          itemType: 'Import',
          itemsAffected: 0,
          kind: 'ACTIVITY',
          level: 'INFO',
          message: 'Synthetic history marker.',
          operationId: 'op-test-import',
          outcome: 'Succeeded',
          schemaVersion: 1,
          source: 'Import',
          timestamp: 1,
        }),
        profileId: id,
      });
      const snapshot: BackupSnapshot = {
        id: crypto.randomUUID(),
        profileId: id,
        profileName: 'Synthetic profile',
        name: 'Old snapshot',
        type: 'manual',
        trigger: 'manual',
        createdAt: 1,
        verifiedAt: 1,
        sizeBytes: encodeBackupPayload(original).byteLength,
        digest: await digestBackupPayload(original),
        payload: original,
      };
      const before = JSON.stringify(snapshot);
      const password = encrypted ? 'LongTestPassword1!' : undefined;
      const service = new ExportProfiles({
        captureProfile: async () => original,
        list: async () => [snapshot],
      });
      const file = await service.create(
        {
          profileIds: [id],
          format: 'bmpro',
          categories: [...exportCategories],
          includeBackups: true,
          password,
        },
        new AbortController().signal,
        vi.fn(),
      );
      const decoded = await decodeNativeExport(file.content, password);
      expect(decoded.profiles[0]!.activity).toEqual([]);
      expect(decoded.backups[0]!.payload.activity).toEqual([]);
      expect(JSON.stringify(decoded)).not.toContain('Synthetic history marker');
      expect(decoded.backups[0]!.digest).toBe(
        await digestBackupPayload(decoded.backups[0]!.payload),
      );
      expect(decoded.backups[0]!.sizeBytes).toBe(
        encodeBackupPayload(decoded.backups[0]!.payload).byteLength,
      );
      expect(JSON.stringify(snapshot)).toBe(before);
      snapshot.digest = '0'.repeat(64);
      await expect(
        service.create(
          {
            profileIds: [id],
            format: 'bmpro',
            categories: [...exportCategories],
            includeBackups: true,
          },
          new AbortController().signal,
          vi.fn(),
        ),
      ).rejects.toThrow('export-backup-integrity-failed');
    },
  );
  it('round-trips 10,000 nested folders and their deepest bookmark in supported tree formats', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const original = source();
    const folderId = (index: number) =>
      `77777777-7777-4777-8777-${String(index).padStart(12, '0')}`;
    original.folders = Array.from({ length: 10_001 }, (_, index) => ({
      ...original.folders[0]!,
      id: folderId(index),
      parentId: index ? folderId(index - 1) : null,
      isRoot: index === 0,
    }));
    original.bookmarks[0]!.parentId = folderId(10_000);
    const service = new ExportProfiles({
      captureProfile: async () => original,
      list: async () => [],
    });
    for (const format of ['bmpro', 'json', 'html', 'csv'] as const) {
      const file = await service.create(
        {
          profileIds: [id],
          format,
          categories: [...exportCategories],
          includeBackups: false,
        },
        new AbortController().signal,
        vi.fn(),
      );
      if (format === 'bmpro')
        expect(
          (await decodeNativeExport(file.content)).profiles[0]!.folders,
        ).toHaveLength(10_001);
      if (format === 'json')
        expect(readPortableJson(file.content)).toHaveLength(10_001);
      if (format === 'html')
        expect(readBookmarkHtml(file.content)).toHaveLength(10_002);
      if (format === 'csv')
        expect(file.content).toContain('https://example.com/');
    }
  }, 30_000);
  it('applies CSV column inclusion and order to headers, rows, and byte estimates', async () => {
    const service = new ExportProfiles(
      { captureProfile: async () => source(), list: async () => [] },
      () => 1,
    );
    const options = {
      profileIds: [id],
      format: 'csv' as const,
      categories: [],
      includeBackups: false,
      csvColumns: ['url', 'title'] as const,
    };
    const file = await service.create(
      options,
      new AbortController().signal,
      vi.fn(),
    );
    expect(file.content).toBe(
      '\uFEFF"URL","Title"\r\n"https://example.com/?a=1&b=2","\'=HYPERLINK(""unsafe"")"',
    );
    expect(
      await service.estimate(
        { ...options, encrypted: false },
        new AbortController().signal,
      ),
    ).toBe(new TextEncoder().encode(file.content).length);
    await expect(
      service.create(
        { ...options, csvColumns: ['title'] },
        new AbortController().signal,
        vi.fn(),
      ),
    ).rejects.toThrow();
    const minimal = await service.create(
      { ...options, csvColumns: ['url'] },
      new AbortController().signal,
      vi.fn(),
    );
    expect(minimal.content).toBe(
      '\uFEFF"URL"\r\n"https://example.com/?a=1&b=2"',
    );
  });
  it('estimates current serialized bytes for every format, including encryption overhead', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const service = new ExportProfiles(
      { captureProfile: async () => source(), list: async () => [] },
      () => 1,
    );
    for (const format of ['bmpro', 'json', 'csv', 'html'] as const) {
      for (const encrypted of format === 'bmpro' ? [false, true] : [false]) {
        const options = {
          profileIds: [id],
          format,
          categories: [...exportCategories],
          includeBackups: false,
        };
        const estimate = await service.estimate(
          { ...options, encrypted },
          new AbortController().signal,
        );
        const file = await service.create(
          {
            ...options,
            password: encrypted ? 'LongTestPassword1!' : undefined,
          },
          new AbortController().signal,
          vi.fn(),
        );
        expect(estimate).toBe(
          new TextEncoder().encode(file.content).byteLength,
        );
      }
    }
  });

  it('aborts an estimate before reading and does not create a backup', async () => {
    const captureProfile = vi.fn(async () => source());
    const list = vi.fn(async () => []);
    const controller = new AbortController();
    controller.abort();
    await expect(
      new ExportProfiles({ captureProfile, list }).estimate(
        {
          profileIds: [id],
          format: 'bmpro',
          categories: [...exportCategories],
          includeBackups: true,
          encrypted: true,
        },
        controller.signal,
      ),
    ).rejects.toThrow();
    expect(captureProfile).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });
  it('exports selected profiles and their verified backup history only', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const original = source();
    const secondId = '44444444-4444-4444-8444-444444444444';
    const second = backupPayloadSchema.parse(
      JSON.parse(JSON.stringify(original).replaceAll(id, secondId)),
    );
    const snapshot: BackupSnapshot = {
      id: '55555555-5555-4555-8555-555555555555',
      profileId: id,
      profileName: 'Synthetic profile',
      name: 'Synthetic snapshot',
      type: 'manual',
      trigger: 'manual',
      createdAt: 1,
      verifiedAt: 1,
      sizeBytes: 1,
      digest: await digestBackupPayload(original),
      payload: original,
    };
    const unrelated = {
      ...snapshot,
      id: '66666666-6666-4666-8666-666666666666',
      profileId: secondId,
      payload: second,
      digest: await digestBackupPayload(second),
    };
    const service = new ExportProfiles({
      captureProfile: async (profileId) =>
        profileId === id ? original : second,
      list: async () => [snapshot, unrelated],
    });
    const options = {
      profileIds: [id],
      format: 'bmpro' as const,
      categories: [...exportCategories],
      includeBackups: true,
    };
    const selected = await decodeNativeExport(
      (await service.create(options, new AbortController().signal, vi.fn()))
        .content,
    );
    expect(selected.backups).toEqual([
      { ...snapshot, sizeBytes: encodeBackupPayload(original).byteLength },
    ]);
    expect(selected.profiles).toHaveLength(1);
    const multiple = await decodeNativeExport(
      (
        await service.create(
          { ...options, profileIds: [id, secondId] },
          new AbortController().signal,
          vi.fn(),
        )
      ).content,
    );
    expect(multiple.profiles.map((profile) => profile.profile.id)).toEqual([
      id,
      secondId,
    ]);
    snapshot.digest = '0'.repeat(64);
    await expect(
      service.create(options, new AbortController().signal, vi.fn()),
    ).rejects.toThrow('export-backup-integrity-failed');
  });
  it('captures complete data and stored screenshot bytes without mutating the source', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const original = source();
    const captureProfile = vi.fn(async () => original);
    const list = vi.fn(async () => []);
    const file = await new ExportProfiles(
      { captureProfile, list },
      () => 1,
    ).create(
      {
        profileIds: [id],
        format: 'bmpro',
        categories: [...exportCategories],
        includeBackups: false,
      },
      new AbortController().signal,
      vi.fn(),
    );
    const decoded = await decodeNativeExport(file.content);
    expect(decoded.profiles[0]).toEqual(original);
    expect(original).toEqual(source());
    expect(file.filename).not.toContain('Synthetic');
    expect(list).not.toHaveBeenCalled();
  });
  it('includes only chosen categories and rejects cancellation before reading', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const captureProfile = vi.fn(async () => source());
    const service = new ExportProfiles({
      captureProfile,
      list: async () => [],
    });
    const options = {
      profileIds: [id],
      format: 'bmpro' as const,
      categories: ['notes' as const],
      includeBackups: false,
    };
    const file = await service.create(
      options,
      new AbortController().signal,
      vi.fn(),
    );
    const profile = (await decodeNativeExport(file.content)).profiles[0]!;
    expect(profile.notes).toEqual([]);
    expect(profile.bookmarks).toBeUndefined();
    expect(profile.settings).toBeUndefined();
    captureProfile.mockClear();
    const abort = new AbortController();
    abort.abort();
    await expect(
      service.create(options, abort.signal, vi.fn()),
    ).rejects.toThrow();
    expect(captureProfile).not.toHaveBeenCalled();
  });
  it('escapes HTML and protects spreadsheet cells while excluding local assets', async () => {
    const service = new ExportProfiles({
      captureProfile: async () => source(),
      list: async () => [],
    });
    for (const format of ['json', 'csv', 'html'] as const) {
      const file = await service.create(
        { profileIds: [id], format, categories: [], includeBackups: true },
        new AbortController().signal,
        vi.fn(),
      );
      expect(file.content).not.toContain('data:image');
      if (format === 'html') {
        expect(file.content).not.toContain('&lt;Home&gt;');
        expect(file.content).toContain('&amp;b=2');
        expect(file.content).not.toContain('<script>');
      }
      if (format === 'csv') expect(file.content).toContain('"\'=HYPERLINK(');
      if (format === 'json')
        expect(
          JSON.parse(file.content).profiles[0].content[0].content[0].parentId,
        ).toBe(root);
    }
  });
  it('exports browser HTML inside a branded folder with dates and ordered content', async () => {
    const original = source();
    const nestedId = '44444444-4444-4444-8444-444444444444';
    original.folders.push({
      ...original.folders[0]!,
      id: nestedId,
      parentId: root,
      title: 'Home',
      index: 0,
      isRoot: false,
      createdAt: 1_790_000_000_123,
      updatedAt: 1_790_000_005_999,
    });
    original.folders.push({
      ...original.folders[0]!,
      id: '55555555-5555-4555-8555-555555555555',
      parentId: nestedId,
      title: 'Empty & safe',
      index: 0,
      isRoot: false,
    });
    original.bookmarks[0]!.index = 1;
    const service = new ExportProfiles(
      {
        captureProfile: async () => original,
        list: async () => [],
      },
      () => Date.UTC(2026, 9, 17, 20, 45),
    );
    const file = await service.create(
      {
        profileIds: [id],
        format: 'html',
        categories: [],
        includeBackups: false,
      },
      new AbortController().signal,
      vi.fn(),
    );
    expect(file.content).toMatch(
      /^<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<!-- This is an automatically generated file\./,
    );
    expect(file.content).toContain('DO NOT EDIT! -->');
    expect(file.content).toContain(
      '<!-- Generated by Bookmark Manager Pro on 2026-10-17T20:45:00.000Z -->',
    );
    expect(file.content).toContain(
      '    <DT><H3 ADD_DATE="1790000000" LAST_MODIFIED="1790000005">Home</H3>',
    );
    expect(file.content).not.toContain(original.profile.username);
    expect(file.content).not.toContain(root);
    expect(file.content).not.toContain('&lt;Home&gt;');
    const items = readBookmarkHtml(file.content);
    expect(items.map((item) => item.title)).toEqual([
      'Bookmark Manager Pro',
      'Home',
      'Empty & safe',
      '=HYPERLINK("unsafe")',
    ]);
    expect(items[0]!.parentId).toBeNull();
    expect(items[1]!.parentId).toBe(items[0]!.id);
    expect(items[2]!.parentId).toBe(items[1]!.id);
    expect(items[3]!.parentId).toBe(items[0]!.id);
  });
  it('groups multiple HTML profiles by escaped name without IDs or app root wrappers', async () => {
    const first = source();
    const second = source();
    second.profile.id = '66666666-6666-4666-8666-666666666666';
    second.profile.username = 'Other & <profile>';
    for (const row of [...second.folders, ...second.bookmarks])
      row.profileId = second.profile.id;
    if (second.settings) second.settings.profileId = second.profile.id;
    const service = new ExportProfiles({
      captureProfile: async (profileId) => (profileId === id ? first : second),
      list: async () => [],
    });
    const file = await service.create(
      {
        profileIds: [id, second.profile.id],
        format: 'html',
        categories: [],
        includeBackups: false,
      },
      new AbortController().signal,
      vi.fn(),
    );
    expect(file.content).toContain('Other &amp; &lt;profile&gt;</H3>');
    expect(file.content).not.toContain(id);
    expect(file.content).not.toContain(second.profile.id);
    const items = readBookmarkHtml(file.content);
    expect(
      items.filter((item) => item.kind === 'folder').map((item) => item.title),
    ).toEqual([
      'Bookmark Manager Pro',
      first.profile.username,
      second.profile.username,
    ]);
    expect(items[1]!.parentId).toBe(items[0]!.id);
    expect(items[2]!.parentId).toBe(items[1]!.id);
    expect(items[3]!.parentId).toBe(items[0]!.id);
    expect(items[4]!.parentId).toBe(items[3]!.id);
  });
  it('exports selected profiles as ordered trees with complete folder metadata', async () => {
    const original = source();
    const nestedId = '44444444-4444-4444-8444-444444444444';
    original.folders.push({
      ...original.folders[0]!,
      id: nestedId,
      parentId: root,
      title: 'Nested',
      tags: ['one', 'two'],
      note: 'Folder note',
      index: 3,
      isRoot: false,
    });
    original.folders.push({
      ...original.folders[0]!,
      id: '55555555-5555-4555-8555-555555555555',
      parentId: nestedId,
      title: 'Empty',
      index: 0,
      isRoot: false,
    });
    original.bookmarks[0]!.parentId = nestedId;
    original.bookmarks[0]!.index = 5;
    const second = source();
    second.profile.id = '66666666-6666-4666-8666-666666666666';
    for (const row of [...second.folders, ...second.bookmarks])
      row.profileId = second.profile.id;
    if (second.settings) second.settings.profileId = second.profile.id;
    const service = new ExportProfiles({
      captureProfile: async (profileId) =>
        profileId === id ? original : second,
      list: async () => [],
    });
    const before = structuredClone(original);
    const file = await service.create(
      {
        profileIds: [id, second.profile.id],
        format: 'json',
        categories: [],
        includeBackups: false,
      },
      new AbortController().signal,
      vi.fn(),
    );
    const json = JSON.parse(file.content);
    expect(json.version).toBe(2);
    expect(json.profiles.map((p: { id: string }) => p.id)).toEqual([
      id,
      second.profile.id,
    ]);
    const folder = json.profiles[0].content[0].content[0];
    expect(folder).toEqual({
      id: nestedId,
      parentId: root,
      title: 'Nested',
      tags: ['one', 'two'],
      note: 'Folder note',
      index: 3,
      content: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          parentId: nestedId,
          title: 'Empty',
          tags: [],
          note: '',
          index: 0,
          content: [],
        },
        {
          id: original.bookmarks[0]!.id,
          parentId: nestedId,
          title: original.bookmarks[0]!.title,
          url: original.bookmarks[0]!.url,
          tags: ['synthetic'],
          note: original.bookmarks[0]!.note,
          index: 5,
        },
      ],
    });
    expect(readPortableJson(file.content)).toHaveLength(4);
    expect(original).toEqual(before);
    expect(json.profiles[0]).not.toHaveProperty('folders');
    expect(json.profiles[0]).not.toHaveProperty('bookmarks');
  });
});
