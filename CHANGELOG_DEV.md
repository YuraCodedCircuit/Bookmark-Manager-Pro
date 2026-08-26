# Developer Changelog

This changelog records Bookmark Manager Pro architecture, APIs, storage,
dependencies, build tooling, and compatibility changes. User-visible
benefits and behavior are maintained in `CHANGELOG.md`.

## Unreleased

## 0.1.0 - 2026-08-24

### Added

- Added a WXT background entry point with synchronously registered install,
  startup, and runtime-message listeners; a versioned Zod request/response
  protocol; restartable Dexie profile-readiness preflight; validated
  `browser.storage.session` snapshot caching; capability metadata; and
  failure-isolated activity diagnostics. WXT manifests now generate background
  worker/script declarations for Chrome MV3, Edge MV3, and Firefox MV3 and set
  `incognito` to `not_allowed`. WXT now targets Manifest V3 explicitly for every
  browser, and its ZIP command creates Firefox archives with `manifest.json` at
  the archive root. Mozilla source-review archives exclude Codex-only records,
  agent instructions, generated preview output, design references, and product
  screenshots.
- Added localized manifest identity/action icons, a WXT action-popup entry
  point, and a background-created page context-menu command. The popup uses the
  existing `CreateContentDialog`, resolves the active profile's last valid
  folder with Home fallback, and persists through `ManageBookmarks`.
  `activeTab` and `contextMenus` are now required permissions. The typed tabs
  adapter reads only the user-invoked active tab and captures/resizes a local
  JPEG into the existing `ItemAppearance` image representation. Screenshot
  success/failure and bookmark creation success/failure use privacy-safe,
  failure-isolated activity boundaries. Popup initialization now runs once at
  the entry-point boundary before the editor renders, has an eight-second bound,
  and avoids React Strict Mode effect cancellation. WXT module preloads are
  disabled because Chromium extension pages reject cross-world preload reuse;
  normal module imports and shared chunks remain unchanged.
  Popup-scoped CSS fixes the action surface to the browser's 640-by-600-pixel
  popup viewport, removes the global root scrollbar gutter, assigns overflow
  only to the editor form without a stable form gutter, suppresses native
  dialog focus chrome and outer gaps, and styles the screenshot capture control
  with shared theme tokens.
- Added localized `ChangelogDialog` and `LegalDialog` surfaces that import
  bundled Markdown as build-time raw assets and render a safe subset without
  HTML injection or a runtime parsing dependency. The legal reader contains
  Privacy Policy, Terms of Use, a standalone GPLv3 application license, and a
  separate production-dependency license inventory. Added root installation,
  disclaimer, and security policies; the security policy defines extension
  trust boundaries and GitHub private vulnerability reporting as the sensitive
  disclosure channel. Added accessibility, contribution, and conduct policies,
  and expanded the public README with current feature, privacy, installation,
  development, support, documentation, and screenshot sections.
  `ProfileMenuPanel` routes both commands through its native-modal close queue.
  Informational document actions intentionally produce no activity event or
  notification. About localization now uses the publisher copyright notice.
- Added a bundled `FAQ.md` reader through `HelpDialog`, enabled the renamed
  Help & FAQ information command, and extended the shared safe Markdown subset
  with HTTPS links. Help links delegate to the existing confirmation-aware
  bookmark navigation boundary instead of navigating directly; passive Help
  viewing remains unlogged and does not notify.

### Changed

- Added a folder-only appearance mapper that applies fixed background attachment
  to image backgrounds while retaining the shared fit-mode size, position, and
  repeat properties. Card and thumbnail image rendering remains unchanged; this
  rendering-only behavior intentionally adds no activity event or notification.
- Relocated all publishable project Markdown from the temporary `docs/`
  directory to the repository root, removed the obsolete ignore rule, updated
  raw document imports and internal references, and converted the root README
  from prototype planning text to the current Alpha feature and build summary.
- Changed `ManageBookmarks.ensureRoot` creation defaults to a 135-degree
  `#2F80C9`/`#185A82`/`#0B1F3A` gradient, Small Card view, Comfortable spacing,
  Manual/Ascending/no-group display, enabled navigation-background inclusion,
  and 70-percent navigation transparency. Repository `ensureRoot` behavior
  still preserves an existing Home record, so no schema migration or
  existing-profile rewrite is required.

### Fixed

