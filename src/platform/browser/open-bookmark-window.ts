import browser from 'webextension-polyfill';

/** Opens a validated bookmark URL in a normal browser window. */
export async function openBookmarkWindow(url: string): Promise<void> {
  await browser.windows.create({ focused: true, url });
}
