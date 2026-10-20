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

Schema version 37 adds profile-owned `importPreferences`. Existing and new
profiles default automatic item review, remembered destinations, and closing
after success to Off. Remembered destinations contain only local profile and
folder UUIDs. Older serialized settings can omit this optional category.
No source file, source path, password, or review selection is stored.

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
  the active opaque ID, never bookmark content. Closing extension tabs or normal
  windows does not expire it; browser-managed session lifetime is authoritative.
  Missing shared markers create a new session without deleting rows. After UI
  commit and document load, separate maintenance removes obsolete session rows
  under the history write lock. Failed, malformed, or changed markers preserve
  rows. Cleanup failures do not disable valid current-session history. Preview tabs
  exchange active IDs before cleanup so one tab cannot delete another live
  tab's history. Saved bookmark content remains local and is never copied into
  activity logs or notifications. IndexedDB capacity errors apply oldest-first
  retention; other failures mark the in-memory entries unavailable.
  Bookmark and folder creation records the destination lineage and created
  record. Edit, favorite, style, and deletion patches read only the affected
  item or subtree, its favorites, and the ancestry needed for restoration and
  cross-tab change summaries. Every bounded read rechecks profile ownership;
  unrelated records and image payloads are excluded. History persistence
  appends new or status-changed rows and deletes removed IDs without rewriting
  unchanged patches.
- `activity`: bounded privacy-safe event metadata, indexed by owning profile,
  timestamp, level, and category
- `activityLogSettings`: per-profile capture, diagnostic threshold, retention,
  and export choices
- `backupSnapshots`: immutable recovery points stored in the primary database
  starting with schema 38. Each snapshot contains one
  complete profile payload, creation metadata, encoded size, and a SHA-256
  digest. Creation is accepted only after a persisted read-back verifies the
  digest.
- Synchronization connection state, mappings, and resumable operations reside
  in profile-owned `sync:v1:` metadata. There are no `jobs` or `syncMappings`
  tables in the current schema. Import and Export do not persist resumable jobs.
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
append position from the compound profile, parent, and order index, and inserts
the record within one transaction. Folder creation declares wallpaper storage
in the same transaction before persisting an image-background reference.
Conditional
editor writes compare the stored `updatedAt` value within the write transaction
and reject stale input.

## Backup snapshots and restore

Schema 38 adds `backupSnapshots` to `bookmark-manager-pro`. Before the first
backup/import/export operation, legacy snapshots from
`bookmark-manager-pro-backups.snapshots` are validated, their payload digests
verified, and copies read back inside the same transaction as a migration
marker. Failure leaves the marker unwritten and the source untouched, allowing
a retry. Subsequent operations use only the primary table. The legacy database
is retained unchanged; it is a historical recovery copy, not an updated mirror.
Deleting a current snapshot does not cause its old copy to be migrated again.
Current backups no longer remain independently available when the main
database cannot open. Deleting a profile preserves its recovery snapshots.

Imports validate complete records and field lengths before writing. Native
files create new profiles and remap owned identities and included backup
history. JSON and HTML preserve selected hierarchy beneath the destination;
CSV saves selected rows flat. Destination defaults supply portable appearance.
A final review shows duplicate exclusions and save totals. Destination changes
invalidate the plan. Confirmation also reports the effective snapshot policy;
Settings > Import and Backup edit the same `backupPreferences.beforeImport`
field, gated by `automaticEnabled`. No schema change or additional stored
preference is required. Activity-log additions alone do not invalidate the plan. Required safety
snapshots, imported records, remembered destinations, and snapshot retention
share one abortable transaction. Snapshot verification failure blocks saving.
Closing the owning UI aborts an unfinished transaction; completed commits
remain saved. No source file, password, or resumable import job is stored.

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
or clearing its browser-managed data removes the primary database and any
retained legacy snapshot database.

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

Customize folder style retains its optimized source and latest crop only in
the open form. Applying uses Fit and persists only through Save style. Originals
and crop geometry are not added to the stored wallpaper format.

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

