import browser from 'webextension-polyfill';
import { defineBackground } from 'wxt/utils/define-background';

import { createBackgroundPreflight } from '../src/application/preflight/create-background-preflight';
import {
  BACKGROUND_PROTOCOL_VERSION,
  backgroundRequestSchema,
  type BackgroundResponse,
} from '../src/messaging/background-protocol';

const background: ReturnType<typeof defineBackground> = defineBackground(() => {
  const preflight = createBackgroundPreflight();
  let activePreflight: Promise<unknown> | undefined;

  const runPreflight = () => {
    activePreflight ??= preflight.execute().finally(() => {
      activePreflight = undefined;
    });
    return activePreflight;
  };

  // Register every listener synchronously before starting asynchronous work.
  browser.runtime.onInstalled.addListener(() => {
    void browser.contextMenus
      .removeAll()
      .then(() =>
        browser.contextMenus.create({
          contexts: ['page'],
          id: 'save-current-page',
          title:
            browser.i18n.getMessage('saveCurrentPage') ||
            'Save page to Bookmark Manager Pro',
        }),
      )
      .catch(() => console.error('save-page-context-menu-create-failed'));
    void runPreflight();
  });
  browser.runtime.onStartup.addListener(() => {
    void runPreflight();
  });
  browser.runtime.onMessage.addListener(
    async (message: unknown): Promise<BackgroundResponse> => {
      const request = backgroundRequestSchema.safeParse(message);
      if (!request.success) {
        return {
          protocolVersion: BACKGROUND_PROTOCOL_VERSION,
          type: 'request.invalid',
          errorCode: 'INVALID_REQUEST',
        };
      }

      try {
        const snapshot = await preflight.execute();
        return {
          protocolVersion: BACKGROUND_PROTOCOL_VERSION,
          type: 'preflight.result',
          snapshot,
        };
      } catch {
        return {
          protocolVersion: BACKGROUND_PROTOCOL_VERSION,
          type: 'preflight.failed',
          errorCode: 'PREFLIGHT_UNEXPECTED_FAILURE',
        };
      }
    },
  );
  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId !== 'save-current-page') return;
    void browser.action.openPopup().catch(async () => {
      await browser.windows.create({
        height: 760,
        type: 'popup',
        url: browser.runtime.getURL('/popup.html'),
        width: 680,
      });
    });
  });

  void runPreflight();
});

export default background;
