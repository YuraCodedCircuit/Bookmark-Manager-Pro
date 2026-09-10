import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  vite: () => ({
    build: { modulePreload: false },
  }),
  zip: {
    artifactTemplate:
      '{{name}}-{{version}}-{{browser}}-{{manifestVersion}}.zip',
    excludeSources: [
      'AGENTS.md',
      'codex-internal/**',
      'design/**',
      'dist/**',
      'screenshots/**',
    ],
  },
  manifest: ({ browser }) => ({
    name: '__MSG_appName__',
    description: '__MSG_appDescription__',
    default_locale: 'en',
    incognito: 'not_allowed',
    minimum_chrome_version: browser === 'firefox' ? undefined : '140',
    permissions: ['activeTab', 'alarms', 'contextMenus', 'search', 'storage'],
    optional_permissions: ['bookmarks'],
    icons: {
      16: 'favicon-32.png',
      32: 'favicon-32.png',
      48: 'extension-icon.png',
      128: 'extension-icon.png',
    },
    action: {
      default_icon: {
        16: 'favicon-32.png',
        32: 'favicon-32.png',
        48: 'extension-icon.png',
      },
      default_title: '__MSG_saveCurrentUrl__',
    },
    browser_specific_settings:
      browser === 'firefox'
        ? {
            gecko: {
              id: 'bookmark-manager-pro@bookmark-manager-pro.local',
              strict_min_version: '140.0',
              data_collection_permissions: {
                required: ['none'],
              },
            },
          }
        : undefined,
  }),
});
