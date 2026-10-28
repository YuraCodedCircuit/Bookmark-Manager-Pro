import { expect, test, type Page } from '@playwright/test';
import {
  encodeNativeExport,
  type ExportPayload,
} from '../../src/domain/profile-export';

function payload(): ExportPayload {
  return {
    format: 'bookmark-manager-pro',
    version: 1,
    createdAt: 1,
    categories: ['bookmarks'],
    restoreSynchronization: 'paused',
    backups: [],
    profiles: Array.from({ length: 40 }, (_, index) => ({
      formatVersion: 3,
      databaseSchemaVersion: 32,
      applicationVersion: '0.6.2',
      profile: {
        id: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
        username: `Synthetic profile ${index}`,
        createdAt: 1,
        updatedAt: 1,
      },
      bookmarks: [],
      folders: [],
      favorites: [],
      folderWallpapers: [],
    })),
  };
}
async function openImport(page: Page, username = 'Synthetic local profile') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Username', exact: true })
    .fill(username);
  await page
    .getByRole('button', { name: 'Create profile', exact: true })
    .click();
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const notices = page.getByRole('button', { name: 'Dismiss notification' });
  if (await notices.count()) await notices.first().click();
  return page.getByRole('dialog', { name: 'Import', exact: true });
}

test('HTML preserves folders without extra controls and never loads imported resources', async ({
  page,
}) => {
  const dialog = await openImport(page);
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('import.invalid')) requests.push(request.url());
  });
  await dialog.getByLabel('Choose file', { exact: true }).setInputFiles({
    name: `${'synthetic-long-filename-'.repeat(8)}.html`,
    mimeType: 'text/html',
    buffer: Buffer.from(`<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE><H1>Bookmarks</H1>
<DL><p><DT><H3 ADD_DATE="1789029930" LAST_MODIFIED="1790526005" PERSONAL_TOOLBAR_FOLDER="true">Home</H3><DL><p>
<DT><A HREF="https://import.invalid/bookmark" ADD_DATE="1790526005" ICON="https://import.invalid/icon.png">Synthetic bookmark</A>
</DL><p></DL><p>`),
  });
  await expect(
    dialog.getByRole('button', { name: 'Choose contents-only folders' }),
  ).toHaveCount(0);
  const filename = dialog.locator('.import-dialog__filename');
  await expect(filename).toHaveAttribute(
    'title',
    `${'synthetic-long-filename-'.repeat(8)}.html`,
  );
  await expect
    .poll(async () => await filename.textContent())
    .toMatch(/^synthetic.*….*\.html$/);
  await expect(filename).toHaveCSS('white-space', 'nowrap');
  await dialog
    .getByRole('button', { name: 'Review items', exact: true })
    .click();
  const review = page.getByRole('dialog', {
    name: 'Review imported items',
    exact: true,
  });
  await expect(
    review.getByRole('checkbox', { name: 'Home', exact: true }),
  ).toBeChecked();
  await review
    .getByRole('button', { name: 'Collapse Home', exact: true })
    .click();
  await expect(
    review.getByRole('checkbox', { name: 'Synthetic bookmark' }),
  ).toHaveCount(0);
  await review
    .getByRole('button', { name: 'Expand Home', exact: true })
    .click();
  await expect(
    review.getByRole('checkbox', { name: 'Synthetic bookmark' }),
  ).toBeChecked();
  await page.setViewportSize({ width: 360, height: 640 });
  await expect
    .poll(() =>
      review.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeLessThan(360);
  expect(
    await dialog
      .locator('.export-dialog__body')
      .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBe(true);
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(
    review.getByRole('checkbox', { name: 'Home', exact: true }),
  ).toBeChecked();
  await page.emulateMedia({ forcedColors: 'none' });
  await page.keyboard.press('Escape');
  await expect(
    dialog.getByRole('button', { name: 'Import', exact: true }),
  ).toBeEnabled();
  expect(requests).toEqual([]);
});

