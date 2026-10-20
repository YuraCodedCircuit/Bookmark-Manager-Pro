import { expect, test, type Page } from '@playwright/test';
import {
  encodeNativeExport,
  type ExportPayload,
} from '../../src/domain/profile-export';
import {
  backupPayloadSchema,
  digestBackupPayload,
  encodeBackupPayload,
} from '../../src/domain/backup';

async function open(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Username', exact: true })
    .fill('Local destination');
  await page
    .getByRole('button', { name: 'Create profile', exact: true })
    .click();
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  return page.getByRole('dialog', { name: 'Import', exact: true });
}

async function saved(page: Page) {
  return page.evaluate(
    () =>
      new Promise<Record<string, Record<string, unknown>[]>>(
        (resolve, reject) => {
          const request = indexedDB.open('bookmark-manager-pro');
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const names = [
              'profiles',
              'bookmarks',
              'folders',
              'backupSnapshots',
              'metadata',
              'profileSettings',
            ];
            const tx = db.transaction(names, 'readonly');
            const reads = Object.fromEntries(
              names.map((name) => [name, tx.objectStore(name).getAll()]),
            );
            tx.oncomplete = () => {
              db.close();
              resolve(
                Object.fromEntries(
                  Object.entries(reads).map(([name, read]) => [
                    name,
                    read.result,
                  ]),
                ),
              );
            };
            tx.onabort = () => {
              db.close();
              reject(tx.error);
            };
          };
        },
      ),
  );
}

test('portable save uses destination defaults, confirms totals, and preserves saved data after reload', async ({
  page,
}) => {
  const dialog = await open(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('bookmark-manager-pro');
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('profileSettings', 'readwrite');
          const store = tx.objectStore('profileSettings');
          const rows = store.getAll();
          rows.onsuccess = () =>
            store.put({
              ...rows.result[0],
              rememberLastAppearance: true,
              lastBookmarkAppearance: { kind: 'color', value: '#112233' },
              lastFolderAppearance: { kind: 'color', value: '#334455' },
              defaultFolderBackgroundAppearance: {
                kind: 'color',
                value: '#556677',
              },
              defaultFolderNavigationTransparency: 27,
              cardSize: 'large',
            });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
  );
  const id = () => crypto.randomUUID();
  const root = id();
  const sources = [
    {
      name: 'source.csv',
      text: 'URL,Title,Note\r\nhttps://example.com/csv,CSV item,CSV note',
    },
    {
      name: 'source.html',
      text: '<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><DT><H3>HTML folder</H3><DL><DT><A HREF="https://example.com/html">HTML item</A></DL></DL>',
    },
    {
      name: 'source.json',
      text: JSON.stringify({
        format: 'bookmark-manager-pro-bookmarks',
        version: 1,
        profiles: [
          {
            id: id(),
            name: 'Source',
            folders: [
              { id: root, parentId: null, title: 'Source root', index: 0 },
            ],
            bookmarks: [
              {
                id: id(),
                parentId: root,
                title: 'JSON item',
                url: 'https://example.com/json',
                tags: ['tag'],
                note: 'JSON note',
                index: 0,
              },
            ],
          },
        ],
      }),
    },
  ];
  for (const [index, source] of sources.entries()) {
    await dialog.getByLabel('Choose file', { exact: true }).setInputFiles({
      name: source.name,
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(source.text),
    });
    await dialog.getByRole('button', { name: 'Import', exact: true }).click();
    const confirmation = page.getByRole('dialog', {
      name: 'Confirm import',
      exact: true,
    });
    await expect(
      confirmation.getByText(
        'A snapshot of the destination profile will be created before importing.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(confirmation).toBeVisible();
    expect((await saved(page)).bookmarks).toHaveLength(index);
    if (index === 0) {
      await page.keyboard.press('Escape');
      await expect(confirmation).not.toBeVisible();
      await expect(
        dialog.getByRole('button', { name: 'Import', exact: true }),
      ).toBeFocused();
      await dialog.getByRole('button', { name: 'Import', exact: true }).click();
    }
    await confirmation
      .getByRole('button', { name: 'Import', exact: true })
      .click();
    await expect(confirmation).not.toBeVisible();
    await expect
      .poll(async () => (await saved(page)).bookmarks!.length)
      .toBe(index + 1);
  }
  const data = await saved(page);
  expect(data.bookmarks).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        title: 'CSV item',
        note: 'CSV note',
        cardAppearance: { kind: 'color', value: '#112233' },
      }),
      expect.objectContaining({
        title: 'JSON item',
        tags: ['tag'],
        note: 'JSON note',
      }),
    ]),
  );
  expect(data.folders).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        title: 'HTML folder',
        cardSize: 'large',
        navigationTransparency: 27,
        backgroundAppearance: { kind: 'color', value: '#556677' },
        cardAppearance: { kind: 'color', value: '#334455' },
      }),
    ]),
  );
  expect(data.backupSnapshots).toHaveLength(3);
  expect(data.profiles).toHaveLength(1);
  await page.reload();
  expect((await saved(page)).bookmarks).toHaveLength(3);
});

