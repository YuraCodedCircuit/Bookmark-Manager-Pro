import { z } from 'zod';

export const activityLogLevelSchema = z.enum(['INFO', 'WARN', 'ERROR']);
export const activityLogKindSchema = z.enum(['ACTIVITY', 'DIAGNOSTIC']);
export const activityLogCategorySchema = z.enum([
  'Application',
  'Bookmarks',
  'Notes',
  'Profiles',
]);

/** Shared privacy-safe history; profile references contain no display names. */
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
  profileId: z.uuid().nullable(),
  sessionId: z.string().min(1).max(80).default('earlier'),
  sequence: z.number().int().nonnegative().default(0),
  schemaVersion: z.number().int().positive(),
  source: z.string().trim().min(1).max(80),
  timestamp: z.number().int().nonnegative().max(8_640_000_000_000_000),
});

export const activityLogSettingsSchema = z.object({
  activityEnabled: z.boolean(),
  autoDeleteOldest: z.boolean(),
  diagnosticsEnabled: z.boolean(),
  enabled: z.boolean(),
  maximumStorageMb: z.number().int().min(1).max(100),
  minimumLevel: activityLogLevelSchema,
  profileId: z.uuid(),
  retentionCount: z.number().int().min(100).max(100_000),
  sessionOrder: z.enum(['newest', 'oldest']).default('newest'),
  eventOrder: z.enum(['oldest', 'newest']).default('oldest'),
  enabledCategories: z
    .array(activityLogCategorySchema)
    .default(['Application', 'Bookmarks', 'Notes', 'Profiles']),
});

/** Essential session status survives event filtering, never disabled recording. */
export const activitySessionSchema = z.object({
  id: z.string().min(1).max(80),
  startedAt: z.number().int().nonnegative().max(8_640_000_000_000_000),
  origin: z.enum(['startup', 'detected', 'earlier']),
  startup: z.enum([
    'pending',
    'succeeded',
    'failed',
    'not-recorded',
    'cleared',
  ]),
  trimmedCount: z.number().int().nonnegative().default(0),
  omittedCount: z.number().int().nonnegative().default(0),
  cleared: z.boolean().default(false),
  recordingResumed: z.boolean().optional(),
});
export type ActivitySession = z.infer<typeof activitySessionSchema>;
export type ActivitySessionIdentity = Pick<
  ActivitySession,
  'id' | 'startedAt' | 'origin'
> & { preflightComplete?: boolean | undefined };

export type ActivityLogEntry = z.infer<typeof activityLogEntrySchema>;
export type ActivityLogSettings = z.infer<typeof activityLogSettingsSchema>;
export type ActivityLogLevel = z.infer<typeof activityLogLevelSchema>;
export type ActivityLogKind = z.infer<typeof activityLogKindSchema>;

/** Fixed classifications never contain submitted content or exception messages. */
export const activityReasonSchema = z.enum([
  'system',
  'storage',
  'worker',
  'api',
  'validation',
  'denied',
  'stale',
  'conflict',
  'committed',
]);
export type ActivityReason = z.infer<typeof activityReasonSchema>;

/** Bounded, local-only incident state; older readers can ignore this versioned metadata. */
export const activityIncidentStateSchema = z.object({
  version: z.literal(1),
  entries: z
    .array(
      z.object({
        profileId: z.uuid().nullable(),
        eventCode: activityLogEntrySchema.shape.eventCode,
        reason: activityReasonSchema,
        sessionId: z.string().min(1).max(80),
        operationId: activityLogEntrySchema.shape.operationId,
        level: z.enum(['WARN', 'ERROR']),
      }),
    )
    .max(128),
});

const quietActivityCodes = new Set([
  'FTP-BOOKMARK-SAVE-CANCELLED',
  'BOOKMARK-DUPLICATE-CANCELLED',
  'BOOKMARK-DUPLICATE-PREVENTED',
  'ITEM-PASTE-DESTINATION-REJECTED',
  'PREFLIGHT-CAPABILITIES-UNAVAILABLE',
  'UNDO-HISTORY-SESSION-CLEANUP-DEFERRED',
  'PROFILE-STORAGE-ESTIMATE-UNAVAILABLE',
  'TOOLBAR-SAVED-STATUS-PERMISSION-DENIED',
  'POPUP-CLIPBOARD-READ-DENIED',
  'DEFAULT-FOLDER-WALLPAPER-IMPORT-REJECTED',
  'FOLDER-WALLPAPER-IMPORT-REJECTED',
  'NOTIFICATION-TOP-LAYER-UNAVAILABLE',
  'IMPORT-VALIDATION-CANCELLED',
  'IMPORT-SAVE-CANCELLED',
  'IMPORT-VALIDATION-CSV-FLAT',
  'IMPORT-DESTINATION-MISSING',
  'IMPORT-SAVE-CHANGED',
  'IMPORT-SAVE-ACTIVITY-EXCLUDED',
  'BACKUP-HISTORY-EXCLUDED',
  'SYNC-SETUP-ACCESS-DENIED',
  'SYNC-SETUP-UNAVAILABLE',
  'SYNC-SETUP-PREVIEW-INCOMPLETE',
  'WEB-SEARCH-API-UNAVAILABLE',
]);
const bulkActivityCodes = new Set([
  'IMPORT-SAVE-SUCCEEDED',
  'BACKUP-SNAPSHOT-RESTORED',
  'SYNC-COMPLETED',
]);

