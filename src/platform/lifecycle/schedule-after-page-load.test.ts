import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleAfterPageLoad } from './schedule-after-page-load';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('scheduleAfterPageLoad', () => {
  it('does no maintenance before document load or in the UI-ready call stack', () => {
    vi.useFakeTimers();
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    const run = vi.fn();
    const cancel = scheduleAfterPageLoad(run);
    vi.runAllTimers();
    expect(run).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('load'));
    expect(run).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(run).toHaveBeenCalledOnce();
    cancel();
  });

  it('defers work even when the document already finished loading and permits cancellation', () => {
    vi.useFakeTimers();
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
    const run = vi.fn();
    const cancel = scheduleAfterPageLoad(run);
    expect(run).not.toHaveBeenCalled();
    cancel();
    vi.runAllTimers();
    expect(run).not.toHaveBeenCalled();
    scheduleAfterPageLoad(run);
    vi.runAllTimers();
    expect(run).toHaveBeenCalledOnce();
  });
});
