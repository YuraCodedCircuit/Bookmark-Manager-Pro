import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';

import { BookmarkManagerDatabase } from './database';
import { DexieInitializationRepository } from './dexie-initialization-repository';

const databases: BookmarkManagerDatabase[] = [];

function createDatabase(): BookmarkManagerDatabase {
  const database = new BookmarkManagerDatabase(
    `bookmark-manager-pro-test-${crypto.randomUUID()}`,
  );
  databases.push(database);
  return database;
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

describe('DexieInitializationRepository', () => {
  it('returns first-run when no profiles exist', async () => {
    const repository = new DexieInitializationRepository(createDatabase());

    await repository.open();

    await expect(repository.load()).resolves.toEqual({ kind: 'first-run' });
  });

  it('loads and validates the active profile and settings', async () => {
    const database = createDatabase();
    const repository = new DexieInitializationRepository(database);
    const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    await repository.open();
    await database.transaction(
      'rw',
      [database.profiles, database.profileSettings, database.metadata],
      async () => {
        await database.profiles.add({
          id: profileId,
          username: 'Local profile',
          createdAt: 1,
          updatedAt: 1,
        });
        await database.profileSettings.add({
          bookmarkView: 'card',
          cardSize: 'medium',
          language: 'en-US',
          profileId,
          theme: 'dark',
        });
        await database.metadata.add({
          key: 'activeProfileId',
          value: profileId,
        });
      },
    );

    await expect(repository.load()).resolves.toEqual({
      kind: 'active-profile',
      profile: {
        id: profileId,
        username: 'Local profile',
        createdAt: 1,
        updatedAt: 1,
      },
      settings: {
        bookmarkView: 'card',
        cardSize: 'medium',
        language: 'en-US',
        profileId,
        theme: 'dark',
      },
    });
  });

  it('rejects a missing active-profile reference as invalid stored data', async () => {
    const database = createDatabase();
    const repository = new DexieInitializationRepository(database);
    await repository.open();
    await database.profiles.add({
      id: '16e35509-1948-41f0-8c64-24528c23f86d',
      username: 'Local profile',
      createdAt: 1,
      updatedAt: 1,
    });

    await expect(repository.load()).rejects.toThrow();
  });
});