/** Actual preflight attempts remain visible; cached readiness never emits these again. */
const preflightActivityCodes = new Set([
  'BACKGROUND-PREFLIGHT-STARTED',
  'BACKGROUND-PREFLIGHT-COMPLETE',
  'BACKGROUND-UPDATE-PREFLIGHT-STARTED',
  'BACKGROUND-UPDATE-PREFLIGHT-COMPLETE',
]);

/** Admission precedes IDs/storage; quiet feedback remains the caller's responsibility. */
export function activityCaptureLevel(input: {
  eventCode: string;
  level: ActivityLogLevel;
  reason?: ActivityReason | undefined;
}): ActivityLogLevel | null {
  if (
    quietActivityCodes.has(input.eventCode) ||
    ['validation', 'denied', 'stale'].includes(input.reason ?? '')
  )
    return null;
  if (
    ['IMPORT-VALIDATION-FAILED', 'IMPORT-UNLOCK-FAILED'].includes(
      input.eventCode,
    ) &&
    input.reason === undefined
  )
    return null;
  if (input.level === 'INFO')
    return bulkActivityCodes.has(input.eventCode) ||
      preflightActivityCodes.has(input.eventCode)
      ? 'INFO'
      : null;
  if (
    input.reason === 'committed' ||
    input.reason === 'conflict' ||
    [
      'UPDATE-RELEASE-NOTES-UNAVAILABLE',
      'UNDO-HISTORY-SESSION-CLEANUP-FAILED',
      'EXTERNAL-CONTENT-REFRESH-FAILED',
    ].includes(input.eventCode)
  )
    return 'WARN';
  return input.level;
}

/** Success signals close matching incidents without adding routine success rows. */
export function activityRecoveryCodes(eventCode: string): readonly string[] {
  if (eventCode === 'BOOKMARK-OPEN-REQUESTED') return ['BOOKMARK-OPEN-FAILED'];
  if (eventCode === 'URL-MATCHES-SCAN-COMPLETE')
    return ['URL-MATCHES-SCAN-FAILED', 'URL-MATCHES-SNAPSHOT-OUTDATED'];
  if (eventCode === 'SYNC-COMPLETED' || eventCode === 'SYNC-RECOVERED')
    return [
      'SYNC-FAILED',
      'SYNC-WAKE-FAILED',
      'SYNC-CONFLICT',
      'SYNC-SKIPPED',
      'SYNC-PERMISSION',
      'SYNC-MISSING-ROOT',
    ];
  if (eventCode === 'UNDO-HISTORY-RECOVERED')
    return [
      'UNDO-HISTORY-INITIALIZATION-FAILED',
      'UNDO-HISTORY-STORAGE-WRITE-FAILED',
      'UNDO-HISTORY-RECORD-SKIPPED',
      'CURRENT-TAB-UNDO-HISTORY-DEGRADED',
    ];
  if (eventCode.endsWith('-COMPLETE')) {
    const stem = eventCode.slice(0, -'-COMPLETE'.length);
    return [`${stem}-FAILED`, `${stem}-VIEW-REFRESH-DEGRADED`];
  }
  if (eventCode.startsWith('NOTES-') && !eventCode.endsWith('-FAILED'))
    return ['NOTES-CHANGE-FAILED'];
  if (eventCode === 'IMPORT-SAVE-SUCCEEDED')
    return [
      'IMPORT-SAVE-FAILED',
      'IMPORT-SAVE-PAUSED',
      'IMPORT-SAVE-REFRESH-FAILED',
      'IMPORT-SAVE-EXCLUDED',
    ];
  if (eventCode === 'BACKUP-SNAPSHOT-RESTORED')
    return ['BACKUP-SNAPSHOT-RESTORE-FAILED'];
  return [];
}
