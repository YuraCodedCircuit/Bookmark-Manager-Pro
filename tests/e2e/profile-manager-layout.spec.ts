import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

test('scrolls the complete profile manager in a short viewport', async ({
  page,
}) => {
  const styles = await readFile('src/styles/global.css', 'utf8');
  await page.setViewportSize({ height: 520, width: 960 });
  await page.setContent(`
    <style>${styles}</style>
    <dialog class="profile-window profile-manager" open>
      <header class="profile-window__header"><h1>Manage profiles</h1></header>
      <form class="profile-editor">
        <div class="profile-avatar"></div>
        <div class="profile-editor__fields" style="height: 280px"></div>
      </form>
      <section class="profile-manager__list">
        <div class="profile-manager__list-heading"><h2>Profiles</h2></div>
        <div class="profile-list">
          ${Array.from(
            { length: 4 },
            (_, index) =>
              `<article class="profile-row">Profile ${index + 1}</article>`,
          ).join('')}
        </div>
      </section>
    </dialog>
  `);

  const manager = page.locator('.profile-manager');
  const list = page.locator('.profile-manager .profile-list');
  const rows = page.locator('.profile-manager .profile-row');

  await expect(manager).toHaveCSS('overflow-y', 'auto');
  await expect(list).toHaveCSS('overflow-y', 'visible');
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toHaveCSS('height', '86px');
  await expect
    .poll(() =>
      manager.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    )
    .toBe(true);
});

test('uses one visual surface and backdrop across application windows', async ({
  page,
}) => {
  const styles = await readFile('src/styles/global.css', 'utf8');
  const modalClasses = [
    'content-editor',
    'settings-dialog',
    'profile-window',
    'welcome-dialog',
    'item-info-dialog',
    'confirmation-dialog',
    'search-window',
    'sync-dialog',
    'backup-dialog',
  ];
  await page.setContent(`
    <style>${styles}</style>
    ${modalClasses.map((className) => `<dialog class="${className}" open></dialog>`).join('')}
    <dialog class="side-panel" open></dialog>
  `);

  const stylesByWindow = await page.locator('dialog').evaluateAll((windows) =>
    windows.map((window) => {
      const surface = getComputedStyle(window);
      const backdrop = getComputedStyle(window, '::backdrop');
      return {
        backdropColor: backdrop.backgroundColor,
        backdropFilter: backdrop.backdropFilter,
        backgroundColor: surface.backgroundColor,
        borderColor: surface.borderColor,
      };
    }),
  );

  expect(
    new Set(stylesByWindow.map(({ backgroundColor }) => backgroundColor)),
  ).toHaveProperty('size', 1);
  expect(
    new Set(stylesByWindow.map(({ borderColor }) => borderColor)),
  ).toHaveProperty('size', 1);
  expect(
    new Set(stylesByWindow.map(({ backdropColor }) => backdropColor)),
  ).toHaveProperty('size', 1);
  expect(
    new Set(stylesByWindow.map(({ backdropFilter }) => backdropFilter)),
  ).toHaveProperty('size', 1);

  const modalStyles = await page
    .locator(`dialog:not(.side-panel)`)
    .evaluateAll((windows) =>
      windows.map((window) => {
        const styles = getComputedStyle(window);
        return {
          borderRadius: styles.borderRadius,
          boxShadow: styles.boxShadow,
        };
      }),
    );
  expect(
    new Set(modalStyles.map(({ borderRadius }) => borderRadius)),
  ).toHaveProperty('size', 1);
  expect(new Set(modalStyles.map(({ boxShadow }) => boxShadow))).toHaveProperty(
    'size',
    1,
  );

  await page
    .locator('html')
    .evaluate((element) => element.setAttribute('data-theme', 'light'));
  const lightSurfaces = await page.locator('dialog').evaluateAll((windows) =>
    windows.map((window) => {
      const styles = getComputedStyle(window);
      return [styles.backgroundColor, styles.borderColor];
    }),
  );
  expect(
    new Set(lightSurfaces.map(([background]) => background)),
  ).toHaveProperty('size', 1);
  expect(new Set(lightSurfaces.map(([, border]) => border))).toHaveProperty(
    'size',
    1,
  );

  await page.emulateMedia({ forcedColors: 'active' });
  const forcedColorStyles = await page
    .locator('dialog')
    .evaluateAll((windows) =>
      windows.map((window) => {
        const surface = getComputedStyle(window);
        const backdrop = getComputedStyle(window, '::backdrop');
        return {
          backdropFilter: backdrop.backdropFilter,
          backgroundColor: surface.backgroundColor,
          boxShadow: surface.boxShadow,
        };
      }),
    );
  expect(
    new Set(forcedColorStyles.map(({ backgroundColor }) => backgroundColor)),
  ).toHaveProperty('size', 1);
  expect(forcedColorStyles.every(({ boxShadow }) => boxShadow === 'none')).toBe(
    true,
  );
  expect(
    forcedColorStyles.every(({ backdropFilter }) => backdropFilter === 'none'),
  ).toBe(true);
});

