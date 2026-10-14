import { createStore, type StoreApi } from 'zustand/vanilla';

import type { NotificationPreferences } from '../../domain/profile-settings';

export type NotificationLevel = 'success' | 'information' | 'warning' | 'error';

export interface NotificationAction {
  id: string;
  label: string;
  run: () => void | Promise<void>;
}

export interface NotificationInput {
  actions?: readonly NotificationAction[];
  durationMs?: number | null;
  /** Optional caller label; reuse never replaces a live event. Use the returned ID to dismiss. */
  id?: string;
  level: NotificationLevel;
  message: string;
  title: string;
}

export interface AppNotification extends NotificationInput {
  createdAt: number;
  durationMs: number | null;
  id: string;
}

interface NotificationState {
  notifications: readonly AppNotification[];
  visibleIds: readonly string[];
  hoveredIds: readonly string[];
}

interface NotificationTiming {
  durationMs: number | null;
  remainingMs: number | null;
  runningSince: number | null;
  started: boolean;
  hovered: boolean;
  timeout?: ReturnType<typeof setTimeout> | undefined;
}

export interface NotificationTimingSnapshot {
  durationMs: number | null;
  elapsedMs: number;
  remainingMs: number | null;
  paused: boolean;
}

export interface NotificationViewportCapacity {
  height: number;
  gap: number;
  cardHeights: ReadonlyMap<string, number>;
}

const defaultDurations: Record<NotificationLevel, number | null> = {
  success: 4_000,
  information: 6_000,
  warning: 10_000,
  error: null,
};

/**
 * Owns one surface's FIFO waiting queue, admitted cards, and independent clocks.
 * React mounts, focus, modal changes, ordering, and positioning never own timers.
 * Only hover pauses an admitted card; waiting events receive their full timeout
 * when admitted. Errors persist. Every trigger creates a separate event.
 */
export class NotificationService {
  private readonly timings = new Map<string, NotificationTiming>();
  private readonly visibleIds = new Set<string>();
  private attached = false;
  private enabled = true;
  private limit = 3;
  private viewport: NotificationViewportCapacity | undefined;
  readonly store: StoreApi<NotificationState> = createStore(() => ({
    notifications: [],
    visibleIds: [],
    hoveredIds: [],
  }));

  /** Applies capacity without evicting live cards for newer arrivals. */
  configure(
    preferences: Pick<NotificationPreferences, 'enabled' | 'stackLimit'>,
  ): void {
    if (
      this.attached &&
      this.enabled === preferences.enabled &&
      this.limit === preferences.stackLimit
    )
      return;
    this.attached = true;
    this.enabled = preferences.enabled;
    this.limit = preferences.stackLimit;
    if (!this.enabled) {
      this.clear();
      return;
    }
    // A reduced setting can hide previously visible cards, but their clocks
    // continue. Hidden cards cannot remain hovered and block queue admission.
    for (const id of [...this.visibleIds].slice(this.limit)) {
      this.visibleIds.delete(id);
      const timing = this.timings.get(id);
      if (timing?.hovered) {
        timing.hovered = false;
        this.startTimer(id, timing);
      }
    }
    this.publish(this.store.getState().notifications);
  }

  /** Requires measured whole-card space before admission; resize never restarts live clocks. */
  setViewportCapacity(capacity: NotificationViewportCapacity): void {
    const previous = this.viewport;
    if (
      previous &&
      previous.height === capacity.height &&
      previous.gap === capacity.gap &&
      previous.cardHeights.size === capacity.cardHeights.size &&
      [...capacity.cardHeights].every(
        ([id, height]) => previous.cardHeights.get(id) === height,
      )
    )
      return;
    this.viewport = { ...capacity, cardHeights: new Map(capacity.cardHeights) };
    let used = 0;
    let count = 0;
    for (const id of this.visibleIds) {
      const height = capacity.cardHeights.get(id);
      const required = (height ?? Infinity) + (count ? capacity.gap : 0);
      if (used + required <= capacity.height && count < this.limit) {
        used += required;
        count++;
      } else {
        this.visibleIds.delete(id);
        const timing = this.timings.get(id);
        if (timing?.hovered) {
          timing.hovered = false;
          this.startTimer(id, timing);
        }
      }
    }
    this.publish(this.store.getState().notifications);
  }

