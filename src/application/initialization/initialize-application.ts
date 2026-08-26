import type { ThemePreference } from '../../domain/profile-settings';
import type { InitializationRepository } from './initialization-repository';
import {
  InitializationError,
  type InitializationState,
} from './initialization-state';

export interface StorageAvailability {
  /** Reports whether the current surface can use IndexedDB. */
  isAvailable(): boolean;
}

export interface ThemeController {
  /** Applies a profile preference and returns the resolved visual theme. */
  apply(preference: ThemePreference): 'light' | 'dark';
}

/** Loads and validates the local profile state required by preflight. */
export class InitializeApplication {
  constructor(
    private readonly storageAvailability: StorageAvailability,
    private readonly repository: InitializationRepository,
    private readonly themeController: ThemeController,
  ) {}

  /** Returns a typed startup state instead of leaking storage or theme errors. */
  async execute(): Promise<InitializationState> {
    if (!this.storageAvailability.isAvailable()) {
      return { status: 'storage-unavailable' };
    }

    try {
      await this.repository.open();
    } catch (error) {
      return {
        status: 'recovery',
        error: new InitializationError('database-open-failed', error),
      };
    }

    let initializationData: Awaited<
      ReturnType<InitializationRepository['load']>
    >;

    try {
      initializationData = await this.repository.load();
    } catch (error) {
      return {
        status: 'recovery',
        error: new InitializationError('data-load-failed', error),
      };
    }

    const themePreference =
      initializationData.kind === 'first-run'
        ? 'system'
        : initializationData.settings.theme;

    let theme: 'light' | 'dark';

    try {
      theme = this.themeController.apply(themePreference);
    } catch (error) {
      return {
        status: 'recovery',
        error: new InitializationError('theme-apply-failed', error),
      };
    }

    if (initializationData.kind === 'first-run') {
      return { status: 'first-run', theme };
    }

    return {
      status: 'ready',
      profile: initializationData.profile,
      settings: initializationData.settings,
      theme,
    };
  }
}
