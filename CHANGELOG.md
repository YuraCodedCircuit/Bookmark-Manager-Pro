# Changelog

This changelog records user-visible Bookmark Manager Pro improvements and
behavior. Developer-facing implementation details are maintained in the
[developer changelog](https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro/blob/main/CHANGELOG_DEV.md).

## Unreleased

## 0.1.5 - 2026-09-09

### New

- Normal extension upgrades now open What's new once when the next app tab is
  ready, showing only the dated changelog section for the installed version.
  Settings > General can disable future automatic announcements, and unavailable
  release notes offer the full bundled changelog in the same window. The full
  changelog links to the published developer changelog on GitHub.
- The Save current URL popup now places a filterable folder tree after Note for
  choosing where Save bookmark creates the bookmark. It initially selects the
  newest created folder and reveals only that folder's ancestor path. Long names
  and deep nesting scroll horizontally without moving the filter or surrounding
  popup content.
- Color and Gradient appearances now include a button after the preview for
  generating a random solid color or a three-color gradient and direction.
- Notifications settings now allow the automatic-close countdown line to use a
  custom profile-owned color or continue following the app foreground color.

### Improved

- Newly created folders now start with Home's default blue gradient and matching
  navigation background at 70-percent transparency.
- Settings search now matches localized text and labels inside every category,
  keeps category rows visible, disables nonmatches, marks matching categories,
  and highlights visible phrases, including matches in the displayed value of a
  closed choice control. No-results guidance can open a blank GitHub
  feature-request form without transmitting the search phrase.
- Horizontal scrolling in folder trees now moves only the tree, keeping the
  left panel's shortcuts and filter fixed to the panel width.
- Favorites and Recent rows now show their complete bookmark or folder title in
  a native tooltip when the pointer rests on truncated text.
- Auto-closing notifications now show a 5 px countdown line that recedes from
  right to left and pauses while the notification is paused.

### Fixed

- Removed the empty right-edge gap in the main window in Chrome and Edge.
- Runtime validation no longer produces Content Security Policy errors in
  extension pages.
- Removed the Chromium-only strip after the Save current URL popup scrollbar
  without changing the popup fields or Firefox scrollbar behavior.
- The Save URL to Bookmark Manager Pro right-click command now appears in
  Chrome and Edge and restores itself after an extension reload or browser
  cleanup. The right-click command, toolbar label, and popup title now make clear
  that this action saves the page address, not an offline copy of the webpage.

## 0.1.0 - 2026-08-24

### Added

- Added the Manifest V3 extension background foundation for Chrome, Edge, and
  Firefox. It validates local startup once per browser session, safely reports
  readiness to extension pages, and does not run in private or incognito
  windows. Firefox packages now place `manifest.json` correctly at the ZIP root.
- Added the Bookmark Manager Pro icon to browser tabs, extension listings, and
  the toolbar. Clicking the toolbar icon or choosing Save page to Bookmark
  Manager Pro from a page's right-click menu opens a prefilled bookmark form.
  Its popup-only Screenshot option captures the visible page locally and shares
  the same replaceable card-image field as an uploaded image. The popup uses one
  edge-to-edge scrolling content area without a highlighted outer panel or
  reserved space after its scrollbar, and its capture button matches the app's
  controls. Popup loading is bounded and shows a friendly error instead of
  remaining on Loading.
- The profile menu Information section now includes What’s new, which opens the
  app changelog in a readable Markdown window, and Legal & privacy, which shows
  the Privacy Policy, Terms of Use, GPLv3 app license, and separate third-party
  notices offline. The project now includes installation, disclaimer, and
  security guidance, with sensitive reports directed to GitHub private
  vulnerability reporting. The About window now displays the YuraCodedCircuit
  copyright notice.
- Help is now Help & FAQ and opens an offline guide with 65 answers covering
  setup, profiles, bookmarks, search, undo, appearance, privacy, storage, and
  troubleshooting, plus a link to the project's GitHub page.

### Changed

- Folder background images now remain still while bookmark content scrolls,
  without changing the selected Fill, Fit, Stretch, Tile, Center, or Span mode.
- New profiles now start Home with a blue three-color gradient that continues
  behind the navigation panel at 70 percent transparency, plus Card view, Small
  cards, Comfortable spacing, Manual order, Ascending direction, and no
  grouping. Existing profiles are unchanged.

### Fixed

- Home now remains visible and clickable at the left of the top navigation
  column at every window width while long descendant paths scroll horizontally.

## 0.0.9 - 2026-08-21

### Added

- About Bookmark Manager Pro now shows the app icon, local-first description,
  version, browser target, Alpha status, local-storage statement, and matching
  footer. The approved icon now also appears in the browser tab and packaged
  extension.
