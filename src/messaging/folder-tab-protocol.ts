import { z } from 'zod';

/** Private, versioned messages between manager pages and the background worker. */
export const folderTabRequestSchema = z.discriminatedUnion('type', [
  z.strictObject({
    protocolVersion: z.literal(1),
    type: z.literal('folder-tab.open'),
    profileId: z.uuid(),
    folderId: z.uuid(),
  }),
  z.strictObject({
    protocolVersion: z.literal(1),
    type: z.literal('folder-tab.claim'),
    profileId: z.uuid(),
  }),
  z.strictObject({
    protocolVersion: z.literal(1),
    type: z.literal('folder-tab.ready'),
  }),
]);

export const folderTabResponseSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('opened') }),
  z.strictObject({ status: z.literal('none') }),
  z.strictObject({ status: z.literal('waiting') }),
  z.strictObject({ status: z.literal('ready') }),
  z.strictObject({ status: z.literal('destination'), folderId: z.uuid() }),
  z.strictObject({
    status: z.literal('failed'),
    errorCode: z.enum([
      'INVALID_REQUEST',
      'UNAVAILABLE',
      'MISSING_DESTINATION',
      'TAB_FAILED',
    ]),
  }),
]);

export type FolderTabRequest = z.infer<typeof folderTabRequestSchema>;
export type FolderTabResponse = z.infer<typeof folderTabResponseSchema>;

/** Session-only binding, retained for reload like the former folder query. */
export const folderTabRecordSchema = z.strictObject({
  version: z.literal(1),
  profileId: z.uuid(),
  folderId: z.uuid(),
});

/** Bounds abandoned creation state without persisting it across browser sessions. */
export const folderTabPendingSchema = z.strictObject({
  version: z.literal(1),
  profileId: z.uuid(),
  folderId: z.uuid(),
  expiresAt: z.number().int().nonnegative(),
});
