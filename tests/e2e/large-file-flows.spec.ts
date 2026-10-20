import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Username', exact: true })
    .fill('Synthetic large profile');
  await page
    .getByRole('button', { name: 'Create profile', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Create your first profile' }),
  ).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Home', exact: true }),
  ).toBeVisible();
}
async function ticks(page: Page, reset = false) {
  return page.evaluate((reset) => {
    const state = window as typeof window & {
      fileTicks?: { last: number; max: number; count: number; timer: number };
    };
    if (reset) {
      if (state.fileTicks) clearInterval(state.fileTicks.timer);
      const measure = { last: performance.now(), max: 0, count: 0, timer: 0 };
      measure.timer = window.setInterval(() => {
        const now = performance.now();
        measure.max = Math.max(measure.max, now - measure.last);
        measure.last = now;
        measure.count++;
      }, 10);
      state.fileTicks = measure;
    }
    return {
      max: state.fileTicks?.max ?? 0,
      count: state.fileTicks?.count ?? 0,
    };
  }, reset);
}
test('large export and HTML import remain responsive and preserve every item', async ({
  page,
}, testInfo) => {
  // Includes fixture construction, four full downloads, and two large database writes.
  // Responsiveness has an independent 250 ms event-loop-gap assertion below.
  test.setTimeout(600_000);
  const recordCount = Number(process.env.FILE_FLOW_RECORDS ?? 30_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await start(page);
  const fixtureStarted = Date.now();
  await page.evaluate(
    (recordCount) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('bookmark-manager-pro');
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction(
              ['profiles', 'folders', 'bookmarks'],
              'readwrite',
            );
          const profiles = tx.objectStore('profiles').getAll(),
            folders = tx.objectStore('folders').getAll();
          const bookmarks = tx.objectStore('bookmarks');
          folders.onsuccess = () => {
            const root = folders.result[0],
              profile = profiles.result[0];
            let index = 0;
            const batch = () => {
              let last: IDBRequest | undefined;
              const end = Math.min(index + 500, recordCount);
              for (; index < end; index++) {
                const i = index;
                last = bookmarks.put({
                  id: `33333333-3333-4333-8333-${String(i).padStart(12, '0')}`,
                  profileId: profile.id,
                  parentId: root.id,
                  title: `Synthetic ${i}`,
                  url: `https://example.com/${i}`,
                  tags: [],
                  note: '',
                  cardAppearance: { kind: 'color', value: '#123456' },
                  index: i,
                  createdAt: 1,
                  updatedAt: 1,
                });
              }
              if (index < recordCount) last!.onsuccess = batch;
            };
            batch();
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
        request.onerror = () => reject(request.error);
      }),
    recordCount,
  );
  console.log('Large fixture seed milliseconds', Date.now() - fixtureStarted);
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const exporter = page.getByRole('dialog', { name: 'Export', exact: true });
  await exporter
    .getByRole('combobox', { name: 'Choose format' })
    .selectOption('json');
  const samples = [];
  for (let run = 0; run < 4; run++) {
    await ticks(page, true);
    const download = page.waitForEvent('download');
    const start = Date.now();
    await exporter.getByRole('button', { name: 'Export', exact: true }).click();
    const file = await download;
    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    expect(
      JSON.parse(Buffer.concat(chunks).toString('utf8')).profiles[0].content[0]
        .content,
    ).toHaveLength(recordCount);
    samples.push({ elapsedMs: Date.now() - start, ...(await ticks(page)) });
    await expect(
      exporter.getByRole('button', { name: 'Export', exact: true }),
    ).toBeEnabled();
    const notices = page.getByRole('button', { name: 'Dismiss notification' });
    while (await notices.count()) {
      const count = await notices.count();
      await notices.first().click();
      await expect(notices).toHaveCount(count - 1);
    }
  }
  console.log('Large export production samples', JSON.stringify(samples));
  for (const sample of samples) {
    expect.soft(sample.count).toBeGreaterThan(3);
    expect.soft(sample.max).toBeLessThan(250);
  }
  await exporter.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const importer = page.getByRole('dialog', { name: 'Import', exact: true });
  const html =
    '<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><DT><H3>Imported group</H3><DL>' +
    Array.from(
      { length: recordCount },
      (_, i) => `<DT><A HREF="https://example.org/${i}">Synthetic ${i}</A>`,
    ).join('') +
    '</DL></DL>';
  // A real file uses the native input path. Buffer uploads make Playwright
  // decode base64 synchronously in the page, contaminating UI measurements.
  const inputPath = testInfo.outputPath('large.html');
  await writeFile(inputPath, html);
  await ticks(page, true);
  await importer
    .getByLabel('Choose file', { exact: true })
    .setInputFiles(inputPath);
  await expect(
    importer.getByRole('button', { name: 'Review items', exact: true }),
  ).toBeEnabled();
  await importer
    .getByRole('button', { name: 'Review items', exact: true })
    .click();
  const review = page.getByRole('dialog', {
    name: 'Review imported items',
    exact: true,
  });
  await expect(review.getByRole('checkbox')).toHaveCount(200);
  await review.getByRole('button', { name: 'Next page', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    review.getByText(`Page 2 of ${Math.ceil((recordCount + 1) / 200)}`, {
      exact: true,
    }),
  ).toBeVisible();
  const previewTicks = await ticks(page);
  await review.getByRole('button', { name: 'Close', exact: true }).click();
  await ticks(page, true);
  const preparationStarted = Date.now();
  await importer.getByRole('button', { name: 'Import', exact: true }).click();
  const confirm = page.getByRole('dialog', {
    name: 'Confirm import',
    exact: true,
  });
  await expect(confirm).toBeVisible({ timeout: 30_000 });
  const prepareTicks = await ticks(page);
  console.log(
    'Large import preparation milliseconds',
    Date.now() - preparationStarted,
  );
  await ticks(page, true);
  const saveStarted = Date.now();
  await confirm.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(confirm).not.toBeVisible({ timeout: 300_000 });
  const saveTicks = await ticks(page);
  console.log(
    'Large import production ticks',
    JSON.stringify({ previewTicks, prepareTicks, saveTicks }),
  );
  console.log('Large import saving milliseconds', Date.now() - saveStarted);
  expect(
    Math.max(previewTicks.max, prepareTicks.max, saveTicks.max),
  ).toBeLessThan(250);
  const count = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('bookmark-manager-pro');
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction('bookmarks');
          const count = tx.objectStore('bookmarks').count();
          tx.oncomplete = () => {
            db.close();
            resolve(count.result);
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
  );
  expect(count).toBe(recordCount * 2);
  expect(errors).toEqual([]);
});

test('cancels an import queued behind synchronization without persisting any records', async ({
  page,
}) => {
  await start(page);
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const importer = page.getByRole('dialog', { name: 'Import', exact: true });
  await importer.getByLabel('Choose file', { exact: true }).setInputFiles({
    name: 'cancel.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('URL,Title\r\nhttps://example.com/,Synthetic'),
  });
  await importer.getByRole('button', { name: 'Import', exact: true }).click();
  const confirmation = page.getByRole('dialog', {
    name: 'Confirm import',
    exact: true,
  });
  await expect(confirmation).toBeVisible();
  await page.evaluate(() => {
    const owner = window as typeof window & { releaseFileLock?: () => void };
    void navigator.locks.request(
      'bookmark-synchronization-v1',
      () =>
        new Promise<void>((resolve) => {
          owner.releaseFileLock = resolve;
        }),
    );
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as typeof window & { releaseFileLock?: () => void })
            .releaseFileLock,
        ),
      ),
    )
    .toBe(true);
  await confirmation
    .getByRole('button', { name: 'Import', exact: true })
    .click();
  await expect
    .poll(async () =>
      page.evaluate(
        async () => (await navigator.locks.query()).pending?.length ?? 0,
      ),
    )
    .toBeGreaterThan(0);
  await confirmation
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(confirmation).not.toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        async () => (await navigator.locks.query()).pending?.length ?? 0,
      ),
    )
    .toBe(0);
  await page.evaluate(() => {
    (
      window as typeof window & { releaseFileLock?: () => void }
    ).releaseFileLock?.();
  });
  const count = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('bookmark-manager-pro');
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction('bookmarks');
          const read = tx.objectStore('bookmarks').count();
          tx.oncomplete = () => {
            db.close();
            resolve(read.result);
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
  );
  expect(count).toBe(0);
});