test('Import preferences persist and automatically open flat CSV item review', async ({
  page,
}) => {
  let dialog = await openImport(page);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  let settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings
    .getByRole('navigation', { name: 'Settings categories' })
    .getByRole('button', { name: 'Import', exact: true })
    .click();
  const related = settings.getByRole('group', {
    name: 'Related settings',
    exact: true,
  });
  const relatedBookmarks = related.getByRole('button', {
    name: 'Bookmarks',
    exact: true,
  });
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.mouse.move(0, 0);
    await expect(relatedBookmarks).toHaveCSS('border-radius', '8px');
    await expect(relatedBookmarks).toHaveCSS('background-image', 'none');
    await relatedBookmarks.hover();
    await expect(relatedBookmarks).not.toHaveCSS('background-image', 'none');
    await relatedBookmarks.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(relatedBookmarks).toBeFocused();
    await expect(relatedBookmarks).toHaveCSS('outline-style', 'solid');
  }
  await page.setViewportSize({ width: 360, height: 640 });
  await expect
    .poll(() =>
      settings.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeLessThan(360);
  expect(
    await settings.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await relatedBookmarks.click();
  await expect(
    settings.getByRole('heading', { name: 'Bookmarks', exact: true }),
  ).toBeVisible();
  await settings
    .getByRole('navigation', { name: 'Settings categories' })
    .getByRole('button', { name: 'Import', exact: true })
    .click();
  for (const name of [
    'Automatically open item review',
    'Remember destination folder',
    'Close Import after success',
  ])
    await expect(
      settings.getByRole('checkbox', { name, exact: true }),
    ).not.toBeChecked();
  await settings
    .getByRole('checkbox', {
      name: 'Automatically open item review',
      exact: true,
    })
    .check();
  await page.screenshot({
    path: 'codex-internal/verification/import-settings-implemented.png',
    animations: 'disabled',
  });
  await settings.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(settings).not.toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings
    .getByRole('navigation', { name: 'Settings categories' })
    .getByRole('button', { name: 'Import', exact: true })
    .click();
  await expect(
    settings.getByRole('checkbox', {
      name: 'Automatically open item review',
      exact: true,
    }),
  ).toBeChecked();
  await settings.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Import', exact: true });
  const values = [
    '11111111-1111-4111-8111-111111111111',
    'Synthetic',
    '["Home","Child"]',
    "'=SUM(1,2)",
    'https://example.com/',
    '[]',
    '',
  ];
  const source = [
    'Profile ID,Profile,Folder path,Title,URL,Tags,Note',
    values.map((value) => `"${value.replaceAll('"', '""')}"`).join(','),
  ].join('\r\n');
  await dialog.getByLabel('Choose file', { exact: true }).setInputFiles({
    name: 'bookmarks.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(source),
  });
  const review = page.getByRole('dialog', {
    name: 'Review imported items',
    exact: true,
  });
  await expect(review.getByRole('checkbox')).toHaveCount(1);
  await expect(review.getByRole('table')).toBeVisible();
  await expect(review.getByRole('columnheader').first()).toHaveCSS(
    'white-space',
    'nowrap',
  );
  await expect(review.getByRole('checkbox').first()).toHaveCSS(
    'height',
    '18px',
  );
  await expect(review.getByRole('columnheader')).toHaveText([
    'Include',
    'Profile ID',
    'Profile',
    'Folder path',
    'Title',
    'URL',
    'Tags',
    'Note',
  ]);
  expect(
    await review.evaluate((element) => element.getBoundingClientRect().width),
  ).toBeGreaterThan(700);
  await expect(review.getByRole('link')).toHaveCount(0);
  await review.getByRole('searchbox').fill('https://example.com/');
  await expect(review.getByRole('checkbox')).toHaveCount(1);
  await review.getByRole('searchbox').fill('');
  await page.screenshot({
    path: 'codex-internal/verification/import-csv-review.png',
    animations: 'disabled',
  });
  await expect(
    review.getByRole('checkbox', { name: "'=SUM(1,2)", exact: true }),
  ).toBeChecked();
  await expect(review.getByRole('status')).toHaveText('1 bookmark · 0 folders');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise((resolve) => {
            const request = indexedDB.open('bookmark-manager-pro');
            request.onerror = () => resolve(null);
            request.onsuccess = () => {
              const database = request.result;
              const records = database
                .transaction('activity')
                .objectStore('activity')
                .getAll();
              records.onerror = () => {
                database.close();
                resolve(null);
              };
              records.onsuccess = () => {
                const event = records.result.find(
                  (record) => record.eventCode === 'IMPORT-VALIDATION-CSV-FLAT',
                );
                database.close();
                resolve({
                  eventPresent: event !== undefined,
                  containsContent:
                    JSON.stringify(records.result).includes('=SUM') ||
                    JSON.stringify(records.result).includes(
                      'https://example.com/',
                    ),
                });
              };
            };
          }),
      ),
    )
    .toEqual({ eventPresent: false, containsContent: false });
  await page.keyboard.press('Escape');
  await expect(
    dialog.getByRole('button', { name: 'Review items', exact: true }),
  ).toBeFocused();
  await expect(
    dialog.getByRole('button', { name: 'Import', exact: true }),
  ).toBeEnabled();
});

