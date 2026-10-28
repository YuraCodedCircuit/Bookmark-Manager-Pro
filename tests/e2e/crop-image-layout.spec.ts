import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 420, height: 600 },
  { width: 700, height: 600 },
  { width: 1200, height: 600 },
]) {
  test(`crop workspace owns scrolling at ${viewport.width}px`, async ({
    page,
  }) => {
    const styles = await readFile('src/styles/global.css', 'utf8');
    await page.setViewportSize(viewport);
    await page.setContent(`<style>${styles}</style>
      <dialog class="crop-image-dialog" aria-label="Crop image">
        <header class="crop-image-dialog__header"><h2>Crop image</h2><button>Close</button></header>
        <div class="crop-image-dialog__workspace">
          <div class="crop-image-dialog__viewport">
            <div class="crop-image-dialog__stage" style="aspect-ratio:1 / 3;width:100%;background:#456"></div>
          </div>
          <div class="crop-image-dialog__controls">
            ${Array.from({ length: 12 }, (_, i) => `<label>Field ${i}<input value="10"></label>`).join('')}
          </div>
        </div>
        <footer class="crop-image-dialog__footer"><button>Cancel</button><button>Reset</button><button>Apply crop</button></footer>
      </dialog>`);
    await page
      .locator('dialog')
      .evaluate((dialog: HTMLDialogElement) => dialog.showModal());
    const workspace = page.locator('.crop-image-dialog__workspace');
    const header = page.locator('header');
    const footer = page.locator('footer');
    const before = {
      header: await header.boundingBox(),
      footer: await footer.boundingBox(),
    };
    expect(
      await workspace.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    ).toBe(true);
    const preview = page.locator('.crop-image-dialog__viewport');
    for (const ratio of ['1 / 3', '1600 / 811']) {
      await page
        .locator('.crop-image-dialog__stage')
        .evaluate((element, value) => {
          (element as HTMLElement).style.aspectRatio = value;
        }, ratio);
      const previewBounds = await preview.boundingBox();
      const controlBounds = await page
        .locator('.crop-image-dialog__controls')
        .boundingBox();
      if (!previewBounds || !controlBounds)
        throw new Error('Missing crop layout');
      const separated =
        previewBounds.x + previewBounds.width <= controlBounds.x + 1 ||
        previewBounds.y + previewBounds.height <= controlBounds.y + 1;
      expect(separated, `Preview overlaps controls for ${ratio}`).toBe(true);
    }
    expect(
      await preview.evaluate(
        (element) =>
          ['auto', 'scroll'].includes(getComputedStyle(element).overflowY) &&
          element.scrollHeight > element.clientHeight,
      ),
    ).toBe(false);
    // Exercise the native scrollbar rather than relying on wheel scrolling.
    const bounds = await workspace.boundingBox();
    if (!bounds) throw new Error('Missing workspace');
    await page.mouse.move(bounds.x + bounds.width - 5, bounds.y + 10);
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width - 5,
      bounds.y + bounds.height - 10,
      { steps: 12 },
    );
    await page.mouse.up();
    await expect
      .poll(() => workspace.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    expect(await header.boundingBox()).toEqual(before.header);
    expect(await footer.boundingBox()).toEqual(before.footer);
    await page.getByRole('button', { name: 'Apply crop' }).focus();
    await expect(
      page.getByRole('button', { name: 'Apply crop' }),
    ).toBeFocused();
  });
}
