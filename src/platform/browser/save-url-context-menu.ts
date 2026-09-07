import browser from 'webextension-polyfill';
import type { Menus } from 'webextension-polyfill/namespaces/menus';

export const SAVE_CURRENT_URL_MENU_ID = 'save-current-page';

interface ContextMenuApi {
  create: typeof browser.contextMenus.create;
  update: typeof browser.contextMenus.update;
}

interface RuntimeApi {
  readonly lastError?: { message?: string };
}

interface NativeChromeContextMenuApi {
  create: ContextMenuApi['create'];
  update: (
    id: string | number,
    properties: Parameters<ContextMenuApi['update']>[1],
    callback: () => void,
  ) => void;
}

interface NativeChromeApi {
  contextMenus?: NativeChromeContextMenuApi;
  i18n?: { getMessage: (key: string) => string };
  runtime?: RuntimeApi;
}

export interface SaveUrlContextMenuDependencies {
  contextMenus: ContextMenuApi;
  getMessage: (key: string) => string;
  runtime: RuntimeApi;
}

export function createChromiumContextMenuDependencies(
  nativeChrome: Required<NativeChromeApi>,
): SaveUrlContextMenuDependencies {
  return {
    contextMenus: {
      create: nativeChrome.contextMenus.create.bind(nativeChrome.contextMenus),
      update: (id, properties) =>
        new Promise<void>((resolve, reject) => {
          nativeChrome.contextMenus.update(id, properties, () => {
            const message = nativeChrome.runtime.lastError?.message;
            if (message) {
              reject(new Error(message));
              return;
            }
            resolve();
          });
        }),
    },
    getMessage: (key) => nativeChrome.i18n.getMessage(key),
    runtime: nativeChrome.runtime,
  };
}

function createDefaultDependencies(): SaveUrlContextMenuDependencies {
  const nativeChrome = (
    globalThis as typeof globalThis & { chrome?: NativeChromeApi }
  ).chrome;
  const isFirefox =
    typeof navigator !== 'undefined' &&
    navigator.userAgent.includes('Firefox/');

  if (
    !isFirefox &&
    nativeChrome?.contextMenus &&
    nativeChrome.i18n &&
    nativeChrome.runtime
  ) {
    return createChromiumContextMenuDependencies({
      contextMenus: nativeChrome.contextMenus,
      i18n: nativeChrome.i18n,
      runtime: nativeChrome.runtime,
    });
  }

  return {
    contextMenus: browser.contextMenus,
    getMessage: (key) => browser.i18n.getMessage(key),
    runtime: browser.runtime,
  };
}

export async function ensureSaveUrlContextMenu(
  dependencies: SaveUrlContextMenuDependencies = createDefaultDependencies(),
): Promise<void> {
  const properties: {
    contexts: Menus.ContextType[];
    title: string;
  } = {
    contexts: ['page'],
    title:
      dependencies.getMessage('saveCurrentUrl') ||
      'Save URL to Bookmark Manager Pro',
  };

  try {
    await dependencies.contextMenus.update(
      SAVE_CURRENT_URL_MENU_ID,
      properties,
    );
    return;
  } catch {
    // A missing item is expected after first install or browser cleanup.
  }

  await new Promise<void>((resolve, reject) => {
    dependencies.contextMenus.create(
      { id: SAVE_CURRENT_URL_MENU_ID, ...properties },
      () => {
        const message = dependencies.runtime.lastError?.message;
        if (message) {
          reject(new Error(message));
          return;
        }
        resolve();
      },
    );
  });
}