test('native worker validates profiles with scoped selection, focus restoration, and responsive scrolling', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const dialog = await openImport(page);
  await dialog.getByLabel('Choose file', { exact: true }).setInputFiles({
    name: 'synthetic.bmpro',
    mimeType: 'application/json',
    buffer: Buffer.from(await encodeNativeExport(payload())),
  });
  await expect(
    dialog.getByRole('status', { name: 'File validation status' }),
  ).toHaveText('File verified. Review the profiles below.');
  const picker = dialog.getByRole('button', {
    name: 'Select profiles to import',
    exact: true,
  });
  const cards = await dialog.evaluate((element) =>
    [
      element.querySelector('.import-dialog__file-card'),
      element.querySelector('.export-dialog__profile-button'),
      element.querySelector('.import-dialog__summary'),
    ].map((node) => ({
      color: getComputedStyle(node!).backgroundColor,
      height: node!.getBoundingClientRect().height,
    })),
  );
  const dialogColor = await dialog.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(cards.every((card) => card.color === dialogColor)).toBe(true);
  expect(Math.abs(cards[1]!.height - cards[2]!.height)).toBeLessThanOrEqual(1);
  await dialog
    .getByLabel('Choose file', { exact: true })
    .dispatchEvent('cancel', { bubbles: true, cancelable: true });
  await expect(dialog).toBeVisible();
  await picker.click();
  const child = page.getByRole('dialog', {
    name: 'Select profiles to import',
    exact: true,
  });
  await expect(child.getByRole('checkbox')).toHaveCount(40);
  const initialSelectionHeight = await child.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  await child.getByRole('searchbox').fill('no matching source');
  const sourceEmpty = child.getByText('No matching profiles', { exact: true });
  await expect(sourceEmpty).toBeVisible();
  const sourceGap =
    (await sourceEmpty.boundingBox())!.y -
    ((await child.getByRole('searchbox').boundingBox())!.y +
      (await child.getByRole('searchbox').boundingBox())!.height);
  expect(sourceGap).toBeGreaterThanOrEqual(0);
  expect(sourceGap).toBeLessThan(40);
  await child.getByRole('searchbox').fill('');
  const profileFilter = child.getByRole('searchbox');
  await profileFilter.fill('profile');
  await expect(child.getByRole('button', { name: 'Clear input' })).toHaveCount(
    1,
  );
  await page.screenshot({
    path: 'codex-internal/verification/import-profile-filter.png',
    animations: 'disabled',
  });
  await child.getByRole('button', { name: 'Clear input' }).click();
  await expect(profileFilter).toHaveValue('');
  await expect(profileFilter).toBeFocused();
  const hoveredProfile = child.locator('.export-profile-picker__row').first();
  await hoveredProfile.hover();
  await expect(hoveredProfile).not.toHaveCSS('background-image', 'none');
  const filterBox = await child.getByRole('searchbox').boundingBox();
  const rowBox = await child
    .locator('.export-profile-picker__row')
    .first()
    .boundingBox();
  expect(Math.abs(filterBox!.x - rowBox!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(filterBox!.width - rowBox!.width)).toBeLessThanOrEqual(1);
  const profileList = child.locator('.export-profile-picker__list');
  const firstRow = await child
    .locator('.export-profile-picker__row')
    .nth(0)
    .boundingBox();
  const secondRow = await child
    .locator('.export-profile-picker__row')
    .nth(1)
    .boundingBox();
  await page.mouse.move(
    firstRow!.x + firstRow!.width / 2,
    (firstRow!.y + firstRow!.height + secondRow!.y) / 2,
  );
  await page.mouse.wheel(0, 300);
  await expect
    .poll(() => profileList.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await profileList.evaluate((element) => {
    element.scrollTop = 0;
  });
  expect((await profileList.boundingBox())!.y).toBeGreaterThanOrEqual(
    filterBox!.y + filterBox!.height,
  );
  await profileList.evaluate((element) => {
    element.scrollTop = 500;
  });
  expect(
    await profileList.evaluate((element) => element.scrollTop),
  ).toBeGreaterThan(0);
  expect(await child.getByRole('searchbox').boundingBox()).toEqual(filterBox);
  await profileList.evaluate((element) => {
    element.scrollTop = 0;
  });
  await child.getByRole('checkbox').first().uncheck();
  await child.getByRole('searchbox').fill('profile 3');
  await expect(child.getByRole('checkbox')).toHaveCount(11);
  await child.getByRole('button', { name: 'Uncheck all', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    child.getByRole('status', { name: 'Profile selection status' }),
  ).toHaveText('28 of 40 profiles selected');
  await child.getByRole('button', { name: 'Check all', exact: true }).click();
  await expect(
    child.getByRole('status', { name: 'Profile selection status' }),
  ).toHaveText('39 of 40 profiles selected');
  await child.getByRole('searchbox').fill('');
  await expect(child.getByRole('checkbox').first()).not.toBeChecked();
  await expect(child.getByRole('checkbox').nth(1)).toBeChecked();
  await child.getByRole('searchbox').fill('profile 39');
  expect(
    await child.evaluate((element) => element.getBoundingClientRect().height),
  ).toBe(initialSelectionHeight);
  await expect(
    child.getByRole('button', { name: 'Check all', exact: true }),
  ).toHaveCount(0);
  await expect(
    child.getByRole('button', { name: 'Uncheck all', exact: true }),
  ).toHaveCount(0);
  await expect(child.getByRole('checkbox')).toHaveCount(1);
  await expect(
    child.getByRole('status', { name: 'Profile selection status' }),
  ).toHaveText('39 of 40 profiles selected');
  await page.keyboard.press('Escape');
  await expect(child).not.toBeVisible();
  await expect(picker).toBeFocused();
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Import', exact: true }),
  ).toBeEnabled();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(dialog).toHaveCSS('background-color', 'rgb(17, 26, 37)');
  await page.screenshot({
    path: 'codex-internal/verification/import-ui-implemented-desktop.png',
  });
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    for (const width of [1100, 360]) {
      await page.setViewportSize({ width, height: 520 });
      await expect
        .poll(() =>
          dialog.evaluate((element) =>
            Math.round(element.getBoundingClientRect().width),
          ),
        )
        .toBe(Math.round(Math.min(width * 0.96, 960)));
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
      await expect
        .poll(() =>
          dialog.evaluate((element) => element.getBoundingClientRect().height),
        )
        .toBeLessThanOrEqual(520);
      const header = await dialog.locator('header').boundingBox();
      const footer = await dialog.locator('footer').boundingBox();

      expect(header!.y).toBeGreaterThanOrEqual(0);
      expect(footer!.y + footer!.height).toBeLessThanOrEqual(520);
      await dialog.locator('.export-dialog__body').evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      expect(await dialog.locator('header').boundingBox()).toEqual(header);
      expect(await dialog.locator('footer').boundingBox()).toEqual(footer);
    }
  }
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Open profile menu' }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test('encrypted native file unlocks with generic retry and clears its password', async ({
  page,
}) => {
  const dialog = await openImport(page);
  await dialog.getByLabel('Choose file', { exact: true }).setInputFiles({
    name: 'protected.bmpro',
    mimeType: 'application/json',
    buffer: Buffer.from(await encodeNativeExport(payload(), 'Aa1!')),
  });
  await dialog
    .getByRole('button', { name: 'Unlock file', exact: true })
    .click();
  const child = page.getByRole('dialog', { name: 'Unlock file', exact: true });
  const idleHeight = (await child.boundingBox())!.height;
  await expect(child.locator('footer').getByRole('status')).toBeAttached();
  const passwordInput = child.getByLabel('Password', { exact: true });
  await passwordInput.fill('Temporary1!');
  await child
    .getByRole('button', { name: 'Show password', exact: true })
    .click();
  await expect(passwordInput).toHaveAttribute('type', 'text');
  const visibility = await child
    .getByRole('button', { name: 'Hide password', exact: true })
    .boundingBox();
  const clear = await child
    .getByRole('button', { name: 'Clear password', exact: true })
    .boundingBox();
  const inputBox = await passwordInput.boundingBox();
  expect(visibility!.x + visibility!.width).toBeLessThanOrEqual(
    inputBox!.x + inputBox!.width,
  );
  expect(clear!.x + clear!.width).toBeLessThan(visibility!.x);
  await child
    .getByRole('button', { name: 'Clear password', exact: true })
    .click();
  await expect(passwordInput).toHaveValue('');
  await expect(passwordInput).toBeFocused();
  await child
    .getByRole('button', { name: 'Hide password', exact: true })
    .click();
  await passwordInput.fill('Wrong1!');
  await page.screenshot({
    path: 'codex-internal/verification/import-unlock-implemented.png',
    animations: 'disabled',
  });
  await child.getByRole('button', { name: 'Unlock', exact: true }).click();
  await expect(child.getByRole('alert')).toHaveCount(0);
  expect(
    Math.abs((await child.boundingBox())!.height - idleHeight),
  ).toBeLessThanOrEqual(1);
  await expect(
    page.getByRole('alert').filter({
      hasText: 'The password is incorrect or the file is damaged. Try again.',
    }),
  ).toBeVisible();
  await expect(child.getByLabel('Password', { exact: true })).toHaveValue('');
  await child.getByLabel('Password', { exact: true }).fill('Aa1!');
  await child.getByRole('button', { name: 'Unlock', exact: true }).click();
  await expect(child).not.toBeVisible();
  await expect(
    dialog.getByRole('button', {
      name: 'Select profiles to import',
      exact: true,
    }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(
    page
      .getByRole('dialog', { name: 'Import', exact: true })
      .getByRole('status', { name: 'File validation status' }),
  ).toHaveText('No verified file selected.');
});

test('malformed files fail closed without exposing content', async ({
  page,
}) => {
  const dialog = await openImport(page);
  await dialog.getByLabel('Choose file', { exact: true }).setInputFiles({
    name: 'bad.bmpro',
    mimeType: 'application/json',
    buffer: Buffer.from('<script>alert("secret")</script>'),
  });
  await expect(
    dialog.getByText(
      'This file could not be verified. Choose a supported, undamaged file.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', {
      name: 'Select profiles to import',
      exact: true,
    }),
  ).toBeDisabled();
  await expect(dialog.getByText('secret')).toHaveCount(0);
});

test('empty inactive destinations show Home without activation or stored folder creation', async ({
  page,
}) => {
  const dialog = await openImport(page);
  const destinationId = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const request = indexedDB.open('bookmark-manager-pro');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('profiles', 'readwrite');
          const store = transaction.objectStore('profiles');
          const rows = store.getAll();
          const id = crypto.randomUUID();
          rows.onsuccess = () => {
            for (let index = 0; index < 24; index++)
              store.add({
                ...rows.result[0],
                id: crypto.randomUUID(),
                username: `Destination ${index}`,
              });
            store.add({ ...rows.result[0], id, username: 'Empty destination' });
          };
          transaction.oncomplete = () => {
            database.close();
            resolve(id);
          };
          transaction.onabort = () => {
            database.close();
            reject(transaction.error);
          };
        };
      }),
  );
  await dialog.getByLabel('Choose file', { exact: true }).setInputFiles({
    name: 'bookmarks.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('URL\r\nhttps://example.com/'),
  });
  const profile = dialog.getByRole('button', {
    name: 'Destination profile',
    exact: true,
  });
  await expect(profile).toBeEnabled();
  await profile.click();
  const profiles = page.getByRole('dialog', {
    name: 'Choose destination profile',
  });
  const radio = profiles.getByRole('radio', {
    name: 'Empty destination',
    exact: true,
  });
  const list = profiles.locator('.export-profile-picker__list');
  const row1 = await profiles
    .locator('.export-profile-picker__row')
    .nth(0)
    .boundingBox();
  const row2 = await profiles
    .locator('.export-profile-picker__row')
    .nth(1)
    .boundingBox();
  await page.mouse.move(
    row1!.x + row1!.width / 2,
    (row1!.y + row1!.height + row2!.y) / 2,
  );
  await page.mouse.wheel(0, 300);
  await expect
    .poll(() => list.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await list.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const listEnd = await list.boundingBox();
  const lastRow = await profiles
    .locator('.export-profile-picker__row')
    .last()
    .boundingBox();
  expect(
    listEnd!.y + listEnd!.height - lastRow!.y - lastRow!.height,
  ).toBeGreaterThanOrEqual(7);
  await radio.focus();
  await radio.press('Space');
  await profiles.getByRole('button', { name: 'Close', exact: true }).click();
  const folder = dialog.getByRole('button', {
    name: 'Destination folder',
    exact: true,
  });
  await expect(folder).toBeEnabled();
  await expect(folder).toHaveText('Home');
  await folder.click();
  const folders = page.getByRole('dialog', {
    name: 'Choose destination folder',
  });
  await expect(
    folders.getByRole('button', { name: 'Home', exact: true }),
  ).toBeVisible();
  await folders.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(folder).toBeFocused();
  await expect(
    page.getByText(
      'The destination could not be loaded. Retry or choose another destination.',
      { exact: true },
    ),
  ).toHaveCount(0);
  const stored = await page.evaluate(
    (id) =>
      new Promise<{ folders: number; active: string }>((resolve, reject) => {
        const request = indexedDB.open('bookmark-manager-pro');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(
            ['folders', 'metadata'],
            'readonly',
          );
          const count = transaction
            .objectStore('folders')
            .index('profileId')
            .count(id);
          const active = transaction
            .objectStore('metadata')
            .get('activeProfileId');
          transaction.oncomplete = () => {
            database.close();
            resolve({ folders: count.result, active: active.result.value });
          };
          transaction.onabort = () => {
            database.close();
            reject(transaction.error);
          };
        };
      }),
    destinationId,
  );
  expect(stored.folders).toBe(0);
  expect(stored.active).not.toBe(destinationId);
});

