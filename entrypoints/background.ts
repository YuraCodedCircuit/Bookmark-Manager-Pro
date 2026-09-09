import '../src/platform/validation/configure-runtime-validation';

import browser from 'webextension-polyfill';
import { defineBackground } from 'wxt/utils/define-background';

import { createBackgroundPreflight } from '../src/application/preflight/create-background-preflight';
import { createUpdateAnnouncementManager } from '../src/application/update-announcement/create-update-announcement-manager';
import {
  BACKGROUND_PROTOCOL_VERSION,
  backgroundRequestSchema,
  type BackgroundResponse,
} from '../src/messaging/background-protocol';
import {
  ensureSaveUrlContextMenu,
  SAVE_CURRENT_URL_MENU_ID,
} from '../src/platform/browser/save-url-context-menu';

const background: ReturnType<typeof defineBackground> = defineBackground(() => {
  const preflight = createBackgroundPreflight();
  const updateAnnouncements = createUpdateAnnouncementManager();
  let activePreflight: Promise<unknown> | undefined;
  let activeMenuRegistration: Promise<void> | undefined;

  const runPreflight = () => {
    activePreflight ??= preflight.execute().finally(() => {
      activePreflight = undefined;
    });
    return activePreflight;
  };

  const registerSaveUrlContextMenu = () => {
    activeMenuRegistration ??= ensureSaveUrlContextMenu().finally(() => {
      activeMenuRegistration = undefined;
    });
    return activeMenuRegistration;
  };

  const registerSaveUrlContextMenuSafely = () => {
    void registerSaveUrlContextMenu().catch((error: unknown) =>
      console.error('save-url-context-menu-registration-failed', error),
    );
  };

  // Register every listener synchronously before starting asynchronous work.
  browser.runtime.onInstalled.addListener((details) => {
    registerSaveUrlContextMenuSafely();
    void runPreflight();
    if (details.reason === 'update' && details.previousVersion) {
      void updateAnnouncements
        .recordUpgrade(
          details.previousVersion,
          browser.runtime.getManifest().version,
        )
        .catch(() => console.error('update-announcement-record-failed'));
    }
  });
  browser.runtime.onStartup.addListener(() => {
    registerSaveUrlContextMenuSafely();
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
    if (info.menuItemId !== SAVE_CURRENT_URL_MENU_ID) return;
    void browser.action.openPopup().catch(async () => {
      await browser.windows.create({
        height: 760,
        type: 'popup',
        url: browser.runtime.getURL('/popup.html'),
        width: 680,
      });
    });
  });

  registerSaveUrlContextMenuSafely();
  void runPreflight();
});

export default background;