- Settings > Activity now has a profile-owned switch that can stop or resume
  all new activity and diagnostic logging without deleting existing records.
- General, Appearance, Accessibility, and Advanced now use clearer original
  category icons inspired by familiar settings concepts.
- Settings > Security can now ask before any external bookmark opens, while
  Settings > Accessibility can follow system motion, reduce motion, remove
  animations, or enable higher contrast. No animations also removes the profile
  summary reveal in the right panel.
- Settings > Shortcuts now lists app-local shortcuts in a table, supports a
  profile-owned enable switch, records replacement key bindings, rejects
  duplicate or reserved combinations, and restores one binding or all changed
  bindings to their defaults. Its spacing, fieldset, table controls, and buttons
  now match the other Settings categories and application controls, and binding
  errors use a full-width row without moving the shortcut controls.

### Fixed

- Import, Export, Backup, and Advanced remain visible in Settings but are now disabled
  until those categories are available.
- Opening application windows no longer adds activity-log entries. A failed
  undo-history write now adds a privacy-safe Error record when the activity log
  is still available.
- Consecutive edits no longer make every undo-history entry unavailable when
  storage fills. Undo patches now use the main local database while session
  storage keeps only a temporary identifier. The oldest entries are removed
  only if database capacity is reached, while retained history remains usable
  and a warning explains the reduction.
- The Undo and redo history window now enables the newest safe operation for
  each independent item. Older operations on the same item and structural
  folder dependencies remain blocked, while Ctrl+Z continues undoing the newest
  timestamped operation globally. Records for the same item are connected
  visually, and parent-folder names plus bookmark hostnames help distinguish
  items with identical titles without allowing long text to overflow.

## 0.0.9 - 2026-08-19

### Added

- Added a Ctrl+F Search window with live local bookmark and folder results,
  temporary in-window options, saved defaults under Settings > Search, and
  optional all-profile grouping. Web mode sends its local action suggestion
  through the browser Search API using the saved bookmark-opening behavior. If
  that API is unavailable, selecting Web immediately explains the limitation
  and stays in Bookmarks without copying or sending the query. Search options
  use the same 1-4-1 layout, consistent control heights, and horizontal
  checkbox rows in the Search window and Settings. Search fields have balanced
  inner spacing, and closing Search from its X button or a result clears the
  query and hides options for the next open.

### Fixed

- Bookmark and folder cards now appear once in the keyboard tab order and show
  one focus ring while retaining keyboard drag-and-drop.

## 0.0.8 - 2026-08-15

### Added

- Added profile-local Copy, Duplicate, Cut, and Paste for bookmarks and complete
  folder trees. Paste stays visible but disabled until an item is ready, rejects
  a folder's own nested destinations, and supports Ctrl+C, Ctrl+X, and Ctrl+V
  outside editable fields and application windows. Copy and Cut are one-shot:
  one successful Paste clears the pending item and disables Paste again, while
  a failed Paste remains retryable. Switching profiles also clears the pending
  item.

## 0.0.7 - 2026-08-14

### Improved

- Customize folder style now saves Card size, Card spacing, sorting, direction,
  and grouping separately for each folder. Its Folder view, Folder background,
  and Navigation panel sections can be expanded or collapsed to shorten the
  window. Appearance settings now provide defaults for newly created folders
  without changing existing folders.

### Fixed

- Creating a bookmark or folder inside a nested folder now keeps that folder
  open instead of returning to Home when remembered appearance is saved.
- Card view now uses the selected Card spacing equally between columns and
  wrapped rows, including rows inside bookmark groups.

### Added

- Added a session-only Undo and redo service and history window from the profile
  menu. Bookmark and folder creation, editing, moving, deletion, favorite, and
  folder-style changes can be reversed or reapplied safely. Search
  stays visible while a Filters button reveals view, availability, item type,
  action, and sorting controls. Profile selection is omitted because session
  history cannot be accessed from another profile. The scrolling history preview
  supports a timeline or item groups, and the fixed footer shows the matching
  session count, a confirmed Clear all action for the active profile, and Close.
  Ctrl+Z, Ctrl+Y, and Ctrl+Shift+Z work when no application window is open. The
  browser storage permission keeps private undo data within the browser session
  and does not send or synchronize content. No Settings options are included
  yet.

## 0.0.6 - 2026-08-13

### Added

