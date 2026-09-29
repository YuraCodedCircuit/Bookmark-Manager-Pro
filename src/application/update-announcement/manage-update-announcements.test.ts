import { describe, expect, it, vi } from 'vitest';

import type { UpdateAnnouncementRepository } from './update-announcement-repository';
import { ManageUpdateAnnouncements } from './manage-update-announcements';

function createRepository(): UpdateAnnouncementRepository {
  return {
    claim: vi.fn(async () => null),
    getPreferences: vi.fn(async () => ({
      schemaVersion: 1 as const,
      showAfterUpdate: true,
    })),
    markShown: vi.fn(async () => undefined),
    markUnavailable: vi.fn(async () => undefined),
    recordUpgrade: vi.fn(async () => undefined),
    updatePreferences: vi.fn(async () => undefined),
  };
}

describe('ManageUpdateAnnouncements', () => {
  it('records major, minor, and patch upgrades', async () => {
    const repository = createRepository();
    const manager = new ManageUpdateAnnouncements(
      repository,
      undefined,
      () => 7,
    );

    await expect(manager.recordUpgrade('1.0.0', '2.0.0')).resolves.toBe(true);
    await expect(manager.recordUpgrade('0.1.0', '0.2.0')).resolves.toBe(true);
    await expect(manager.recordUpgrade('0.0.1', '0.0.2')).resolves.toBe(true);
    expect(repository.recordUpgrade).toHaveBeenNthCalledWith(
      1,
      '1.0.0',
      '2.0.0',
      7,
    );
    expect(repository.recordUpgrade).toHaveBeenNthCalledWith(
      2,
      '0.1.0',
      '0.2.0',
      7,
    );
    expect(repository.recordUpgrade).toHaveBeenNthCalledWith(
      3,
      '0.0.1',
      '0.0.2',
      7,
    );
  });

  it('ignores a change limited to the optional fourth version component', async () => {
    const repository = createRepository();
    const manager = new ManageUpdateAnnouncements(repository);

    await expect(manager.recordUpgrade('0.0.0.1', '0.0.0.2')).resolves.toBe(
      false,
    );
    expect(repository.recordUpgrade).not.toHaveBeenCalled();
  });

  it('normalizes a four-part version when a release component increases', async () => {
    const repository = createRepository();
    const manager = new ManageUpdateAnnouncements(
      repository,
      undefined,
      () => 7,
    );

    await expect(manager.recordUpgrade('0.0.0.9', '0.0.1.0')).resolves.toBe(
      true,
    );
    expect(repository.recordUpgrade).toHaveBeenCalledWith('0.0.0', '0.0.1', 7);
  });

  it('uses the normalized release version throughout the claim lifecycle', async () => {
    const repository = createRepository();
    const claimId = '11111111-1111-4111-8111-111111111111';
    const manager = new ManageUpdateAnnouncements(
      repository,
      () => claimId,
      () => 400_000,
    );

    await manager.claim('0.0.1.7');
    await manager.markShown('0.0.1.7', claimId);
    await manager.markUnavailable('0.0.1.7', claimId);

    expect(repository.claim).toHaveBeenCalledWith(
      '0.0.1',
      claimId,
      400_000,
      100_000,
    );
    expect(repository.markShown).toHaveBeenCalledWith('0.0.1', claimId);
    expect(repository.markUnavailable).toHaveBeenCalledWith('0.0.1', claimId);
  });

  it('ignores equal versions and downgrades', async () => {
    const repository = createRepository();
    const manager = new ManageUpdateAnnouncements(repository);

    await expect(manager.recordUpgrade('1.2.3', '1.2.3')).resolves.toBe(false);
    await expect(manager.recordUpgrade('2.0.0', '1.9.9')).resolves.toBe(false);
    expect(repository.recordUpgrade).not.toHaveBeenCalled();
  });

  it('rejects malformed installed versions', async () => {
    const manager = new ManageUpdateAnnouncements(createRepository());

    await expect(manager.recordUpgrade('1.0', '1.0.1')).rejects.toThrow();
    await expect(manager.recordUpgrade('1.0.0', '1.0.0.0.1')).rejects.toThrow();
  });
});
