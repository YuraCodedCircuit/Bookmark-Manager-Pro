import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('scrolls expanded folder-style settings without moving the header or actions', async ({
  page,
}) => {
  const styles = await readFile('src/styles/global.css', 'utf8');
  await page.setViewportSize({ width: 850, height: 520 });
  await page.setContent(`<style>${styles}</style>
    <dialog class="content-editor" open aria-label="Customize folder style">
      <form class="content-editor__fixed-form">
        <header><h1>Customize folder style</h1><button type="button">Close</button></header>
        <div class="content-editor__body folder-style__body">
          <details class="folder-style__section" open><summary>Folder view</summary>
            <div class="folder-style__section-content">
              ${Array.from({ length: 12 }, (_, index) => `<label>Setting ${index}<input value="Example" /></label>`).join('')}
            </div>
          </details>
          <details class="folder-style__section"><summary>Folder background</summary></details>
          <details class="folder-style__section"><summary>Navigation panel</summary></details>
        </div>
        <footer><button type="button">Cancel</button><button type="submit">Save style</button></footer>
      </form>
    </dialog>`);
  const dialog = page.getByRole('dialog');
  const header = dialog.locator('header');
  const footer = dialog.locator('footer');
  const before = {
    header: await header.boundingBox(),
    footer: await footer.boundingBox(),
  };
  const body = dialog.locator('.content-editor__body');
  expect(
    await body.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  await body.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(await body.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    0,
  );
  expect(await header.boundingBox()).toEqual(before.header);
  expect(await footer.boundingBox()).toEqual(before.footer);
  await expect(
    dialog.getByText('Navigation panel', { exact: true }),
  ).toBeInViewport();
  await expect(
    dialog.getByRole('button', { name: 'Save style' }),
  ).toBeInViewport();
  await dialog.getByRole('button', { name: 'Cancel' }).focus();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
});
