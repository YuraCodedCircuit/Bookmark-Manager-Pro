import { afterEach, describe, expect, it, vi } from 'vitest';

import { BrowserUndoHistorySessionMarker } from './browser-undo-history-session-marker';

const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

afterEach(() => {
  window.sessionStorage.clear();
  Reflect.deleteProperty(globalThis, 'browser');
  Reflect.deleteProperty(globalThis, 'chrome');
});

describe('BrowserUndoHistorySessionMarker', () => {
  it('uses tab session storage in the webpage preview', async () => {
    const marker = new BrowserUndoHistorySessionMarker();

    await expect(marker.get()).resolves.toBeUndefined();
    await marker.set(sessionId);

    expect(marker.sharedAcrossTabs).toBe(false);
    await expect(marker.get()).resolves.toBe(sessionId);
  });

  it('uses shared extension session storage when available', async () => {
    const values: Record<string, unknown> = {};
    const remove = vi.fn(async (key: string) => {
      delete values[key];
    });
    Object.assign(globalThis, {
      browser: {
        storage: {
          session: {
            get: vi.fn(async (key: string) => ({ [key]: values[key] })),
            remove,
            set: vi.fn(async (next: Record<string, unknown>) =>
              Object.assign(values, next),
            ),
          },
        },
      },
    });
    const marker = new BrowserUndoHistorySessionMarker();

    await marker.set(sessionId);

    expect(marker.sharedAcrossTabs).toBe(true);
    await expect(marker.get()).resolves.toBe(sessionId);
    await marker.removeLegacyHistory();
    expect(remove).toHaveBeenCalledWith('bookmark-manager-pro.undo-history.v1');
  });

  it('preserves extension read failures for safe startup handling', async () => {
    Object.assign(globalThis, {
      browser: {
        storage: {
          session: {
            get: vi.fn(async () => Promise.reject(new Error('read failed'))),
            remove: vi.fn(async () => undefined),
            set: vi.fn(async () => undefined),
          },
        },
      },
    });

    await expect(new BrowserUndoHistorySessionMarker().get()).rejects.toThrow(
      'read failed',
    );
  });
});
