import '../src/platform/validation/configure-runtime-validation';

import browser from 'webextension-polyfill';
import { browserActivitySession } from '../src/platform/storage/browser-activity-session';
import { createActivityLogService } from '../src/application/activity-log/create-activity-log-service';
import { i18n } from '../src/localization/i18n';
import {
  createFolderTabHandler,
  removeFolderTab,
} from '../src/platform/browser/folder-tabs';
import {
  folderTabRequestSchema,
  type FolderTabResponse,
} from '../src/messaging/folder-tab-protocol';
import { folderTabDestinationExists } from '../src/storage/dexie-folder-tab-destination';
import { registerSynchronizationBackground } from '../src/platform/browser/sync-background';
import {
  syncRequestSchema,
  type SyncResponse,
} from '../src/messaging/sync-protocol';
import { defineBackground } from 'wxt/utils/define-background';

import { createBackgroundPreflight } from '../src/application/preflight/create-background-preflight';
import { createUpdateAnnouncementManager } from '../src/application/update-announcement/create-update-announcement-manager';
import {
  BACKGROUND_PROTOCOL_VERSION,
  activitySessionRequestSchema,
  backgroundRequestSchema,
  type BackgroundResponse,
  type BackgroundPreflightSnapshot,
} from '../src/messaging/background-protocol';
import {
  ensureSaveUrlContextMenu,
  SAVE_CURRENT_URL_MENU_ID,
} from '../src/platform/browser/save-url-context-menu';
import { ToolbarSavedStatusController } from '../src/platform/browser/toolbar-saved-status';

const background: ReturnType<typeof defineBackground> = defineBackground(() => {
  const preflight = createBackgroundPreflight();
  const updateAnnouncements = createUpdateAnnouncementManager();
  const toolbarSavedStatus = new ToolbarSavedStatusController();
  const folderTabs = createFolderTabHandler({
    pageUrl: browser.runtime.getURL('/newtab.html'),
    pendingPageUrl: browser.runtime.getURL('/folder-tab-pending.html'),
    extensionId: browser.runtime.id,
    read: async (key) => (await browser.storage.session.get(key))[key],
    keys: async () => Object.keys(await browser.storage.session.get(null)),
    write: (key, value) => browser.storage.session.set({ [key]: value }),
    remove: (key) => browser.storage.session.remove(key),
    exists: folderTabDestinationExists,
    create: async () => {
      const tab = await browser.tabs.create({
        active: false,
        url: browser.runtime.getURL('/folder-tab-pending.html'),
      });
      if (tab.id === undefined) throw new Error('folder-tab-id-unavailable');
      return tab.id;
    },
    activate: async (tabId) => {
      await browser.tabs.update(tabId, { active: true });
    },
  });
  let activePreflight: Promise<BackgroundPreflightSnapshot> | undefined;
  let activeMenuRegistration: Promise<void> | undefined;

  const runPreflight = (update = false) => {
    activePreflight ??= preflight.execute(update).finally(() => {
      activePreflight = undefined;
    });
    return activePreflight;
  };

  // Listener registration remains synchronous; synchronization starts only
  // after real preflight checks, independently of their best-effort logging.
  const syncCommand = registerSynchronizationBackground(() => runPreflight());

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

  const refreshToolbarStatusSafely = (tabId?: number, url?: string) => {
    const refresh =
      tabId === undefined
        ? toolbarSavedStatus.refreshActiveTabs()
        : toolbarSavedStatus.refreshTab(tabId, url);
    void refresh.catch(() =>
      console.error('toolbar-saved-status-refresh-failed'),
    );
  };

  // Register every listener synchronously before starting asynchronous work.
  browser.tabs.onRemoved.addListener((tabId) => {
    void removeFolderTab(tabId).catch(() =>
      console.error('folder-tab-cleanup-failed'),
    );
  });
  browser.runtime.onInstalled.addListener((details) => {
    registerSaveUrlContextMenuSafely();
    void browserActivitySession(
      details.reason === 'update' ? 'update' : undefined,
    )
      .then(async () => {
        await browser.storage.session.remove('backgroundPreflightSnapshotV1');
        await runPreflight(details.reason === 'update');
        if (details.reason === 'update')
          await createActivityLogService({ background: true }).record(null, {
            action: 'Update',
            category: 'Application',
            dataChanged: true,
            durationMs: 0,
            eventCode: 'APPLICATION-UPDATE-COMPLETE',
            itemType: 'Application',
            itemsAffected: 1,
            kind: 'ACTIVITY',
            level: 'INFO',
            message: i18n.t('activityRebuild.background.updateCompleted'),
            outcome: 'Succeeded',
            source: 'Background service',
          });
      })
      .catch(() => console.error('activity-update-session-failed'));
    refreshToolbarStatusSafely();
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
    void browserActivitySession('startup')
      .then(async () => {
        await browser.storage.session.remove('backgroundPreflightSnapshotV1');
        await runPreflight();
      })
      .catch(() => console.error('activity-startup-session-failed'));
    refreshToolbarStatusSafely();
  });
  browser.runtime.onMessage.addListener(
    async (
      message: unknown,
      sender: browser.Runtime.MessageSender,
    ): Promise<
      | BackgroundResponse
      | SyncResponse
      | FolderTabResponse
      | Awaited<ReturnType<typeof browserActivitySession>>
    > => {
      if (
        sender.id === browser.runtime.id &&
        activitySessionRequestSchema.safeParse(message).success
      )
        return browserActivitySession();
      if (folderTabRequestSchema.safeParse(message).success)
        return folderTabs(message, sender);
      if (
        sender.id === browser.runtime.id &&
        syncRequestSchema.safeParse(message).success
      )
        return syncCommand(message);
      const request = backgroundRequestSchema.safeParse(message);
      if (!request.success) {
        return {
          protocolVersion: BACKGROUND_PROTOCOL_VERSION,
          type: 'request.invalid',
          errorCode: 'INVALID_REQUEST',
        };
      }

      if (request.data.type === 'toolbar-saved-status.refresh') {
        refreshToolbarStatusSafely();
        return {
          protocolVersion: BACKGROUND_PROTOCOL_VERSION,
          type: 'toolbar-saved-status.accepted',
        };
      }

      try {
        const snapshot = await runPreflight();
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
  browser.tabs.onActivated.addListener(({ tabId }) => {
    refreshToolbarStatusSafely(tabId);
  });
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url || changeInfo.status === 'complete')
      refreshToolbarStatusSafely(tabId, changeInfo.url);
  });
  browser.windows.onFocusChanged.addListener(() => {
    refreshToolbarStatusSafely();
  });
  browser.permissions.onAdded.addListener((permissions) => {
    if (permissions.permissions?.includes('tabs')) refreshToolbarStatusSafely();
  });
  browser.permissions.onRemoved.addListener((permissions) => {
    if (permissions.permissions?.includes('tabs')) refreshToolbarStatusSafely();
  });

  registerSaveUrlContextMenuSafely();
  // Startup/install listeners own their preflight; the first surface request
  // supplies recovery detection if startup was missed while unavailable.
  refreshToolbarStatusSafely();
});

export default background;