- Split `TopNavigation` into a left-aligned fixed Home breadcrumb anchor and an
  independently scrollable descendant-path container. Path changes continue
  scrolling the descendant container to its newest segment without moving Home
  offscreen, and the breadcrumb no longer centers within wide navigation grids.

## 0.0.9 - 2026-08-21

### Added

- Added a localized `AboutDialog` opened through the profile-menu close queue,
  with package-version and browser-target metadata, a 4:3 icon presentation
  area, and no logging or notification side effects.
- Added a profile-owned `enabled` master flag to `ActivityLogSettings` and
  Settings > Activity. `ManageActivityLog` checks it before the existing
  activity/diagnostic filters. Database schema 24 initializes the flag to true
  for schema-23 records without changing individual logging preferences.
- Replaced the General, Appearance, Accessibility, and Advanced branches in
  `SettingsCategoryIcon` with original stroke-based SVG geometry. The icons
  continue inheriting `currentColor` and remain hidden from the accessibility
  tree because the adjacent category labels provide their names.
- Added profile settings for `confirmExternalLinks`, `animationPreference`, and
  `highContrast`. Schema 25 supplies non-disruptive defaults for schema-24
  profiles. Bookmark opening now routes card, list, details, search, and context
  menu requests through the centralized confirmation/logging path. The root
  motion dataset and high-contrast class drive CSS and JavaScript motion
  behavior without adding permissions or exposing bookmark data. The side-panel
  animation hook distinguishes `none` from reduced motion so disabled motion
  completes panel state and the profile-summary reveal synchronously.
- Added validated `shortcutPreferences` with an enabled flag and explicit
  bindings for Search, Copy, Cut, Paste, Undo, Redo, and history. Schema 26
  initializes schema-25 profiles with enabled defaults. Shared normalization,
  reserved-combination checks, conflict detection, and event matching drive the
  Settings table and all app-local keydown handlers; standard editable-control
  and open-dialog suppression remains unchanged. `ShortcutSettingsPanel` uses
  the shared Settings fieldset spacing and theme-compatible secondary-button
  states instead of browser-native button presentation. Binding validation
  feedback renders in a dedicated three-column table row so it does not alter
  the control columns.

### Changed

- Settings category metadata now marks Import, Export, Backup, and Advanced as disabled.
  Their native navigation buttons stay visible but are excluded from pointer,
  keyboard, selected-category, and search auto-selection behavior. No settings
  schema, permission, logging, or notification boundary changed.
- Removed the Settings, Get info, and activity-log window-open event triggers.
  `UndoHistoryService` exposes a failure-isolated subscription for failed undo
  writes, and `App` records `UNDO-HISTORY-STORAGE-WRITE-FAILED` without item
  data when diagnostic recording is enabled. Failed activity-log persistence
  falls back to a non-sensitive console diagnostic and does not change the
  bookmark operation.
- Added schema-23 `undoHistory` with session/profile/position/timestamp indexes.
  `DexieUndoHistoryStorage` transactionally replaces the active session's
  ordered patches, while `BrowserUndoHistorySessionMarker` stores only an
  opaque UUID in shared extension session storage or webpage tab storage. A
  genuinely missing marker creates a new namespace and removes stale rows;
  one-shot preview-tab presence probes protect other live session IDs. Marker
  read failures cannot trigger cleanup, produce a persistent Error notice, and
  record `UNDO-HISTORY-INITIALIZATION-FAILED` when a profile logger is
  available. The legacy session-storage history value is removed best-effort.

### Fixed

- `UndoHistoryService.persist` now recognizes storage-capacity errors
  and retries with oldest-first retention instead of marking the complete
  in-memory history unavailable. Successful trimming updates Zustand state,
  IndexedDB persistence and cross-tab synchronization with the same retained
  entries, then emits the privacy-safe
  `UNDO-HISTORY-OLDER-ENTRIES-REMOVED` Warn boundary. Non-capacity failures and
  a newest entry that cannot fit alone retain the existing Error behavior.
- `UndoHistoryService.canApply` now treats ordinary edits, style changes, and
  favorite changes as item-local dependencies while retaining affected-ID
  overlap checks whenever either operation creates, deletes, or moves data.
  Explicit entry IDs continue to power per-item window actions; the default
  undo candidate is now selected by greatest `createdAt` so Ctrl+Z remains
  globally chronological even if cross-tab delivery changes array order.
