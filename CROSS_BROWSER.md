# Cross-Browser Requirements

## Supported targets

- Google Chrome using Manifest V3
- Microsoft Edge using Manifest V3
- Mozilla Firefox using Manifest V3

Chrome 140+, Edge 140+, and Firefox 140+ are supported. Compatibility claims
require automated or manual verification on that browser.

Every generated manifest sets `incognito` to `not_allowed`. Bookmark Manager Pro
is intentionally unavailable in Chrome Incognito, Edge InPrivate, and Firefox
Private Browsing windows. This is a product boundary, not a missing browser
capability.

## Build strategy

WXT generates browser-specific manifests and packages. Shared code uses the
promise-based `browser` API through `webextension-polyfill`. Direct `chrome.*`
calls are limited to documented Chromium adapters.

Firefox packages use the permanent AMO add-on ID
`{3a1de31b-582d-4add-aa01-7b6ac6f7e4bb}` so signed releases remain associated
with the existing Bookmark Manager Pro listing. Chrome and Edge manifests do
not include the Firefox-specific ID.

Firefox packages declare `chrome_settings_overrides.homepage` for the bundled
`newtab.html` page so ordinary new windows can open Bookmark Manager Pro. This
browser-specific setting requires Firefox's approval prompt and does not replace
tabs restored by Firefox session recovery. Chrome and Edge do not receive the
homepage override; their existing new-tab behavior remains unchanged.

Generated manifests request the WebExtensions `search` permission. Search
submission is routed through a capability-checked adapter and uses the default
provider with current-tab or new-tab disposition. The supported browser API does
not expose default-provider suggestions, so the application shows one local
action suggestion and never constructs a provider URL. The capability is checked
when Web mode is selected. When unavailable, Search shows an Information
notification and remains in Bookmarks mode without copying text, simulating
keys, or navigating. The webpage preview reports this capability as unavailable.

## Expected compatibility boundaries

Synchronization declares `bookmarks` as an optional permission in every target.
Grant bookmark access requests permission from a user gesture before folder
selection becomes available. Browser events and local database changes wake the
active profile's connection; a one-minute alarm resumes durable work after
worker suspension. Each batch checks the active profile, permission, and roots.
Revocation pauses the connection without deleting content. The standalone
webpage cannot access native bookmarks or run synchronization.

Toolbar saved status declares `tabs` as an optional permission in every target.
It is requested only after the user enables the profile-owned setting. Chrome,
Edge, and Firefox use a per-tab action badge and accessible title; denial or
revocation clears the indicator without preventing the save popup from working.

After a committed synchronization, toolbar-popup, or app content change,
installed Chrome, Edge, and Firefox surfaces receive the same profile-scoped
content-change message. Each tab reloads only an affected visible folder,
coalesces reads while hidden, and falls back to the closest surviving ancestor
when its displayed folder was removed. A durable revision recovers missed
messages. Active-profile changes use a separate durable activation revision so
all profile-bound surfaces open the latest profile's Home folder. The webpage
preview can receive local cross-tab updates but cannot originate native
bookmark sync.

- Background declarations and worker lifecycle differ across browser targets.
- Commands may have browser-reserved shortcuts and different assignment rules.
- Browser session-storage availability differs. Undo history stores its patches
  in IndexedDB and uses a typed session adapter only for the opaque session ID;
  the webpage preview uses a tab-session marker. IndexedDB capacity errors use
  the same oldest-first retention behavior across targets.
- Extension windows, new-tab overrides, Firefox's consent-based homepage
  override, and popup sizing may differ.
- Browser-owned action popups close when an operating-system file picker takes
  focus. The Save current URL popup therefore omits uploaded-image selection in
  every target while retaining visible-tab Screenshot capture; full application
  editors continue to support local image selection.
- Privileged browser pages may hide the active tab URL from extensions. The
  current-URL popup treats a hidden or unsupported URL as an expected condition,
  explains that the page cannot be saved, and offers Close without a retry.
- Optional permissions and user prompts may differ.
- App-local Paste may request optional clipboard-read permission. Chromium and
  Firefox permission behavior can differ; denial leaves the field unchanged and
  native Ctrl+V remains available.
- Bookmark roots and native bookmark identifiers are browser-owned.
- Store packaging, signing, review, and update processes are separate.

## Capability policy

Feature code requests capabilities through typed platform interfaces. Adapters
must return an explicit unsupported result instead of silently doing nothing.
Browser detection alone is insufficient when a direct capability test is
available.

The required `storage` permission currently supports browser-session undo and
redo patches. It does not enable remote storage or synchronization.

The toolbar action and native page context menu open the same current-URL save
popup. The background worker verifies the native menu registration whenever it
starts so Chrome, Edge, and Firefox can recover a missing menu item after an
extension reload or browser cleanup. The `activeTab` grant is limited to that
user-invoked page and supports
prefilling its title/address and optional local visible-tab capture. The
`contextMenus` permission adds only the save-URL command. Firefox uses an
event-driven background script while Chrome and Edge use service workers.

The Password Generator uses standards-based Web Crypto and explicit clipboard
writes in every target. It does not require a profile or an additional browser
permission, and its values are never routed through a background worker. Image
cropping uses browser canvas APIs locally; each target must verify source
decoding, transparent PNG output, opaque WebP output, exact crop edges, and the
870-pixel output bound.

Bookmark context actions use typed adapters to copy an address or create a new
browser window. Private-window creation remains prohibited by the manifest, and
adapter failures return privacy-safe feedback without exposing the address.

## Acceptance matrix

Each release candidate must verify:

- Installation, startup, upgrade, disable, enable, and removal
- New-tab, Firefox new-window homepage, popup, settings, and focused-window
  surfaces
- Bookmark permissions and native synchronization
- Commands, context menus, notifications, tabs, and downloads
- Password generation, strength feedback, reduced-motion reveal, clipboard
  copy, and close-time state clearing
- Image crop geometry, zoom, keyboard controls, transparency, output bounds,
  popup automatic crop, popup image-option omission, and original-image
  retention until save
- Optional clipboard-read grant and denial paths, native paste fallback, and
  bookmark-address copy and new-window actions
- IndexedDB persistence across worker restarts and browser restarts
- Import, export, backup, restore, and schema-upgrade failure recovery
- Keyboard, focus, zoom, contrast, and localization behavior
- Package contents, manifest permissions, and Content Security Policy
- Private-mode exclusion and privileged browser-page fallback behavior

Backup snapshots use IndexedDB and Web Crypto APIs available in the Chrome 140+,
Edge 140+, and Firefox 140+ support baseline. Each target must verify snapshot
creation, retention, replacement restore, deleted-profile restore, paused sync
state, and browser-data removal behavior. Snapshots are browser-profile local
and do not transfer between browsers.

Chrome and Edge may share automated coverage where behavior is identical, but
both packaged extensions must receive installation smoke tests.
