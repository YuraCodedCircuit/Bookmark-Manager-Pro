import { createStore, type StoreApi } from 'zustand/vanilla';

export type NotificationLevel = 'success' | 'information' | 'warning' | 'error';

export interface NotificationAction {
  id: string;
  label: string;
  run: () => void | Promise<void>;
}

export interface NotificationInput {
  actions?: readonly NotificationAction[];
  durationMs?: number | null;
  id?: string;
  level: NotificationLevel;
  message: string;
  title: string;
}

export interface AppNotification extends NotificationInput {
  createdAt: number;
  durationMs: number | null;
  id: string;
  revision: number;
}

interface NotificationState {
  notifications: readonly AppNotification[];
}

interface NotificationTiming {
  durationMs: number | null;
  remainingMs: number | null;
  runningSince: number | null;
}

export interface NotificationTimingSnapshot {
  durationMs: number | null;
  elapsedMs: number;
  remainingMs: number | null;
}

const defaultDurations: Record<NotificationLevel, number | null> = {
  success: 4_000,
  information: 6_000,
  warning: 10_000,
  error: null,
};

/**
 * Owns transient notification state for one application surface. Supplying an
 * existing ID replaces that entry, while identical visible messages are
 * de-duplicated so repeated failures cannot flood the stack.
 */
export class NotificationService {
  private readonly timings = new Map<string, NotificationTiming>();
  readonly store: StoreApi<NotificationState> = createStore(() => ({
    notifications: [],
  }));

  show(input: NotificationInput): string {
    const current = this.store.getState().notifications;
    const sameId = input.id
      ? current.find((notification) => notification.id === input.id)
      : undefined;
    const duplicate = current.find(
      (notification) =>
        notification.level === input.level &&
        notification.title === input.title &&
        notification.message === input.message,
    );
    if (duplicate && !sameId) return duplicate.id;

    const id = input.id ?? crypto.randomUUID();
    const next: AppNotification = {
      ...input,
      createdAt: sameId?.createdAt ?? Date.now(),
      durationMs:
        input.durationMs === undefined
          ? defaultDurations[input.level]
          : input.durationMs,
      id,
      revision: (sameId?.revision ?? 0) + 1,
    };
    this.timings.set(id, {
      durationMs: next.durationMs,
      remainingMs: next.durationMs,
      runningSince: null,
    });
    this.store.setState({
      notifications: sameId
        ? current.map((notification) =>
            notification.id === id ? next : notification,
          )
        : [...current, next],
    });
    return id;
  }

  dismiss(id: string): void {
    this.timings.delete(id);
    this.store.setState((state) => ({
      notifications: state.notifications.filter(
        (notification) => notification.id !== id,
      ),
    }));
  }

  clear(): void {
    this.timings.clear();
    this.store.setState({ notifications: [] });
  }

  /** Returns countdown progress that remains stable across React portal moves. */
  getTiming(id: string): NotificationTimingSnapshot {
    const timing = this.requireTiming(id);
    const remainingMs = this.currentRemaining(timing);
    return {
      durationMs: timing.durationMs,
      elapsedMs:
        timing.durationMs === null || remainingMs === null
          ? 0
          : Math.max(0, timing.durationMs - remainingMs),
      remainingMs,
    };
  }

  /** Starts or resumes an auto-close countdown and returns its remaining time. */
  resumeTimer(id: string): number | null {
    const timing = this.requireTiming(id);
    if (timing.remainingMs !== null && timing.runningSince === null)
      timing.runningSince = performance.now();
    return this.currentRemaining(timing);
  }

  /** Persists elapsed countdown time before a card pauses or unmounts. */
  pauseTimer(id: string): void {
    const timing = this.timings.get(id);
    if (!timing || timing.runningSince === null) return;
    timing.remainingMs = this.currentRemaining(timing);
    timing.runningSince = null;
  }

  private currentRemaining(timing: NotificationTiming): number | null {
    if (timing.remainingMs === null) return null;
    return Math.max(
      0,
      timing.remainingMs -
        (timing.runningSince === null
          ? 0
          : performance.now() - timing.runningSince),
    );
  }

  private requireTiming(id: string): NotificationTiming {
    const timing = this.timings.get(id);
    if (!timing) throw new Error('notification-timing-not-found');
    return timing;
  }
}
