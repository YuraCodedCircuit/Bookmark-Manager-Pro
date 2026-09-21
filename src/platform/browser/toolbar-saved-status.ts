import browser from 'webextension-polyfill';

import { safeBookmarkUrlSchema } from '../../domain/bookmark-url';
import { profileSettingsSchema } from '../../domain/profile-settings';
import { BookmarkManagerDatabase } from '../../storage/database';

interface ToolbarSavedStatusDependencies {
  action: Pick<
    typeof browser.action,
    'setBadgeBackgroundColor' | 'setBadgeText' | 'setTitle'
  >;
  database: Pick<
    BookmarkManagerDatabase,
    'bookmarks' | 'metadata' | 'profileSettings'
  >;
  getMessage(key: string, substitutions?: string | string[]): string;
  hasTabsPermission(): Promise<boolean>;
  tabs: Pick<typeof browser.tabs, 'get' | 'query'>;
}

function defaultDependencies(): ToolbarSavedStatusDependencies {
  return {
    action: browser.action,
    database: new BookmarkManagerDatabase(),
    getMessage: (key, substitutions) =>
      browser.i18n.getMessage(key, substitutions),
    hasTabsPermission: () =>
      browser.permissions.contains({ permissions: ['tabs'] }),
    tabs: browser.tabs,
  };
}

/** Computes privacy-local, profile-scoped saved status for toolbar actions. */
export class ToolbarSavedStatusController {
  constructor(
    private readonly dependencies: ToolbarSavedStatusDependencies = defaultDependencies(),
  ) {}

  async refreshActiveTabs(): Promise<void> {
    const tabs = await this.dependencies.tabs.query({ active: true });
    await Promise.all(
      tabs.flatMap((tab) =>
        tab.id === undefined ? [] : [this.refreshTab(tab.id, tab.url)],
      ),
    );
  }

  async refreshTab(tabId: number, suppliedUrl?: string): Promise<void> {
    if (!(await this.dependencies.hasTabsPermission())) {
      await this.clear(tabId);
      return;
    }

    const activeProfile =
      await this.dependencies.database.metadata.get('activeProfileId');
    if (typeof activeProfile?.value !== 'string') {
      await this.clear(tabId);
      return;
    }
    const storedSettings = await this.dependencies.database.profileSettings.get(
      activeProfile.value,
    );
    const settings = profileSettingsSchema.safeParse(storedSettings);
    if (!settings.success || !settings.data.showSavedStatusOnToolbar) {
      await this.clear(tabId);
      return;
    }

    const url = suppliedUrl ?? (await this.dependencies.tabs.get(tabId)).url;
    const canonicalUrl = safeBookmarkUrlSchema.safeParse(url);
    if (!canonicalUrl.success) {
      await this.clear(tabId);
      return;
    }
    const count = await this.dependencies.database.bookmarks
      .where('[profileId+url]')
      .equals([activeProfile.value, canonicalUrl.data])
      .count();
    if (count === 0) {
      await this.clear(tabId);
      return;
    }

    await Promise.all([
      this.dependencies.action.setBadgeBackgroundColor({
        color: '#2f7de1',
        tabId,
      }),
      this.dependencies.action.setBadgeText({ tabId, text: '✓' }),
      this.dependencies.action.setTitle({
        tabId,
        title: this.dependencies.getMessage(
          count === 1 ? 'toolbarSavedStatusOne' : 'toolbarSavedStatusMany',
          count === 1 ? undefined : [String(count)],
        ),
      }),
    ]);
  }

  private async clear(tabId: number): Promise<void> {
    await Promise.all([
      this.dependencies.action.setBadgeText({ tabId, text: '' }),
      this.dependencies.action.setTitle({
        tabId,
        title: this.dependencies.getMessage('saveCurrentUrl'),
      }),
    ]);
  }
}

export type { ToolbarSavedStatusDependencies };
