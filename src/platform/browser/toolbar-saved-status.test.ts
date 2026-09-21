import { describe, expect, it, vi } from 'vitest';

vi.mock('webextension-polyfill', () => ({
  default: {
    action: {},
    i18n: { getMessage: vi.fn() },
    permissions: { contains: vi.fn() },
    tabs: {},
  },
}));

import {
  ToolbarSavedStatusController,
  type ToolbarSavedStatusDependencies,
} from './toolbar-saved-status';

function dependencies(options?: {
  count?: number;
  enabled?: boolean;
  permission?: boolean;
  url?: string;
}): ToolbarSavedStatusDependencies {
  const count = vi.fn().mockResolvedValue(options?.count ?? 0);
  return {
    action: {
      setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      setBadgeText: vi.fn().mockResolvedValue(undefined),
      setTitle: vi.fn().mockResolvedValue(undefined),
    },
    database: {
      bookmarks: {
        where: vi.fn(() => ({
          equals: vi.fn(() => ({ count })),
        })),
      } as never,
      metadata: {
        get: vi.fn().mockResolvedValue({
          key: 'activeProfileId',
          value: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
        }),
      } as never,
      profileSettings: {
        get: vi.fn().mockResolvedValue({
          profileId: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
          showSavedStatusOnToolbar: options?.enabled ?? true,
          theme: 'system',
        }),
      } as never,
    },
    getMessage: vi.fn((key, substitutions) =>
      key === 'toolbarSavedStatusMany'
        ? `Saved in Bookmark Manager Pro - ${String(substitutions?.[0])} copies`
        : key === 'toolbarSavedStatusOne'
          ? 'Saved in Bookmark Manager Pro'
          : 'Save URL to Bookmark Manager Pro',
    ),
    hasTabsPermission: vi.fn().mockResolvedValue(options?.permission ?? true),
    tabs: {
      get: vi.fn().mockResolvedValue({
        id: 7,
        url: options?.url ?? 'https://example.com/path',
      }),
      query: vi.fn().mockResolvedValue([]),
    },
  };
}

describe('ToolbarSavedStatusController', () => {
  it('shows a check badge and duplicate count in the accessible title', async () => {
    const api = dependencies({ count: 3 });

    await new ToolbarSavedStatusController(api).refreshTab(7);

    expect(api.action.setBadgeText).toHaveBeenCalledWith({
      tabId: 7,
      text: '✓',
    });
    expect(api.action.setTitle).toHaveBeenCalledWith({
      tabId: 7,
      title: 'Saved in Bookmark Manager Pro - 3 copies',
    });
  });

  it.each([
    ['permission is absent', { permission: false }],
    ['the setting is disabled', { enabled: false }],
    ['the URL is unsupported', { url: 'about:config' }],
    ['the URL is not saved', { count: 0 }],
  ])('clears stale tab state when %s', async (_label, options) => {
    const api = dependencies(options);

    await new ToolbarSavedStatusController(api).refreshTab(7);

    expect(api.action.setBadgeText).toHaveBeenCalledWith({
      tabId: 7,
      text: '',
    });
    expect(api.action.setTitle).toHaveBeenCalledWith({
      tabId: 7,
      title: 'Save URL to Bookmark Manager Pro',
    });
  });
});
