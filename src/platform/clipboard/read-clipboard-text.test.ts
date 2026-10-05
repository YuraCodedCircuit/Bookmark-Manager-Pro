import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.hoisted(() => vi.fn());

vi.mock('webextension-polyfill', () => ({
  default: { permissions: { request } },
}));

import {
  ClipboardReadPermissionDeniedError,
  requestAndReadClipboardText,
} from './read-clipboard-text';

describe('requestAndReadClipboardText', () => {
  const execCommand = vi.fn();
  const readText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText },
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });
  });

  it('requests optional clipboard access before reading text', async () => {
    request.mockResolvedValue(true);
    readText.mockResolvedValue('Clipboard text');

    await expect(requestAndReadClipboardText()).resolves.toBe('Clipboard text');
    expect(request).toHaveBeenCalledWith({ permissions: ['clipboardRead'] });
    expect(request.mock.invocationCallOrder[0]).toBeLessThan(
      readText.mock.invocationCallOrder[0]!,
    );
  });

  it('does not read the clipboard when permission is denied', async () => {
    request.mockResolvedValue(false);

    await expect(requestAndReadClipboardText()).rejects.toBeInstanceOf(
      ClipboardReadPermissionDeniedError,
    );
    expect(readText).not.toHaveBeenCalled();
  });

  it('reuses an existing grant through the idempotent permission request', async () => {
    request.mockResolvedValue(true);
    readText.mockResolvedValue('Clipboard text');

    await expect(requestAndReadClipboardText()).resolves.toBe('Clipboard text');
    expect(request).toHaveBeenCalledOnce();
  });

  it('uses the extension paste command when the Async Clipboard API is unavailable', async () => {
    request.mockResolvedValue(true);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    execCommand.mockImplementation(() => {
      const pasteTarget = document.activeElement;
      if (pasteTarget instanceof HTMLTextAreaElement)
        pasteTarget.value = 'Firefox clipboard text';
      return true;
    });

    await expect(requestAndReadClipboardText()).resolves.toBe(
      'Firefox clipboard text',
    );
    expect(execCommand).toHaveBeenCalledWith('paste');
  });

  it('falls back when the Async Clipboard read rejects after permission is granted', async () => {
    request.mockResolvedValue(true);
    readText.mockRejectedValue(new DOMException('Document is not focused'));
    execCommand.mockImplementation(() => {
      const pasteTarget = document.activeElement;
      if (pasteTarget instanceof HTMLTextAreaElement)
        pasteTarget.value = 'Edge clipboard text';
      return true;
    });

    await expect(requestAndReadClipboardText()).resolves.toBe(
      'Edge clipboard text',
    );
  });
});
