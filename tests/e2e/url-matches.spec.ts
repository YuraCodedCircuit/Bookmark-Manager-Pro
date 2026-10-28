import { readFile } from 'node:fs/promises';
import { chromium, expect, test, type Page } from '@playwright/test';

test('Search keeps balanced stable gutters and separates regular-weight URL match members', async ({
  page,
}) => {
  const styles = await readFile('src/styles/global.css', 'utf8');
  for (const theme of ['dark', 'light']) {
    await page.setViewportSize({ width: 1100, height: 720 });
    await page.setContent(`<style>${styles}</style><main data-theme="${theme}" class="scrollbars--always">
      <dialog class="search-window" open aria-label="Search">
        <header class="search-window__header"><h1>Search</h1></header>
        <section class="search-window__controls">URL matches</section>
        <section class="search-window__results"><div class="url-matches">
          <section class="url-matches__group"><h3>https://example.com</h3><ul>
            <li><button type="button" class="url-matches__member"><strong>First bookmark</strong><span>https://example.com/a</span></button></li>
            <li><button type="button" class="url-matches__member"><strong>Second bookmark</strong><span>https://example.com/b</span></button></li>
          </ul></section>
        </div></section>
      </dialog></main>`);
    const results = page.locator('.search-window__results');
    const content = page.locator('.url-matches');
    const before = await content.boundingBox();
    expect(before).not.toBeNull();
    expect(
      await results.evaluate((el) => el.scrollHeight <= el.clientHeight),
    ).toBe(true);
    await page.locator('.url-matches__group ul').evaluate((list) => {
      const row = list.lastElementChild;
      if (row)
        for (let index = 0; index < 20; index++)
          list.append(row.cloneNode(true));
    });
    expect(
      await results.evaluate((el) => el.scrollHeight > el.clientHeight),
    ).toBe(true);
    const after = await content.boundingBox();
    expect(after?.x).toBeCloseTo(before?.x ?? 0, 1);
    expect(after?.width).toBeCloseTo(before?.width ?? 0, 1);
    const gaps = await content.evaluate((el) => {
      const contentBox = el.getBoundingClientRect();
      const parent = el.parentElement;
      if (!parent) throw new Error('missing-scroll-container');
      const scrollBox = parent.getBoundingClientRect();
      return {
        left: contentBox.left - scrollBox.left,
        right: scrollBox.right - contentBox.right,
      };
    });
    expect(gaps.left).toBeCloseTo(gaps.right, 1);
    const rows = page.locator('.url-matches__member');
    await expect(page.locator('.url-matches__group ul')).toHaveCSS(
      'list-style-type',
      'none',
    );
    const first = await rows.nth(0).boundingBox();
    const second = await rows.nth(1).boundingBox();
    expect(
      (second?.y ?? 0) - ((first?.y ?? 0) + (first?.height ?? 0)),
    ).toBeGreaterThanOrEqual(10);
    await expect(rows.first().locator('strong')).toHaveCSS(
      'font-weight',
      '400',
    );
    await rows.first().focus();
    await expect(rows.first()).toHaveCSS('outline-style', 'solid');
  }
});

async function createProfile(page: Page, url = '/') {
  await page.goto(url);
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Username', exact: true })
    .fill('Synthetic matches profile');
  await page
    .getByRole('button', { name: 'Create profile', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Open search', exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole('region', { name: 'Bookmarks', exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('bookmark-manager-pro');
      request.onerror = () => reject(new Error('test-db-open-failed'));
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(
          ['folders', 'bookmarks'],
          'readwrite',
        );
        const folders = transaction.objectStore('folders').getAll();
        folders.onsuccess = () => {
          const root = folders.result.find(
            (folder: { isRoot: boolean }) => folder.isRoot,
          ) as { id: string; profileId: string } | undefined;
          if (!root) {
            transaction.abort();
            return;
          }
          for (let index = 0; index < 3; index++)
            transaction.objectStore('bookmarks').put({
              id: crypto.randomUUID(),
              profileId: root.profileId,
              parentId: root.id,
              title: `Synthetic match ${index}`,
              url:
                index === 2
                  ? 'https://example.com/a?x=1'
                  : 'https://example.com/a',
              createdAt: 1,
              updatedAt: 1,
              index,
              tags: [],
              note: '',
              cardAppearance: { kind: 'color', value: '#123456' },
            });
        };
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onabort = () => {
          db.close();
          reject(new Error('test-db-write-failed'));
        };
        transaction.onerror = () => {
          db.close();
          reject(new Error('test-db-write-failed'));
        };
      };
    });
  });
}

