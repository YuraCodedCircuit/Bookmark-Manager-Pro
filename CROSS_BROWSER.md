# Cross-Browser Requirements

## Supported targets

- Google Chrome using Manifest V3
- Microsoft Edge using Manifest V3
- Mozilla Firefox using Manifest V3

Chrome 140+, Edge 140+, and Firefox 140+ are supported. Compatibility claims
require automated or manual verification on that browser.

## Build strategy

WXT generates browser-specific manifests and packages. Shared code uses the
promise-based `browser` API through `webextension-polyfill`. Direct `chrome.*`
calls are limited to documented Chromium adapters.

Generated manifests request the WebExtensions `search` permission. Search
submission is routed through a capability-checked adapter and uses the default
provider with current-tab or new-tab disposition. The supported browser API does
not expose default-provider suggestions, so the application shows one local
action suggestion and never constructs a provider URL. The capability is checked
when Web mode is selected. When unavailable, Search shows an Information
notification and remains in Bookmarks mode without copying text, simulating
keys, or navigating. The webpage preview reports this capability as unavailable.

## Expected compatibility boundaries

- Background declarations and worker lifecycle differ across browser targets.
- Commands may have browser-reserved shortcuts and different assignment rules.
- Browser session-storage availability differs. Undo history stores its patches
  in IndexedDB and uses a typed session adapter only for the opaque session ID;
  the webpage preview uses a tab-session marker. IndexedDB capacity errors use
  the same oldest-first retention behavior across targets.
- Extension windows, new-tab overrides, and popup sizing may differ.
- Optional permissions and user prompts may differ.
- Bookmark roots and native bookmark identifiers are browser-owned.
- Store packaging, signing, review, and update processes are separate.

## Capability policy

Feature code requests capabilities through typed platform interfaces. Adapters
must return an explicit unsupported result instead of silently doing nothing.
Browser detection alone is insufficient when a direct capability test is
available.

The required `storage` permission currently supports browser-session undo and
redo patches. It does not enable remote storage or synchronization.

The toolbar action and native page context menu open the same current-page save
popup. The `activeTab` grant is limited to that user-invoked page and supports
prefilling its title/address and optional local visible-tab capture. The
`contextMenus` permission adds only the save-page command. Firefox uses an
event-driven background script while Chrome and Edge use service workers.

## Acceptance matrix

Each release candidate must verify:

- Installation, startup, upgrade, disable, enable, and removal
- New-tab, popup, settings, and focused-window surfaces
- Bookmark permissions and native synchronization
- Commands, context menus, notifications, tabs, and downloads
- IndexedDB persistence across worker restarts and browser restarts
- Import, export, backup, restore, and schema-upgrade failure recovery
- Keyboard, focus, zoom, contrast, and localization behavior
- Package contents, manifest permissions, and Content Security Policy

Chrome and Edge may share automated coverage where behavior is identical, but
both packaged extensions must receive installation smoke tests.