Packaged Chrome, Edge, and Firefox extensions require `unlimitedStorage` to
protect extension-owned IndexedDB data against automatic storage eviction and
lift extension storage quotas. The permission does not prevent deliberate
deletion, uninstall, browser-profile loss, or disk failure, and does not replace
recovery snapshots or exported backups. The local web preview does not receive
extension permissions and remains subject to the browser's normal quota and
eviction rules. `navigator.storage.persisted()` alone does not indicate whether
an extension has the separate `unlimitedStorage` permission.

The browser and available disk space still bound storage. The app can show estimated
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

### Native export and import contract

Native `.bmpro` v1 files contain explicit selected profiles and categories:
bookmarks, notes, settings, activity, and synchronization. Optional backup
history contains complete verified historical snapshots regardless of the
current category selection. Native imports remap identities and create new
profiles; they do not replace or activate an existing profile. Synchronization
configuration is restored paused without transferring browser permissions.
Session undo patches are excluded.

Plaintext native envelopes contain a SHA-256 payload digest for corruption
detection; an attacker can rewrite an unencrypted file and its digest, so this
is not source authentication. Optional authenticated encryption uses Web Crypto
PBKDF2-SHA256 with 600,000 iterations, a random 16-byte salt, and AES-256-GCM
with a random 12-byte nonce. The versioned envelope carries its KDF/cipher
parameters, encoding metadata, and ciphertext. Readers validate those bounds
before derivation/decryption. Passwords are transient and not recoverable.

The native payload budget is 256 MiB; the serialized-file ceiling is 384 MiB.
Other field and record limits remain enforced. Available browser memory can
still prevent processing an otherwise allowed file. Portable formats are
unencrypted and have their own validated representations described below.

### Portable formats and file processing

CSV export preferences belong to the profile that opens Export, even when
other profiles are selected for the file. The optional `exportPreferences`
settings field stores a complete permutation of the seven CSV columns and a
unique enabled subset containing URL. Missing preferences preserve the original
seven-column export. This additive optional field requires no IndexedDB schema
change or backfill and does not add fields to older serialized settings.
Native exports include it only when settings are selected. CSV serialization
and byte estimation use the same enabled column order. Source paths and file
contents are not remembered. Header names, JSON-array folder paths and tags,
UTF-8 BOM, quoting, and spreadsheet-formula protection remain unchanged.

Bookmark JSON exports use `bookmark-manager-pro-bookmarks` version 2. Each
profile has `id`, `name`, and `content` containing its structural root folder.
Folders contain `id`, `parentId`, `title`, `index`, `tags`, `note`, and a
`content` array of child folders and bookmarks. Bookmarks contain `id`,
`parentId`, `title`, `url`, `tags`, `note`, and `index`. Children are ordered by
index, with ID as the tie breaker. Empty folders retain an empty content array.
Appearance, images, and other profile data remain exclusive to native exports.
The reader accepts both flat JSON v1 and nested JSON v2; older v1 readers cannot
read v2 exports. Nested parent IDs must agree with containment. Both formats
retain size, record, field, URL, ownership, and cycle validation boundaries.
Bookmark folder nesting has no application-defined depth cap. JSON tree
serialization and relationship checks are iterative; HTML indentation is
bounded independently of the represented hierarchy. Native v1 and portable
JSON v1/v2 formats are unchanged. Earlier readers with fixed depth limits can
reject newly generated deeply nested files.

Export capture, serialization, encryption, and estimates run in local dedicated
workers owned by the dialog. Generated files cross to the download adapter as
Blobs rather than large strings.
Selected-profile backup histories are read one payload at a time. JSON, HTML,
and CSV output enforce the serialized-byte budget while accumulating chunks;
CSV folder paths and HTML escaping cannot silently expand beyond that budget.
Import parsing, preparation, and atomic IndexedDB commits run in dialog-owned workers.
Record writes are issued in batches of up to 500 inside the original transaction;
a later batch failure or cancellation rolls back earlier batches and safety snapshots.
Workers have no network behavior, new permissions, or durable job payloads.
Close, cancellation, replacement, and page lifecycle cleanup discard transient
work; interrupted transactions retain IndexedDB atomicity. There is no restart
or resume contract. Worker failure uses existing generic errors rather than a
blocking UI-thread fallback. File-size and record-count limits still apply;
worker isolation does not guarantee sufficient memory for every allowed file.
Large IndexedDB commits can take substantially longer than parsing or export;
worker isolation preserves interface responsiveness rather than guaranteeing a
fixed completion time. Cancellation aborts the complete import transaction.

