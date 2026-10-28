import '../../src/platform/validation/configure-runtime-validation';
import browser from 'webextension-polyfill';
import { folderTabResponseSchema } from '../../src/messaging/folder-tab-protocol';

/** Retries only this page's readiness claim; never creates or redirects another tab. */
async function openBoundManager(): Promise<void> {
  try {
    for (let attempt = 0; attempt < 50; attempt++) {
      const result = folderTabResponseSchema.parse(
        await browser.runtime.sendMessage({
          protocolVersion: 1,
          type: 'folder-tab.ready',
        }),
      );
      if (result.status === 'ready') {
        window.location.replace(browser.runtime.getURL('/newtab.html'));
        return;
      }
      if (result.status !== 'waiting')
        throw new Error('folder-tab-readiness-failed');
      // Surface-owned delay, not worker state. A cold page may beat the binding write.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
    }
    throw new Error('folder-tab-readiness-expired');
  } catch {
    console.error('folder-tab-readiness-failed');
    const { i18n } = await import('../../src/localization/i18n');
    const status = document.getElementById('status');
    if (!status) return;
    const message = document.createElement('p');
    message.setAttribute('role', 'alert');
    message.textContent = i18n.t('activityLog.messages.folderOpenFailed');
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = i18n.t('notifications.retry');
    retry.addEventListener(
      'click',
      () => {
        retry.disabled = true;
        void openBoundManager();
      },
      { once: true },
    );
    status.replaceChildren(message, retry);
    retry.focus();
  }
}

void openBoundManager();
