export type ExportEvent =
  'started' | 'completed' | 'cancelled' | 'failed' | 'loadFailed';

interface ExportFeedback {
  record: (input: {
    eventCode: string;
    level: 'INFO' | 'ERROR';
    kind: 'ACTIVITY' | 'DIAGNOSTIC';
    outcome: 'Succeeded' | 'Failed' | 'Cancelled';
    message: string;
  }) => Promise<void>;
  notify: (input: { level: 'success' | 'error'; message: string }) => void;
}

/** Delivers content-free operational feedback independently; disabled services may no-op. */
export function reportExportEvent(
  event: ExportEvent,
  message: string,
  feedback: ExportFeedback,
): void {
  const failed = event === 'failed' || event === 'loadFailed';
  try {
    void feedback
      .record({
        eventCode: `PROFILE-EXPORT-${event.replace(/([A-Z])/g, '-$1').toUpperCase()}`,
        level: failed ? 'ERROR' : 'INFO',
        kind: failed ? 'DIAGNOSTIC' : 'ACTIVITY',
        outcome: failed
          ? 'Failed'
          : event === 'cancelled'
            ? 'Cancelled'
            : 'Succeeded',
        message,
      })
      .catch(() => console.error('profile-export-log-write-failed'));
  } catch {
    console.error('profile-export-log-write-failed');
  }
  if (event === 'started' || event === 'cancelled') return;
  try {
    feedback.notify({ level: failed ? 'error' : 'success', message });
  } catch {
    console.error('profile-export-notification-failed');
  }
}