The current Import UI validates native files, own bookmark JSON, supported CSV, and
Netscape browser HTML in a dialog-owned worker before displaying verified
metadata. Closing, replacing the file, or pagehide terminates processing.
Source files require valid UTF-8; malformed byte sequences fail before parsing.
Native validation rejects bookmark folder cycles and missing parents without
a folder depth cap. Note folder depth remains limited to 20, including embedded
backups. Note bodies must satisfy the
existing 1 MiB UTF-8 limit. Plain-text symbols and code examples are not executed
or removed; unsafe URLs and invalid structures reject the whole file.
HTML is tokenized without a DOM or resource loading; all source folders are
preserved in the preview. CSV recognizes Profile ID, Profile, Folder path,
Title, URL, Tags, and Note headers in any order, ignoring case and outer header
whitespace. URL is required; other columns may be omitted. Unknown columns are
ignored, duplicate supported headers and malformed rows fail the whole file,
and unsafe URLs are rejected. Tags use JSON arrays; missing titles fall back
to a bounded URL title. CSV fields remain strings, with existing formula
protection preserved. A maximum of 128 source columns bounds ignored fields.
Supported cells are transferred from the worker only after complete validation
and displayed as inert text in a wide review table. CSV profile/folder values
do not select destinations or create folders. JSON/HTML review displays a
checkbox hierarchy using Home tree visuals and at most 200 review rows per page.
Selection counts and subtree changes include items on other pages. Import
preferences persist independently; successful
destination updates and automatic closing await the writer.

Browser HTML uses the Netscape bookmark grammar: a doctype, generated-file
comment, an app-name and UTC export-time comment, UTF-8 metadata, a Bookmarks
heading, and nested DL/H3/A elements. The provenance comment uses the export
payload's creation time and is informational, not an authenticity guarantee.
HTML exports retain empty folders and sibling order, with ADD_DATE and folder
LAST_MODIFIED values in Unix seconds. A Bookmark Manager Pro enclosing folder
keeps exported content together. A single profile contributes its Home contents
inside it; multiple profiles contribute named folders without UUIDs inside it.
Only the structural app root is omitted. Browser toolbar markers, date fields,
and icon attributes are accepted as inert metadata by the reader. They neither
load resources nor define app appearance. HTML omits app-specific tags, notes,
images, and settings; native and JSON exports retain their documented data.

The implemented saving operation follows these stages:

1. Read into a bounded buffer or streaming parser.
2. Validate format version, structure, sizes, URLs, and relationships.
3. Normalize into a proposed domain model without modifying current data.
4. Show a safe summary and conflict preview.
5. Resolve the destination's automatic-snapshot and Before import preferences;
   native new-profile imports need no pre-import snapshot.
6. Recheck the destination and atomically save records, any required verified
   snapshot, included native history, preferences, and retention. Failure or
   cancellation before commit rolls back the entire transaction.
7. Discard transient file/review state after commit and deliver failure-isolated
   feedback and content refresh. A completed commit remains saved even if
   subsequent feedback fails.

Imported HTML is treated as data and is never rendered unsanitized.

## Schema upgrades and recovery

Each schema upgrade created after the initial release is monotonic, testable, and
idempotent where practical. Before a destructive upgrade, the application
creates and verifies a snapshot. Upgrade failure leaves the prior usable
database or an explicit recovery path.

The initial release starts with a new schema. Data and export formats from
earlier Bookmark Manager Pro implementations are not supported.
