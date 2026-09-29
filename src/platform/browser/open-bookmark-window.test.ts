import { beforeEach, describe, expect, it, vi } from 'vitest';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('webextension-polyfill', () => ({
  default: { windows: { create } },
}));

import { openBookmarkWindow } from './open-bookmark-window';

describe('openBookmarkWindow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens the URL in a focused normal window', async () => {
    create.mockResolvedValue({ id: 1, incognito: false });

    await openBookmarkWindow('https://example.com/');

    expect(create).toHaveBeenCalledWith({
      focused: true,
      url: 'https://example.com/',
    });
  });

  it('preserves browser API failures for the caller', async () => {
    create.mockRejectedValue(new Error('window-create-failed'));

    await expect(openBookmarkWindow('https://example.com/')).rejects.toThrow(
      'window-create-failed',
    );
  });
});