test('balances the Get info scrollbar gutter around its content', async ({
  page,
}) => {
  const styles = await readFile('src/styles/global.css', 'utf8');
  await page.setContent(`
    <style>${styles}</style>
    <dialog class="item-info-dialog" open>
      <header class="item-info-dialog__header"><h1>Get info</h1></header>
      <div class="item-info-dialog__scroll-region">
        <div class="item-info-dialog__appearance"></div>
        <div class="item-info-dialog__content" style="height: 720px"></div>
      </div>
    </dialog>
  `);

  const scrollRegion = page.locator('.item-info-dialog__scroll-region');
  await expect(scrollRegion).toHaveCSS('scrollbar-gutter', 'stable both-edges');

  const horizontalMargins = await scrollRegion.evaluate((element) => {
    const styles = getComputedStyle(element);
    return [styles.marginLeft, styles.marginRight];
  });
  expect(horizontalMargins[0]).toBe(horizontalMargins[1]);
});

test('uses the refined Get info visual hierarchy without hiding full values', async ({
  page,
}) => {
  const styles = await readFile('src/styles/global.css', 'utf8');
  const longValue =
    'A long value that remains available in full to assistive technology and copy actions';
  await page.setContent(`
    <style>${styles}</style>
    <dialog class="item-info-dialog" open>
      <header class="item-info-dialog__header">
        <div class="item-info-dialog__title">
          <span class="item-info-dialog__type-icon"><svg></svg></span>
          <h1>Get info</h1>
        </div>
        <button type="button">Close</button>
      </header>
      <div class="item-info-dialog__scroll-region">
        <div class="item-info-dialog__appearance"></div>
        <div class="item-info-dialog__content">
          <dl><div class="item-info-dialog__row"><dt>Title</dt><dd>${longValue}</dd><button type="button">Copy</button></div></dl>
          <details class="item-info-dialog__more"><summary><svg></svg><span>More details</span></summary></details>
        </div>
      </div>
    </dialog>
  `);

  await expect(page.locator('.item-info-dialog__appearance')).toHaveCSS(
    'min-height',
    '152px',
  );
  await expect(page.locator('.item-info-dialog__row button')).toHaveCSS(
    'border-color',
    'rgba(0, 0, 0, 0)',
  );
  await page.locator('.item-info-dialog__row button').hover();
  await expect(page.locator('.item-info-dialog__row button')).not.toHaveCSS(
    'border-color',
    'rgba(0, 0, 0, 0)',
  );
  await expect(page.locator('.item-info-dialog__row dd')).toHaveCSS(
    '-webkit-line-clamp',
    '3',
  );
  await expect(page.locator('.item-info-dialog__row dd')).toHaveText(longValue);

  const details = page.locator('.item-info-dialog__more');
  const chevron = details.locator('summary svg');
  await expect(chevron).toHaveCSS('transform', 'none');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
  await expect(chevron).not.toHaveCSS('transform', 'none');

  await page.setViewportSize({ height: 640, width: 320 });
  await expect
    .poll(() =>
      page
        .locator('.item-info-dialog__scroll-region')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    )
    .toBe(true);
});