- Undo-history entries now capture optional immediate-parent titles and bookmark
  hostnames from the full mutation state before their before/after patches are
  reduced to affected records. Existing schema-23 rows remain valid without
  these additive display fields, so no IndexedDB version change or migration is
  required. `UndoHistoryDialog` keeps stable item-ID groups contiguous and
  assigns start, middle, end, or single connector classes. Bounded flex text and
  native title attributes prevent long item context from overflowing while
  retaining access to complete values. This presentation-only change adds no
  activity-log or notification boundary.

### Migration Notes

- Upgrading from schema 22 creates the additive `undoHistory` table without
  modifying bookmark, folder, profile, settings, or activity rows. Legacy
  session-storage undo patches are intentionally not migrated because they are
  session-only; the old value is removed after the new marker initializes.
  Older builds ignore the new table but cannot expose schema-23 undo rows.

## 0.0.9 - 2026-08-19

### Added

- Added the domain-pure bookmark search service, responsive `SearchDialog`,
  Ctrl+F/content-menu integration, profile-grouped search sources, shared search
  option controls, and schema-22 persisted `searchPreferences`. Dialog option
  edits remain component-local, while Settings > Search persists the defaults
  loaded on each open. A capability-checked platform adapter invokes only the
  WebExtensions Search API and never derives provider URLs. The WXT manifests
  request the `search` permission. Search data-load, settings-save, web-search,
  and unavailable-capability boundaries use privacy-safe activity events and
  failure-isolated notifications. An unavailable explicit web action records a
  Warn event, shows an Information notice, and prevents the transition from
  bookmark mode without clipboard, keyboard-simulation, or navigation fallback.
  `SearchDialog` and Settings now render the shared `SearchOptions` component
  with full-width boundary rows around a two-column group of four select
  controls, aligned control sizing, balanced fieldset padding, and horizontal
  checkbox rows. The dialog resets transient query, disclosure, and mode state
  through the close and result-activation event paths; successful bookmark and
  Web-result navigation now close Search consistently with folder-result
  navigation. Queries and result content are excluded from logs and
  notifications.

### Fixed

- Moved dnd-kit activator attributes, listeners, and focus ownership from each
  `BookmarkGrid` drag wrapper to its native bookmark link or folder button. The
  wrapper remains the measured draggable and droppable node, while cards retain
  native semantics, one tab stop, and keyboard-sensor support. No schema,
  permission, or browser-compatibility change is required.

## 0.0.8 - 2026-08-15

### Added

- Added profile-local internal clipboard state in `App`, focus-scoped
  Ctrl+C/Ctrl+X/Ctrl+V handling, disabled Paste menu state, and matched
  privacy-safe INFO/WARN/ERROR activity and notification boundaries.
  `ManageBookmarks.copyItem` validates profile ownership and folder ancestry,
  recursively remaps folder and bookmark IDs, and sends each prepared tree to
  `DexieBookmarkRepository.addItems` for one IndexedDB transaction. Cut-paste
  reuses the validated atomic move path; Copy/Duplicate use undoable creation
  patches and Cut uses an undoable move patch. Both clipboard operations clear
  immediately after successful persistence but remain available when the
  mutation fails; a profile change also clears pending state. The former
  bookmark copy-format setting is no longer displayed because
  structural Copy does not write item content to the operating-system clipboard;
  explicit Get info Copy value controls retain that write-only behavior. No
  schema or permission change is required.

## 0.0.7 - 2026-08-14

### Changed

- Extended folder-owned display state and `FolderStyleDialog` with card size,
  card spacing, sort field, sort direction, and grouping. `App` now resolves
  these values from the open folder, while `ManageBookmarks.createFolder`
  copies the active profile defaults only at creation. Native `details` and
  `summary` elements provide independent accessible disclosure sections without
  duplicating open state in React.

### Migration Notes

- IndexedDB schema version 21 copies each profile's current card size, card
  spacing, sort field, sort direction, and grouping defaults into its existing
  folders. No indexes or serialized export formats changed.

### Fixed

- Decoupled active-folder initialization from same-profile preflight snapshot
  refreshes. Startup navigation now runs when the ready profile changes, while
  remembered-appearance updates preserve the current folder state.
- Card grids now use start-aligned implicit row tracks so their configured CSS
  gap controls both axes instead of distributing unused viewport height between
  wrapped rows. The same layout rule applies to grouped card content.

### Added

