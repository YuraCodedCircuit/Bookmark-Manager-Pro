import { describe, expect, it, vi } from 'vitest';
import type { ProfileManagementRepository } from './profile-management-repository';
import { ManageProfiles } from './manage-profiles';

describe('ManageProfiles', () => {
  it('duplicates identity fields and settings under a new ID and timestamps', async () => {
    const sourceId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    const duplicateId = '85923bcb-cfd7-45a4-bf10-12f6162cad44';
    const repository: ProfileManagementRepository = {
      create: vi.fn(),
      copyOwnedData: vi.fn(),
      delete: vi.fn(),
      getSettings: vi.fn(async () => ({
        bookmarkView: 'card' as const,
        cardSize: 'medium' as const,
        language: 'en-US',
        profileId: sourceId,
        theme: 'dark' as const,
      })),
      isProfileIdAvailable: vi.fn(async () => true),
      getStorageUsage: vi.fn(async () => []),
      list: vi.fn(async () => [
        {
          isActive: true,
          profile: {
            createdAt: 1,
            icon: 'data:image/png;base64,aWNvbg==',
            id: sourceId,
            updatedAt: 2,
            username: 'Work',
          },
        },
      ]),
      switchTo: vi.fn(),
      update: vi.fn(),
      updateSettings: vi.fn(),
    };
    const service = new ManageProfiles(
      repository,
      () => duplicateId,
      () => 42,
    );

    await service.duplicate(sourceId);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: 42,
        icon: 'data:image/png;base64,aWNvbg==',
        id: duplicateId,
        updatedAt: 42,
        username: 'Work Copy',
      }),
      expect.objectContaining({
        bookmarkView: 'card',
        cardSize: 'medium',
        language: 'en-US',
        profileId: duplicateId,
        theme: 'dark',
      }),
    );
    expect(repository.copyOwnedData).toHaveBeenCalledWith(
      sourceId,
      duplicateId,
      expect.objectContaining({
        duplicateActivityLogs: false,
        duplicateBookmarks: true,
      }),
    );
  });
});