test('JSON preview reuses destination pickers and reviews hidden descendants without saving', async ({
  page,
}) => {
  const profileName = 'Synthetic profile '.repeat(4).trim();
  const dialog = await openImport(page, profileName);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('bookmark-manager-pro');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('folders', 'readwrite');
          const store = transaction.objectStore('folders');
          const rows = store.getAll();
          rows.onsuccess = () => {
            const root = rows.result.find((folder) => folder.isRoot);
            if (!root) {
              transaction.abort();
              return;
            }
            store.add({
              ...root,
              id: crypto.randomUUID(),
              parentId: root.id,
              isRoot: false,
              title: 'Existing folder',
            });
            for (let index = 0; index < 25; index++) {
              store.add({
                ...root,
                id: crypto.randomUUID(),
                parentId: root.id,
                isRoot: false,
                title:
                  index === 0
                    ? 'Long destination folder '.repeat(8)
                    : `Folder ${index}`,
              });
            }
          };
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onabort = () => {
            database.close();
            reject(transaction.error);
          };
        };
      }),
  );
  const id = (value: number) =>
    `22222222-2222-4222-8222-${String(value).padStart(12, '0')}`;
  const content = JSON.stringify({
    format: 'bookmark-manager-pro-bookmarks',
    version: 1,
    profiles: [
      {
        id: id(1),
        name: 'Synthetic source',
        folders: [
          { id: id(2), parentId: null, title: 'Source Home', index: 0 },
          { id: id(3), parentId: id(2), title: 'Imported folder', index: 0 },
          { id: id(4), parentId: id(2), title: 'Empty folder', index: 1 },
        ],
        bookmarks: [
          {
            id: id(5),
            parentId: id(3),
            title: 'Visible bookmark',
            url: 'https://example.com/visible',
            tags: [],
            note: '',
            index: 0,
          },
          {
            id: id(6),
            parentId: id(3),
            title: 'Hidden bookmark',
            url: 'https://example.com/hidden',
            tags: [],
            note: '',
            index: 1,
          },
        ],
      },
    ],
  });
  await dialog.getByLabel('Choose file', { exact: true }).setInputFiles({
    name: 'renamed.bmpro',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(content),
  });
  const profile = dialog.getByRole('button', {
    name: 'Destination profile',
    exact: true,
  });
  const folder = dialog.getByRole('button', {
    name: 'Destination folder',
    exact: true,
  });
  await expect(profile).toBeEnabled();
  await expect(folder).toBeEnabled();
  await profile.click();
  const profileChild = page.getByRole('dialog', {
    name: 'Choose destination profile',
    exact: true,
  });
  await expect(profileChild.getByRole('radio')).toHaveCount(1);
  await expect(profileChild.getByRole('radio')).toBeChecked();
  const destinationHeight = await profileChild.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  await profileChild.getByRole('searchbox').fill('no matching destination');
  await expect(profileChild.getByRole('radio')).toHaveCount(0);
  const profileEmpty = profileChild.getByText('No matching profiles', {
    exact: true,
  });
  await expect(profileEmpty).toBeVisible();
  const profileGap =
    (await profileEmpty.boundingBox())!.y -
    ((await profileChild.getByRole('searchbox').boundingBox())!.y +
      (await profileChild.getByRole('searchbox').boundingBox())!.height);
  expect(profileGap).toBeGreaterThanOrEqual(0);
  expect(profileGap).toBeLessThan(40);
  expect(
    await profileChild.evaluate(
      (element) => element.getBoundingClientRect().height,
    ),
  ).toBe(destinationHeight);
  await profileChild.getByRole('searchbox').fill('');
  await expect(profileChild.locator('footer > p')).toHaveCount(0);
  const destinationName = profileChild.locator('footer strong');
  await expect(destinationName).toHaveAttribute(
    'title',
    `Destination: ${profileName}`,
  );
  await expect(destinationName).toHaveCSS('white-space', 'nowrap');
  await expect(destinationName).toContainText('…');
  await expect(
    profileChild.getByText(
      'Choosing a destination does not switch the active profile.',
    ),
  ).toHaveCount(0);
  await profileChild
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await expect(profile).toBeFocused();
  await folder.click();
  const folderChild = page.getByRole('dialog', {
    name: 'Choose destination folder',
    exact: true,
  });
  await expect(folderChild.getByRole('tree')).toBeVisible();
  const folderHeight = await folderChild.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  await folderChild.getByRole('searchbox').focus();
  expect(
    await folderChild.getByRole('searchbox').evaluate((element) => {
      const clip = element
        .closest('.folder-tree-picker')!
        .getBoundingClientRect();
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const ring =
        parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
      return box.left - ring >= clip.left && box.right + ring <= clip.right;
    }),
  ).toBe(true);
  await folderChild.getByRole('searchbox').fill('no matching folder');
  const folderFilterBounds = (await folderChild
    .getByRole('searchbox')
    .boundingBox())!;
  const folderEmptyBounds = (await folderChild
    .getByText('No folders found', { exact: true })
    .boundingBox())!;
  const folderGap =
    folderEmptyBounds.y - folderFilterBounds.y - folderFilterBounds.height;
  expect(Math.abs(profileGap - folderGap)).toBeLessThanOrEqual(1);
  expect(
    await folderChild.evaluate(
      (element) => element.getBoundingClientRect().height,
    ),
  ).toBe(folderHeight);
  await folderChild.getByRole('searchbox').fill('');
  const filterBottom = await folderChild
    .locator('.folder-tree-filter')
    .evaluate((element) => element.getBoundingClientRect().bottom);
  const treeTop = await folderChild
    .locator('.folder-tree-scroll')
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(treeTop).toBeGreaterThanOrEqual(filterBottom);
  const folderFilterBox = await folderChild
    .getByRole('searchbox')
    .boundingBox();
  await folderChild.locator('.folder-tree-scroll').evaluate((element) => {
    element.scrollTop = 500;
  });
  expect(
    await folderChild
      .locator('.folder-tree-scroll')
      .evaluate((element) => element.scrollTop),
  ).toBeGreaterThan(0);
  expect(await folderChild.getByRole('searchbox').boundingBox()).toEqual(
    folderFilterBox,
  );
  expect(
    await folderChild.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  await expect(
    folderChild.getByRole('button', {
      name: 'Close selection dialog',
      exact: true,
    }),
  ).toBeInViewport();
  await page.screenshot({
    path: 'codex-internal/verification/import-destination-folder-implemented.png',
    animations: 'disabled',
  });
  await expect(folderChild.locator('header p')).toHaveText(
    `Folders in ${profileName}`,
  );
  await expect(folderChild.locator('header p')).toHaveAttribute(
    'title',
    `Folders in ${profileName}`,
  );
  await expect(folderChild.locator('.folder-tree__folder').first()).toHaveCSS(
    'border-top-width',
    '0px',
  );
  await expect(folderChild.locator('.folder-tree__toggle').first()).toHaveCSS(
    'border-top-width',
    '0px',
  );
  await folderChild.getByRole('searchbox').fill('Long destination folder');
  await folderChild
    .locator('.folder-tree__folder')
    .filter({ hasText: 'Long destination folder' })
    .click();
  const selectedPath = folderChild.locator(
    'footer .export-profile-picker__count',
  );
  await expect(selectedPath).toHaveCSS('white-space', 'nowrap');
  const pathSeparator = await page.evaluate(() =>
    /win/i.test(navigator.platform) ? '\\' : '/',
  );
  await expect(selectedPath).toHaveAttribute(
    'title',
    `Home ${pathSeparator} ${'Long destination folder '.repeat(8).trim()}`,
  );
  await expect(folder.locator('span[title]')).toHaveCSS(
    'white-space',
    'nowrap',
  );
  await folderChild.getByRole('searchbox').fill('Home');
  await page.keyboard.press('Escape');
  await expect(folderChild).not.toBeVisible();
  await expect(folder).toBeFocused();
  const review = dialog.getByRole('button', {
    name: 'Review items',
    exact: true,
  });
  await review.click();
  const child = page.getByRole('dialog', {
    name: 'Review imported items',
    exact: true,
  });
  await child.getByRole('searchbox').fill('Visible');
  await expect(
    child.getByRole('checkbox', { name: 'Hidden bookmark', exact: true }),
  ).toHaveCount(0);
  await child
    .getByRole('checkbox', { name: 'Imported folder', exact: true })
    .uncheck();
  await expect(
    child.getByRole('status', { name: 'Profile selection status' }),
  ).toHaveText('0 bookmarks · 1 folder');
  await child.getByRole('searchbox').fill('');
  await child.getByRole('button', { name: 'Collapse Imported folder' }).click();
  await child.getByRole('button', { name: 'Expand Imported folder' }).click();
  await expect(
    child.getByRole('checkbox', { name: 'Hidden bookmark', exact: true }),
  ).not.toBeChecked();
  await child
    .getByRole('checkbox', { name: 'Visible bookmark', exact: true })
    .check();
  await expect(
    child.getByRole('checkbox', { name: 'Imported folder', exact: true }),
  ).toHaveJSProperty('indeterminate', true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const mixed = child.getByRole('checkbox', {
    name: 'Imported folder',
    exact: true,
  });
  await expect
    .poll(() =>
      mixed.evaluate(
        (element) => getComputedStyle(element, '::before').transform,
      ),
    )
    .toBe('matrix(1, 0, 0, 1, 0, 0)');
  await expect(mixed).toHaveCSS(
    'background-color',
    await child
      .getByRole('checkbox', { name: 'Empty folder', exact: true })
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  );
  await page.screenshot({
    path: 'codex-internal/verification/import-json-review-implemented.png',
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 360, height: 640 });
  await expect
    .poll(() =>
      child.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeLessThan(360);
  expect(
    await child.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(child).not.toBeVisible();
  await expect(review).toBeFocused();
  await expect(
    dialog
      .locator('footer')
      .getByText('1 bookmark · 2 folders', { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Import', exact: true }),
  ).toBeEnabled();
  await expect(dialog.getByText('Source Home', { exact: true })).toHaveCount(0);
});

test('replacing JSON, CSV, or HTML with native data resets the preview mode', async ({
  page,
}) => {
  const dialog = await openImport(page);
  const native = Buffer.from(await encodeNativeExport(payload()));
  const sources = [
    {
      name: 'source.json',
      content: JSON.stringify({
        format: 'bookmark-manager-pro-bookmarks',
        version: 2,
        profiles: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Synthetic',
            content: [],
          },
        ],
      }),
    },
    {
      name: 'source.csv',
      content: 'Profile ID,Profile,Folder path,Title,URL,Tags,Note',
    },
    {
      name: 'source.html',
      content: '<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p></DL><p>',
    },
  ];
  for (const source of sources) {
    await dialog.getByLabel('Choose file', { exact: true }).setInputFiles({
      name: source.name,
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(source.content),
    });
    await expect(
      dialog.getByRole('button', { name: 'Destination profile', exact: true }),
    ).toBeVisible();
    await dialog.getByLabel('Choose file', { exact: true }).setInputFiles({
      name: 'profiles.bmpro',
      mimeType: 'application/octet-stream',
      buffer: native,
    });
    await expect(
      dialog.getByRole('button', {
        name: 'Select profiles to import',
        exact: true,
      }),
    ).toBeEnabled();
    await expect(
      dialog.getByRole('button', { name: 'Destination profile', exact: true }),
    ).toHaveCount(0);
    await expect(
      dialog.getByText('Native profile file', { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText(
        'Selected profiles keep their saved themes and settings.',
      ),
    ).toHaveCount(0);
  }
});
