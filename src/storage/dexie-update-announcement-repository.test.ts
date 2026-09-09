import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { BookmarkManagerDatabase } from './database';
import { DexieUpdateAnnouncementRepository } from './dexie-update-announcement-repository';

const names: string[] = [];

afterEach(async () =>
  Promise.all(names.splice(0).map((name) => Dexie.delete(name))),
);

describe('DexieUpdateAnnouncementRepository', () => {
  it('lets only one tab claim a pending update and completes that claim', async () => {
    const name = `update-announcement-${crypto.randomUUID()}`;
    names.push(name);
    const database = new BookmarkManagerDatabase(name);
    const repository = new DexieUpdateAnnouncementRepository(database);
    await repository.recordUpgrade('1.0.0', '1.1.0', 10);

    const [first, second] = await Promise.all([
      repository.claim('1.1.0', '11111111-1111-4111-8111-111111111111', 20, 0),
      repository.claim('1.1.0', '22222222-2222-4222-8222-222222222222', 20, 0),
    ]);

    const claim = first ?? second;
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(claim?.status).toBe('claimed');
    if (!claim || claim.status !== 'claimed') throw new Error('claim-missing');
    await repository.markShown(claim.version, claim.claimId);
    await expect(
      repository.claim('1.1.0', '33333333-3333-4333-8333-333333333333', 30, 0),
    ).resolves.toBeNull();
    database.close();
  });

  it('skips updates while globally disabled and does not revive them', async () => {
    const name = `update-announcement-disabled-${crypto.randomUUID()}`;
    names.push(name);
    const database = new BookmarkManagerDatabase(name);
    const repository = new DexieUpdateAnnouncementRepository(database);
    await repository.updatePreferences(false);
    await repository.recordUpgrade('1.0.0', '1.1.0', 10);
    await repository.updatePreferences(true);

    await expect(
      repository.claim('1.1.0', '11111111-1111-4111-8111-111111111111', 20, 0),
    ).resolves.toBeNull();
    database.close();
  });

  it('allows a stale interrupted claim to be recovered', async () => {
    const name = `update-announcement-stale-${crypto.randomUUID()}`;
    names.push(name);
    const database = new BookmarkManagerDatabase(name);
    const repository = new DexieUpdateAnnouncementRepository(database);
    await repository.recordUpgrade('1.0.0', '1.1.0', 10);
    await repository.claim(
      '1.1.0',
      '11111111-1111-4111-8111-111111111111',
      20,
      0,
    );

    await expect(
      repository.claim(
        '1.1.0',
        '22222222-2222-4222-8222-222222222222',
        400,
        20,
      ),
    ).resolves.toMatchObject({
      claimId: '22222222-2222-4222-8222-222222222222',
      status: 'claimed',
    });
    database.close();
  });
});
