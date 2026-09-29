import browser from 'webextension-polyfill';

/** Opens the bundled app page where first-profile creation is available. */
export async function openProfileCreation(): Promise<void> {
  await browser.tabs.create({
    active: true,
    url: browser.runtime.getURL('/newtab.html'),
  });
}
