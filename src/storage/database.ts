import Dexie, { type EntityTable, type Table } from 'dexie';

import type { Profile } from '../domain/profile';
import type { ProfileSettings } from '../domain/profile-settings';
import type { Bookmark } from '../domain/bookmark';
import type { Folder } from '../domain/folder';
import type { FavoriteItem } from '../domain/favorite-item';
import type {
  ActivityLogEntry,
  ActivityLogSettings,
} from '../domain/activity-log';
import type { UndoHistoryRecord } from './undo-history-record';

export interface MetadataRecord {
  key: string;
  value: unknown;
}

export class BookmarkManagerDatabase extends Dexie {
  readonly profiles!: EntityTable<Profile, 'id'>;
  readonly profileSettings!: EntityTable<ProfileSettings, 'profileId'>;
  readonly metadata!: EntityTable<MetadataRecord, 'key'>;
  readonly activity!: EntityTable<ActivityLogEntry, 'id'>;
  readonly activityLogSettings!: EntityTable<ActivityLogSettings, 'profileId'>;
  readonly bookmarks!: EntityTable<Bookmark, 'id'>;
  readonly folders!: EntityTable<Folder, 'id'>;
  readonly favoriteItems!: Table<FavoriteItem, [string, string]>;
  readonly undoHistory!: EntityTable<UndoHistoryRecord, 'id'>;

