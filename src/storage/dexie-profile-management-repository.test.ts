import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { BookmarkManagerDatabase } from './database';
import { DexieProfileManagementRepository } from './dexie-profile-management-repository';
import { defaultActivityLogSettings } from '../application/activity-log/manage-activity-log';
import { defaultProfilePreferences } from '../domain/profile-settings';

const databases: BookmarkManagerDatabase[] = [];
const firstId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
const secondId = '85923bcb-cfd7-45a4-bf10-12f6162cad44';

async function setup() {
  const database = new BookmarkManagerDatabase(
    `profile-management-${crypto.randomUUID()}`,
  );
  databases.push(database);
  await database.open();
  await database.profiles.add({
    id: firstId,
    username: 'First',
    createdAt: 1,
    updatedAt: 1,
  });
  await database.profileSettings.add({
    bookmarkView: 'card',
    cardSize: 'medium',
    profileId: firstId,
    theme: 'system',
  });
  await database.metadata.add({ key: 'activeProfileId', value: firstId });
  return {
    database,
    repository: new DexieProfileManagementRepository(database),
  };
}

afterEach(async () =>
  Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  ),
);

describe('DexieProfileManagementRepository', () => {
  it('copies selected profile content with remapped item and favorite IDs', async () => {
    const { database, repository } = await setup();
    const targetId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const folderId = '11111111-1111-4111-8111-111111111111';
    const bookmarkId = '22222222-2222-4222-8222-222222222222';
    await database.folders.add({
      backgroundAppearance: { kind: 'color', value: '#0b121a' },
      bookmarkView: 'card',
      cardAppearance: { kind: 'color', value: '#2f7de1' },
      createdAt: 1,
      detailsTableTransparency: 0,
      id: folderId,
      includeNavigationBackground: false,
      index: 0,
      isRoot: true,
      navigationTransparency: 45,
      note: '',
      parentId: null,
      profileId: firstId,
      tags: [],
      title: 'Home',
      updatedAt: 1,
    });
    await database.bookmarks.add({
      cardAppearance: { kind: 'color', value: '#123456' },
      createdAt: 2,
      id: bookmarkId,
      index: 0,
      note: '',
      parentId: folderId,
      profileId: firstId,
      tags: [],
      title: 'Example',
      updatedAt: 2,
      url: 'https://example.com/',
    });
    await database.favoriteItems.add({
      favoritedAt: 3,
      itemId: bookmarkId,
      kind: 'bookmark',
      profileId: firstId,
    });

    await repository.copyOwnedData(
      firstId,
      targetId,
      defaultProfilePreferences,
    );

    const copiedFolder = await database.folders
      .where('profileId')
      .equals(targetId)
      .first();
    const copiedBookmark = await database.bookmarks
      .where('profileId')
      .equals(targetId)
      .first();
    expect(copiedFolder?.id).not.toBe(folderId);
    expect(copiedBookmark).toMatchObject({
      parentId: copiedFolder?.id,
      profileId: targetId,
      title: 'Example',
    });
    await expect(
      database.favoriteItems.where('profileId').equals(targetId).first(),
    ).resolves.toMatchObject({ itemId: copiedBookmark?.id, kind: 'bookmark' });
    await expect(
      database.activity.where('profileId').equals(targetId).count(),
    ).resolves.toBe(0);
  });

  it('creates, lists, updates, and switches profiles', async () => {
    const { repository } = await setup();
    await repository.create(
      { id: secondId, username: 'Second', createdAt: 2, updatedAt: 2 },
      {
        bookmarkView: 'card',
        cardSize: 'medium',
        profileId: secondId,
        theme: 'dark',
      },
    );
    await expect(repository.getSettings(secondId)).resolves.toEqual({
      bookmarkView: 'card',
      cardSize: 'medium',
      profileId: secondId,
      theme: 'dark',
    });
    expect(await repository.list()).toHaveLength(2);
    await repository.update({
      id: secondId,
      username: 'Renamed',
      createdAt: 2,
      updatedAt: 3,
    });
    await repository.switchTo(secondId);
    expect(
      (await repository.list()).find(({ isActive }) => isActive)?.profile
        .username,
    ).toBe('Renamed');
  });

  it('protects the active profile and deletes an inactive profile with its settings', async () => {
    const { database, repository } = await setup();
    await repository.create(
      { id: secondId, username: 'Second', createdAt: 2, updatedAt: 2 },
      {
        bookmarkView: 'card',
        cardSize: 'medium',
        profileId: secondId,
        theme: 'dark',
      },
    );
    await database.activityLogSettings.add(
      defaultActivityLogSettings(secondId),
    );
    await database.activity.add({
      action: 'Update',
      applicationVersion: '0.0.2',
      browserTarget: 'Edge v.140.0.0',
      category: 'Profiles',
      dataChanged: true,
      durationMs: 1,
      eventCode: 'PROFILE-UPDATE-COMPLETE',
      id: '11111111-1111-4111-8111-111111111111',
      itemType: 'Profile settings',
      itemsAffected: 1,
      kind: 'ACTIVITY',
      level: 'INFO',
      message: 'Local profile settings were updated.',
      operationId: 'op-local-1111',
      outcome: 'Succeeded',
      profileId: secondId,
      schemaVersion: 2,
      source: 'Profile manager',
      timestamp: 1,
    });
    const folderId = '11111111-1111-4111-8111-111111111111';
    await database.folders.add({
      backgroundAppearance: { kind: 'color', value: '#0b121a' },
      bookmarkView: 'card',
      detailsTableTransparency: 0,
      includeNavigationBackground: false,
      navigationTransparency: 45,
      cardAppearance: { kind: 'color', value: '#2f7de1' },
      createdAt: 1,
      id: folderId,
      index: 0,
      isRoot: true,
      note: '',
      parentId: null,
      profileId: secondId,
      tags: [],
      title: 'Home',
      updatedAt: 1,
    });
    await database.bookmarks.add({
      cardAppearance: { kind: 'color', value: '#123456' },
      createdAt: 1,
      id: '22222222-2222-4222-8222-222222222222',
      index: 0,
      note: '',
      parentId: folderId,
      profileId: secondId,
      title: 'Private item',
      tags: [],
      updatedAt: 1,
      url: 'https://example.com/',
    });
    await database.favoriteItems.add({
      favoritedAt: 2,
      itemId: '22222222-2222-4222-8222-222222222222',
      kind: 'bookmark',
      profileId: secondId,
    });
    await expect(repository.delete(firstId)).rejects.toThrow(
      'active-profile-cannot-be-deleted',
    );
    await repository.delete(secondId);
    await expect(database.profiles.get(secondId)).resolves.toBeUndefined();
    await expect(
      database.profileSettings.get(secondId),
    ).resolves.toBeUndefined();
    await expect(
      database.activity.where('profileId').equals(secondId).count(),
    ).resolves.toBe(0);
    await expect(
      database.activityLogSettings.get(secondId),
    ).resolves.toBeUndefined();
    await expect(
      database.bookmarks.where('profileId').equals(secondId).count(),
    ).resolves.toBe(0);
    await expect(
      database.folders.where('profileId').equals(secondId).count(),
    ).resolves.toBe(0);
    await expect(
      database.favoriteItems.where('profileId').equals(secondId).count(),
    ).resolves.toBe(0);
  });
});
