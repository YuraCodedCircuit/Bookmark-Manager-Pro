import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';

import { BookmarkManagerDatabase } from '../../storage/database';
import { ContentChangeBridge } from './content-change-bridge';

const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
const databases: BookmarkManagerDatabase[] = [];

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

describe('ContentChangeBridge', () => {
  it('increments a durable profile revision without storing content', async () => {
    const database = new BookmarkManagerDatabase(
      `content-change-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const bridge = new ContentChangeBridge(database);
    const input = {
      affectedParentIds: ['11111111-1111-4111-8111-111111111111'],
      changedFolderIds: [],
      deletedFolderPaths: [],
      profileId,
    };

    await expect(bridge.publish(input)).resolves.toMatchObject({ revision: 1 });
    await expect(bridge.publish(input)).resolves.toMatchObject({ revision: 2 });
    await expect(bridge.revision(profileId)).resolves.toBe(2);
    await expect(
      database.metadata.get(`content-revision:v1:${profileId}`),
    ).resolves.toEqual({
      key: `content-revision:v1:${profileId}`,
      value: 2,
    });
  });

  it('rejects malformed or cross-profile identifiers before publishing', async () => {
    const database = new BookmarkManagerDatabase(
      `content-change-invalid-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const bridge = new ContentChangeBridge(database);

    await expect(
      bridge.publish({
        affectedParentIds: ['not-an-id'],
        changedFolderIds: [],
        deletedFolderPaths: [],
        profileId,
      }),
    ).rejects.toThrow();
    await expect(bridge.revision(profileId)).resolves.toBe(0);
  });

  it('reads and validates the durable active-profile revision', async () => {
    const database = new BookmarkManagerDatabase(
      `profile-activation-${crypto.randomUUID()}`,
    );
    databases.push(database);
    await database.metadata.bulkPut([
      { key: 'activeProfileId', value: profileId },
      { key: 'profile-activation-revision:v1', value: 3 },
    ]);
    const bridge = new ContentChangeBridge(database);

    await expect(bridge.profileActivation()).resolves.toEqual({
      profileId,
      revision: 3,
    });
    expect(bridge.publishProfileActivation({ profileId, revision: 3 })).toEqual(
      {
        profileId,
        protocolVersion: 1,
        revision: 3,
        type: 'profile.activated',
      },
    );
  });
});
