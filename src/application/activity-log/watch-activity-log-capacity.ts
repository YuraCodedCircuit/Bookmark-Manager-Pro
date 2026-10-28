import type { NotificationInput } from '../notification/notification-service';

/** Announces each capacity transition once; feedback cannot affect recording. */
export function watchActivityLogCapacity(
  source: {
    full(): Promise<boolean>;
    subscribe(listener: () => void): () => void;
  },
  notify: (input: NotificationInput) => void,
  notice: Omit<NotificationInput, 'level' | 'durationMs'>,
): () => void {
  let disposed = false;
  let notified = false;
  let revision = 0;
  const check = async () => {
    const request = ++revision;
    try {
      const full = await source.full();
      if (disposed || request !== revision) return;
      if (!full) {
        notified = false;
        return;
      }
      if (notified) return;
      notified = true;
      try {
        notify({ ...notice, durationMs: null, level: 'warning' });
      } catch {
        console.error('activity-log-capacity-notification-failed');
      }
    } catch {
      console.error('activity-log-capacity-read-failed');
    }
  };
  let unsubscribe = () => undefined;
  try {
    const close = source.subscribe(() => {
      void check();
    });
    unsubscribe = () => {
      close();
      return undefined;
    };
  } catch {
    console.error('activity-log-capacity-subscribe-failed');
  }
  void check();
  return () => {
    disposed = true;
    unsubscribe();
  };
}
