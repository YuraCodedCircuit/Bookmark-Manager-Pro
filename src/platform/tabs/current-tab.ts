import browser from 'webextension-polyfill';
import { z } from 'zod';

const currentTabSchema = z.object({
  title: z.string().default(''),
  url: z.string().default(''),
  windowId: z.number().int(),
});

export type CurrentTab = z.infer<typeof currentTabSchema>;

export class CurrentTabUrlUnavailableError extends Error {
  constructor() {
    super('current-tab-url-unavailable');
    this.name = 'CurrentTabUrlUnavailableError';
  }
}

export async function getCurrentTab(): Promise<CurrentTab> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = currentTabSchema.parse(tab);
  if (!currentTab.url) throw new CurrentTabUrlUnavailableError();
  return currentTab;
}

/** Captures and bounds a visible tab image to the bookmark image limit. */
export async function captureCurrentTab(windowId: number): Promise<string> {
  const source = await browser.tabs.captureVisibleTab(windowId, {
    format: 'jpeg',
    quality: 75,
  });
  if (source.length <= 1_500_000) return source;

  const image = new Image();
  image.src = source;
  await image.decode();
  const scale = Math.min(1, Math.sqrt(1_350_000 / source.length));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  const resized = canvas.toDataURL('image/jpeg', 0.68);
  if (resized.length > 1_500_000) throw new Error('screenshot-too-large');
  return resized;
}
