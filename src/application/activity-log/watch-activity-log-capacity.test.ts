import { describe, expect, it, vi } from 'vitest';
import { watchActivityLogCapacity } from './watch-activity-log-capacity';

describe('activity capacity feedback', () => {
  it('isolates subscription and capacity-read failures', async () => {
    const diagnostic = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const notify = vi.fn();
    const stop = watchActivityLogCapacity(
      {
        full: async () => {
          throw new Error('synthetic');
        },
        subscribe: () => {
          throw new Error('synthetic');
        },
      },
      notify,
      { title: 'Full', message: 'Options' },
    );
    await vi.waitFor(() =>
      expect(diagnostic).toHaveBeenCalledWith(
        'activity-log-capacity-read-failed',
      ),
    );
    expect(diagnostic).toHaveBeenCalledWith(
      'activity-log-capacity-subscribe-failed',
    );
    expect(notify).not.toHaveBeenCalled();
    stop();
    diagnostic.mockRestore();
  });
  it('announces one persistent warning per full transition and isolates disabled delivery', async () => {
    let listener: () => void = () => undefined;
    const full = vi.fn(async () => false);
    const unsubscribe = vi.fn();
    const source = {
      full,
      subscribe: (callback: () => void) => {
        listener = callback;
        return unsubscribe;
      },
    };
    const notify = vi.fn();
    const close = watchActivityLogCapacity(source, notify, {
      title: 'Full',
      message: 'Clear or change limits',
    });
    await vi.waitFor(() => expect(full).toHaveBeenCalledOnce());
    full.mockResolvedValue(true);
    listener();
    await vi.waitFor(() => expect(notify).toHaveBeenCalledOnce());
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'warning', durationMs: null }),
    );
    listener();
    await Promise.resolve();
    expect(notify).toHaveBeenCalledOnce();
    full.mockResolvedValue(false);
    listener();
    await Promise.resolve();
    full.mockResolvedValue(true);
    listener();
    await vi.waitFor(() => expect(notify).toHaveBeenCalledTimes(2));
    close();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
  it('isolates notification failure and never reads or replays event content', async () => {
    const diagnostic = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const stop = watchActivityLogCapacity(
      { full: async () => true, subscribe: () => () => undefined },
      () => {
        throw new Error('synthetic');
      },
      { title: 'Full', message: 'Options' },
    );
    await vi.waitFor(() =>
      expect(diagnostic).toHaveBeenCalledWith(
        'activity-log-capacity-notification-failed',
      ),
    );
    stop();
    diagnostic.mockRestore();
  });
});
