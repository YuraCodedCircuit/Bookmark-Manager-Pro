import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';

import { BookmarkManagerDatabase } from './database';
import { DexieProfileCreationRepository } from './dexie-profile-creation-repository';

const databases: BookmarkManagerDatabase[] = [];

function createDatabase(): BookmarkManagerDatabase {
  const database = new BookmarkManagerDatabase(
    `bookmark-manager-pro-profile-test-${crypto.randomUUID()}`,
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

describe('DexieProfileCreationRepository', () => {
  it('creates the first profile, settings, and active reference atomically', async () => {
    const database = createDatabase();
    const repository = new DexieProfileCreationRepository(database);
    const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    const profile = {
      createdAt: 1,
      id: profileId,
      updatedAt: 1,
      username: 'Local user',
    };
    const settings = {
      bookmarkView: 'card' as const,
      cardSize: 'medium' as const,
      profileId,
      theme: 'system' as const,
    };

    await repository.create(profile, settings);

    await expect(database.profiles.get(profileId)).resolves.toEqual(profile);
    await expect(database.profileSettings.get(profileId)).resolves.toEqual(
      settings,
    );
    await expect(database.metadata.get('activeProfileId')).resolves.toEqual({
      key: 'activeProfileId',
      value: profileId,
    });
  });

  it('rejects a second first-profile creation without changing active state', async () => {
    const database = createDatabase();
    const repository = new DexieProfileCreationRepository(database);
    const firstId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    await repository.create(
      {
        createdAt: 1,
        id: firstId,
        updatedAt: 1,
        username: 'First',
      },
      {
        bookmarkView: 'card',
        cardSize: 'medium',
        profileId: firstId,
        theme: 'system',
      },
    );

    await expect(
      repository.create(
        {
          createdAt: 2,
          id: '85923bcb-cfd7-45a4-bf10-12f6162cad44',
          updatedAt: 2,
          username: 'Second',
        },
        {
          bookmarkView: 'card',
          cardSize: 'medium',
          profileId: '85923bcb-cfd7-45a4-bf10-12f6162cad44',
          theme: 'system',
        },
      ),
    ).rejects.toThrow('first-profile-already-exists');
    await expect(database.metadata.get('activeProfileId')).resolves.toEqual({
      key: 'activeProfileId',
      value: firstId,
    });
  });
});
