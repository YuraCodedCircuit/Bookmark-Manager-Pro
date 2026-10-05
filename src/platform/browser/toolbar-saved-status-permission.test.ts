import { beforeEach, describe, expect, it, vi } from 'vitest';

const { request, sendMessage } = vi.hoisted(() => ({
  request: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('webextension-polyfill', () => ({
  default: {
    permissions: { remove: vi.fn(), request },
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

  it('requests optional tab access directly from the user action', async () => {
    request.mockResolvedValue(true);

    await expect(
      requestToolbarSavedStatusPermission(),
    ).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith({ permissions: ['tabs'] });
  });

  it('reports a denied request without enabling the preference', async () => {
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
