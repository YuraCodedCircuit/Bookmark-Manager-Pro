import { describe, expect, it, vi } from 'vitest';

import type { ProfileCreationRepository } from './profile-creation-repository';
import { CreateFirstProfile } from './create-first-profile';
import { defaultShortcutPreferences } from '../../domain/keyboard-shortcuts';

function createRepository(): ProfileCreationRepository {
  return {
    create: vi.fn(),
    isProfileIdAvailable: vi.fn().mockResolvedValue(true),
  };
}

describe('CreateFirstProfile', () => {
  it('creates a trimmed local profile with default settings', async () => {
    const repository = createRepository();
    const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    const service = new CreateFirstProfile(
      repository,
      () => profileId,
      () => 42,
    );

    await expect(
      service.execute({ language: 'en-US', username: '  Local user  ' }),
    ).resolves.toEqual({
      profile: {
        createdAt: 42,
        icon: undefined,
        id: profileId,
        updatedAt: 42,
        username: 'Local user',
      },
      settings: {
        accentColorMode: 'system',
        animationPreference: 'system',
        bookmarkView: 'card',
        bookmarkOpening: 'current-tab',
        cardSize: 'medium',
        cardSpacing: 'comfortable',
        customAccentColor: '#88bdf2',
        confirmExternalLinks: false,
        dateTimeFormat: 'browser',
        firstDayOfWeek: 'browser',
        folderOpening: 'single-click',
        highContrast: false,
        language: 'en-US',
        profileId,
        scrollbarBehavior: 'scrolling',
        shortcutPreferences: defaultShortcutPreferences,
        startupLocation: 'home',
        profilePreferences: {
          appendCopyToDuplicateName: true,
          confirmProfileDeletion: true,
          defaultProfileIcon: 'built-in',
          duplicateActivityLogs: false,
          duplicateAppearance: true,
          duplicateBookmarks: true,
          duplicateFavorites: true,
          duplicateImages: true,
          duplicateSettings: true,
          maximumProfiles: null,
          reopenLastFolderOnSwitch: false,
          startupProfileMode: 'active',
        },
        theme: 'system',
      },
    });
    expect(repository.create).toHaveBeenCalledOnce();
  });

  it('retries a colliding profile ID with a bounded generator', async () => {
    const repository = createRepository();
    vi.mocked(repository.isProfileIdAvailable)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const ids = [
      '16e35509-1948-41f0-8c64-24528c23f86d',
      '85923bcb-cfd7-45a4-bf10-12f6162cad44',
    ];
    const service = new CreateFirstProfile(
      repository,
      () => ids.shift()!,
      () => 1,
    );

    const result = await service.execute({ username: 'Profile' });

    expect(result.profile.id).toBe('85923bcb-cfd7-45a4-bf10-12f6162cad44');
    expect(repository.isProfileIdAvailable).toHaveBeenCalledTimes(2);
  });

  it('rejects an empty username and untrusted icon data', async () => {
    const service = new CreateFirstProfile(createRepository());

    await expect(service.execute({ username: '   ' })).rejects.toThrow();
    await expect(
      service.execute({
        icon: 'data:text/html;base64,PHNjcmlwdD4=',
        username: 'A',
      }),
    ).rejects.toThrow();
  });
});