test('native plaintext and encrypted files create new profiles without switching the active profile', async ({
  page,
}) => {
  const dialog = await open(page);
  const before = await saved(page);
  const originalId = before.profiles![0]!.id;
  const source: ExportPayload = {
    format: 'bookmark-manager-pro',
    version: 1,
    createdAt: 1,
    categories: ['bookmarks'],
    restoreSynchronization: 'paused',
    backups: [],
    profiles: [
      {
        formatVersion: 3,
        databaseSchemaVersion: 37,
        applicationVersion: '0.6.2',
        profile: {
          id: crypto.randomUUID(),
          username: 'Imported native',
          createdAt: 1,
          updatedAt: 1,
        },
        folders: [],
        bookmarks: [],
        favorites: [],
        folderWallpapers: [],
      },
    ],
  };
  for (const password of [undefined, 'Aa1!']) {
    await dialog.getByLabel('Choose file', { exact: true }).setInputFiles({
      name: 'source.bmpro',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(await encodeNativeExport(source, password)),
    });
    if (password) {
      await dialog
        .getByRole('button', { name: 'Unlock file', exact: true })
        .click();
      const unlock = page.getByRole('dialog', {
        name: 'Unlock file',
        exact: true,
      });
      await unlock.getByLabel('Password', { exact: true }).fill(password);
      await unlock.getByRole('button', { name: 'Unlock', exact: true }).click();
      await expect(unlock).not.toBeVisible();
    }
    await dialog.getByRole('button', { name: 'Import', exact: true }).click();
    const confirmation = page.getByRole('dialog', {
      name: 'Confirm import',
      exact: true,
    });
    await confirmation
      .getByRole('button', { name: 'Import', exact: true })
      .click();
    await expect(confirmation).not.toBeVisible();
  }
  const data = await saved(page);
  expect(data.profiles).toHaveLength(3);
  expect(
    data.profiles!.filter((row) => row.username === 'Imported native'),
  ).toHaveLength(2);
  expect(
    data.metadata!.find((row) => row.key === 'activeProfileId')!.value,
  ).toBe(originalId);
});

