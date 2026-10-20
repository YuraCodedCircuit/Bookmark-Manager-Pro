import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { BookmarkManagerDatabase } from './database';
import { defaultImportPreferences } from '../domain/profile-settings';

const databases: string[] = [];
afterEach(async () => {
  for (const name of databases.splice(0)) await Dexie.delete(name);
});
describe('schema 37 Import preferences', () => {
  it('adds off defaults to schema 36 records without changing other profile data and persists choices', async () => {
    const name = `import-settings-${crypto.randomUUID()}`;
    databases.push(name);
    const old = new Dexie(name);
    old.version(36).stores({ profileSettings: '&profileId' });
    const first = '11111111-1111-4111-8111-111111111111';
    const second = '22222222-2222-4222-8222-222222222222';
    await old.table('profileSettings').bulkAdd([
      { profileId: first, theme: 'dark' },
      { profileId: second, theme: 'light' },
    ]);
    old.close();
    const upgraded = new BookmarkManagerDatabase(name);
    try {
      await upgraded.open();
      expect(upgraded.verno).toBe(38);
      expect(await upgraded.profileSettings.get(first)).toMatchObject({
        theme: 'dark',
        importPreferences: defaultImportPreferences,
      });
      await upgraded.profileSettings.update(first, {
        importPreferences: {
          ...defaultImportPreferences,
          autoOpenReview: true,
        },
      });
      upgraded.close();
      await upgraded.open();
      expect(
        (await upgraded.profileSettings.get(first))?.importPreferences
          ?.autoOpenReview,
      ).toBe(true);
      expect(
        (await upgraded.profileSettings.get(second))?.importPreferences,
      ).toEqual(defaultImportPreferences);
    } finally {
      upgraded.close();
    }
  });
});
