import { z } from 'zod';
import {
  syncChoicesSchema,
  syncConnectionSchema,
} from '../domain/synchronization';
import { syncNodeSchema } from '../domain/sync-preview';

/** Versioned local-only commands accepted by the background synchronization owner. */
export const syncRequestSchema = z.object({
  type: z.literal('sync.command'),
  protocolVersion: z.literal(1),
  profileId: z.uuid(),
  command: z.enum([
    'status',
    'preview',
    'enable',
    'pause',
    'resume',
    'disconnect',
    'retry',
  ]),
  setup: z
    .object({
      extensionRoot: z.string().min(1),
      browserRoot: z.string().min(1),
      direction: z.enum([
        'browser-to-extension',
        'extension-to-browser',
        'both',
      ]),
      choices: syncChoicesSchema,
    })
    .optional(),
  token: z.string().optional(),
});
export type SyncRequest = z.infer<typeof syncRequestSchema>;
export const syncResponseSchema = z.object({
  protocolVersion: z.literal(1),
  type: z.literal('sync.result'),
  error: z
    .enum([
      'failed',
      'permission',
      'stale',
      'overlap',
      'inactive',
      'missing-root',
    ])
    .optional(),
  connection: syncConnectionSchema.nullable(),
  token: z.string().optional(),
  preview: z
    .object({
      extension: z.object({
        add: z.number(),
        update: z.number(),
        delete: z.number(),
      }),
      browser: z.object({
        add: z.number(),
        update: z.number(),
        delete: z.number(),
      }),
      conflicts: z.number(),
      skipped: z.number(),
    })
    .optional(),
  conflicts: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(['pair', 'edit', 'delete']),
        extension: z.array(syncNodeSchema),
        browser: z.array(syncNodeSchema),
      }),
    )
    .optional(),
});
export type SyncResponse = z.infer<typeof syncResponseSchema>;
