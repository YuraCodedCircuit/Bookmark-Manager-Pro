# Data and Storage Design

## Principles

- Local-first and private by default
- Transactional mutations
- Versioned schemas and portable formats
- Validated imports before database changes
- Recoverable destructive operations
- No sensitive content in logs

## IndexedDB stores and schema

Schema version 1 establishes `profiles`, `profileSettings`, and `metadata`.
The `metadata` store owns the active profile ID so initialization works in both
the local web preview and packaged extension without depending on a browser API.
Stored records are validated before they are returned to the application layer.

First-profile creation validates the required username and optional PNG, JPEG,
or BMP icon before writing. The profile record, default system-theme settings,
and `activeProfileId` metadata are committed in one transaction. Creation is
rejected if a profile already exists. UUID candidates are checked for uniqueness
with a bounded retry limit.

Profile settings may store a supported application language. New profiles store
the language selected by webpage preflight. When no language is stored, preflight
uses the browser language with an American English fallback. Language selection
is validated and applied before the main interface is rendered.

Schema version 30 stores the profile-owned toolbar saved-status preference with
a default of disabled and adds the `[profileId+url]` bookmark index used for
local exact-URL counts. The current tab address is transient input to that
lookup; it is not persisted as browsing history or written to diagnostics.

Schema version 31 adds the key-only folder-tree index used by navigation-only
surfaces so they can read folder IDs, titles, parent relationships, creation
times, and root status without loading appearance payloads.

Schema version 32 adds `folderWallpapers`. During upgrade, embedded folder
wallpapers are moved into profile-owned records and identical image data within
one profile is stored once. Folder records retain only the wallpaper ID and fit
mode. Repository reads hydrate the image only for surfaces that need the full
folder appearance.

Schema version 33 adds the optional profile-owned
`autoCropPopupScreenshots` setting. Existing profiles default to disabled, and
new or duplicated profiles receive the same default.

Schema version 34 adds a validated `detailsColumnOrder` permutation to profile
settings and folder records. Existing profiles and folders receive the standard
Appearance, Title, URL, Date modified, and Type order. Profile settings supply
the default copied into newly created folders; later profile-default changes do
not rewrite an existing folder's saved order.

Schema version 35 adds the optional profile-owned
`showDetailsColumnReorderControls` accessibility setting. Existing and new
profiles default to hiding the explicit move toolbar; pointer and keyboard
header reordering remain available.

Schema version 36 adds the optional profile-owned
`hideEmptyDetailsTableHeader` Appearance setting. Existing and new profiles
default to hiding the Details header when a folder has no items.

Packaged-extension preflight stores a schema-validated snapshot in
`browser.storage.session` for the current browser session. The snapshot contains
only stable startup metadata: operation and completion identifiers, locale,
capability results, readiness status, and the opaque active profile ID when one
exists. Bookmark, folder, profile-display, and settings content remains in
IndexedDB. A session-storage read or write failure cannot block preflight;
readiness is recomputed from IndexedDB instead.

Profile creation writes the profile and default settings in one transaction.
Profile deletion removes an inactive profile and its settings in one transaction
after verifying that it is neither active nor the only profile. Switching
validates the target and replaces `activeProfileId` transactionally. Profile
updates preserve the stable ID and creation time while advancing `updatedAt`.
Profile duplication creates a new profile ID and timestamps, then copies the
source identity fields and current profile-settings record in one transaction.
Schema version 2 adds `activity` and `activityLogSettings`. Upgrading preserves
all version-1 profile data because the upgrade is additive. Activity records are
indexed by profile and timestamp and are validated on every repository read.
Deleting a profile also deletes its activity records and log settings in the
same transaction.

Schema version 21 adds folder-owned card size, card spacing, sorting, direction,
and grouping values without changing folder indexes. The upgrade copies the
owning profile's current defaults into every existing folder. New folders copy
those defaults at creation; later profile-setting changes do not rewrite saved
folder display choices.

- `profiles`: profile identity, display metadata, and timestamps
- `folders`: parent relationship, profile, order, per-folder display choices,
  and background/navigation customization
- `folderWallpapers`: schema-32 optimized folder-background image data, owned by
  one profile and referenced by folder and default-style records
- `bookmarks`: folder, profile, URL, title, order, display metadata, and optional
  per-item card appearance overrides
- `appearance`: versioned per-profile bookmark-area defaults and reusable card
  visual settings
- `preferences`: application behavior not owned by the browser, including saved
  view mode and layout-flow direction
- `profileSettings.searchPreferences`: schema-22 profile-owned defaults for
  search fields, matching, scope, item type, sorting, and direction, saved from
  Settings > Search. Option edits inside an open Search window, search queries,
  and result content are transient and are never stored.
- `undoHistory`: schema-23 session-namespaced undo/redo patches, indexed by
  opaque session ID, profile, insertion position, and timestamp. Each patch
  contains only records changed by its operation. Session storage contains only
  the active opaque ID, never bookmark content. Missing shared markers remove
  stale session rows; marker read failures preserve every row. Preview tabs
  exchange active IDs before cleanup so one tab cannot delete another live
  tab's history. Saved bookmark content remains local and is never copied into
  activity logs or notifications. IndexedDB capacity errors apply oldest-first
  retention; other failures mark the in-memory entries unavailable.
- `activity`: bounded privacy-safe event metadata, indexed by owning profile,
  timestamp, level, and category
- `activityLogSettings`: per-profile capture, diagnostic threshold, retention,
  and export choices
