import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('webextension-polyfill', () => ({
  default: { tabs: { query } },
}));

import { CurrentTabUrlUnavailableError, getCurrentTab } from './current-tab';

describe('getCurrentTab', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('returns the active tab when its URL is available', async () => {
    query.mockResolvedValue([
      { title: 'Example', url: 'https://example.com/', windowId: 4 },
    ]);

    await expect(getCurrentTab()).resolves.toEqual({
      title: 'Example',
      url: 'https://example.com/',
      windowId: 4,
    });
  });

  it('classifies a URL withheld on a privileged page as unavailable', async () => {
    query.mockResolvedValue([{ title: 'Extensions', windowId: 4 }]);

    await expect(getCurrentTab()).rejects.toBeInstanceOf(
      CurrentTabUrlUnavailableError,
    );
  });
});
