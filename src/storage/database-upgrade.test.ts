import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { BookmarkManagerDatabase } from './database';

const names: string[] = [];

afterEach(async () =>
  Promise.all(names.splice(0).map((name) => Dexie.delete(name))),
);

describe('BookmarkManagerDatabase schema upgrades', () => {
  it('opens schema 27 with session-namespaced undo history', async () => {
    const name = `search-preferences-schema-${crypto.randomUUID()}`;
    names.push(name);
    const database = new BookmarkManagerDatabase(name);

    await database.open();

    expect(database.verno).toBe(27);
    expect(database.undoHistory.schema.indexes.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'sessionId',
        '[sessionId+profileId]',
        '[sessionId+position]',
      ]),
    );
    database.close();
  });

  it('keeps the app foreground countdown color for schema-26 profiles', async () => {
    const name = `upgrade-notification-line-${crypto.randomUUID()}`;
    names.push(name);
    const versionTwentySix = new Dexie(name);
    versionTwentySix.version(26).stores({ profileSettings: '&profileId' });
    const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    await versionTwentySix.table('profileSettings').add({
      notificationPreferences: {
        enabled: true,
        order: 'newest',
        position: 'bottom-right',
        stackLimit: 3,
      },
      profileId,
    });
    versionTwentySix.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();

    await expect(upgraded.profileSettings.get(profileId)).resolves.toEqual(
      expect.objectContaining({
        notificationPreferences: expect.objectContaining({
          countdownLineColor: null,
        }),
      }),
    );
    upgraded.close();
  });

  it('adds enabled default app shortcuts to schema-25 profiles', async () => {
    const name = `upgrade-shortcuts-${crypto.randomUUID()}`;
    names.push(name);
    const versionTwentyFive = new Dexie(name);
    versionTwentyFive.version(25).stores({ profileSettings: '&profileId' });
    const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    await versionTwentyFive.table('profileSettings').add({ profileId });
    versionTwentyFive.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();
    await expect(upgraded.profileSettings.get(profileId)).resolves.toEqual(
      expect.objectContaining({
        shortcutPreferences: expect.objectContaining({
          enabled: true,
          bindings: expect.objectContaining({ search: 'Control+F' }),
        }),
      }),
    );
    upgraded.close();
  });

  it('adds security and accessibility defaults to schema-24 profiles', async () => {
    const name = `upgrade-accessibility-${crypto.randomUUID()}`;
    names.push(name);
    const versionTwentyFour = new Dexie(name);
    versionTwentyFour.version(24).stores({ profileSettings: '&profileId' });
    const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    await versionTwentyFour.table('profileSettings').add({ profileId });
    versionTwentyFour.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();

    await expect(upgraded.profileSettings.get(profileId)).resolves.toEqual(
      expect.objectContaining({
        animationPreference: 'system',
        confirmExternalLinks: false,
        highContrast: false,
      }),
    );
    upgraded.close();
  });

  it('enables the master log service for existing schema-23 settings', async () => {
    const name = `upgrade-log-service-${crypto.randomUUID()}`;
    names.push(name);
    const versionTwentyThree = new Dexie(name);
    versionTwentyThree.version(23).stores({
      activityLogSettings: '&profileId',
    });
    const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    await versionTwentyThree.table('activityLogSettings').add({
      activityEnabled: true,
      autoDeleteOldest: true,
      diagnosticsEnabled: true,
      includeDiagnosticsExport: false,
      maximumStorageMb: 25,
      minimumLevel: 'INFO',
      profileId,
      retentionCount: 10_000,
    });
    versionTwentyThree.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();

    await expect(upgraded.activityLogSettings.get(profileId)).resolves.toEqual(
      expect.objectContaining({ enabled: true }),
    );
    upgraded.close();
  });

  it('adds empty undo history without changing schema-22 content', async () => {
    const name = `upgrade-undo-history-${crypto.randomUUID()}`;
    names.push(name);
    const versionTwentyTwo = new Dexie(name);
    versionTwentyTwo.version(22).stores({ folders: '&id, profileId' });
    await versionTwentyTwo.table('folders').add({
      id: '11111111-1111-4111-8111-111111111111',
      profileId: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
    });
    versionTwentyTwo.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();

    await expect(upgraded.folders.count()).resolves.toBe(1);
    await expect(upgraded.undoHistory.count()).resolves.toBe(0);
    upgraded.close();
  });

  it('copies profile display defaults into existing folders for schema 21', async () => {
    const name = `upgrade-folder-display-${crypto.randomUUID()}`;
    names.push(name);
    const versionTwenty = new Dexie(name);
    versionTwenty.version(20).stores({
      folders: '&id, profileId',
      profileSettings: '&profileId',
    });
    const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    await versionTwenty.table('profileSettings').add({
      bookmarkGroupBy: 'domain',
      bookmarkSortBy: 'updatedAt',
      bookmarkSortDirection: 'descending',
      cardSize: 'large',
      cardSpacing: 'spacious',
      profileId,
    });
    await versionTwenty.table('folders').add({
      id: '11111111-1111-4111-8111-111111111111',
      profileId,
    });
    versionTwenty.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();
    await expect(
      upgraded.folders.toCollection().first(),
    ).resolves.toMatchObject({
      bookmarkGroupBy: 'domain',
      bookmarkSortBy: 'updatedAt',
      bookmarkSortDirection: 'descending',
      cardSize: 'large',
      cardSpacing: 'spacious',
    });
    upgraded.close();
  });

  it('migrates the removed protocol-less URL option to Ask', async () => {
    const name = `upgrade-url-normalization-${crypto.randomUUID()}`;
    names.push(name);
    const versionNineteen = new Dexie(name);
    versionNineteen.version(19).stores({ profileSettings: '&profileId' });
    const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    await versionNineteen.table('profileSettings').add({
      profileId,
      urlNormalization: 'none',
    });
    versionNineteen.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();
    await expect(
      upgraded.profileSettings.get(profileId),
    ).resolves.toMatchObject({ urlNormalization: 'ask' });
    upgraded.close();
  });

  it('updates the original custom accent default from schema 13', async () => {
    const name = `upgrade-accent-${crypto.randomUUID()}`;
    names.push(name);
    const versionThirteen = new Dexie(name);
    versionThirteen.version(13).stores({ profileSettings: '&profileId' });
    const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    await versionThirteen.table('profileSettings').add({
      profileId,
      customAccentColor: '#55b7ff',
      theme: 'system',
    });
    versionThirteen.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();
    await expect(
      upgraded.profileSettings.get(profileId),
    ).resolves.toMatchObject({ customAccentColor: '#88bdf2' });
    upgraded.close();
  });

  it('removes selected-folder startup settings from schema 11', async () => {
    const name = `upgrade-startup-${crypto.randomUUID()}`;
    names.push(name);
    const versionEleven = new Dexie(name);
    versionEleven.version(11).stores({
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
    const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    await versionEleven.table('profileSettings').add({
      profileId,
      selectedStartupFolderId: '11111111-1111-4111-8111-111111111111',
      startupLocation: 'selected',
      theme: 'dark',
    });
    versionEleven.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();
    const settings = await upgraded.profileSettings.get(profileId);
    expect(settings).toMatchObject({ startupLocation: 'home' });
    expect(settings).not.toHaveProperty('selectedStartupFolderId');
    upgraded.close();
  });

  it('upgrades version 1 without losing profile data', async () => {
    const name = `upgrade-${crypto.randomUUID()}`;
    names.push(name);
    const versionOne = new Dexie(name);
    versionOne.version(1).stores({
      profiles: 'id, username, createdAt, updatedAt',
      profileSettings: '&profileId',
      metadata: '&key',
    });
    await versionOne.table('profiles').add({
      id: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
      username: 'Local user',
      createdAt: 1,
      updatedAt: 1,
    });
    versionOne.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();
    await expect(upgraded.profiles.count()).resolves.toBe(1);
    expect(upgraded.tables.map(({ name: tableName }) => tableName)).toEqual(
      expect.arrayContaining([
        'activity',
        'activityLogSettings',
        'bookmarks',
        'favoriteItems',
        'folders',
        'undoHistory',
      ]),
    );
    upgraded.close();
  });

  it('upgrades schema-3 content and profile display defaults without data loss', async () => {
    const name = `upgrade-content-${crypto.randomUUID()}`;
    names.push(name);
    const versionThree = new Dexie(name);
    versionThree.version(3).stores({
      profiles: 'id, username, createdAt, updatedAt',
      profileSettings: '&profileId',
      metadata: '&key',
      activity:
        '&id, profileId, [profileId+timestamp], [profileId+level], category',
      activityLogSettings: '&profileId',
      bookmarks: '&id, profileId, parentId, [profileId+parentId]',
      folders: '&id, profileId, parentId, [profileId+parentId]',
    });
    const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    const rootId = '11111111-1111-4111-8111-111111111111';
    await versionThree
      .table('profileSettings')
      .add({ profileId, theme: 'dark' });
    await versionThree.table('folders').add({
      appearance: { kind: 'color', value: '#2f7de1' },
      createdAt: 1,
      id: rootId,
      isRoot: true,
      name: 'Home',
      parentId: null,
      profileId,
      updatedAt: 1,
    });
    await versionThree.table('bookmarks').add({
      appearance: {
        kind: 'gradient',
        value: 'linear-gradient(90deg, #112233, #445566, #778899)',
      },
      createdAt: 2,
      id: '22222222-2222-4222-8222-222222222222',
      parentId: rootId,
      profileId,
      title: 'Example',
      updatedAt: 2,
      url: 'https://example.com/',
    });
    versionThree.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();
    await expect(
      upgraded.profileSettings.get(profileId),
    ).resolves.toMatchObject({
      bookmarkView: 'card',
      bookmarkSortBy: 'manual',
      bookmarkSortDirection: 'ascending',
      bookmarkGroupBy: 'none',
      dragAndDropEnabled: true,
      dropIntoFoldersEnabled: true,
      folderDropHoverDelay: 600,
      confirmFolderDrop: false,
      openFolderAfterDrop: false,
      duplicateHandling: 'allow',
      urlNormalization: 'ask',
      faviconDisplay: 'available',
      missingFavicon: 'initials',
      folderIcon: 'initials',
      rememberLastAppearance: false,
      tagOrder: 'preserve',
      bookmarkCopyBehavior: 'url',
      bookmarkOpening: 'current-tab',
      accentColorMode: 'system',
      cardSize: 'medium',
      cardSpacing: 'comfortable',
      customAccentColor: '#88bdf2',
      dateTimeFormat: 'browser',
      firstDayOfWeek: 'browser',
      folderOpening: 'single-click',
      scrollbarBehavior: 'scrolling',
      startupLocation: 'home',
      profilePreferences: {
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
      },
    });
    await expect(upgraded.folders.get(rootId)).resolves.toMatchObject({
      bookmarkView: 'card',
      title: 'Home',
      tags: [],
      note: '',
      index: 0,
      cardAppearance: { kind: 'color', value: '#2f7de1' },
      backgroundAppearance: { kind: 'color', value: '#0b121a' },
      detailsTableTransparency: 0,
      includeNavigationBackground: false,
      navigationTransparency: 45,
    });
    await expect(
      upgraded.bookmarks.get('22222222-2222-4222-8222-222222222222'),
    ).resolves.toMatchObject({
      tags: [],
      note: '',
      index: 0,
      cardAppearance: {
        kind: 'gradient',
        direction: 90,
        colors: ['#112233', '#445566', '#778899'],
      },
    });
    upgraded.close();
  });

  it('copies the profile view into folders when upgrading schema 4', async () => {
    const name = `upgrade-folder-view-${crypto.randomUUID()}`;
    names.push(name);
    const versionFour = new Dexie(name);
    versionFour.version(4).stores({
      profileSettings: '&profileId',
      folders:
        '&id, profileId, parentId, [profileId+parentId], [profileId+parentId+index]',
    });
    const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
    await versionFour.table('profileSettings').add({
      bookmarkView: 'details',
      cardSize: 'medium',
      profileId,
      theme: 'dark',
    });
    await versionFour
      .table('folders')
      .add({ id: '11111111-1111-4111-8111-111111111111', profileId });
    versionFour.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();
    await expect(
      upgraded.folders.toCollection().first(),
    ).resolves.toMatchObject({ bookmarkView: 'details' });
    upgraded.close();
  });

  it('adds safe navigation-background defaults when upgrading schema 5', async () => {
    const name = `upgrade-navigation-background-${crypto.randomUUID()}`;
    names.push(name);
    const versionFive = new Dexie(name);
    versionFive.version(5).stores({ folders: '&id, profileId' });
    await versionFive.table('folders').add({
      id: '11111111-1111-4111-8111-111111111111',
      profileId: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
    });
    versionFive.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();
    await expect(
      upgraded.folders.toCollection().first(),
    ).resolves.toMatchObject({
      includeNavigationBackground: false,
      navigationTransparency: 45,
    });
    upgraded.close();
  });

  it('maps legacy image sizing to schema-7 fit modes', async () => {
    const name = `upgrade-image-fit-${crypto.randomUUID()}`;
    names.push(name);
    const versionSix = new Dexie(name);
    versionSix.version(6).stores({
      bookmarks: '&id, profileId',
      folders: '&id, profileId',
    });
    await versionSix.table('bookmarks').add({
      cardAppearance: { fit: 'cover', kind: 'image', value: 'bookmark' },
      id: '22222222-2222-4222-8222-222222222222',
      profileId: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
    });
    await versionSix.table('folders').add({
      backgroundAppearance: {
        fit: 'fill',
        kind: 'image',
        value: 'background',
      },
      cardAppearance: { fit: 'contain', kind: 'image', value: 'card' },
      id: '11111111-1111-4111-8111-111111111111',
      profileId: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
    });
    versionSix.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();
    await expect(
      upgraded.bookmarks.toCollection().first(),
    ).resolves.toMatchObject({ cardAppearance: { fit: 'fill' } });
    await expect(
      upgraded.folders.toCollection().first(),
    ).resolves.toMatchObject({
      backgroundAppearance: { fit: 'stretch' },
      cardAppearance: { fit: 'fit' },
    });
    upgraded.close();
  });

  it('adds an opaque Details-table default when upgrading schema 7', async () => {
    const name = `upgrade-details-transparency-${crypto.randomUUID()}`;
    names.push(name);
    const versionSeven = new Dexie(name);
    versionSeven.version(7).stores({ folders: '&id, profileId' });
    await versionSeven.table('folders').add({
      id: '11111111-1111-4111-8111-111111111111',
      profileId: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
    });
    versionSeven.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();
    await expect(
      upgraded.folders.toCollection().first(),
    ).resolves.toMatchObject({ detailsTableTransparency: 0 });
    upgraded.close();
  });

  it('adds profile-scoped favorites when upgrading schema 8', async () => {
    const name = `upgrade-favorites-${crypto.randomUUID()}`;
    names.push(name);
    const versionEight = new Dexie(name);
    versionEight.version(8).stores({ folders: '&id, profileId' });
    await versionEight.table('folders').add({
      id: '11111111-1111-4111-8111-111111111111',
      profileId: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
    });
    versionEight.close();

    const upgraded = new BookmarkManagerDatabase(name);
    await upgraded.open();
    await expect(upgraded.favoriteItems.count()).resolves.toBe(0);
    await expect(upgraded.folders.count()).resolves.toBe(1);
    upgraded.close();
  });
});
