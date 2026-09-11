import { z } from 'zod';

import type {
  ProfileActivationResult,
  ProfileListItem,
  ProfileManagementRepository,
  ProfileStorageUsage,
} from '../application/profile/profile-management-repository';
import { profileSchema, type Profile } from '../domain/profile';
import {
  profileSettingsSchema,
  type ProfilePreferences,
  type ProfileSettings,
} from '../domain/profile-settings';
import type { BookmarkManagerDatabase } from './database';

const activeMetadataSchema = z.object({
  key: z.literal('activeProfileId'),
  value: z.uuid(),
});
const activationRevisionSchema = z.number().int().nonnegative();

/** Implements profile management as validated IndexedDB transactions. */
export class DexieProfileManagementRepository implements ProfileManagementRepository {
  constructor(private readonly database: BookmarkManagerDatabase) {}

  async list(): Promise<readonly ProfileListItem[]> {
    await this.database.open();
    const [profiles, metadata] = await Promise.all([
      this.database.profiles.orderBy('createdAt').reverse().toArray(),
      this.database.metadata.get('activeProfileId'),
    ]);
    const activeId = activeMetadataSchema.parse(metadata).value;
    return profiles.map((stored) => {
      const profile = profileSchema.parse(stored);
      return { profile, isActive: profile.id === activeId };
    });
  }

  async isProfileIdAvailable(profileId: string): Promise<boolean> {
    await this.database.open();
    return (await this.database.profiles.get(profileId)) === undefined;
  }

  async create(profile: Profile, settings: ProfileSettings): Promise<void> {
    await this.database.transaction(
      'rw',
      [this.database.profiles, this.database.profileSettings],
      async () => {
        await this.database.profiles.add(profile);
        await this.database.profileSettings.add(settings);
      },
    );
  }

  /** Copies the selected profile-owned data while remapping every item ID. */
  async copyOwnedData(
    sourceProfileId: string,
    targetProfileId: string,
    preferences: ProfilePreferences,
  ): Promise<void> {
    await this.database.transaction(
      'rw',
      [
        this.database.activity,
        this.database.activityLogSettings,
        this.database.bookmarks,
        this.database.folders,
        this.database.favoriteItems,
      ],
      async () => {
        if (preferences.duplicateBookmarks) {
          const [folders, bookmarks] = await Promise.all([
            this.database.folders
              .where('profileId')
              .equals(sourceProfileId)
              .toArray(),
            this.database.bookmarks
              .where('profileId')
              .equals(sourceProfileId)
              .toArray(),
          ]);
          const idMap = new Map<string, string>();
          for (const item of [...folders, ...bookmarks])
            idMap.set(item.id, crypto.randomUUID());
          const copyAppearance = <T extends { kind: string }>(
            appearance: T,
          ): T | { kind: 'color'; value: string } => {
            if (
              !preferences.duplicateAppearance ||
              (!preferences.duplicateImages && appearance.kind === 'image')
            )
              return { kind: 'color', value: '#2f7de1' };
            return appearance;
          };
          await this.database.folders.bulkAdd(
            folders.map((folder) => ({
              ...folder,
              id: idMap.get(folder.id)!,
              profileId: targetProfileId,
              parentId: folder.parentId
                ? (idMap.get(folder.parentId) ?? null)
                : null,
              icon: preferences.duplicateImages ? folder.icon : undefined,
              cardAppearance: copyAppearance(folder.cardAppearance),
              backgroundAppearance: !preferences.duplicateAppearance
                ? { kind: 'color', value: '#0b121a' }
                : folder.backgroundAppearance.kind === 'none'
                  ? folder.backgroundAppearance
                  : copyAppearance(folder.backgroundAppearance),
            })),
          );
          await this.database.bookmarks.bulkAdd(
            bookmarks.map((bookmark) => ({
              ...bookmark,
              id: idMap.get(bookmark.id)!,
              profileId: targetProfileId,
              parentId: idMap.get(bookmark.parentId)!,
              favicon: preferences.duplicateImages
                ? bookmark.favicon
                : undefined,
              cardAppearance: copyAppearance(bookmark.cardAppearance),
            })),
          );
          if (preferences.duplicateFavorites) {
            const favorites = await this.database.favoriteItems
              .where('profileId')
              .equals(sourceProfileId)
              .toArray();
            await this.database.favoriteItems.bulkAdd(
              favorites.flatMap((favorite) => {
                const itemId = idMap.get(favorite.itemId);
                return itemId
                  ? [{ ...favorite, itemId, profileId: targetProfileId }]
                  : [];
              }),
            );
          }
        }
        if (preferences.duplicateActivityLogs) {
          const [entries, settings] = await Promise.all([
            this.database.activity
              .where('profileId')
              .equals(sourceProfileId)
              .toArray(),
            this.database.activityLogSettings.get(sourceProfileId),
          ]);
          await this.database.activity.bulkAdd(
            entries.map((entry) => ({
              ...entry,
              id: crypto.randomUUID(),
              operationId: `op-duplicate-${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`,
              profileId: targetProfileId,
            })),
          );
          if (settings)
            await this.database.activityLogSettings.add({
              ...settings,
              profileId: targetProfileId,
            });
        }
      },
    );
  }