- Added a localized `UndoHistoryDialog` and session-scoped `UndoHistoryService`
  with a fixed search region, disclosure-controlled view and history filters,
  timeline and item-group modes, an independently scrolling list, and a fixed
  summary/footer region. The filter model intentionally excludes profile
  selection because undo history is session-scoped and cannot be operated from
  another profile.
  `ProfileMenuPanel` now exposes the ready-profile Undo history command, and
  `App` defers opening the modal until the side-panel close animation finishes.
  `UndoHistoryService` stores validated minimal before/after record patches,
  serializes mutations with undo/redo writes, limits history to 100 entries,
  clears redo branches after new mutations, and persists through a
  `browser.storage.session` adapter with webpage `sessionStorage` fallback.
  `DexieBookmarkRepository.restoreProfileState` atomically restores affected
  bookmark, folder, and favorite records without adding a durable IndexedDB
  schema. A platform Web Locks adapter serializes history writes across live
  tabs, with the service's local promise queue as the compatibility fallback.
  Bookmark mutations, keyboard commands, INFO/WARN/ERROR activity
  boundaries, and notifications are connected; shortcut handling is suppressed
  while dialogs or editable controls are active. The dialog's confirmed
  `Clear all` action serializes a profile-scoped history removal, broadcasts the
  new session state to live tabs, and preserves entries owned by other profiles.
  The manifest now requests the WebExtensions `storage` permission for
  `browser.storage.session`; the webpage preview continues to use
  `sessionStorage`. Settings schema is unchanged.

## 0.0.6 - 2026-08-13

### Added

- Added a per-surface Zustand-backed `NotificationService` with stable-ID
  replacement, content de-duplication, transient queuing, level-based duration
  defaults, and failure-isolated optional actions. Added an accessible
  `NotificationViewport` with edge-aware ordering, hover/focus timer pausing,
  Escape dismissal, reduced-motion and forced-color support, and localized
  Settings-save success/failure notices. Profile settings schema 16 persists
  only `notificationPreferences`: enabled state, four-corner position,
  newest/oldest order, and a 3/6/9 visible-stack limit. The notification close
  mark uses centered CSS pseudo-elements independently of the text glyph's font
  metrics. Added privacy-safe Success/Error triggers at implemented mutation and
  copy boundaries in `App`, plus activity-log load, settings, clear, and export
  triggers in `BookmarkActivityLogDialog`; storage-estimate fallback emits
  Warning. The viewport uses a manual popover to remain in the browser top layer
  above modal dialogs; its CSS resets the user-agent popover inset before
  applying the persisted corner class, preventing default top/left inset values
  from overriding Bottom right and the other saved positions. Notification
  level icons use a normalized flex-centered line box. `NotificationViewport`
  portals once to `document.body` and observes open application dialogs only to
  re-promote its manual popover above newer top-layer entries. Notification-card
  identity is stable across service revisions, and timer effects use a stable
  event callback so unrelated window renders do not reset elapsed duration.
  Document scroll locking is derived from `dialog[open]` in CSS rather than
  notification host state, preventing notification dismissal from changing the
  main scrollbar. Rejected button-owned
  profile operations are consumed after their Error notification prevents
  unhandled promises. App error notices no longer attach the activity-log
  action. Bookmark create/update failures classify Zod URL issue codes into
  localized, privacy-safe malformed-address, blocked-scheme, and embedded-
  credential explanations while leaving durable diagnostics in the activity
  log.
- Added schema-17 `bookmarkSortBy`, `bookmarkSortDirection`, and
  `bookmarkGroupBy` profile settings with manual/ascending/none migration
  defaults. Shared content organization derives stable card, list, and details
  ordering without mutating item indexes; domain grouping uses parsed hostnames
  and a separate folder group. Details-table column actions remain local
  overrides of the saved initial ordering.
