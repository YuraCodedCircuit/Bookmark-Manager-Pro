import type { Profile } from '../../domain/profile';
import type {
  ProfileSettings,
  ResolvedTheme,
} from '../../domain/profile-settings';

export type InitializationErrorCode =
  'database-open-failed' | 'data-load-failed' | 'theme-apply-failed';

export class InitializationError extends Error {
  readonly code: InitializationErrorCode;

  constructor(code: InitializationErrorCode, cause: unknown) {
    super(code, { cause });
    this.name = 'InitializationError';
    this.code = code;
  }
}

export type InitializationState =
  | { status: 'storage-unavailable' }
  | { status: 'first-run'; theme: ResolvedTheme }
  | {
      status: 'ready';
      profile: Profile;
      settings: ProfileSettings;
      theme: ResolvedTheme;
    }
  | { status: 'recovery'; error: InitializationError };