  async getSettings(profileId: string): Promise<ProfileSettings> {
    await this.database.open();
    return profileSettingsSchema.parse(
      await this.database.profileSettings.get(profileId),
    );
  }

  /** Estimates profile-owned payload sizes without exposing record contents. */
  async getStorageUsage(): Promise<readonly ProfileStorageUsage[]> {
    await this.database.open();
    const profiles = await this.database.profiles.toArray();
    return Promise.all(
      profiles.map(async (profile) => {
        const [
          settings,
          activity,
          activitySettings,
          bookmarks,
          folders,
          favorites,
        ] = await Promise.all([
          this.database.profileSettings.get(profile.id),
          this.database.activity
            .where('profileId')
            .equals(profile.id)
            .toArray(),
          this.database.activityLogSettings.get(profile.id),
          this.database.bookmarks
            .where('profileId')
            .equals(profile.id)
            .toArray(),
          this.database.folders.where('profileId').equals(profile.id).toArray(),
          this.database.favoriteItems
            .where('profileId')
            .equals(profile.id)
            .toArray(),
        ]);
        const payload = [
          profile,
          settings,
          activitySettings,
          ...activity,
          ...bookmarks,
          ...folders,
          ...favorites,
        ].filter(Boolean);
        return {
          profileId: profile.id,
          sizeBytes: new TextEncoder().encode(JSON.stringify(payload))
            .byteLength,
        };
      }),
    );
  }

  async updateSettings(settings: ProfileSettings): Promise<void> {
    const validated = profileSettingsSchema.parse(settings);
    const changed = await this.database.profileSettings.update(
      validated.profileId,
      validated,
    );
    if (changed !== 1) throw new Error('profile-settings-not-found');
  }

  async update(profile: Profile): Promise<void> {
    const changed = await this.database.profiles.update(profile.id, profile);
    if (changed !== 1) throw new Error('profile-not-found');
  }

  async delete(profileId: string): Promise<void> {
    await this.database.transaction(
      'rw',
      [
        this.database.profiles,
        this.database.profileSettings,
        this.database.activity,
        this.database.activityLogSettings,
        this.database.bookmarks,
        this.database.folders,
        this.database.favoriteItems,
        this.database.metadata,
      ],
      async () => {
        const metadata = activeMetadataSchema.parse(
          await this.database.metadata.get('activeProfileId'),
        );
        if (metadata.value === profileId)
          throw new Error('active-profile-cannot-be-deleted');
        if ((await this.database.profiles.count()) <= 1)
          throw new Error('only-profile-cannot-be-deleted');
        await this.database.profiles.delete(profileId);
        await this.database.profileSettings.delete(profileId);
        await this.database.activity
          .where('profileId')
          .equals(profileId)
          .delete();
        await this.database.activityLogSettings.delete(profileId);
        await this.database.bookmarks
          .where('profileId')
          .equals(profileId)
          .delete();
        await this.database.folders
          .where('profileId')
          .equals(profileId)
          .delete();
        await this.database.favoriteItems
          .where('profileId')
          .equals(profileId)
          .delete();
      },
    );
  }

  async switchTo(profileId: string): Promise<ProfileActivationResult> {
    return this.database.transaction(
      'rw',
      [this.database.profiles, this.database.metadata],
      async () => {
        if (!(await this.database.profiles.get(profileId)))
          throw new Error('profile-not-found');
        const active = activeMetadataSchema.parse(
          await this.database.metadata.get('activeProfileId'),
        );
        const revision = activationRevisionSchema.parse(
          (await this.database.metadata.get('profile-activation-revision:v1'))
            ?.value ?? 0,
        );
        if (active.value === profileId)
          return { changed: false, profileId, revision };
        const nextRevision = revision + 1;
        await this.database.metadata.put({
          key: 'activeProfileId',
          value: profileId,
        });
        await this.database.metadata.put({
          key: 'profile-activation-revision:v1',
          value: nextRevision,
        });
        return { changed: true, profileId, revision: nextRevision };
      },
    );
  }
}
