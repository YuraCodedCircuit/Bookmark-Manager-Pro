import { describe, expect, it, vi } from 'vitest';

vi.mock('webextension-polyfill', () => ({
  default: {
    contextMenus: {
      create: vi.fn(),
      update: vi.fn(),
    },
    i18n: { getMessage: vi.fn() },
    runtime: {},
  },
}));

import {
  createChromiumContextMenuDependencies,
  ensureSaveUrlContextMenu,
  SAVE_CURRENT_URL_MENU_ID,
  type SaveUrlContextMenuDependencies,
} from './save-url-context-menu';

function createDependencies(): SaveUrlContextMenuDependencies {
  return {
    contextMenus: {
      create: vi.fn((_properties, callback) => {
        callback?.();
        return SAVE_CURRENT_URL_MENU_ID;
      }),
      update: vi.fn().mockResolvedValue(undefined),
    },
    getMessage: vi.fn(() => 'Save URL to Bookmark Manager Pro'),
    runtime: {},
  };
}

describe('ensureSaveUrlContextMenu', () => {
  it('updates an existing browser menu item without creating a duplicate', async () => {
    const dependencies = createDependencies();

    await ensureSaveUrlContextMenu(dependencies);

    expect(dependencies.contextMenus.update).toHaveBeenCalledWith(
      SAVE_CURRENT_URL_MENU_ID,
      {
        contexts: ['page'],
        title: 'Save URL to Bookmark Manager Pro',
      },
    );
    expect(dependencies.contextMenus.create).not.toHaveBeenCalled();
  });

  it('creates the item when the browser has no persisted registration', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.contextMenus.update).mockRejectedValue(
      new Error('missing'),
    );

    await ensureSaveUrlContextMenu(dependencies);

    expect(dependencies.contextMenus.create).toHaveBeenCalledWith(
      {
        contexts: ['page'],
        id: SAVE_CURRENT_URL_MENU_ID,
        title: 'Save URL to Bookmark Manager Pro',
      },
      expect.any(Function),
    );
  });

  it('reports a browser creation failure', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.contextMenus.update).mockRejectedValue(
      new Error('missing'),
    );
    dependencies.runtime = { lastError: { message: 'creation failed' } };

    await expect(ensureSaveUrlContextMenu(dependencies)).rejects.toThrow(
      'creation failed',
    );
  });

  it('uses Chromium callbacks and creates the item after a missing update', async () => {
    const runtime: { lastError?: { message: string } } = {};
    const create = vi.fn((_properties, callback) => {
      callback?.();
      return SAVE_CURRENT_URL_MENU_ID;
    });
    const update = vi.fn((_id, _properties, callback) => {
      runtime.lastError = { message: 'Cannot find menu item' };
      callback();
      delete runtime.lastError;
    });
    const dependencies = createChromiumContextMenuDependencies({
      contextMenus: { create, update },
      i18n: { getMessage: () => 'Save URL to Bookmark Manager Pro' },
      runtime,
    });

    await ensureSaveUrlContextMenu(dependencies);

    expect(update).toHaveBeenCalledWith(
      SAVE_CURRENT_URL_MENU_ID,
      expect.objectContaining({ contexts: ['page'] }),
      expect.any(Function),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ id: SAVE_CURRENT_URL_MENU_ID }),
      expect.any(Function),
    );
  });
});
