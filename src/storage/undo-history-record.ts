import { z } from 'zod';

import { undoHistoryEntrySchema } from '../domain/undo-history';

export const undoHistoryRecordSchema = undoHistoryEntrySchema.extend({
  position: z.number().int().nonnegative(),
  sessionId: z.uuid(),
});

export type UndoHistoryRecord = z.infer<typeof undoHistoryRecordSchema>;
