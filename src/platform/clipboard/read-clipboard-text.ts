import browser from 'webextension-polyfill';
import type { Permissions } from 'webextension-polyfill/namespaces/permissions';

const clipboardReadPermission: Permissions.Permissions = {
  permissions: ['clipboardRead'],
};

const readClipboardTextWithLegacyPaste = (): string => {
  const pasteTarget = document.createElement('textarea');
  pasteTarget.tabIndex = -1;
  Object.assign(pasteTarget.style, {
    height: '1px',
    left: '-10000px',
    opacity: '0',
    position: 'fixed',
    top: '0',
    width: '1px',
  });
  document.body.append(pasteTarget);

  try {
    pasteTarget.focus({ preventScroll: true });
    if (!document.execCommand('paste'))
      throw new Error('clipboard-legacy-paste-failed');
    return pasteTarget.value;
  } finally {
    pasteTarget.remove();
  }
};

export class ClipboardReadPermissionDeniedError extends Error {
  constructor() {
    super('clipboard-read-permission-denied');
    this.name = 'ClipboardReadPermissionDeniedError';
  }
}

/** Requests clipboard access and reads transient text across extension engines. */
export async function requestAndReadClipboardText(): Promise<string> {
  // This must remain the first asynchronous browser call in the Paste action.
  // Firefox rejects optional permission prompts after user activation is lost.
  const granted = await browser.permissions.request(clipboardReadPermission);
  if (!granted) throw new ClipboardReadPermissionDeniedError();

  if (navigator.clipboard?.readText) {
    try {
      return await navigator.clipboard.readText();
    } catch {
      // Firefox versions without extension-page Async Clipboard support still
      // expose the permission through the legacy paste command.
    }
  }

  return readClipboardTextWithLegacyPaste();
}
