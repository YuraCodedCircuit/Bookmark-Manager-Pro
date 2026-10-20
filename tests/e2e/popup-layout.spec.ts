import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

for (const theme of ['dark', 'light']) {
  test(`popup footer fits one button row in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 600 });
    const global = await readFile('src/styles/global.css', 'utf8');
    const popup = await readFile('entrypoints/popup/popup.css', 'utf8');
    await page.setContent(`<style>${global}\n${popup}</style>
      <div id="root" data-theme="${theme}"><dialog open class="content-editor">
        <form class="content-editor__fixed-form">
          <header><div><h1>Save current URL</h1><p>Stored locally</p></div><button type="button">Close</button></header>
          <div class="content-editor__body"><div style="height:1200px">Scrollable bookmark fields</div></div>
          <footer><button type="button">Cancel</button><button type="submit">Save bookmark</button></footer>
        </form>
      </dialog></div>`);
    const footer = page.locator('footer');
    const bounds = await footer.boundingBox();
    const button = await page
      .getByRole('button', { name: 'Save bookmark' })
      .boundingBox();
    expect(Math.abs(bounds!.y + bounds!.height - 600)).toBeLessThanOrEqual(1);
    expect(bounds!.height - button!.height).toBeLessThanOrEqual(40);
    const body = page.locator('.content-editor__body');
    expect(
      await body.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    ).toBe(true);
    await body.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    expect(await footer.boundingBox()).toEqual(bounds);
    await page.getByRole('button', { name: 'Cancel' }).focus();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Save bookmark' }),
    ).toBeFocused();
  });
}
