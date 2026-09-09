import { z } from 'zod';

export const updateAnnouncementPreferencesSchema = z.object({
  schemaVersion: z.literal(1),
  showAfterUpdate: z.boolean(),
});

const versionSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

export const updateAnnouncementStateSchema = z.discriminatedUnion('status', [
  z.object({
    installedAt: z.number().int().nonnegative(),
    previousVersion: versionSchema,
    schemaVersion: z.literal(1),
    status: z.enum(['pending', 'shown', 'skipped', 'unavailable']),
    version: versionSchema,
  }),
  z.object({
    claimId: z.uuid(),
    claimedAt: z.number().int().nonnegative(),
    installedAt: z.number().int().nonnegative(),
    previousVersion: versionSchema,
    schemaVersion: z.literal(1),
    status: z.literal('claimed'),
    version: versionSchema,
  }),
]);

export type UpdateAnnouncementPreferences = z.infer<
  typeof updateAnnouncementPreferencesSchema
>;
export type UpdateAnnouncementState = z.infer<
  typeof updateAnnouncementStateSchema
>;

export const defaultUpdateAnnouncementPreferences: UpdateAnnouncementPreferences =
  {
    schemaVersion: 1,
    showAfterUpdate: true,
  };
