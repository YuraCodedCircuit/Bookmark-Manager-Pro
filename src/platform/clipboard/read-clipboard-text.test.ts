import { beforeEach, describe, expect, it, vi } from 'vitest';

const { contains, request } = vi.hoisted(() => ({
  contains: vi.fn(),
  request: vi.fn(),
}));

vi.mock('webextension-polyfill', () => ({
  default: { permissions: { contains, request } },
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
    contains.mockResolvedValue(false);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText },
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  it('requests optional clipboard access before reading text', async () => {
    request.mockResolvedValue(true);
    readText.mockResolvedValue('Clipboard text');

    await expect(requestAndReadClipboardText()).resolves.toBe('Clipboard text');
    expect(contains).toHaveBeenCalledWith({ permissions: ['clipboardRead'] });
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

  it('reads without requesting again when clipboard access is already granted', async () => {
    contains.mockResolvedValue(true);
    readText.mockResolvedValue('Clipboard text');

    await expect(requestAndReadClipboardText()).resolves.toBe('Clipboard text');
    expect(request).not.toHaveBeenCalled();
  });

  it('uses the extension paste command when the Async Clipboard API is unavailable', async () => {
    contains.mockResolvedValue(true);
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
    contains.mockResolvedValue(false);
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
