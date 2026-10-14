import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationService } from './notification-service';

const services: NotificationService[] = [];
function service(limit: 3 | 6 | 9 = 3) {
  const instance = new NotificationService();
  services.push(instance);
  instance.configure({ enabled: true, stackLimit: limit });
  return instance;
}
const timed = {
  level: 'success' as const,
  title: 'Saved',
  message: 'Saved.',
  durationMs: 1_000,
};
afterEach(() => {
  services.splice(0).forEach((instance) => instance.clear());
  vi.useRealTimers();
});

describe('NotificationService', () => {
  it('waits for measured viewport space as well as the saved count limit', () => {
    vi.useFakeTimers();
    const instance = service(9);
    instance.setViewportCapacity({
      height: 232,
      gap: 12,
      cardHeights: new Map(),
    });
    const ids = Array.from({ length: 4 }, () => instance.show(timed));
    expect(instance.store.getState().visibleIds).toEqual([]);
    const heights = new Map([
      [ids[0]!, 100],
      [ids[1]!, 120],
      [ids[2]!, 80],
    ]);
    instance.setViewportCapacity({
      height: 232,
      gap: 12,
      cardHeights: heights,
    });
    expect(instance.store.getState().visibleIds).toEqual(ids.slice(0, 2));
    vi.advanceTimersByTime(600);
    expect(instance.getTiming(ids[2]!)?.remainingMs).toBe(1000);
    instance.dismiss(ids[0]!);
    expect(instance.store.getState().visibleIds).toEqual(ids.slice(1, 3));
    expect(instance.getTiming(ids[2]!)?.remainingMs).toBe(1000);
    // An unmeasured entry cannot consume a nominally free slot.
    instance.dismiss(ids[1]!);
    expect(instance.store.getState().visibleIds).toEqual([ids[2]]);
    heights.set(ids[3]!, 80);
    instance.configure({ enabled: true, stackLimit: 3 });
    instance.setViewportCapacity({
      height: 1000,
      gap: 12,
      cardHeights: heights,
    });
    for (let index = 0; index < 4; index++) instance.show(timed);
    expect(instance.store.getState().visibleIds).toHaveLength(2);
  });

  it('rechecks resize without restarting admitted clocks or expiring waiting events', () => {
    vi.useFakeTimers();
    const instance = service(9);
    instance.setViewportCapacity({
      height: 300,
      gap: 12,
      cardHeights: new Map(),
    });
    const ids = Array.from({ length: 3 }, () => instance.show(timed));
    const cardHeights = new Map(ids.map((id) => [id, 100]));
    instance.setViewportCapacity({ height: 212, gap: 12, cardHeights });
    vi.advanceTimersByTime(400);
    instance.setViewportCapacity({ height: 100, gap: 12, cardHeights });
    expect(instance.store.getState().visibleIds).toEqual([ids[0]]);
    expect(instance.getTiming(ids[1]!)?.remainingMs).toBe(600);
    expect(instance.getTiming(ids[2]!)?.remainingMs).toBe(1000);
    instance.setViewportCapacity({ height: 324, gap: 12, cardHeights });
    expect(instance.store.getState().visibleIds).toEqual(ids);
    expect(instance.getTiming(ids[0]!)?.remainingMs).toBe(600);
    expect(instance.getTiming(ids[2]!)?.remainingMs).toBe(1000);
  });

  it('keeps every identical triggered event as a separate notification', () => {
    const instance = service();
    const first = instance.show({ ...timed, id: 'feedback' });
    const second = instance.show({ ...timed, id: 'feedback' });
    const third = instance.show(timed);
    expect(new Set([first, second, third]).size).toBe(3);
    expect(instance.store.getState().notifications).toHaveLength(3);
  });

  it('preserves a live event and its remaining timeout when the same caller ID is reused', () => {
    vi.useFakeTimers();
    const instance = service();
    const first = instance.show({ ...timed, id: 'export-progress' });
    vi.advanceTimersByTime(600);
    const next = instance.show({
      ...timed,
      id: 'export-progress',
      title: 'Another event',
    });
    expect(next).not.toBe(first);
    expect(instance.getTiming(first)?.remainingMs).toBe(400);
    vi.advanceTimersByTime(400);
    expect(instance.store.getState().notifications.map((n) => n.id)).toEqual([
      next,
    ]);
    expect(instance.getTiming(next)?.remainingMs).toBe(600);
  });

  it('uses the existing level durations and keeps errors persistent', () => {
    vi.useFakeTimers();
    const instance = service(6);
    const ids = (['success', 'information', 'warning', 'error'] as const).map(
      (level) =>
        instance.show({ level, title: level, message: 'Generic result' }),
    );
    expect(
      instance.store.getState().notifications.map((n) => n.durationMs),
    ).toEqual([4_000, 6_000, 10_000, null]);
    vi.advanceTimersByTime(4_000);
    expect(instance.store.getState().notifications.map((n) => n.id)).toEqual(
      ids.slice(1),
    );
    vi.advanceTimersByTime(2_000);
    expect(instance.store.getState().notifications.map((n) => n.id)).toEqual(
      ids.slice(2),
    );
    vi.advanceTimersByTime(20_000);
    expect(instance.store.getState().notifications.map((n) => n.id)).toEqual([
      ids[3],
    ]);
  });

  it('never makes an error expire or a non-error indefinite through an override', () => {
    vi.useFakeTimers();
    const instance = service();
    instance.show({ ...timed, durationMs: null });
    const error = instance.show({ ...timed, level: 'error', durationMs: 1 });
    vi.advanceTimersByTime(4_000);
    expect(instance.store.getState().notifications.map((n) => n.id)).toEqual([
      error,
    ]);
  });

  it('retains visible slots and starts a FIFO waiting event only after a card closes', () => {
    vi.useFakeTimers();
    const instance = service();
    const visible = Array.from({ length: 3 }, () => instance.show(timed));
    vi.advanceTimersByTime(600);
    const queued = instance.show(timed);
    expect(instance.store.getState().visibleIds).toEqual(visible);
    expect(instance.getTiming(queued)?.remainingMs).toBe(1_000);
    vi.advanceTimersByTime(400);
    expect(instance.store.getState().visibleIds).toEqual([queued]);
    expect(instance.getTiming(queued)?.remainingMs).toBe(1_000);
    vi.advanceTimersByTime(999);
    expect(instance.getTiming(queued)).toBeDefined();
    vi.advanceTimersByTime(1);
    expect(instance.getTiming(queued)).toBeUndefined();
  });

  it('admits waiting events in trigger order even when older errors are persistent', () => {
    const instance = service();
    const active = Array.from({ length: 3 }, () =>
      instance.show({ ...timed, level: 'error' }),
    );
    const queued = [instance.show(timed), instance.show(timed)];
    instance.dismiss(active[1]!);
    expect(instance.store.getState().visibleIds).toEqual([
      active[0],
      active[2],
      queued[0],
    ]);
    instance.dismiss(active[0]!);
    expect(instance.store.getState().visibleIds).toEqual([
      active[2],
      queued[0],
      queued[1],
    ]);
  });

  it('pauses only the hovered card and resumes its exact remaining time', () => {
    vi.useFakeTimers();
    const instance = service();
    const first = instance.show(timed);
    const second = instance.show(timed);
    vi.advanceTimersByTime(400);
    instance.setHovered(first, true);
    vi.advanceTimersByTime(1_000);
    expect(instance.getTiming(second)).toBeUndefined();
    expect(instance.getTiming(first)).toMatchObject({
      remainingMs: 600,
      paused: true,
    });
    instance.setHovered(first, false);
    vi.advanceTimersByTime(599);
    expect(instance.getTiming(first)?.remainingMs).toBe(1);
    vi.advanceTimersByTime(1);
    expect(instance.getTiming(first)).toBeUndefined();
  });

  it('does not restart admitted timers when capacity changes', () => {
    vi.useFakeTimers();
    const instance = service(6);
    const ids = Array.from({ length: 6 }, () => instance.show(timed));
    vi.advanceTimersByTime(400);
    instance.configure({ enabled: true, stackLimit: 3 });
    expect(instance.store.getState().visibleIds).toEqual(ids.slice(0, 3));
    const pending = instance.show(timed);
    vi.advanceTimersByTime(600);
    expect(instance.store.getState().notifications.map((n) => n.id)).toEqual([
      pending,
    ]);
    expect(instance.getTiming(pending)?.remainingMs).toBe(1_000);
  });

  it('does not start any clock before a viewport configures the service', () => {
    vi.useFakeTimers();
    const instance = new NotificationService();
    services.push(instance);
    const id = instance.show(timed);
    vi.advanceTimersByTime(20_000);
    expect(instance.getTiming(id)?.remainingMs).toBe(1_000);
    instance.configure({ enabled: true, stackLimit: 3 });
    vi.advanceTimersByTime(1_000);
    expect(instance.getTiming(id)).toBeUndefined();
  });

  it('clears timers and queued events when disabled and ignores triggers until re-enabled', () => {
    vi.useFakeTimers();
    const instance = service();
    for (let i = 0; i < 5; i++) instance.show(timed);
    instance.configure({ enabled: false, stackLimit: 3 });
    instance.show(timed);
    expect(instance.store.getState().notifications).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    instance.configure({ enabled: true, stackLimit: 3 });
    instance.show(timed);
    expect(instance.store.getState().visibleIds).toHaveLength(1);
  });
});
