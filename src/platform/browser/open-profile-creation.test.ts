import { beforeEach, describe, expect, it, vi } from 'vitest';

const { create, getURL } = vi.hoisted(() => ({
  create: vi.fn(),
  getURL: vi.fn(() => 'moz-extension://test/newtab.html'),
}));

vi.mock('webextension-polyfill', () => ({
  default: { runtime: { getURL }, tabs: { create } },
}));

import { openProfileCreation } from './open-profile-creation';

describe('openProfileCreation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens the bundled app in an active new tab', async () => {
    create.mockResolvedValue({ id: 2 });

    await openProfileCreation();

    expect(getURL).toHaveBeenCalledWith('/newtab.html');
    expect(create).toHaveBeenCalledWith({
      active: true,
      url: 'moz-extension://test/newtab.html',
    });
  });

  it('preserves browser API failures for inline recovery', async () => {
    create.mockRejectedValue(new Error('tab-create-failed'));

    await expect(openProfileCreation()).rejects.toThrow('tab-create-failed');
  });
});
