import type { ImportValidationEvent } from './native-import-session';

interface Feedback {
  record: (event: ImportValidationEvent) => Promise<void>;
  notifyFailure: () => void;
  notifySuccess?: () => void;
  notifyWarning?: () => void;
}

/** Distinguishes cancellation from supported preview limitations without recording content. */
export function importValidationOutcome(event: ImportValidationEvent) {
  if (event.level === 'ERROR') return 'Failed';
  if (
    event.code === 'import.validation.cancelled' ||
    event.code === 'import.save.cancelled'
  )
    return 'Cancelled';
  return event.level === 'WARN' ? 'Skipped' : 'Succeeded';
}

/** Isolates feedback failures; all failed validation and unlock requests use the app notifier. */
export function reportImportValidation(
  event: ImportValidationEvent,
  feedback: Feedback,
): void {
  try {
    void feedback
      .record(event)
      .catch(() => console.error('import-log-write-failed'));
  } catch {
    console.error('import-log-write-failed');
  }
  try {
    if (event.level === 'ERROR') feedback.notifyFailure();
    else if (event.code === 'import.save.succeeded') feedback.notifySuccess?.();
    else if (
      event.code === 'import.save.changed' ||
      event.code === 'import.save.excluded' ||
      event.code === 'import.save.paused' ||
      event.code === 'import.save.refresh-failed'
    )
      feedback.notifyWarning?.();
  } catch {
    console.error('import-notification-failed');
  }
}