- Added privacy-safe in-app notifications for completed and failed operations.
  Notifications can be enabled or disabled and placed in any screen corner.
  They support Newest first or Oldest first ordering, edge-aware stacking, and
  limits of 3, 6, or 9 visible messages. Timed messages pause while hovered or
  keyboard-focused, errors remain until dismissed, and identical messages do
  not repeatedly fill the stack. The notification close mark is centered within
  its button. Notifications now report completed and failed operations in all
  available application windows, including profiles, bookmark and folder
  editors, folder styles, Get info, Settings, and the activity log. Recoverable
  storage-estimate fallback appears as a warning, and notifications stay visible
  above open windows. Saved corner choices now place notifications at the
  selected screen edge, and each notification-type icon is centered in its
  circular outline. Notification controls remain clickable while an editor,
  Settings, or another modal window is open, and notification cards are no
  longer clipped by the modal boundary. Notifications remain attached to the
  main window and above newly opened panels without restarting their remaining
  time. Dialogs lock the main scrollbar until the last dialog closes, while
  showing or dismissing a notification does not change scrolling. Error messages now explain
  user-correctable causes in plain
  language without an activity-log button. Bookmark URL errors distinguish
  incomplete addresses, unsafe address types, and URLs containing usernames or
  passwords without displaying the submitted URL.
- Added profile-owned bookmark organization settings for Manual order, Title,
  Date created, Date modified, or Domain sorting; Ascending or Descending
  direction; and None, Type, or Domain grouping. Manual order preserves saved
  positions, and folders receive their own group when bookmarks are grouped by
  domain.
- Added file-manager-style bookmark and folder movement with manual reordering,
  exclusive before, inside, and after target zones, content-panel drag
  boundaries, an always-on-top drag preview, delayed drop-into-folder
  highlighting, keyboard operation, folder-cycle protection, and optional
  confirmation or destination opening. Pointer-based zones remain reachable on
  the first and last cards even though the preview stays inside the panel.
  Moving between zones on one card updates the operation, while destinations
  that would not change the order are hidden. Manual ordering also works within
  each visible group without allowing edge drops across group boundaries. Bookmarks
  settings control whether dragging and folder drops are enabled, choose a
  400/600/900 ms hover delay, and choose what happens after a folder move.
  Valid drops clear the drag preview immediately while saving continues, and
  another drag cannot begin until the move finishes.
- Added Bookmarks settings for profile-wide duplicate URL handling, missing
  HTTPS behavior with Ask or automatic addition, favicon and folder-icon
  fallbacks, full-width folder text when icons are hidden, remembered appearance, tag
  ordering, and bookmark copy format. Inputs are trimmed before saving;
  domain, localhost, and IPv4 addresses without a protocol reach the Add HTTPS
  confirmation instead of the browser's generic URL warning;
  dangerous and browser-internal addresses remain blocked; FTP asks before
  saving or opening. Copy now writes the selected value, and confirmed Delete
  removes a bookmark or a folder with its contents.
- Added app-styled confirmation windows with localized Cancel and action-specific
  buttons such as Add HTTPS, Save copy, Move, and Delete. Delete uses a red
  destructive-action button. Confirmations appear above other windows and
  support keyboard navigation, Escape-to-cancel, safe initial focus, and focus
  restoration.

### UI/UX

- Matched the close icon size and centering across application windows to the
  Manage profiles window.
- Card widths now remain fixed at the Small, Medium, or Large size selected in
  Appearance settings instead of stretching with the window. Cards wrap to a
  new row when less horizontal space is available.

## 0.0.5 - 2026-08-12

### Added

- Added General settings for opening Home or the last opened folder at startup,
  opening bookmarks in the current or a new tab, and opening folders with one or
  two clicks. Home, current-tab bookmark opening, and single-click folders are
  the defaults.
- Added Appearance settings for system, dark, or light themes; default or custom
  accent colors; Compact, Comfortable, or Spacious card spacing; and system,
  always-visible, or shown-while-scrolling scrollbars. Light theme applies white
  backgrounds and dark text throughout cards, panels, windows, and controls.
  Buttons and icon containers use white backgrounds with dark labels or icons.
  When Use system theme is selected, the app now follows system theme changes
  immediately without requiring a reload. The custom accent color chooser fills
  the settings control width and matches the color chooser used when editing
  bookmark and folder appearance. The folder tree, profile menu, and Settings
  categories use the selected accent color for consistent highlights.
  The default accent is `#88BDF2`.
  New profiles show scrollbars only while scrolling by default.
  Scrollbar choices now behave consistently in Chrome, Edge, and Firefox:
  System and Shown while scrolling auto-hide when idle, while Always visible
  keeps a themed scrollbar visible.
- Added Language settings with a disabled American English selector, app-wide
  Browser default, American, International, or ISO date and time formatting, and
  Browser default, Sunday, Monday, or Saturday as the first day of the week.

