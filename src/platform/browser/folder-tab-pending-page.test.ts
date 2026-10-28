import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';

const { sendMessage } = vi.hoisted(() => ({ sendMessage: vi.fn() }));
vi.mock('webextension-polyfill', () => ({
  default: { runtime: { sendMessage } },
}));

beforeEach(() => {
  vi.resetModules();
  sendMessage.mockReset();
  document.body.innerHTML = '<main id="status"></main>';
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('folder-tab temporary page', () => {
  it.each([
    { status: 'failed', errorCode: 'UNAVAILABLE' },
    { status: 'failed', errorCode: 'MISSING_DESTINATION' },
    { status: 'untrusted-result' },
  ])(
    'shows a localized error and keyboard-focused Retry for failed readiness',
    async (response) => {
      sendMessage.mockResolvedValue(response);
      await import('../../../entrypoints/folder-tab-pending/main');
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A folder could not be opened.',
      );
      expect(screen.getByRole('button', { name: 'Retry' })).toHaveFocus();
      expect(sendMessage).toHaveBeenCalledWith({
        protocolVersion: 1,
        type: 'folder-tab.ready',
      });
      expect(console.error).toHaveBeenCalledWith('folder-tab-readiness-failed');
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(
        await screen.findByRole('button', { name: 'Retry' }),
      ).toBeDisabled();
    },
  );

  it('bounds early-readiness retries and never creates another tab', async () => {
    vi.useFakeTimers();
    sendMessage.mockResolvedValue({ status: 'waiting' });
    await import('../../../entrypoints/folder-tab-pending/main');
    await vi.runAllTimersAsync();
    expect(sendMessage).toHaveBeenCalledTimes(50);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A folder could not be opened.',
    );
    expect(screen.getByRole('button', { name: 'Retry' })).toHaveFocus();
  });
});