- Added schema-18 drag-and-drop profile settings and dnd-kit pointer/keyboard
  orchestration for content cards. Drag-over state resolves one exclusive
  before/inside/after intent from horizontal target zones, with delayed middle
  activation and immediate edge cancellation. A bounded `DragOverlay` keeps the
  preview above sibling cards, and a dnd-kit modifier clamps transforms to the
  bookmark content panel. Pointer intent uses raw window-level pointer/touch
  coordinates independently of the clamped overlay and its modified drag delta;
  keyboard intent retains rectangle-center targeting. Drag-move and drag-over
  events share the intent resolver so same-target zone changes remain
  observable; duplicate intent state is ignored, and edge intents resolving to
  the same visible group position are suppressed. A derived item-to-group map
  enables manual edge reordering within an active group and rejects cross-group
  edge intents. `ManageBookmarks.moveItem` validates profile
  ownership and folder ancestry before `DexieBookmarkRepository.moveItem`
  atomically reindexes source/destination siblings, changes the parent, and
  touches both ancestor chains. Move boundaries emit privacy-safe matched
  `ITEM-MOVE-COMPLETE`/`ITEM-MOVE-FAILED` records and user notifications.
  `ManageBookmarks.moveItem` exposes a post-validation, pre-persistence
  callback. `BookmarkGrid` uses it to clear transient drag visuals, mark the
  content region busy, and disable every dnd-kit source until persistence,
  content reload, and activity recording settle; success and failure both
  release the lock.
- Added schema-20 bookmark-behavior preferences for duplicate policy, URL
  normalization, favicon/folder fallback, last appearance, tag order, and copy
  format. Icon-free folder cards and their drag overlays switch the details
  grid to one flexible column instead of retaining the removed icon column.
  Canonical URL matching is profile-wide. Mandatory deletion
  confirmation remains application behavior rather than a stored preference.
  The editor URL control uses text semantics with `inputmode="url"` so
  application normalization handles protocol-less domains, localhost, and IPv4
  addresses before the strict URL schema runs.
  `DexieBookmarkRepository.deleteItem` transactionally removes bookmark records
  or complete folder subtrees and their favorite references.
  Context-menu Copy and Delete now emit privacy-safe completion/failure events.
- Added an application-scoped `ConfirmationService` backed by transient Zustand
  state. It serializes asynchronous decisions, while `ConfirmationDialog` uses
  the HTML dialog top layer, accessible labelling, Cancel-first focus, Escape
  cancellation, focus restoration, semantic action labels, and a destructive
  button variant. Bookmark creation/editing, FTP opening, deletion, and
  folder-move confirmations no longer call the native browser confirmation API.

### Migration Notes

- IndexedDB schema version 20 initializes existing profiles to Allow duplicates,
  Ask before adding HTTPS, available favicon with initials fallback, folder
  initials, preserved tag order, URL-only copying, and no remembered appearance.
  Profiles that stored the removed Do not add protocol value are moved to Ask.
  Bookmark content is unchanged.
- IndexedDB schema version 18 enables dragging and folder drops, selects the
  600 ms hover delay, disables confirmation, and keeps the current folder after
  a move for existing profiles. No content records are changed.

- IndexedDB schema version 17 initializes existing profiles to Manual order,
  Ascending direction, and no grouping without changing bookmark or folder
  records.
- IndexedDB schema version 16 enables notifications for existing profiles with
  Bottom right, Newest first, and three visible entries as defaults. No table or
  index changes are required, and notification entries remain memory-only.

### Changed

- Replaced fractional Card-view `minmax()` columns and the narrow-viewport grid
  override with fixed 150/210/290 px columns scoped to Card view. Viewport
  changes now affect wrapping only; List and Details retain their own sizing.
- Consolidated modal-header close controls under a shared CSS rule that
  normalizes button geometry and SVG sizing, and draws the remaining text-based
  editor close marks with centered CSS pseudo-elements without changing React
  markup or behavior.

## 0.0.5 - 2026-08-12

### Added

- Added schema-12 General settings for `startupLocation`,
  `lastOpenedFolderId`, `bookmarkOpening`, and `folderOpening`, with Home/last
  startup resolution and card/details interaction support. Bookmark display
  rendering now belongs to Appearance.
- Added schema-13 profile settings for `accentColorMode`, `customAccentColor`,
  `cardSpacing`, and `scrollbarBehavior`. Appearance persists these fields with
  the existing theme, view, and card-size settings; the application maps them to
  shared accent variables, bookmark-grid spacing classes, and scrollbar modes.
  `DomThemeController` remains the single theme application boundary; semantic
  light palette tokens and compatibility overrides now cover all legacy dark
  window surfaces. Shared light-theme button and icon-container selectors use
  white control surfaces with dark inherited foregrounds. The controller owns a
  `prefers-color-scheme` change listener only while `theme` is `system` and
  removes it before applying an explicit Light or Dark preference. The Settings
  color input now shares the editor color control's full-width, 48-pixel sizing.
  Shared `--highlight-background` and `--highlight-border` tokens derive
  navigation hover and selection states from the active accent color. Renamed
  localization key `systemAccent` to `defaultAccent` and set `#88BDF2` as the
  shared default accent, focus color, and initial custom color.
  Scrollbar modes now apply to the document root and nested scroll containers.
  WebKit scrollbar pseudo-elements provide persistent Always-visible thumbs,
  while root scroll capture drives the shared idle/active state for System and
  Shown-while-scrolling modes across Chromium and Firefox.
