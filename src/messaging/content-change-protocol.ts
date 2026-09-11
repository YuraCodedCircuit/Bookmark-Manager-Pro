import { z } from 'zod';

export const CONTENT_CHANGE_PROTOCOL_VERSION = 1;
export const PROFILE_ACTIVATION_PROTOCOL_VERSION = 1;

const deletedFolderPathSchema = z.object({
  folderId: z.uuid(),
  ancestorIds: z.array(z.uuid()).max(250),
});

/** A privacy-safe, profile-scoped description of committed bookmark changes. */
export const contentChangeSchema = z.object({
  type: z.literal('content.changed'),
  protocolVersion: z.literal(CONTENT_CHANGE_PROTOCOL_VERSION),
  profileId: z.uuid(),
  revision: z.number().int().positive(),
  affectedParentIds: z.array(z.uuid()).max(500),
  changedFolderIds: z.array(z.uuid()).max(500),
  deletedFolderPaths: z.array(deletedFolderPathSchema).max(500),
  fullRefresh: z.boolean().default(false),
  navigationChanged: z.boolean().default(false),
});

export type ContentChange = z.infer<typeof contentChangeSchema>;
export type ContentChangeInput = Omit<
  z.input<typeof contentChangeSchema>,
  'type' | 'protocolVersion' | 'revision'
>;

/** A privacy-safe notification that another surface activated a profile. */
export const profileActivationSchema = z.object({
  type: z.literal('profile.activated'),
  protocolVersion: z.literal(PROFILE_ACTIVATION_PROTOCOL_VERSION),
  profileId: z.uuid(),
  revision: z.number().int().positive(),
});

export type ProfileActivation = z.infer<typeof profileActivationSchema>;
export type ProfileActivationInput = Omit<
  ProfileActivation,
  'type' | 'protocolVersion'
>;