test('URL match profile round trip keeps breadcrumb Home usable', async ({
  page: previewPage,
}) => {
  const extensionPath = process.env.URL_MATCHES_EXTENSION_DIR;
  const context = extensionPath
    ? await chromium.launchPersistentContext('', {
        headless: true,
        channel: 'chromium',
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
        ],
      })
    : undefined;
  try {
    const page = context ? await context.newPage() : previewPage;
    const worker = context
      ? (context.serviceWorkers()[0] ??
        (await context.waitForEvent('serviceworker')))
      : undefined;
    await createProfile(
      page,
      worker
        ? `chrome-extension://${new URL(worker.url()).host}/newtab.html`
        : '/',
    );
    await page.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('bookmark-manager-pro');
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(
            ['profiles', 'profileSettings', 'folders', 'bookmarks'],
            'readwrite',
          );
          const profiles = tx.objectStore('profiles').getAll();
          const settings = tx.objectStore('profileSettings').getAll();
          const folders = tx.objectStore('folders').getAll();
          const bookmarks = tx.objectStore('bookmarks').getAll();
          bookmarks.onsuccess = () => {
            const root = folders.result.find(
              (folder: { isRoot: boolean }) => folder.isRoot,
            );
            const second = '44444444-4444-4444-8444-444444444444';
            const secondRoot = '55555555-5555-4555-8555-555555555555';
            const firstChild = '66666666-6666-4666-8666-666666666666';
            const secondChild = '77777777-7777-4777-8777-777777777777';
            tx.objectStore('profiles').put({
              ...profiles.result[0],
              id: second,
              username: 'Second profile',
            });
            tx.objectStore('profileSettings').put({
              ...settings.result[0],
              profileId: second,
            });
            tx.objectStore('folders').put({
              ...root,
              id: secondRoot,
              profileId: second,
            });
            tx.objectStore('folders').put({
              ...root,
              id: firstChild,
              parentId: root.id,
              isRoot: false,
              title: 'First child',
            });
            tx.objectStore('folders').put({
              ...root,
              id: secondChild,
              profileId: second,
              parentId: secondRoot,
              isRoot: false,
              title: 'Second child',
            });
            tx.objectStore('bookmarks').put({
              ...bookmarks.result[0],
              id: crypto.randomUUID(),
              parentId: firstChild,
              title: 'First child match',
              url: 'https://round-trip.example/',
            });
            tx.objectStore('bookmarks').put({
              ...bookmarks.result[0],
              id: crypto.randomUUID(),
              profileId: second,
              parentId: secondChild,
              title: 'Second child match',
              url: 'https://round-trip.example/',
            });
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => {
            db.close();
            reject(new Error('seed-failed'));
          };
        };
        request.onerror = () => reject(new Error('open-failed'));
      });
    });
    for (const title of ['Second child match', 'First child match']) {
      await page
        .getByRole('button', { name: 'Open search', exact: true })
        .click();
      const search = page.getByRole('dialog', { name: 'Search', exact: true });
      await search
        .getByRole('button', { name: 'URL matches', exact: true })
        .click();
      await search
        .getByRole('button', { name: 'URL match options', exact: true })
        .click();
      await search.getByLabel('Scope').selectOption('all');
      await page.keyboard.press('Escape');
      await search
        .getByRole('button', {
          name: 'https://round-trip.example/ · 2 bookmarks',
          exact: true,
        })
        .click();
      await search
        .getByRole('listitem')
        .filter({ hasText: title })
        .getByRole('button', { name: 'Open folder', exact: true })
        .click();
      await expect(search).not.toBeVisible();
      await expect(
        page
          .getByRole('region', { name: 'Bookmarks', exact: true })
          .getByText(title, { exact: true }),
      ).toBeVisible();
    }
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(
      page
        .getByRole('region', { name: 'Bookmarks', exact: true })
        .getByText('Synthetic match 0', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Loading folder...', { exact: true }),
    ).toHaveCount(0);
  } finally {
    await context?.close();
  }
});

