import { z } from 'zod';

export const BACKGROUND_PROTOCOL_VERSION = 1 as const;

const capabilitySchema = z.object({
  id: z.enum([
    'extension-startup',
    'runtime-messaging',
    'extension-permissions',
    'native-bookmarks',
  ]),
  status: z.enum(['available', 'unavailable']),
  reason: z.string().min(1).optional(),
});

const initializationSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('storage-unavailable') }),
  z.object({ status: z.literal('first-run') }),
  z.object({ status: z.literal('ready'), profileId: z.uuid() }),
  z.object({
    status: z.literal('recovery'),
    errorCode: z.enum(['database-open-failed', 'data-load-failed']),
  }),
]);

export const backgroundPreflightSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  operationId: z.uuid(),
  completedAt: z.iso.datetime(),
  language: z.string().min(1),
  initialization: initializationSchema,
  capabilities: z.array(capabilitySchema),
});

export type BackgroundPreflightSnapshot = z.infer<
  typeof backgroundPreflightSnapshotSchema
>;

export const backgroundRequestSchema = z.discriminatedUnion('type', [
  z.object({
    protocolVersion: z.literal(BACKGROUND_PROTOCOL_VERSION),
    type: z.literal('preflight.get'),
  }),
]);

export type BackgroundRequest = z.infer<typeof backgroundRequestSchema>;

export type BackgroundResponse =
  | {
      protocolVersion: typeof BACKGROUND_PROTOCOL_VERSION;
      type: 'preflight.result';
      snapshot: BackgroundPreflightSnapshot;
    }
  | {
      protocolVersion: typeof BACKGROUND_PROTOCOL_VERSION;
      type: 'request.invalid' | 'preflight.failed';
      errorCode: string;
    };