- Added schema-15 `dateTimeFormat` and `firstDayOfWeek` profile settings and a
  shared date-time formatter used by Details view, Get info, activity logs, and
  profile windows. Language settings persist `en-US` as the only available and
  fixed fallback application locale while exposing browser, US, international,
  and ISO formatting modes.

### Migration Notes

- IndexedDB schema version 12 converts unsupported startup-location values to
  Home and removes obsolete selected-folder startup IDs without changing table
  indexes.
- IndexedDB schema version 13 initializes default accent, `#88BDF2` custom color,
  Comfortable card spacing, and shown-while-scrolling behavior when those fields
  are absent, without changing table indexes.
- IndexedDB schema version 14 replaces the former `#55B7FF` generated custom
  accent default with `#88BDF2`; other saved custom colors remain unchanged.
- IndexedDB schema version 15 sets `en-US`, Browser-default date/time formatting,
  and Browser-default first day of the week for existing profiles without
  changing table indexes.

## 0.0.4 - 2026-08-11

### Added

- Added the `profilePreferences` settings contract, Profiles settings panel,
  localized storage-estimate donut chart, expandable per-profile byte estimates,
  profile-count enforcement, delete-confirmation flow, fallback avatar modes,
  and privacy-safe Warn logging when storage estimation is unavailable.

- Added a responsive, accessible Settings shell with searchable category
  navigation, a General bookmark-display section, thirteen localized placeholder
  categories, fixed form actions, and localized no-results behavior. Import,
  Export, and Backup use separate category IDs.
- Added a privacy-safe `SETTINGS-WINDOW-OPENED` Info activity event; search text
  and unsaved setting values remain unlogged.
- Added privacy-safe activity and diagnostic triggers for item updates,
  first-profile completion, profile-list loading, folder and bookmark navigation,
  initial-folder load failure, Get info opening, and activity-log load, settings,
  clear, and export boundaries.

### Changed

- Extended profile duplication to remap bookmark, folder, favorite, and optional
  activity-log identifiers; apply selectable content, appearance, and image
  policies; append the default `Copy` suffix; and remove a partially created
  duplicate if copying fails.
- Added shared window title and supporting-text CSS tokens and final-cascade
  selectors covering content editors, Settings, profile windows, welcome/setup,
  activity-log guidance, and folder-tree informational states without changing
  labels, values, warnings, or errors.
- Refactored `BookmarkDisplaySettingsDialog` from a compact editor into a
  two-region settings workspace with a 220-pixel minimum category rail,
  fixed search and reserved footer rows, independently scrolling icon-labeled
  category navigation, selected-only row treatment, one-word labels, and empty
  non-General option panes while retaining the existing validated profile-level
  `bookmarkView` and `cardSize` persistence contract. Removed the repeated
  global Settings heading and summary from the category content area, and wired
  the fixed sidebar footer to the localized `displaySettings.footerCredit` key.
- Advanced the build-day extension version to `0.0.4` for the first production
  builds on August 11, 2026; additional browser builds on the same date reuse it.
- Made activity-log operation logging best-effort and refreshed visible records
  after settings, clear, and export events without allowing logger failures to
  change the primary operation result.
- Expanded the repository instructions with a required per-feature logging audit
  covering success, supported degradation, failure, and privacy.

### Migration Notes

- IndexedDB schema version 10 adds default `profilePreferences` values to every
  stored profile-settings record. No tables or indexes were removed, so rollback
  code that ignores unknown settings fields remains data-compatible.

## 0.0.3 - 2026-08-10

### Added

- Added a localized item-information dialog, a write-only clipboard platform
  adapter, and privacy-safe copy success/failure events.
- Added derived, non-persistent Get info presentation fields, including
  one-based position and localized item/appearance types.
- Added explicit enabled-only profile-menu hover state for pointer entry, exit,
  and disabled commands.
- Added IndexedDB schema 9 for validated, profile-scoped favorite item IDs;
  repository and application queries for Favorites and the five newest items;
  privacy-safe favorite activity events; and localized navigation UI.
