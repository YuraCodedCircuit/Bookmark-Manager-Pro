import { afterEach, describe, expect, it, vi } from 'vitest';

import { writeClipboardText } from './write-clipboard-text';

const originalClipboard = navigator.clipboard;

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: originalClipboard,
  });
});

describe('writeClipboardText', () => {
  it('writes only the supplied value', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    await writeClipboardText('selected value');
    expect(writeText).toHaveBeenCalledWith('selected value');
  });

  it('fails explicitly when clipboard writing is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    await expect(writeClipboardText('value')).rejects.toThrow(
      'clipboard-write-unavailable',
    );
  });
});
