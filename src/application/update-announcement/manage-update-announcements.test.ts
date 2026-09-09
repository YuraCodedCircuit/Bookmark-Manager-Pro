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
  it('records only increasing semantic versions', async () => {
    const repository = createRepository();
    const manager = new ManageUpdateAnnouncements(
      repository,
      undefined,
      () => 7,
    );

    await expect(manager.recordUpgrade('1.2.3', '1.3.0')).resolves.toBe(true);
    await expect(manager.recordUpgrade('1.2.3', '1.2.3')).resolves.toBe(false);
    await expect(manager.recordUpgrade('2.0.0', '1.9.9')).resolves.toBe(false);
    expect(repository.recordUpgrade).toHaveBeenCalledOnce();
    expect(repository.recordUpgrade).toHaveBeenCalledWith('1.2.3', '1.3.0', 7);
  });
});
