import { z } from 'zod';

import { profileSchema, type Profile } from '../../domain/profile';
import {
  defaultProfilePreferences,
  profileSettingsSchema,
  type ProfileSettings,
} from '../../domain/profile-settings';
import type { ProfileCreationRepository } from './profile-creation-repository';
import { defaultShortcutPreferences } from '../../domain/keyboard-shortcuts';

const MAX_ID_ATTEMPTS = 5;

const createFirstProfileInputSchema = z.object({
  icon: z
    .string()
    .max(1_500_000)
    .regex(/^data:image\/(?:bmp|jpeg|png);base64,/)
    .optional(),
  language: z.string().trim().min(2).max(35).optional(),
  username: z.string().trim().min(1).max(80),
});

export type CreateFirstProfileInput = z.input<
  typeof createFirstProfileInputSchema
>;

export interface CreatedProfile {
  profile: Profile;
  settings: ProfileSettings;
}

export class CreateFirstProfile {
  constructor(
    private readonly repository: ProfileCreationRepository,
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => number = () => Date.now(),
  ) {}

  async execute(input: CreateFirstProfileInput): Promise<CreatedProfile> {
    const validatedInput = createFirstProfileInputSchema.parse(input);
    const profileId = await this.createUniqueProfileId();
    const timestamp = this.now();
    const profile = profileSchema.parse({
      createdAt: timestamp,
      icon: validatedInput.icon,
      id: profileId,
      updatedAt: timestamp,
      username: validatedInput.username,
    });
    const settings = profileSettingsSchema.parse({
      profileId,
      theme: 'system',
      accentColorMode: 'system',
      animationPreference: 'system',
      cardSpacing: 'comfortable',
      customAccentColor: '#88bdf2',
      confirmExternalLinks: false,
      dateTimeFormat: 'browser',
      firstDayOfWeek: 'browser',
      language: validatedInput.language,
      startupLocation: 'home',
      bookmarkOpening: 'current-tab',
      folderOpening: 'single-click',
      highContrast: false,
      shortcutPreferences: defaultShortcutPreferences,
      scrollbarBehavior: 'scrolling',
      profilePreferences: defaultProfilePreferences,
    });

    await this.repository.create(profile, settings);

    return { profile, settings };
  }

  private async createUniqueProfileId(): Promise<string> {
    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
      const profileId = this.createId();

      if (await this.repository.isProfileIdAvailable(profileId)) {
        return profileId;
      }
    }

    throw new Error('profile-id-generation-failed');
  }
}
