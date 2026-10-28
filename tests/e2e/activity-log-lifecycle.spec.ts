import { chromium, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('packaged Chromium records preflight across browser restart without replaying cached checks', async () => {
  const temporaryBase = path.resolve(os.tmpdir());
  const profile = await mkdtemp(
    path.join(temporaryBase, 'bmpro-activity-lifecycle-'),
  );
  // Validate the exact constant target before any recursive cleanup is possible.
  if (
    path.dirname(path.resolve(profile)) !== temporaryBase ||
    !path.basename(profile).startsWith('bmpro-activity-lifecycle-')
  )
    throw new Error('unexpected-test-profile-path');
  const extension = path.resolve(
    process.env.ACTIVITY_LOG_EXTENSION_DIR ??
      'codex-internal/verification/builds/chrome-mv3',
  );
  const launch = () =>
    chromium.launchPersistentContext(profile, {
      headless: true,
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${extension}`,
        `--load-extension=${extension}`,
      ],
    });
  let context: Awaited<ReturnType<typeof launch>> | undefined;
  try {
    context = await launch();
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker'));
    const extensionId = new URL(worker.url()).host;
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/newtab.html`);
    await expect(
      page.getByRole('button', { name: 'Get started', exact: true }),
    ).toBeVisible();
    const readIdentity = async () =>
      (
        await page.evaluate(async () => {
          const api = (
            globalThis as unknown as {
              chrome: {
                storage: {
                  session: {
                    get(key: string): Promise<Record<string, { id: string }>>;
                  };
                };
              };
            }
          ).chrome;
          return (await api.storage.session.get('activityBrowserSessionV1'))
            .activityBrowserSessionV1;
        })
      )?.id;
    const initial = await readIdentity();
    expect(initial).toMatch(/^[0-9a-f-]{36}$/);
    const preflightCodes = (target: typeof page) =>
      target.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('bookmark-manager-pro');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        try {
          return await new Promise<string[]>((resolve, reject) => {
            const request = db
              .transaction('activity')
              .objectStore('activity')
              .getAll();
            request.onsuccess = () =>
              resolve(
                request.result
                  .sort(
                    (left: { sequence: number }, right: { sequence: number }) =>
                      left.sequence - right.sequence,
                  )
                  .filter((row: { eventCode: string }) =>
                    row.eventCode.includes('PREFLIGHT'),
                  )
                  .map((row: { eventCode: string }) => row.eventCode),
              );
            request.onerror = () => reject(request.error);
          });
        } finally {
          db.close();
        }
      });
    await expect
      .poll(() => preflightCodes(page))
      .toEqual([
        'BACKGROUND-PREFLIGHT-STARTED',
        'BACKGROUND-PREFLIGHT-COMPLETE',
      ]);
    const second = await context.newPage();
    await second.goto(`chrome-extension://${extensionId}/newtab.html`);
    await expect(
      second.getByRole('button', { name: 'Get started', exact: true }),
    ).toBeVisible();
    expect(await readIdentity()).toBe(initial);
    expect(await preflightCodes(second)).toHaveLength(2);
    await context.close();
    context = await launch();
    await (context.serviceWorkers()[0]
      ? Promise.resolve()
      : context.waitForEvent('serviceworker'));
    const reopened = await context.newPage();
    await reopened.goto(`chrome-extension://${extensionId}/newtab.html`);
    await expect(
      reopened.getByRole('button', { name: 'Get started', exact: true }),
    ).toBeVisible();
    const next = await reopened.evaluate(async () => {
      const api = (
        globalThis as unknown as {
          chrome: {
            storage: {
              session: {
                get(key: string): Promise<Record<string, { id: string }>>;
              };
            };
          };
        }
      ).chrome;
      return (await api.storage.session.get('activityBrowserSessionV1'))
        .activityBrowserSessionV1?.id;
    });
    expect(next).toMatch(/^[0-9a-f-]{36}$/);
    expect(next).not.toBe(initial);
    await expect
      .poll(async () => (await preflightCodes(reopened)).length)
      .toBe(4);
    expect((await preflightCodes(reopened)).slice(-2)).toEqual([
      'BACKGROUND-PREFLIGHT-STARTED',
      'BACKGROUND-PREFLIGHT-COMPLETE',
    ]);
  } finally {
    await context?.close();
    // Only the exact isolated profile validated above can be removed.
    await rm(profile, { recursive: true, force: true });
  }
});