test('migrates real legacy IndexedDB snapshots before an atomic import', async ({
  page,
}) => {
  const dialog = await open(page);
  const initial = await saved(page);
  const payload = backupPayloadSchema.parse({
    formatVersion: 3,
    databaseSchemaVersion: 37,
    applicationVersion: '0.6.2',
    profile: initial.profiles![0],
    settings: initial.profileSettings![0],
    activityLogSettings: null,
    bookmarks: [],
    folders: initial.folders,
    favorites: [],
    activity: [],
    synchronization: null,
    notes: [],
    noteFolders: [],
    folderWallpapers: [],
  });
  const snapshot = {
    id: crypto.randomUUID(),
    profileId: payload.profile.id,
    profileName: payload.profile.username,
    name: 'Synthetic legacy snapshot',
    type: 'manual',
    trigger: 'manual',
    createdAt: 1,
    verifiedAt: 1,
    sizeBytes: encodeBackupPayload(payload).byteLength,
    digest: await digestBackupPayload(payload),
    payload,
  };
  await page.evaluate(
    (row) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('bookmark-manager-pro-backups', 10);
        request.onupgradeneeded = () => {
          const store = request.result.createObjectStore('snapshots', {
            keyPath: 'id',
          });
          for (const index of ['profileId', 'type', 'trigger', 'createdAt'])
            store.createIndex(index, index);
          store.createIndex('[profileId+createdAt]', [
            'profileId',
            'createdAt',
          ]);
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('snapshots', 'readwrite');
          tx.objectStore('snapshots').add(row);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
    snapshot,
  );
  await dialog.getByLabel('Choose file', { exact: true }).setInputFiles({
    name: 'source.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('URL\r\nhttps://example.com/migration'),
  });
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  const confirmation = page.getByRole('dialog', {
    name: 'Confirm import',
    exact: true,
  });
  await expect(confirmation).toBeVisible();
  expect((await saved(page)).backupSnapshots).toEqual([snapshot]);
  await confirmation
    .getByRole('button', { name: 'Import', exact: true })
    .click();
  await expect(confirmation).not.toBeVisible();
  await expect.poll(async () => (await saved(page)).bookmarks!.length).toBe(1);
  expect((await saved(page)).backupSnapshots).toHaveLength(2);
  const legacyCount = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('bookmark-manager-pro-backups');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const count = db
            .transaction('snapshots')
            .objectStore('snapshots')
            .count();
          count.onsuccess = () => {
            db.close();
            resolve(count.result);
          };
        };
      }),
  );
  expect(legacyCount).toBe(1);
});

test('Import settings disable its shared snapshot trigger and confirmation shows warning with right-aligned actions', async ({
  page,
}) => {
  const dialog = await open(page);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings
    .getByRole('navigation', { name: 'Settings categories' })
    .getByRole('button', { name: 'Import', exact: true })
    .click();
  const snapshotOption = settings.getByRole('checkbox', {
    name: 'Create a snapshot before importing',
    exact: true,
  });
  await expect(snapshotOption).toBeChecked();
  await snapshotOption.uncheck();
  await settings.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(settings).not.toBeVisible();
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await dialog.getByLabel('Choose file', { exact: true }).setInputFiles({
    name: 'duplicates.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'URL\r\nhttps://example.com/duplicate\r\nhttps://example.com/duplicate',
    ),
  });
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  const confirmation = page.getByRole('dialog', {
    name: 'Confirm import',
    exact: true,
  });
  const notice = confirmation.locator('.export-dialog__notice.is-warning');
  await expect(notice).toContainText('1 duplicate bookmark');
  await expect(notice.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  await expect(
    confirmation.getByText(
      'No snapshot will be created. Create a snapshot before importing is turned off for the destination profile.',
      { exact: true },
    ),
  ).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [1100, 360]) {
      await page.setViewportSize({ width, height: 680 });
      const actions = confirmation.locator('.import-selection-footer__actions');
      await expect(actions).toHaveCSS('justify-content', 'flex-end');
      const parent = (await actions.boundingBox())!;
      const action = (await confirmation
        .getByRole('button', { name: 'Import', exact: true })
        .boundingBox())!;
      expect(
        Math.abs(parent.x + parent.width - action.x - action.width),
      ).toBeLessThanOrEqual(1);
      expect(
        await confirmation.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
      await expect(notice).toBeVisible();
    }
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(notice).toBeVisible();
  await page.emulateMedia({ forcedColors: 'none' });
  await confirmation
    .getByRole('button', { name: 'Import', exact: true })
    .focus();
  await expect(
    confirmation.getByRole('button', { name: 'Import', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(confirmation).not.toBeVisible();
  const data = await saved(page);
  expect(data.bookmarks).toHaveLength(2);
  expect(data.backupSnapshots).toHaveLength(0);
});