  constructor(name = 'bookmark-manager-pro') {
    super(name);

    this.version(1).stores({
      profiles: 'id, username, createdAt, updatedAt',
      profileSettings: '&profileId',
      metadata: '&key',
    });
    this.version(2).stores({
      profiles: 'id, username, createdAt, updatedAt',
      profileSettings: '&profileId',
      metadata: '&key',
      activity:
        '&id, profileId, [profileId+timestamp], [profileId+level], category',
      activityLogSettings: '&profileId',
    });
    this.version(3).stores({
      profiles: 'id, username, createdAt, updatedAt',
      profileSettings: '&profileId',
      metadata: '&key',
      activity:
        '&id, profileId, [profileId+timestamp], [profileId+level], category',
      activityLogSettings: '&profileId',
      bookmarks: '&id, profileId, parentId, [profileId+parentId]',
      folders: '&id, profileId, parentId, [profileId+parentId]',
    });
    this.version(4)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            settings.bookmarkView ??= 'card';
            settings.cardSize ??= 'medium';
          });
        await transaction
          .table('bookmarks')
          .toCollection()
          .modify((bookmark) => {
            bookmark.cardAppearance = upgradeAppearance(bookmark.appearance);
            delete bookmark.appearance;
            bookmark.tags ??= [];
            bookmark.note ??= '';
            bookmark.index ??= 0;
          });
        await transaction
          .table('folders')
          .toCollection()
          .modify((folder) => {
            folder.title = folder.title ?? folder.name;
            delete folder.name;
            folder.cardAppearance = upgradeAppearance(folder.appearance);
            delete folder.appearance;
            folder.backgroundAppearance ??= { kind: 'color', value: '#0b121a' };
            folder.tags ??= [];
            folder.note ??= '';
            folder.index ??= 0;
          });
      });
    this.version(5)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
      })
      .upgrade(async (transaction) => {
        const settings = await transaction.table('profileSettings').toArray();
        const views = new Map(
          settings.map((item) => [item.profileId, item.bookmarkView ?? 'card']),
        );
        await transaction
          .table('folders')
          .toCollection()
          .modify((folder) => {
            folder.bookmarkView ??= views.get(folder.profileId) ?? 'card';
          });
      });
    this.version(6)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
      })
      .upgrade((transaction) =>
        transaction
          .table('folders')
          .toCollection()
          .modify((folder) => {
            folder.includeNavigationBackground ??= false;
            folder.navigationTransparency ??= 45;
          }),
      );
    this.version(7)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
      })
      .upgrade(async (transaction) => {
        const migrate = (appearance: { kind?: string; fit?: string }) => {
          if (appearance?.kind !== 'image') return;
          appearance.fit =
            appearance.fit === 'contain'
              ? 'fit'
              : appearance.fit === 'fill'
                ? 'stretch'
                : 'fill';
        };
        await transaction
          .table('bookmarks')
          .toCollection()
          .modify((item) => {
            migrate(item.cardAppearance);
          });
        await transaction
          .table('folders')
          .toCollection()
          .modify((item) => {
            migrate(item.cardAppearance);
            migrate(item.backgroundAppearance);
          });
      });
    this.version(8)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
      })
      .upgrade((transaction) =>
        transaction
          .table('folders')
          .toCollection()
          .modify((folder) => {
            folder.detailsTableTransparency ??= 0;
          }),
      );
    this.version(9).stores({
      profiles: 'id, username, createdAt, updatedAt',
      profileSettings: '&profileId',
      metadata: '&key',
      activity:
        '&id, profileId, [profileId+timestamp], [profileId+level], category',
      activityLogSettings: '&profileId',
      bookmarks:
        '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
      folders:
        '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
      favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
    });
    this.version(10)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            settings.profilePreferences ??= {
              appendCopyToDuplicateName: true,
              confirmProfileDeletion: true,
              defaultProfileIcon: 'built-in',
              duplicateActivityLogs: false,
              duplicateAppearance: true,
              duplicateBookmarks: true,
              duplicateFavorites: true,
              duplicateImages: true,
              duplicateSettings: true,
              maximumProfiles: null,
              reopenLastFolderOnSwitch: false,
              startupProfileMode: 'active',
            };
          }),
      );
    this.version(11)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            settings.startupLocation ??= 'home';
            settings.bookmarkOpening ??= 'current-tab';
            settings.folderOpening ??= 'single-click';
          }),
      );
    this.version(12)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            if (settings.startupLocation === 'selected') {
              settings.startupLocation = 'home';
            }
            delete settings.selectedStartupFolderId;
          }),
      );
    this.version(13)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            settings.accentColorMode ??= 'system';
            settings.cardSpacing ??= 'comfortable';
            settings.customAccentColor ??= '#88bdf2';
            settings.scrollbarBehavior ??= 'scrolling';
          }),
      );
    this.version(14)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            if (settings.customAccentColor === '#55b7ff') {
              settings.customAccentColor = '#88bdf2';
            }
          }),
      );
    this.version(15)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            settings.language = 'en-US';
            settings.dateTimeFormat ??= 'browser';
            settings.firstDayOfWeek ??= 'browser';
          }),
      );
    this.version(16)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            settings.notificationPreferences ??= {
              enabled: true,
              position: 'bottom-right',
              order: 'newest',
              stackLimit: 3,
            };
          }),
      );
    this.version(17)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            settings.bookmarkSortBy ??= 'manual';
            settings.bookmarkSortDirection ??= 'ascending';
            settings.bookmarkGroupBy ??= 'none';
          }),
      );
    this.version(18)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            settings.dragAndDropEnabled ??= true;
            settings.dropIntoFoldersEnabled ??= true;
            settings.folderDropHoverDelay ??= 600;
            settings.confirmFolderDrop ??= false;
            settings.openFolderAfterDrop ??= false;
          }),
      );
    this.version(19)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            settings.duplicateHandling ??= 'allow';
            settings.urlNormalization ??= 'ask';
            settings.faviconDisplay ??= 'available';
            settings.missingFavicon ??= 'initials';
            settings.folderIcon ??= 'initials';
            settings.rememberLastAppearance ??= false;
            settings.tagOrder ??= 'preserve';
            settings.bookmarkCopyBehavior ??= 'url';
          }),
      );
    this.version(20)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            if (settings.urlNormalization === 'none')
              settings.urlNormalization = 'ask';
          }),
      );
    this.version(21)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
      })
      .upgrade(async (transaction) => {
        const settings = await transaction.table('profileSettings').toArray();
        const defaults = new Map(
          settings.map((value) => [value.profileId, value] as const),
        );
        await transaction
          .table('folders')
          .toCollection()
          .modify((folder) => {
            const value = defaults.get(folder.profileId);
            folder.cardSize ??= value?.cardSize ?? 'medium';
            folder.cardSpacing ??= value?.cardSpacing ?? 'comfortable';
            folder.bookmarkSortBy ??= value?.bookmarkSortBy ?? 'manual';
            folder.bookmarkSortDirection ??=
              value?.bookmarkSortDirection ?? 'ascending';
            folder.bookmarkGroupBy ??= value?.bookmarkGroupBy ?? 'none';
          });
      });
    this.version(22).stores({
      profiles: 'id, username, createdAt, updatedAt',
      profileSettings: '&profileId',
      metadata: '&key',
      activity:
        '&id, profileId, [profileId+timestamp], [profileId+level], category',
      activityLogSettings: '&profileId',
      bookmarks:
        '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
      folders:
        '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
      favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
    });
    this.version(23).stores({
      profiles: 'id, username, createdAt, updatedAt',
      profileSettings: '&profileId',
      metadata: '&key',
      activity:
        '&id, profileId, [profileId+timestamp], [profileId+level], category',
      activityLogSettings: '&profileId',
      bookmarks:
        '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
      folders:
        '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
      favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
      undoHistory:
        '&id, sessionId, [sessionId+profileId], [sessionId+position], [sessionId+createdAt]',
    });
    this.version(24)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
        undoHistory:
          '&id, sessionId, [sessionId+profileId], [sessionId+position], [sessionId+createdAt]',
      })
      .upgrade((transaction) =>
        transaction
          .table('activityLogSettings')
          .toCollection()
          .modify((settings) => {
            settings.enabled ??= true;
          }),
      );
    this.version(25)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
        undoHistory:
          '&id, sessionId, [sessionId+profileId], [sessionId+position], [sessionId+createdAt]',
      })
      .upgrade((transaction) =>
        transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            settings.animationPreference ??= 'system';
            settings.confirmExternalLinks ??= false;
            settings.highContrast ??= false;
          }),
      );
    this.version(26)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
        undoHistory:
          '&id, sessionId, [sessionId+profileId], [sessionId+position], [sessionId+createdAt]',
      })
      .upgrade((transaction) =>
        transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            settings.shortcutPreferences ??= {
              bindings: {
                copy: 'Control+C',
                cut: 'Control+X',
                history: 'Control+Shift+Z',
                paste: 'Control+V',
                redo: 'Control+Y',
                search: 'Control+F',
                undo: 'Control+Z',
              },
              enabled: true,
            };
          }),
      );
    this.version(27)
      .stores({
        profiles: 'id, username, createdAt, updatedAt',
        profileSettings: '&profileId',
        metadata: '&key',
        activity:
          '&id, profileId, [profileId+timestamp], [profileId+level], category',
        activityLogSettings: '&profileId',
        bookmarks:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        folders:
          '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
        favoriteItems: '&[profileId+itemId], profileId, itemId, favoritedAt',
        undoHistory:
          '&id, sessionId, [sessionId+profileId], [sessionId+position], [sessionId+createdAt]',
      })
      .upgrade((transaction) =>
        transaction
          .table('profileSettings')
          .toCollection()
          .modify((settings) => {
            settings.notificationPreferences ??= {
              enabled: true,
              position: 'bottom-right',
              order: 'newest',
              stackLimit: 3,
            };
            settings.notificationPreferences.countdownLineColor ??= null;
          }),
      );
  }
}

/** Converts schema-3 appearance values into the structured schema-4 union. */
function upgradeAppearance(appearance: unknown): unknown {
  if (!appearance || typeof appearance !== 'object') {
    return { kind: 'color', value: '#2f7de1' };
  }
  const value = appearance as { kind?: string; value?: string };
  if (value.kind === 'gradient') {
    const colors = value.value?.match(/#[0-9a-f]{6}/gi)?.slice(0, 3) ?? [];
    const direction = Number(value.value?.match(/(\d+)deg/)?.[1] ?? 135);
    return {
      colors: [
        colors[0] ?? '#2f7de1',
        colors[1] ?? '#9250bd',
        colors[2] ?? '#20a6ba',
      ],
      direction: direction % 45 === 0 && direction <= 315 ? direction : 135,
      kind: 'gradient',
    };
  }
  if (value.kind === 'image') return { ...value, fit: 'fill' };
  return value;
}
