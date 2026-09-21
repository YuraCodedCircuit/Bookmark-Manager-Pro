import { beforeEach, describe, expect, it, vi } from 'vitest';

const { contains, request, sendMessage } = vi.hoisted(() => ({
  contains: vi.fn(),
  request: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('webextension-polyfill', () => ({
  default: {
    permissions: { contains, remove: vi.fn(), request },
    runtime: { sendMessage },
  },
}));

import {
  refreshToolbarSavedStatus,
  requestToolbarSavedStatusPermission,
  ToolbarSavedStatusPermissionDeniedError,
} from './toolbar-saved-status-permission';

describe('toolbar saved-status permission', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests optional tab access only when it is not already granted', async () => {
    contains.mockResolvedValue(false);
    request.mockResolvedValue(true);

    await expect(requestToolbarSavedStatusPermission()).resolves.toBe(true);
    expect(request).toHaveBeenCalledWith({ permissions: ['tabs'] });

    contains.mockResolvedValue(true);
    await expect(requestToolbarSavedStatusPermission()).resolves.toBe(false);
    expect(request).toHaveBeenCalledOnce();
  });

  it('reports a denied request without enabling the preference', async () => {
    contains.mockResolvedValue(false);
    request.mockResolvedValue(false);

    await expect(requestToolbarSavedStatusPermission()).rejects.toBeInstanceOf(
      ToolbarSavedStatusPermissionDeniedError,
    );
  });

  it('sends only a privacy-safe refresh command', async () => {
    sendMessage.mockResolvedValue(undefined);

    await refreshToolbarSavedStatus();

    expect(sendMessage).toHaveBeenCalledWith({
      protocolVersion: 1,
      type: 'toolbar-saved-status.refresh',
    });
  });
});
