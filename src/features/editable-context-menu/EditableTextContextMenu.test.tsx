import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { writeClipboardText } from '../../platform/clipboard/write-clipboard-text';
import {
  ClipboardReadPermissionDeniedError,
  requestAndReadClipboardText,
} from '../../platform/clipboard/read-clipboard-text';
import { EditableTextContextMenu } from './EditableTextContextMenu';
import { getEditableTextControl } from './editable-text-control';

const clipboardReadMock = vi.hoisted(() => {
  class PermissionDeniedError extends Error {}
  Object.defineProperty(PermissionDeniedError.prototype, 'name', {
    value: 'ClipboardReadPermissionDeniedError',
  });
  return {
    PermissionDeniedError,
    requestAndReadClipboardText: vi.fn(),
  };
});

vi.mock('../../platform/clipboard/write-clipboard-text', () => ({
  writeClipboardText: vi.fn(),
}));

vi.mock('../../platform/clipboard/read-clipboard-text', () => ({
  ClipboardReadPermissionDeniedError: clipboardReadMock.PermissionDeniedError,
  requestAndReadClipboardText: clipboardReadMock.requestAndReadClipboardText,
}));

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.clearAllMocks();
});

function renderMenu(
  target: HTMLInputElement | HTMLTextAreaElement,
  selectionStart: number,
  selectionEnd: number,
) {
  const onClose = vi.fn();
  const onOperationFailed = vi.fn();
  const onPastePermissionDenied = vi.fn();
  render(
    <EditableTextContextMenu
      onClose={onClose}
      onOperationFailed={onOperationFailed}
      onPastePermissionDenied={onPastePermissionDenied}
      request={{ selectionEnd, selectionStart, target, x: 20, y: 30 }}
    />,
  );
  return { onClose, onOperationFailed, onPastePermissionDenied };
}

describe('EditableTextContextMenu', () => {
  it('disables selection commands when there is no selected text', () => {
    const input = document.createElement('input');
    input.value = 'Example';
    document.body.append(input);
    renderMenu(input, 3, 3);

    expect(screen.getByRole('menuitem', { name: /^Cut/ })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: /^Copy/ })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: /^Paste/ })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: /^Select all/ })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Clear' })).toBeEnabled();
  });

  it('copies and cuts only the captured selection', async () => {
    const user = userEvent.setup();
    const input = document.createElement('input');
    input.value = 'Hello world';
    document.body.append(input);
    vi.mocked(writeClipboardText).mockResolvedValue(undefined);
    renderMenu(input, 0, 5);

    await user.click(screen.getByRole('menuitem', { name: /^Cut/ }));

    expect(writeClipboardText).toHaveBeenCalledWith('Hello');
    expect(input).toHaveValue(' world');
  });

  it('pastes at the captured selection after browser permission succeeds', async () => {
    const user = userEvent.setup();
    const input = document.createElement('input');
    input.value = 'Hello world';
    document.body.append(input);
    vi.mocked(requestAndReadClipboardText).mockResolvedValue('Bookmark');
    renderMenu(input, 6, 11);

    await user.click(screen.getByRole('menuitem', { name: /^Paste/ }));

    expect(requestAndReadClipboardText).toHaveBeenCalledOnce();
    expect(input).toHaveValue('Hello Bookmark');
  });

  it('preserves text and reports browser permission denial', async () => {
    const user = userEvent.setup();
    const input = document.createElement('input');
    input.value = 'Keep this';
    document.body.append(input);
    vi.mocked(requestAndReadClipboardText).mockRejectedValue(
      new ClipboardReadPermissionDeniedError(),
    );
    const { onOperationFailed, onPastePermissionDenied } = renderMenu(
      input,
      0,
      4,
    );

    await user.click(screen.getByRole('menuitem', { name: /^Paste/ }));

    expect(input).toHaveValue('Keep this');
    expect(onPastePermissionDenied).toHaveBeenCalledOnce();
    expect(onOperationFailed).not.toHaveBeenCalled();
  });

  it('selects all, clears the complete value, and restores focus', async () => {
    const user = userEvent.setup();
    const textarea = document.createElement('textarea');
    textarea.value = 'Notes';
    document.body.append(textarea);
    const { onClose } = renderMenu(textarea, 2, 2);

    await user.click(screen.getByRole('menuitem', { name: /^Select all/ }));

    expect(textarea.selectionStart).toBe(0);
    expect(textarea.selectionEnd).toBe(5);
    expect(onClose).toHaveBeenCalledOnce();

    cleanup();
    renderMenu(textarea, 0, 5);
    await user.click(screen.getByRole('menuitem', { name: 'Clear' }));
    expect(textarea).toHaveValue('');
  });

  it('does not intercept native Ctrl+V and excludes unsafe controls', () => {
    const input = document.createElement('input');
    input.value = 'Native paste';
    document.body.append(input);
    renderMenu(input, 0, 0);
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: 'v',
    });

    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(requestAndReadClipboardText).not.toHaveBeenCalled();

    const password = document.createElement('input');
    password.type = 'password';
    const readOnly = document.createElement('textarea');
    readOnly.readOnly = true;
    expect(getEditableTextControl(password)).toBeNull();
    expect(getEditableTextControl(readOnly)).toBeNull();
    expect(getEditableTextControl(input)).toBe(input);
  });

  it('closes with Escape and restores focus to the edited field', () => {
    const input = document.createElement('input');
    input.value = 'Example';
    document.body.append(input);
    const { onClose } = renderMenu(input, 0, 0);

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
