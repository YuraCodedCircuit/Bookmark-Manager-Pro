import { describe, expect, it, vi } from 'vitest';

import { createBrowserSearchAdapter } from './browser-search';

describe('createBrowserSearchAdapter', () => {
  it('checks capability and uses the configured opening disposition', async () => {
    const query = vi.fn();
    const adapter = createBrowserSearchAdapter({
      browser: { search: { query } },
    } as unknown as typeof globalThis);

    expect(adapter.isAvailable()).toBe(true);
    await adapter.query('privacy tools', 'new-tab');
    expect(query).toHaveBeenCalledWith({
      disposition: 'NEW_TAB',
      text: 'privacy tools',
    });
  });

  it('fails safely when the Search API is unavailable', async () => {
    const adapter = createBrowserSearchAdapter({} as typeof globalThis);
    expect(adapter.isAvailable()).toBe(false);
    await expect(adapter.query('test', 'current-tab')).rejects.toThrow(
      'browser-search-api-unavailable',
    );
  });

  it('uses the Chromium Search API when the browser namespace is absent', async () => {
    const query = vi.fn();
    const adapter = createBrowserSearchAdapter({
      chrome: { search: { query } },
    } as unknown as typeof globalThis);

    await adapter.query('cross browser', 'current-tab');
    expect(query).toHaveBeenCalledWith({
      disposition: 'CURRENT_TAB',
      text: 'cross browser',
    });
  });
});