- `snapshots`: immutable recovery points stored in the separate versioned
  `bookmark-manager-pro-backups` IndexedDB database. Each snapshot contains one
  complete profile payload, creation metadata, encoded size, and a SHA-256
  digest. Creation is accepted only after a persisted read-back verifies the
  digest.
- `jobs`: resumable import, export, schema-upgrade, and synchronization state
- `syncMappings`: internal and native browser bookmark identity mapping
- `metadata`: schema, export-format, upgrade, installation identifiers,
  per-profile `content-revision:v1` counters, and the global
  `profile-activation-revision:v1` counter. Revision records contain no bookmark
  or folder content and require no table or index migration. Successful content
  mutations increment the affected profile's counter after commit. Active
  profile selection and its activation revision commit atomically. Hidden or
  suspended surfaces use these counters to detect missed transient messages.

## Identifiers

Application records use generated stable identifiers independent of browser
bookmark IDs. Native IDs are stored only in synchronization mappings because
browsers may replace or reorganize native bookmark nodes.

## Transactions

Every tree mutation updates affected parents, children, and ordering in one
transaction. The session history service captures the validated before/after
delta around that transaction and serializes new mutations with undo/redo
restoration. Applying a history patch restores all affected bookmark, folder,
and favorite records in one IndexedDB transaction. Synchronization planning is
read-only; application of a plan creates a snapshot and records durable
progress.
New bookmark and folder creation verifies the parent, calculates the current
append position, and inserts the record within one transaction. Conditional
editor writes compare the stored `updatedAt` value within the write transaction
and reject stale input.

## Backup snapshots and restore

Manual, automatic, safety, pre-upgrade, and deleted-profile snapshot types share
a versioned validated payload. Automatic retention applies independently to
each profile and trigger; it never deletes manual or mandatory safety records.
A replacement restore validates integrity, creates a verified safety snapshot,
and replaces the selected profile in one primary-database transaction. A
deleted-profile restore remaps record identifiers into a new profile. Restored
synchronization configuration is always paused and native bookmark links are
not reactivated automatically.

Backup format 3 includes shared folder-wallpaper records. Restoring as a new
profile remaps wallpaper IDs together with folder and content IDs so references
remain profile-local.

Snapshot deletion affects only the chosen snapshot. Uninstalling the extension
or clearing its browser-managed data removes both primary data and the separate
snapshot database.

## Image storage and quota behavior

Profile icons, favicons, bookmark-card images, and folder icons remain bounded
local data URLs. Their existing schema-specific encoded limits remain separate
from folder-wallpaper processing.

Folder wallpapers accept PNG, JPEG, or BMP source files up to 1 MB by default.
The off-by-default Allow larger background images setting raises the source
limit to 10 MB. Processing occurs locally: sources above 7680 by 4320 pixels are
rejected, accepted images are resized to fit within 3840 by 2160 pixels, opaque
images are encoded as WebP at approximately 85-percent quality, and PNG is kept
only when transparency is present. The original source is discarded and only a
validated result of at most 4.4 MB is saved.

Optimized folder wallpapers are stored in `folderWallpapers` as profile-owned
data URLs. Folder and default-style records store an opaque wallpaper ID and fit
mode. Reusing an existing default wallpaper does not duplicate its data for each
new folder. An image is removed after no folder or default-style record in that
profile references it.

Visible-page screenshots and selected bookmark-card images remain temporary
data URLs together with the latest cropped result until the owning bookmark or
folder is saved. The shared crop pipeline accepts sources up to 7680 by 4320
pixels, produces an output with no edge larger than 870 pixels without
upscaling, encodes opaque output as WebP at approximately 85-percent quality,
and preserves transparency with PNG. Canvas re-encoding removes source image
metadata. Processing failures preserve the original temporary image instead of
silently saving a partial crop.

The profile-owned automatic screenshot-crop preference applies a top-left Card
crop after a popup capture. The uncropped screenshot remains available for
manual editing until Save bookmark commits the selected result. Ordinary image
selection and crop editing follow the same save boundary.

Password Generator values and options exist only in React state while its
dialog is open. They are never written to IndexedDB, browser storage, snapshots,
exports, activity records, or diagnostics. Closing the dialog clears them. An
explicit Copy action writes the generated value to the operating-system
clipboard, which is outside extension storage.

The browser controls the total IndexedDB quota. The app can show estimated
profile storage, but the estimate excludes browser database overhead and is not
a guarantee of remaining capacity. A fixed application-wide quota, proactive
low-storage warnings, and cleanup rules for ordinary profile data remain an open
architecture decision. Capacity handling must never silently remove bookmarks,
folders, profiles, or their images.

Bounded services may apply their own documented retention behavior. Activity
history can remove its oldest records according to its saved retention settings,
and undo history can remove its oldest patches when a capacity error prevents a
new patch from being stored. These cleanup rules do not apply to primary profile
content.

## Imports

Import processing follows these stages:

1. Read into a bounded buffer or streaming parser.
2. Validate format version, structure, sizes, URLs, and relationships.
3. Normalize into a proposed domain model without modifying current data.
4. Show a safe summary and conflict preview.
5. Create a recovery snapshot.
6. Apply changes transactionally.
7. Verify counts and key relationships before deleting temporary state.

Imported HTML is treated as data and is never rendered unsanitized.

## Schema upgrades and recovery

Each schema upgrade created after the initial release is monotonic, testable, and
idempotent where practical. Before a destructive upgrade, the application
creates and verifies a snapshot. Upgrade failure leaves the prior usable
database or an explicit recovery path.

The initial release starts with a new schema. Data and export formats from
earlier Bookmark Manager Pro implementations are not supported.