## 0.0.4 - 2026-08-11

### New

- Added Profiles settings with a local-storage chart, optional per-profile size
  list, profile-count limit, duplication choices, switching and startup
  preferences, deletion confirmation, and fallback profile icons.

### Improved

- Profile duplication now adds “Copy” by default, creates new item identifiers,
  and copies only the profile content selected in Profiles settings. Activity
  logs remain excluded by default.
- Standardized every window with the same large bold title and smaller, lighter
  subtitles and informational text for a consistent reading hierarchy.
- Replaced the compact bookmark display window with a full Settings layout that
  separates a wider category rail, category options, and fixed Cancel and Save
  actions. Search and a reserved bottom panel stay fixed while only the
  icon-labeled category list scrolls. The options area no longer repeats a
  Settings heading, leaving more room for controls. General contains the existing
  bookmark display controls; thirteen additional one-word categories have empty
  option panels, with Import, Export, and Backup listed separately.
- The activity log now records bookmark and folder edits and opening requests,
  first-profile completion, profile-list loading, Get info opening, and log
  loading, settings, clearing, and export without storing personal content.
- Successful operations use Info, supported webpage limitations use Warn, and
  failures that need diagnosis use Error.

## 0.0.3 - 2026-08-10

### Added

- Added a compact Get info window for bookmarks and folders with their saved
  appearance, title, URL when applicable, ID, dates, and per-row copy buttons.
- Extended Get info with Type, Parent folder, and a compact More details section
  for tags, note, position, and appearance type.
- Added pointer highlighting to enabled profile-menu commands while keeping
  disabled commands visually inactive.
- Added profile-specific Favorites and five-item Recent sections above Search
  and the folder tree. Bookmarks and folders can be favorited from their item
  menu and removed with the row's pin button.
- Added a Customize folder style window for saving and restoring a color,
  three-color directional gradient, or local image on the currently open folder.
- Added an optional per-folder navigation-background extension with adjustable
  transparency and theme-aware readability treatment.
- Added Fill, Fit, Stretch, Tile, Center, and Span image presentation choices
  to item and folder-style editors.
- Made Card, List, and Details selection folder-specific while using the saved
  selection as the default for newly created folders.
- Added a profile-level Details view with a compact table for item appearance,
  title, URL, modification date, and type. Every labeled column can be sorted in
  ascending or descending order.
- Added per-folder Details-table background transparency and a No background
  choice that restores the normal themed application surface.

### Fixed

- Matched the Details-table transparency help text styling to the subdued
  navigation transparency explanation.
- Applied Details-table transparency to both the header and body so 100% fully
  reveals the folder background behind the table.
- Reloaded every Customize folder style control from the current folder whenever
  the window opens, preventing stale unsaved values from another opening.
- Stacked image appearance controls vertically so the fit selector and file
  picker remain within the bookmark and folder editor windows.
- Moved existing-folder view selection into Customize folder style and limited
  the Settings view choice to the default for newly created folders.
- Standardized gradient direction in item and folder-style editors with the
  same synchronized slider and exact numeric degree input.
- Changed List view to keep items in a compact top-to-bottom sequence instead
  of stretching rows to fill the content panel.

## 0.0.2 - 2026-08-05

### Fixed

- Fixed right-clicking folder cards so they open the item-actions context menu
  instead of the empty-content-area menu.
- Fixed folder-tree selection so it opens the selected folder's content and
  preserves subsequent navigation through the top breadcrumb path.

### Added

- Added working Open, Open in new tab, and prefilled Edit actions for bookmark
  and folder context menus, including durable edit saving through the shared
  creation UI.
- Added tags and notes to bookmark and folder creation, FTP bookmark storage,
  profile-level card/list and card-size defaults, and durable item ordering.
- Added a functional Bookmark display settings window for changing the active
  profile's Card/List view and Small/Medium/Large card size.
- Added a localized “Made with ❤️ and magic” message to the fixed Settings
  sidebar footer.
- Added strict URL protection that rejects executable, inline-data, local-file,
  browser-internal, extension-internal, credential-bearing, malformed, and
  unsupported schemes.
- Added functional New bookmark and New folder windows with title, local image,
  color, and gradient controls; bookmark URLs; current-folder parenting; local
  persistence; and immediate grid/tree refresh.
- Added Info, Warn, and Error records for active-profile webpage preflight, plus
  Error diagnostics for failed profile operations.
- Added a profile-scoped local logging service that persistently records
  privacy-safe application activity, applies configurable retention, clears
  records with confirmation, and exports readable text logs without profile IDs.
