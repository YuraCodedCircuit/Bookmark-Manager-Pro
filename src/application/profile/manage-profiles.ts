import { z } from 'zod';

import { profileSchema } from '../../domain/profile';
import {
  defaultProfilePreferences,
  profilePreferencesSchema,
  profileSettingsSchema,
} from '../../domain/profile-settings';
import type { ProfileSettings } from '../../domain/profile-settings';
import type {
  ProfileListItem,
  ProfileActivationResult,
  ProfileManagementRepository,
} from './profile-management-repository';
import { defaultShortcutPreferences } from '../../domain/keyboard-shortcuts';

const MAX_ID_ATTEMPTS = 5;
type RunExclusive = <T>(run: () => Promise<T>) => Promise<T>;
const profileInputSchema = z.object({
  icon: z
    .string()
    .max(1_500_000)
    .regex(/^data:image\/(?:bmp|jpeg|png);base64,/)
    .optional(),
  language: z.string().trim().min(2).max(35),
  username: z.string().trim().min(1).max(80),
});

export type ManagedProfileInput = z.input<typeof profileInputSchema>;

/** Coordinates validated profile CRUD and active-profile selection. */
export class ManageProfiles {
  constructor(
    private readonly repository: ProfileManagementRepository,
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => number = () => Date.now(),
    private readonly runExclusive: RunExclusive = (run) => run(),
  ) {}

  list(): Promise<readonly ProfileListItem[]> {
    return this.repository.list();
  }

  getStorageUsage() {
    return this.repository.getStorageUsage();
  }

  async create(input: ManagedProfileInput): Promise<void> {
    const validated = profileInputSchema.parse(input);
    await this.assertProfileCapacity();
    const id = await this.createUniqueId();
    const timestamp = this.now();
    await this.repository.create(
      profileSchema.parse({
        id,
        ...validated,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
      profileSettingsSchema.parse({
        profileId: id,
        theme: 'system',
        accentColorMode: 'system',
        animationPreference: 'system',
        cardSpacing: 'comfortable',
        customAccentColor: '#88bdf2',
        confirmExternalLinks: false,
        dateTimeFormat: 'browser',
        firstDayOfWeek: 'browser',
        language: validated.language,
        startupLocation: 'home',
        bookmarkOpening: 'current-tab',
        folderOpening: 'single-click',
        highContrast: false,
        shortcutPreferences: defaultShortcutPreferences,
        scrollbarBehavior: 'scrolling',
        profilePreferences: defaultProfilePreferences,
      }),
    );
  }

  async update(profileId: string, input: ManagedProfileInput): Promise<void> {
    const validated = profileInputSchema.parse(input);
    const item = (await this.repository.list()).find(
      ({ profile }) => profile.id === profileId,
    );
    if (!item) throw new Error('profile-not-found');
    await this.repository.update(
      profileSchema.parse({
        ...item.profile,
        ...validated,
        updatedAt: this.now(),
      }),
    );
  }

  delete(profileId: string): Promise<void> {
    return this.repository.delete(profileId);
  }

  /** Duplicates the currently implemented profile-owned identity and settings. */
  async duplicate(profileId: string): Promise<void> {
    await this.assertProfileCapacity();
    const profiles = await this.repository.list();
    const item = profiles.find(({ profile }) => profile.id === profileId);
    if (!item) throw new Error('profile-not-found');
    const sourceSettings = await this.repository.getSettings(profileId);
    const activeProfile = profiles.find(({ isActive }) => isActive);
    const policySettings = activeProfile
      ? await this.repository.getSettings(activeProfile.profile.id)
      : sourceSettings;
    const preferences = profilePreferencesSchema.parse(
      policySettings.profilePreferences ?? defaultProfilePreferences,
    );
    const id = await this.createUniqueId();
    const timestamp = this.now();
    await this.repository.create(
      profileSchema.parse({
        ...item.profile,
        id,
        icon: preferences.duplicateImages ? item.profile.icon : undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
        username: preferences.appendCopyToDuplicateName
          ? `${item.profile.username} Copy`.slice(0, 80)
          : item.profile.username,
      }),
      profileSettingsSchema.parse({
        ...(preferences.duplicateSettings
          ? sourceSettings
          : {
              bookmarkView: 'card',
              accentColorMode: 'system',
              animationPreference: 'system',
              bookmarkOpening: 'current-tab',
              cardSize: 'medium',
              cardSpacing: 'comfortable',
              customAccentColor: '#88bdf2',
              confirmExternalLinks: false,
              dateTimeFormat: 'browser',
              firstDayOfWeek: 'browser',
              folderOpening: 'single-click',
              highContrast: false,
              shortcutPreferences: defaultShortcutPreferences,
              language: sourceSettings.language,
              startupLocation: 'home',
              scrollbarBehavior: 'scrolling',
              theme: 'system',
            }),
        profileId: id,
        profilePreferences: preferences.duplicateSettings
          ? (sourceSettings.profilePreferences ?? defaultProfilePreferences)
          : defaultProfilePreferences,
      }),
    );
    try {
      await this.repository.copyOwnedData(profileId, id, preferences);
    } catch (error) {
      await this.repository.delete(id);
      throw new Error('profile-duplicate-copy-failed', { cause: error });
    }
  }

  switchTo(profileId: string): Promise<ProfileActivationResult> {
    return this.runExclusive(() => this.repository.switchTo(profileId));
  }

  /** Saves the currently implemented profile-level bookmark presentation. */
  async updateBookmarkDisplay(
    profileId: string,
    display: Pick<ProfileSettings, 'bookmarkView' | 'cardSize'>,
  ): Promise<void> {
    const current = await this.repository.getSettings(profileId);
    await this.repository.updateSettings(
      profileSettingsSchema.parse({ ...current, ...display }),
    );
  }

  /** Saves a fully validated profile-settings snapshot from Settings. */
  async updateProfileSettings(
    profileId: string,
    settings: ProfileSettings,
  ): Promise<void> {
    if (settings.profileId !== profileId)
      throw new Error('profile-settings-id-mismatch');
    const maximum = settings.profilePreferences?.maximumProfiles ?? null;
    if (maximum !== null && maximum < (await this.repository.list()).length)
      throw new Error('maximum-profile-count-below-current-count');
    await this.repository.updateSettings(profileSettingsSchema.parse(settings));
  }

  /** Persists current navigation early enough to survive reload or tab close. */
  async updateLastOpenedFolder(
    profileId: string,
    folderId: string,
  ): Promise<void> {
    const current = await this.repository.getSettings(profileId);
    await this.repository.updateSettings(
      profileSettingsSchema.parse({ ...current, lastOpenedFolderId: folderId }),
    );
  }

  private async assertProfileCapacity(): Promise<void> {
    const profiles = await this.repository.list();
    const active = profiles.find(({ isActive }) => isActive);
    if (!active) return;
    const settings = await this.repository.getSettings(active.profile.id);
    const maximum = settings.profilePreferences?.maximumProfiles ?? null;
    if (maximum !== null && profiles.length >= maximum)
      throw new Error('maximum-profile-count-reached');
  }

  private async createUniqueId(): Promise<string> {
    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
      const id = this.createId();
      if (await this.repository.isProfileIdAvailable(id)) return id;
    }
    throw new Error('profile-id-generation-failed');
  }
}
