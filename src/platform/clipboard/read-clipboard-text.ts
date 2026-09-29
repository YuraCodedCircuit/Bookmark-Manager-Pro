import browser from 'webextension-polyfill';
import type { Permissions } from 'webextension-polyfill/namespaces/permissions';

const clipboardReadPermission: Permissions.Permissions = {
  permissions: ['clipboardRead'],
};

const waitForBrowserPromptToClose = () =>
  new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

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
  const alreadyGranted = await browser.permissions.contains(
    clipboardReadPermission,
  );
  if (!alreadyGranted) {
    const granted = await browser.permissions.request(clipboardReadPermission);
    if (!granted) throw new ClipboardReadPermissionDeniedError();

    // Chromium can resolve the permission request before its browser-chrome
    // prompt has fully returned focus to the extension document.
    await waitForBrowserPromptToClose();
  }

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