- Added IndexedDB schema 5 with migration of existing folders to their profile's
  saved view, validated per-folder view/background mutations, localized folder
  style UI, background reapplication, and privacy-safe activity triggers.
- Added IndexedDB schema 6 with safe defaults for per-folder navigation
  background inclusion and validated 0–100 transparency, plus dark/light CSS
  overlays.
- Added IndexedDB schema 7 to migrate legacy image-fit values and a shared,
  validated six-mode image background renderer used by every appearance surface.
- Added IndexedDB schema 8 with a safe opaque Details-table default, validated
  per-folder transparency, and an explicit folder-background `none` state.
- Extended the validated profile view setting with `details` and added a
  localized, semantic details table with stable locale-aware sorting, accessible
  sort state, and shared item context-menu targets.
- Added privacy-safe Info and Error activity events for profile display-setting
  updates.

### Fixed

- Added a shared folder-style helper-text class for consistent muted typography.
- Moved the Details transparency variables onto the table scroller, scaled the
  header tint with the same value, and restored the generic icon-button surface.
- Remounts the folder-style form on every open and keys it by folder ID so local
  React state always initializes from the selected folder without sync effects.
- Updated the shared content-editor image layout to a single responsive column,
  preventing native file controls from overflowing modal bounds.
- Combined per-folder background and view updates into one validated folder
  mutation and removed current-folder mutation from profile-default settings.
- Replaced inconsistent gradient-direction selects with a shared slider/number
  control and strict decimal-integer parsing constrained to 0–359 degrees.
- Constrained List-view implicit grid rows to their content height.

## 0.0.2 - 2026-08-05

### Fixed

- Marked folder cards as item context-menu targets shared with bookmark cards.
- Preserved the selected folder ID through the folder-tree panel callback and
  subsequent breadcrumb navigation.

### Added

- Added typed bookmark/folder context targets, validated folder deep links,
  profile-scoped repository update operations, ancestor timestamp propagation,
  and shared editor create/edit modes.
- Added IndexedDB schema version 4 with a schema-3 content migration,
  structured gradient/image appearance data, tags, notes, optional local icons,
  position indexes, folder backgrounds, and profile display defaults.
- Added a centralized bookmark URL schema with HTTP/HTTPS/FTP normalization,
  credential/control-character rejection, strict protocol allowlisting, and
  injection/browser-internal protection.
- Added cross-store content-ID collision checks and ancestor timestamp
  propagation with cycle detection.
- Added validated profile display-settings persistence and a localized settings
  dialog wired through preflight reload.
- Added validated Bookmark, Folder, and appearance domain schemas; a
  framework-independent creation/query service; and a Dexie repository.
- Added IndexedDB schema version 3 with profile/parent-indexed bookmark and
  folder stores, lazy root-folder creation for existing profiles, and
  profile-deletion cleanup.
- Injected the activity logger into webpage preflight with non-blocking localized
  INFO/WARN/ERROR triggers, added matched success/failure profile-operation
  records, and documented future trigger requirements in `AGENTS.md`.
- Added validated activity-log domain records and settings, a repository
  contract, retention/export application service, Dexie implementation, browser
  target adapter, and user-initiated file-download adapter.
- Added IndexedDB schema version 2 with profile-indexed `activity` and
  `activityLogSettings` stores plus version-1 upgrade preservation.
- Extended typed activity-log records with non-sensitive diagnostic
  context and added localized, `aria-describedby`-connected detail help that is
  revealed on pointer hover or keyboard focus.
- Added a localized activity-log dialog with durable service loading, saved
  settings, semantic disclosure controls, bounded internal scrolling, confirmed
  deletion, and explicit plain-text export.
- Added profile duplication with bounded unique-ID generation, copied settings,
  new timestamps, and transactional persistence.
- Added a browser-independent webpage preflight orchestrator with locale
  resolution, typed unavailable results for extension-only capabilities,
  immutable startup snapshots, and a post-render UI-ready signal.
- Added validated profile-management services and transactional Dexie operations
  for listing, creating, updating, guarded deletion, and active-profile changes.
- Added accessible, localized profile switcher and manager dialogs.
- Added a localized, native-dialog-based first-run welcome surface with initial
  focus, Escape dismissal, scroll locking, reduced-motion handling, responsive
  layout, and accessible controls.
