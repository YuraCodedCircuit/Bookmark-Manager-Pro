import { describe, expect, it, vi } from 'vitest';

import type { Profile } from '../../domain/profile';
import type { ResolvedTheme } from '../../domain/profile-settings';
import type {
  InitializationData,
  InitializationRepository,
} from './initialization-repository';
import {
  InitializeApplication,
  type StorageAvailability,
  type ThemeController,
} from './initialize-application';

const profile: Profile = {
  id: 'db99e46b-6087-4aa3-9606-27ac37dd38c8',
  username: 'Local profile',
  createdAt: 1,
  updatedAt: 1,
};

function createDependencies() {
  const storageAvailability: StorageAvailability = {
    isAvailable: vi.fn(() => true),
  };
  const repository: InitializationRepository = {
    open: vi.fn(async () => undefined),
    load: vi.fn(async (): Promise<InitializationData> => ({
      kind: 'first-run',
    })),
  };
  const themeController: ThemeController = {
    apply: vi.fn((): ResolvedTheme => 'light'),
  };

  return { storageAvailability, repository, themeController };
}

describe('InitializeApplication', () => {
  it('returns storage-unavailable without opening the database', async () => {
    const dependencies = createDependencies();
    dependencies.storageAvailability.isAvailable = vi.fn(() => false);

    const result = await new InitializeApplication(
      dependencies.storageAvailability,
      dependencies.repository,
      dependencies.themeController,
    ).execute();

    expect(result).toEqual({ status: 'storage-unavailable' });
    expect(dependencies.repository.open).not.toHaveBeenCalled();
  });

  it('returns first-run and applies the system theme for an empty database', async () => {
    const dependencies = createDependencies();

    const result = await new InitializeApplication(
      dependencies.storageAvailability,
      dependencies.repository,
      dependencies.themeController,
    ).execute();

    expect(result).toEqual({ status: 'first-run', theme: 'light' });
    expect(dependencies.themeController.apply).toHaveBeenCalledWith('system');
  });

  it('loads the active profile and applies its saved theme', async () => {
    const dependencies = createDependencies();
    dependencies.repository.load = vi.fn(
      async (): Promise<InitializationData> => ({
        kind: 'active-profile',
        profile,
        settings: {
          bookmarkView: 'card',
          cardSize: 'medium',
          language: 'en-US',
          profileId: profile.id,
          theme: 'dark',
        },
      }),
    );
    dependencies.themeController.apply = vi.fn((): ResolvedTheme => 'dark');

    const result = await new InitializeApplication(
      dependencies.storageAvailability,
      dependencies.repository,
      dependencies.themeController,
    ).execute();

    expect(result).toEqual({
      status: 'ready',
      profile,
      settings: {
        bookmarkView: 'card',
        cardSize: 'medium',
        language: 'en-US',
        profileId: profile.id,
        theme: 'dark',
      },
      theme: 'dark',
    });
    expect(dependencies.themeController.apply).toHaveBeenCalledWith('dark');
  });

  it('returns recovery when the database cannot be opened', async () => {
    const dependencies = createDependencies();
    dependencies.repository.open = vi.fn(async () => {
      throw new Error('open failed');
    });

    const result = await new InitializeApplication(
      dependencies.storageAvailability,
      dependencies.repository,
      dependencies.themeController,
    ).execute();

    expect(result.status).toBe('recovery');
    if (result.status === 'recovery') {
      expect(result.error.code).toBe('database-open-failed');
      expect(result.error.cause).toBeInstanceOf(Error);
    }
  });

  it('returns recovery when stored data cannot be loaded', async () => {
    const dependencies = createDependencies();
    dependencies.repository.load = vi.fn(async () => {
      throw new Error('invalid data');
    });

    const result = await new InitializeApplication(
      dependencies.storageAvailability,
      dependencies.repository,
      dependencies.themeController,
    ).execute();

    expect(result.status).toBe('recovery');
    if (result.status === 'recovery') {
      expect(result.error.code).toBe('data-load-failed');
    }
  });
});