for (const openContainingFolder of [false, true]) {
  test(`cross-profile Get info and ${openContainingFolder ? 'folder navigation switches to the containing profile' : 'confirmed deletion retain activation and source feedback settings'}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1100, height: 900 });
    await createProfile(page);
    const sourceProfileId = '11111111-1111-4111-8111-111111111111';
    const sourceBookmarkId = '22222222-2222-4222-8222-222222222222';
    const activeBefore = await page.evaluate(
      async ({ sourceProfileId, sourceBookmarkId, sourceNotifications }) =>
        new Promise<unknown>((resolve, reject) => {
          const open = indexedDB.open('bookmark-manager-pro');
          open.onerror = () => reject(new Error('test-db-open-failed'));
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction(
              [
                'profiles',
                'profileSettings',
                'folders',
                'bookmarks',
                'metadata',
              ],
              'readwrite',
            );
            const profile = tx.objectStore('profiles').getAll();
            const settings = tx.objectStore('profileSettings').getAll();
            const folders = tx.objectStore('folders').getAll();
            const active = tx.objectStore('metadata').get('activeProfileId');
            folders.onsuccess = () => {
              const root = folders.result.find(
                (folder: { isRoot: boolean }) => folder.isRoot,
              );
              if (!root || !profile.result[0] || !settings.result[0]) {
                tx.abort();
                return;
              }
              const rootId = '33333333-3333-4333-8333-333333333333';
              tx.objectStore('profiles').put({
                ...profile.result[0],
                id: sourceProfileId,
                username: 'Source profile',
              });
              tx.objectStore('profileSettings').put({
                ...settings.result[0],
                profileId: sourceProfileId,
                dateTimeFormat: 'iso',
                notificationPreferences: {
                  countdownLineColor: null,
                  position: 'bottom-right',
                  order: 'newest',
                  stackLimit: 3,
                  ...settings.result[0].notificationPreferences,
                  enabled: sourceNotifications,
                },
              });
              tx.objectStore('folders').put({
                ...root,
                id: rootId,
                profileId: sourceProfileId,
                title: 'Source home',
              });
              tx.objectStore('bookmarks').put({
                id: sourceBookmarkId,
                profileId: sourceProfileId,
                parentId: rootId,
                title: 'Source bookmark',
                url: 'https://example.com/a',
                createdAt: 1,
                updatedAt: 1,
                index: 0,
                tags: [],
                note: '',
                cardAppearance: { kind: 'color', value: '#123456' },
              });
            };
            tx.oncomplete = () => {
              db.close();
              resolve(active.result);
            };
            tx.onabort = tx.onerror = () => {
              db.close();
              reject(new Error('test-db-seed-failed'));
            };
          };
        }),
      {
        sourceProfileId,
        sourceBookmarkId,
        sourceNotifications: openContainingFolder,
      },
    );
    const notices = page.getByRole('button', { name: 'Dismiss notification' });
    if (await notices.count()) await notices.first().click();
    await page
      .getByRole('button', { name: 'Open search', exact: true })
      .click();
    const search = page.getByRole('dialog', { name: 'Search', exact: true });
    await search
      .getByRole('button', { name: 'URL matches', exact: true })
      .click();
    await search
      .getByRole('button', { name: 'URL match options', exact: true })
      .click();
    await search.getByLabel('Scope').selectOption('all');
    await page.keyboard.press('Escape');
    await expect(search).toBeVisible();
    await expect(
      search.getByRole('button', { name: 'URL match options', exact: true }),
    ).toBeFocused();
    await search
      .getByRole('button', { name: 'https://example.com/a · 3 bookmarks' })
      .click();
    const row = search
      .getByRole('listitem')
      .filter({ hasText: 'Source bookmark' });
    await expect(
      row.getByText('Profile: Source profile', { exact: true }),
    ).toBeVisible();
    await expect(row.getByText('Active', { exact: true })).toHaveCount(0);
    await expect(search.getByText('Active', { exact: true })).toHaveCount(2);
    await expect(
      row.getByRole('button', { name: 'Delete', exact: true }),
    ).toHaveCSS('color', 'rgb(255, 133, 140)');
    const infoBox = await row
      .getByRole('button', { name: 'Get info', exact: true })
      .boundingBox();
    const deleteBox = await row
      .getByRole('button', { name: 'Delete', exact: true })
      .boundingBox();
    expect(
      (deleteBox?.y ?? 0) - ((infoBox?.y ?? 0) + (infoBox?.height ?? 0)),
    ).toBeGreaterThan(0);
    await row.getByRole('button', { name: 'Get info', exact: true }).click();
    const details = page.getByRole('dialog', { name: 'Get info', exact: true });
    const copyButton = details.getByRole('button', {
      name: 'Copy Title',
      exact: true,
    });
    const copySize = await copyButton.locator('svg').boundingBox();
    expect(copySize?.width).toBeGreaterThanOrEqual(18);
    expect(copySize?.height).toBeGreaterThanOrEqual(18);
    for (const colorScheme of ['dark', 'light'] as const) {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      for (const width of [1100, 360]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(copyButton.locator('svg')).toHaveCSS('width', '20px');
        await expect(copyButton.locator('svg')).toHaveCSS('height', '20px');
        await details
          .getByRole('button', { name: 'Close item information' })
          .focus();
        await page.keyboard.press('Tab');
        await expect(copyButton).toBeFocused();
        await expect(copyButton).toHaveCSS('outline-style', 'solid');
      }
      if (process.env.URL_MATCHES_SCREENSHOT_DIR && !openContainingFolder)
        await details.screenshot({
          path: `${process.env.URL_MATCHES_SCREENSHOT_DIR}/item-info-copy-${colorScheme}.png`,
        });
    }
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1100, height: 900 });
    await expect(
      details.getByText('Source home', { exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(details).not.toBeVisible();
    await expect(search).toBeVisible();
    await expect(
      row.getByRole('button', { name: 'Get info', exact: true }),
    ).toBeFocused();
    if (openContainingFolder) {
      await row
        .getByRole('button', { name: 'Open folder', exact: true })
        .focus();
      await page.keyboard.press('Enter');
      await expect(search).not.toBeVisible();
      await expect(
        page.getByText(
          "Switched to the bookmark's profile and opened its containing folder.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page
          .getByRole('region', { name: 'Bookmarks', exact: true })
          .getByText('Source bookmark', { exact: true }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Open profile menu', exact: true })
        .click();
      await expect(
        page
          .getByLabel('Profile menu', { exact: true })
          .getByRole('strong')
          .filter({ hasText: /^Source profile$/ }),
      ).toBeVisible();
      return;
    }
    if (process.env.URL_MATCHES_SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.URL_MATCHES_SCREENSHOT_DIR}/url-matches-all-profiles.png`,
        fullPage: true,
      });
    await row.getByRole('button', { name: 'Delete', exact: true }).click();
    const confirm = page.getByRole('dialog', {
      name: 'Confirm action',
      exact: true,
    });
    await expect(
      confirm.getByText('Delete this bookmark from profile "Source profile"?', {
        exact: true,
      }),
    ).toBeVisible();
    await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Delete', exact: true }).click();
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(
      search.getByText('1 group · 2 bookmarks', { exact: true }),
    ).toBeVisible();
    await expect(row).toHaveCount(0);
    const persisted = await page.evaluate(
      async (sourceBookmarkId) =>
        new Promise<{ active: unknown; bookmark: unknown; logs: unknown[] }>(
          (resolve, reject) => {
            const open = indexedDB.open('bookmark-manager-pro');
            open.onerror = () => reject(new Error('test-db-open-failed'));
            open.onsuccess = () => {
              const db = open.result;
              const tx = db.transaction(
                ['metadata', 'bookmarks', 'activity'],
                'readonly',
              );
              const active = tx.objectStore('metadata').get('activeProfileId');
              const bookmark = tx
                .objectStore('bookmarks')
                .get(sourceBookmarkId);
              const logs = tx.objectStore('activity').getAll();
              tx.oncomplete = () => {
                db.close();
                resolve({
                  active: active.result,
                  bookmark: bookmark.result,
                  logs: logs.result,
                });
              };
              tx.onerror = () => reject(new Error('test-db-read-failed'));
            };
          },
        ),
      sourceBookmarkId,
    );
    expect(persisted.active).toEqual(activeBefore);
    expect(persisted.bookmark).toBeUndefined();
    expect(persisted.logs).toEqual([]);
    await expect(
      page.getByText('The item was deleted.', { exact: true }),
    ).toHaveCount(0);
  });
}