- Added a validated first-profile application service and Dexie repository that
  atomically create the profile, default settings, and active-profile metadata.
- Added bounded UUID collision retries and validation for required usernames and
  optional PNG, JPEG, or BMP data-URL icons.
- Added the transparent extension icon to WXT public assets for the welcome
  surface.
- Added a persistent, time-zone-aware extension-version state and build-day
  incrementer that ignores missed build days.
- Established the strict TypeScript, React, Vite, and WXT project foundation.
- Added WXT production targets for Chrome Manifest V3, Firefox Manifest V2, and
  Microsoft Edge Manifest V3.
- Added the initial local-first Dexie and IndexedDB persistence layer for
  profiles, settings, and versioned database initialization.
- Added application initialization boundaries that expose first-run, ready,
  recovery, and storage-unavailable states without relying on persistent
  background-worker memory.
- Added i18next-backed interface strings and semantic, keyboard-accessible UI
  foundations for navigation, panels, trees, bookmark cards, and custom menus.

### Changed

- Updated localized Get info date labels.
- Reordered the derived Get info rows without changing stored item data.
- Removed the unused Get info section label, localization entry, and styling.
- Added a dedicated primary-row boundary so the shared last-row rule does not
  remove the Title/URL separator, and removed the extra margin before the More
  details boundary so all direct-row dividers use consistent spacing.
- Moved Get info overflow from the dialog element to an inset, stable-gutter
  scroll region beneath the fixed header.
- Moved shared bookmark/folder editor overflow to its inset form with a stable
  scrollbar gutter, covering both create and edit modes.
- Centered the shared editor's text close glyph with an explicit CSS grid,
  zero padding, and normalized line height.

- Added desktop and compact breakpoint column gaps to the top-navigation grid
  without changing breadcrumb overflow behavior.
- Changed the shared card-detail grid from start alignment to vertical centering
  while preserving its equal padding and fixed minimum height.
- Removed native button spacing from folder cards and unified bookmark/folder
  markup and layout rules.
- Changed the shared content-creation dialog to construct validated linear
  gradient values from three color controls and a fixed direction enumeration.
- Replaced hard-coded bookmark and folder feature data with active-profile
  IndexedDB queries and wired context-menu commands to accessible creation
  dialogs and privacy-safe activity triggers.
- Updated activity-log environment records to report database schema version 4.
- Replaced repeated environment fields with a one-time export header and an
  injection-safe, single-line-per-event `text/plain` formatter.
- Made the activity-log confirmation and export footer states mutually exclusive.
- Replaced baseline-dependent activity-log disclosure glyphs with fixed-frame,
  CSS-drawn directional chevrons.
- Replaced layout-affecting activity-detail tooltips with native `title`
  attributes and visually hidden `aria-describedby` content.
- Changed the activity-log detail grid from two columns to one field per row,
  retaining aligned labels and safe value wrapping.
- Added document scroll locking for profile dialogs and a bounded internal
  profile-list scroll container.
- Connected active-profile icon data from resumed preflight state to navigation
  and profile-menu presentation with a fallback glyph.
- Added localized profile-icon removal state for the profile manager editor.
- Documented preflight public contracts and non-obvious startup, locale,
  profile-resume, and UI-ready logic, and established the code-commenting
  standard in the architecture guide.
- Documented the planned restart-safe, once-per-browser-session background
  preflight, new-tab snapshot requests, and two-stage browser/profile locale
  resolution with an American English fallback.
- Routed first-profile completion back through preflight and persisted the
  selected startup language in the new profile's settings.
- Configured WXT production build and package commands to increment `0.0.patch`
  at most once per New York build date and reuse the stored version otherwise.
- Updated package metadata to the current `0.0.2` extension version.
- Replaced the empty-area `saveOpenTabs` context-menu definition and icon with a
  localized `customizeFolderStyle` placeholder.
- Updated localized welcome copy and product documentation
  to distinguish optional online accounts from the required active local
  profile and its saved bookmarks, settings, and logs.
- Extended the welcome dialog with animated stage replacement, accessible
  username and icon controls, submission/error states, and no password input.
- Normalized all custom context-menu SVG drawings to a shared square glyph
  frame while retaining the existing shared SVG viewport and menu layout.

### Compatibility

- Preserved extension build support for Chrome, Firefox, and Microsoft Edge.
- Kept browser-facing behavior behind WXT-generated browser-specific manifests.