- Added privacy-safe outcome, source, action, item type, affected count,
  data-change status, application version, schema version, browser target, and
  operation details to activity-log events, with non-shifting native hover help.
- Added a Bookmark activity log window with functional filters, expandable
  persisted details, saved settings, and confirmed clearing from the profile
  menu.
- Added a Duplicate action to each Manage profiles list row, copying the
  profile's current identity and settings into a new inactive profile.
- Added a first-run welcome window with the extension icon, a concise product
  introduction, local privacy messaging, and Get started and Learn more actions.
- Added an animated first-profile step that requires a username, optionally
  accepts a local profile icon, and saves the new active profile on the device.
- Added webpage preflight that selects a supported browser language before the
  interface appears, falls back to American English, and honors the active
  profile's saved language.
- Added separate Switch profile and Manage profiles windows with local profile
  creation, editing, guarded deletion, detailed profile lists, and switching.
- Added a new-tab bookmark manager preview with a sticky navigation bar,
  breadcrumb path, and responsive bookmark-card layout.
- Added a keyboard-accessible folder-tree panel with filtering, match
  highlighting, expandable folders, and focus restoration.
- Added a profile panel that summarizes the active local profile and presents
  disabled placeholders for planned profile and application commands.
- Added themed custom context menus for bookmark cards and empty bookmark-panel
  space, including keyboard navigation, viewport-aware placement, and
  reduced-motion support.
- Added local startup handling for IndexedDB availability, profile discovery,
  active-profile settings, and theme selection.

### Changed

- Renamed the Get info date labels to Created and Last modified for clearer,
  more conventional wording.
- Moved the technical item ID into the collapsed More details section.
- Removed the redundant Technical details heading so the Get info rows display
  directly beneath the title and URL rows.
- Restored the visual separator beneath the Get info Title/URL block and aligned
  the divider after Last modified with the other row dividers.
- Kept the Get info scrollbar inside the rounded window border and left the
  dialog header visible while its content scrolls.
- Kept the shared create/edit bookmark and folder scrollbar inside its rounded
  window border.
- Centered the close symbol inside the shared bookmark and folder editor button.

- Added responsive horizontal separation between the breadcrumb navigation and
  both toolbar icon buttons.
- Vertically centered shared bookmark and folder card details so the visible top
  and bottom gaps are equal.
- Standardized bookmark and folder cards to the same dimensions, full-width
  appearance panel, four-sided outer gutter, detail spacing, and title-derived
  two-character fallback icon.
- Split stored folder card appearance from open-folder background appearance,
  added optional local favicon/icon fields, and propagated content-mutation
  timestamps through ancestor folders.
- Replaced the raw gradient text input in bookmark and folder creation with
  three color selectors, eight direction choices, and a live gradient preview.
- Removed the six preview bookmarks and demonstration folder path. The main
  window now loads profile-owned bookmarks, folders, and breadcrumbs from local
  storage.
- Changed activity-log export to write environment information once in a header
  and exactly one timestamped, leveled, sourced line per event.
- Kept the activity-log footer height stable during clear confirmation by
  temporarily hiding the disabled Export action and its status message.
- Replaced activity-log disclosure characters with consistently centered
  chevron icons for event rows and Log settings.
- Replaced expanding activity-detail explanations with native HTML titles so
  showing help no longer moves the surrounding log rows.
- Changed expanded activity-log details to display Event code, Operation ID,
  Duration, and Metadata on separate rows for easier reading.
- Moved profile-manager scrolling from the main window to the internal profile
  list so the editor stays visible while browsing any number of profiles.
- Changed the top-right profile control and profile-menu header to display the
  active profile's saved image and update after editing or switching.
- Added a Remove image action to profile creation and editing in the profile
  manager.
- Standardized every custom context-menu glyph to the same square visual
  footprint, including the new-bookmark and new-folder icons.
- Changed the extension version to advance once on each New York calendar date
  that has a production build, without counting dates when no build occurs.
- Replaced Save open tabs in the bookmark-panel context menu with a Customize
  folder style placeholder for the currently open folder.
- Clarified the welcome privacy message: an online account is not required, but
  one active local profile stores its bookmarks, settings, and logs on the
  device and is saved when another profile is selected.
- Removed the password field from first-profile onboarding. The form explains
  that the username and profile icon can be changed later in Profile Manager.
- Changed first-profile completion to reload the created profile through
  preflight before displaying the complete main interface.

### Known limitations

- Context-menu commands other than New bookmark and New folder do not yet
  modify application data.
- Profile-panel commands remain disabled placeholders.
- A dedicated storage-recovery screen is not yet displayed.
