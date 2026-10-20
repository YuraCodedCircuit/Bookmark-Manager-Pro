import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { i18n } from '../../src/localization/i18n';

for (const theme of ['dark', 'light']) {
  test(`active cards match across profile dialogs in ${theme}`, async ({
    page,
  }) => {
    const styles = await readFile('src/styles/global.css', 'utf8');
    await page.setContent(`<style>${styles}</style><main data-theme="${theme}">
      <section class="profile-window profile-switcher"><article class="profile-row profile-row--active">Active<span class="profile-status">Active</span></article></section>
      <section class="profile-window profile-manager"><article class="profile-row profile-row--active">Active<span class="profile-status">Active</span><button class="profile-button">Edit</button></article></section>
    </main>`);
    const switcher = page.locator('.profile-switcher .profile-row');
    const manager = page.locator('.profile-manager .profile-row');
    const colors = await switcher.evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, border: style.borderColor };
    });
    await expect(manager).toHaveCSS('background-color', colors.background);
    await expect(manager).toHaveCSS('border-color', colors.border);
    await manager.hover();
    await expect(manager).toHaveCSS('background-image', 'none');
    await page.mouse.move(0, 0);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Edit' })).toBeFocused();
    await expect(manager).toHaveCSS('background-image', 'none');
    await expect(manager).toHaveCSS('background-color', colors.background);
    await expect(manager).toHaveCSS('border-color', colors.border);
  });
}

for (const surface of ['switcher', 'manager']) {
  for (const theme of ['dark', 'light']) {
    test(`non-active ${surface} cards show subtle hover and focus feedback in ${theme}`, async ({
      page,
    }) => {
      const styles = await readFile('src/styles/global.css', 'utf8');
      await page.setContent(`<style>${styles}</style><main data-theme="${theme}">
      <section class="profile-window profile-${surface}">
        <article class="profile-row profile-row--active">Active profile<span class="profile-status">Active</span></article>
        <article class="profile-row">Other profile<button class="profile-button profile-button--primary">Switch</button></article>
      </section>
      <section class="unrelated-list"><article class="profile-row">Unrelated row</article></section>
    </main>`);
      const card = page.locator(`.profile-${surface} .profile-row`).last();
      const active = page.locator(`.profile-${surface} .profile-row`).first();
      const button = page.getByRole('button', { name: 'Switch', exact: true });
      const border = await card.evaluate(
        (element) => getComputedStyle(element).borderColor,
      );
      const activeFill = await active.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      );
      await expect(card).toHaveCSS('background-image', 'none');
      await card.hover();
      await expect(card).toHaveCSS(
        'background-image',
        'linear-gradient(rgba(128, 128, 128, 0.08), rgba(128, 128, 128, 0.08))',
      );
      await expect(card).toHaveCSS('border-color', border);
      await expect(card).toHaveCSS('cursor', 'default');
      await expect(button).toHaveCSS('cursor', 'pointer');
      await active.hover();
      await expect(active).toHaveCSS('background-image', 'none');
      await expect(active).toHaveCSS('background-color', activeFill);
      await page.mouse.move(0, 0);
      await page.keyboard.press('Tab');
      await expect(button).toBeFocused();
      await expect(button).toHaveCSS('outline-style', 'solid');
      await expect(card).not.toHaveCSS('background-image', 'none');
      await page.keyboard.press('Tab');
      await expect(card).toHaveCSS('background-image', 'none');
      await page.locator('.unrelated-list .profile-row').hover();
      await expect(page.locator('.unrelated-list .profile-row')).toHaveCSS(
        'background-image',
        'none',
      );
      await page.emulateMedia({ forcedColors: 'active' });
      await card.hover();
      await expect(card).toHaveCSS('background-image', 'none');
    });
  }
}

for (const theme of ['dark', 'light']) {
  test(`profile image picker follows shared hover and keyboard focus in ${theme}`, async ({
    page,
  }) => {
    const styles = await readFile('src/styles/global.css', 'utf8');
    await page.setContent(`
      <style>${styles}</style>
      <main data-theme="${theme}">
        <label class="profile-file">Choose image<input type="file"></label>
        <button class="profile-button" type="button">Edit</button>
        <label class="profile-file">Unavailable<input type="file" disabled></label>
      </main>
    `);
    const picker = page.locator('.profile-file').first();
    const disabledPicker = page.locator('.profile-file').last();
    const secondary = page.getByRole('button', { name: 'Edit' });
    const idle = await picker.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    await picker.hover();
    await expect(picker).not.toHaveCSS('background-image', idle);
    const hovered = await picker.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    await secondary.hover();
    await expect(secondary).toHaveCSS('background-image', hovered);
    await disabledPicker.hover();
    await expect(disabledPicker).toHaveCSS('background-image', idle);
    await page.mouse.move(0, 0);
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Choose image')).toBeFocused();
    await expect(picker).toHaveCSS('outline-style', 'solid');
    await expect(picker).toHaveCSS('outline-width', '2px');
    const chooser = page.waitForEvent('filechooser');
    await page.keyboard.press('Space');
    await chooser;
  });
}

test('profile image size stays together while helper text reflows', async ({
  page,
}) => {
  const styles = await readFile('src/styles/global.css', 'utf8');
  for (const key of ['profiles.iconHelp', 'welcome.profile.iconHelp']) {
    for (const width of [90, 100, 110, 120, 130, 140, 150, 160]) {
      const help = i18n.t(key);
      await page.setContent(
        `<style>${styles}</style><div class="profile-editor__image" style="width: ${width}px"><small>${help}</small></div>`,
      );
      const lines = await page.locator('small').evaluate((element) => {
        const text = element.firstChild;
        if (!text?.textContent) throw new Error('Missing image help text');
        const value = text.textContent;
        const number = value.indexOf('1');
        const unit = value.indexOf('MB');
        const range = document.createRange();
        range.setStart(text, number);
        range.setEnd(text, number + 1);
        const numberTop = range.getBoundingClientRect().top;
        range.setStart(text, unit);
        range.setEnd(text, unit + 2);
        return {
          numberTop,
          unitTop: range.getBoundingClientRect().top,
          fits: element.scrollWidth <= element.clientWidth,
        };
      });
      expect(lines.numberTop).toBe(lines.unitTop);
      expect(lines.fits).toBe(true);
    }
  }
});
