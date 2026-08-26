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
    this.store.setState((state) => ({
      notifications: state.notifications.filter(
        (notification) => notification.id !== id,
      ),
    }));
  }

  clear(): void {
    this.store.setState({ notifications: [] });
  }
}