  show(input: NotificationInput): string {
    const current = this.store.getState().notifications;
    const id =
      input.id && !this.timings.has(input.id) ? input.id : crypto.randomUUID();
    if (!this.enabled) return id;
    const requestedDuration = input.durationMs;
    const durationMs =
      input.level === 'error'
        ? null
        : typeof requestedDuration === 'number' &&
            Number.isFinite(requestedDuration)
          ? Math.max(0, Math.min(requestedDuration, 2_147_483_647))
          : defaultDurations[input.level];
    const next: AppNotification = {
      ...input,
      createdAt: Date.now(),
      durationMs,
      id,
    };
    this.timings.set(id, {
      durationMs,
      remainingMs: durationMs,
      runningSince: null,
      started: false,
      hovered: false,
    });
    this.publish([...current, next]);
    return id;
  }

  dismiss(id: string): void {
    const timing = this.timings.get(id);
    if (!timing) return;
    clearTimeout(timing.timeout);
    this.timings.delete(id);
    this.visibleIds.delete(id);
    this.publish(
      this.store
        .getState()
        .notifications.filter((notification) => notification.id !== id),
    );
  }

  /** Discards transient cards and pending work when notifications are disabled or the surface is disposed. */
  clear(): void {
    for (const timing of this.timings.values()) clearTimeout(timing.timeout);
    this.timings.clear();
    this.visibleIds.clear();
    this.store.setState({ notifications: [], visibleIds: [], hoveredIds: [] });
  }

  /** Returns live progress; missing events may already have expired before the next render. */
  getTiming(id: string): NotificationTimingSnapshot | undefined {
    const timing = this.timings.get(id);
    if (!timing) return undefined;
    const remainingMs = this.currentRemaining(timing);
    return {
      durationMs: timing.durationMs,
      remainingMs,
      elapsedMs:
        timing.durationMs === null || remainingMs === null
          ? 0
          : Math.max(0, timing.durationMs - remainingMs),
      paused: timing.hovered,
    };
  }

  /** Pauses only this visible card on mouse entry and resumes its remaining time on exit. */
  setHovered(id: string, hovered: boolean): void {
    const timing = this.timings.get(id);
    if (
      !timing ||
      !this.visibleIds.has(id) ||
      timing.hovered === hovered ||
      timing.durationMs === null
    )
      return;
    if (hovered) {
      timing.remainingMs = this.currentRemaining(timing);
      timing.runningSince = null;
      clearTimeout(timing.timeout);
      timing.timeout = undefined;
      timing.hovered = true;
    } else {
      timing.hovered = false;
      this.startTimer(id, timing);
    }
    this.publish(this.store.getState().notifications);
  }

  private publish(notifications: readonly AppNotification[]): void {
    if (this.attached && this.enabled) {
      let used = this.viewport
        ? [...this.visibleIds].reduce(
            (sum, id) => sum + (this.viewport!.cardHeights.get(id) ?? Infinity),
            0,
          ) +
          Math.max(0, this.visibleIds.size - 1) * this.viewport.gap
        : 0;
      for (const notification of notifications) {
        if (this.visibleIds.size >= this.limit) break;
        if (this.visibleIds.has(notification.id)) continue;
        if (this.viewport) {
          const height = this.viewport.cardHeights.get(notification.id);
          const required =
            (height ?? Infinity) +
            (this.visibleIds.size ? this.viewport.gap : 0);
          if (used + required > this.viewport.height) break;
          used += required;
        }
        this.visibleIds.add(notification.id);
        const timing = this.timings.get(notification.id)!;
        if (!timing.started) {
          timing.started = true;
          this.startTimer(notification.id, timing);
        }
      }
    }
    this.store.setState({
      notifications,
      visibleIds: [...this.visibleIds],
      hoveredIds: [...this.timings]
        .filter(([, timing]) => timing.hovered)
        .map(([id]) => id),
    });
  }

  private startTimer(id: string, timing: NotificationTiming): void {
    if (timing.remainingMs === null || timing.runningSince !== null) return;
    timing.runningSince = performance.now();
    timing.timeout = setTimeout(() => {
      if (this.timings.get(id) === timing) this.dismiss(id);
    }, timing.remainingMs);
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
}