test('URL matches stays local and supports keyboard review, themes, narrow layout, and reset', async ({
  page,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const outgoing: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('https://example.com'))
      outgoing.push(request.url());
  });
  await createProfile(page);
  await expect(page).toHaveURL(new URL('/', baseURL).href);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  const notifications = page.getByRole('button', {
    name: 'Dismiss notification',
  });
  if (await notifications.count()) await notifications.first().click();
  await page.getByRole('button', { name: 'Open search', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Search', exact: true });
  await dialog
    .getByRole('button', { name: 'URL matches', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expect(dialog.getByText('1 group · 2 bookmarks')).toBeVisible();
  const group = dialog.getByRole('button', {
    name: 'https://example.com/a · 2 bookmarks',
  });
  await group.focus();
  await page.keyboard.press('Enter');
  await expect(group).toHaveAttribute('aria-expanded', 'true');
  await expect(
    dialog.getByRole('button', { name: /Synthetic match 0/ }),
  ).toBeVisible();
  await dialog.getByRole('searchbox').fill('0');
  await expect(
    dialog.getByRole('button', { name: /Synthetic match 1/ }),
  ).toBeVisible();
  const matchOptions = dialog.getByRole('button', {
    name: 'URL match options',
    exact: true,
  });
  await matchOptions.click();
  const childOptions = page.getByRole('dialog', {
    name: 'URL match options',
    exact: true,
  });
  await expect(childOptions.getByLabel('Matching level')).toBeFocused();
  await childOptions.getByLabel('Matching level').selectOption('path');
  if (process.env.URL_MATCHES_SCREENSHOT_DIR)
    await childOptions.screenshot({
      path: `${process.env.URL_MATCHES_SCREENSHOT_DIR}/url-match-options.png`,
    });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(matchOptions).toBeFocused();
  await expect(dialog.getByText('1 group · 3 bookmarks')).toBeVisible();
  await expect(
    dialog.getByText(/Potential matches share URL parts/),
  ).toHaveCount(0);
  await expect(dialog.getByText('Experimental', { exact: true })).toBeVisible();
  await dialog
    .getByRole('button', { name: 'https://example.com/a · 3 bookmarks' })
    .click();
  await expect(
    dialog.locator('.url-matches__member > strong').first(),
  ).toHaveCSS('font-weight', '400');
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      colorScheme,
    );
    await expect(
      dialog.locator('.url-matches__actions .profile-button--danger').first(),
    ).toHaveCSS(
      'color',
      colorScheme === 'light' ? 'rgb(180, 35, 47)' : 'rgb(255, 133, 140)',
    );
    for (const width of [1100, 360]) {
      await page.setViewportSize({ width, height: 720 });
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
      await expect(
        dialog.getByRole('button', { name: 'URL match options', exact: true }),
      ).toBeVisible();
      await matchOptions.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(
        dialog.getByRole('button', { name: 'URL match options', exact: true }),
      ).toBeFocused();
      await expect(
        dialog.getByRole('button', { name: 'URL match options', exact: true }),
      ).toHaveCSS('outline-style', 'solid');
      const screenshotDirectory = process.env.URL_MATCHES_SCREENSHOT_DIR;
      if (
        screenshotDirectory &&
        ((colorScheme === 'light' && width === 1100) ||
          (colorScheme === 'dark' && width === 360))
      ) {
        await page.screenshot({
          path: `${screenshotDirectory}/url-matches-${colorScheme}-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await matchOptions.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('button', { name: 'URL match options', exact: true }),
  ).toBeFocused();
  await expect(
    dialog.getByRole('button', { name: 'URL match options', exact: true }),
  ).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Open search', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Bookmarks', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await dialog
    .getByRole('button', { name: 'URL matches', exact: true })
    .click();
  await expect(dialog.getByLabel('Matching level')).toHaveValue('exact');
  await expect(dialog.getByRole('searchbox')).toHaveValue('');
  expect(outgoing).toEqual([]);
  expect(errors).toEqual([]);
});
