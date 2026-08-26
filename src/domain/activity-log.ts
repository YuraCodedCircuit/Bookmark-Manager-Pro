import { z } from 'zod';

export const activityLogLevelSchema = z.enum(['INFO', 'WARN', 'ERROR']);
export const activityLogKindSchema = z.enum(['ACTIVITY', 'DIAGNOSTIC']);
export const activityLogCategorySchema = z.enum([
  'Application',
  'Bookmarks',
  'Profiles',
]);

/** Durable, privacy-safe operational metadata owned by one local profile. */
export const activityLogEntrySchema = z.object({
  action: z.string().trim().min(1).max(80),
  applicationVersion: z.string().trim().min(1).max(30),
  browserTarget: z.string().trim().min(1).max(80),
  category: activityLogCategorySchema,
  dataChanged: z.boolean(),
  durationMs: z.number().int().nonnegative().max(86_400_000),
  eventCode: z.string().regex(/^[A-Z][A-Z0-9-]{2,79}$/),
  id: z.uuid(),
  itemType: z.string().trim().min(1).max(80),
  itemsAffected: z.number().int().nonnegative().max(1_000_000_000),
  kind: activityLogKindSchema,
  level: activityLogLevelSchema,
  message: z.string().trim().min(1).max(240),
  operationId: z.string().regex(/^op-[a-z0-9-]{4,80}$/),
  outcome: z.enum(['Succeeded', 'Failed', 'Cancelled', 'Skipped']),
  profileId: z.uuid(),
  schemaVersion: z.number().int().positive(),
  source: z.string().trim().min(1).max(80),
  timestamp: z.number().int().nonnegative(),
});

export const activityLogSettingsSchema = z.object({
  activityEnabled: z.boolean(),
  autoDeleteOldest: z.boolean(),
  diagnosticsEnabled: z.boolean(),
  enabled: z.boolean(),
  includeDiagnosticsExport: z.boolean(),
  maximumStorageMb: z.number().int().min(1).max(100),
  minimumLevel: activityLogLevelSchema,
  profileId: z.uuid(),
  retentionCount: z.number().int().min(100).max(100_000),
});

export type ActivityLogEntry = z.infer<typeof activityLogEntrySchema>;
export type ActivityLogSettings = z.infer<typeof activityLogSettingsSchema>;
export type ActivityLogLevel = z.infer<typeof activityLogLevelSchema>;
export type ActivityLogKind = z.infer<typeof activityLogKindSchema>;
