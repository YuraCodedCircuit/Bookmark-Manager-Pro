import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  vite: () => ({
    build: {
      chunkSizeWarningLimit: 600,
      modulePreload: false,
    },
  }),
  zip: {
    artifactTemplate:
      '{{name}}-{{version}}-{{browser}}-{{manifestVersion}}.zip',
    excludeSources: [
      '*.log',
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
    optional_permissions: ['bookmarks', 'clipboardRead', 'tabs'],
    icons: {
      16: 'extension-icon-16.png',
      32: 'extension-icon-32.png',
      48: 'extension-icon-48.png',
      128: 'extension-icon-128.png',
    },
    action: {
      default_icon: {
        16: 'extension-icon-16.png',
        32: 'extension-icon-32.png',
        48: 'extension-icon-48.png',
      },
      default_title: '__MSG_saveCurrentUrl__',
    },
    chrome_settings_overrides:
      browser === 'firefox'
        ? {
            homepage: 'newtab.html',
          }
        : undefined,
    browser_specific_settings:
      browser === 'firefox'
        ? {
            gecko: {
              id: '{3a1de31b-582d-4add-aa01-7b6ac6f7e4bb}',
              strict_min_version: '140.0',
              data_collection_permissions: {
                required: ['none'],
              },
            },
          }
        : undefined,
  }),
});
