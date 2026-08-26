import { z } from 'zod';

import type {
  InitializationData,
  InitializationRepository,
} from '../application/initialization/initialization-repository';
import { profileSchema } from '../domain/profile';
import { profileSettingsSchema } from '../domain/profile-settings';
import type { BookmarkManagerDatabase } from './database';

const activeProfileMetadataSchema = z.object({
  key: z.literal('activeProfileId'),
  value: z.uuid(),
});

export class DexieInitializationRepository implements InitializationRepository {
  constructor(private readonly database: BookmarkManagerDatabase) {}

  async open(): Promise<void> {
    await this.database.open();
  }

  async load(): Promise<InitializationData> {
    return this.database.transaction(
      'r',
      [
        this.database.profiles,
        this.database.profileSettings,
        this.database.metadata,
      ],
      async () => {
        const profileCount = await this.database.profiles.count();

        if (profileCount === 0) {
          return { kind: 'first-run' };
        }

        const metadata = activeProfileMetadataSchema.parse(
          await this.database.metadata.get('activeProfileId'),
        );
        const profile = profileSchema.parse(
          await this.database.profiles.get(metadata.value),
        );
        const settings = profileSettingsSchema.parse(
          await this.database.profileSettings.get(metadata.value),
        );

        return {
          kind: 'active-profile',
          profile,
          settings,
        };
      },
    );
  }
}
