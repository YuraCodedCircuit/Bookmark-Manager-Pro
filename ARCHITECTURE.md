# Architecture

## Goals

The architecture supports a large local-first extension with several UI
surfaces, restartable background processing, versioned data, and browser-specific
packaging without duplicating business logic.

## Layers

### Domain

Pure TypeScript entities, value objects, policies, and operations. This layer
must not import React, WXT, Dexie, or browser APIs.

Primary concepts include profiles, folders, bookmarks, appearance settings,
selection, search, password generation, image cropping, mutation history,
synchronization plans, and portable exports.

### Application

Use cases coordinate domain policies and repository interfaces. Examples include
moving a bookmark, duplicating a profile, restoring a backup, planning browser
bookmark synchronization, and replaying an undo operation.

### Storage

Dexie implementations of repository contracts, schema upgrades, snapshots,
and durable job state. Transactions begin and end in this layer or in a narrow
unit-of-work abstraction.

### Platform

Typed wrappers around bookmarks, tabs, windows, commands, context menus,
clipboard access, notifications, storage, downloads, and alarms. Capability
checks select a Chromium or Firefox implementation when behavior differs.

### Messaging

A versioned request, response, command, and event protocol shared by background
and UI entry points. Zod validates all received messages before dispatch.

### Presentation

React entry points and reusable components. Presentation state belongs in local
React state or Zustand stores. Durable domain state must be loaded through
application services rather than treated as a UI store.

## Extension surfaces

- New-tab page: primary bookmark manager
- Action popup: save the current tab with the shared bookmark editor and an
  optional local visible-tab screenshot
- Settings page: appearance, behavior, permissions, localization, and data tools
- Focused window: add or edit bookmark and folder workflows when needed
- Import/Export dialogs: validated preview, progress, cancellation, and recovery
  with transient dedicated workers owned by the dialog, not resumable
  background-worker jobs
- Activity page: privacy-safe operational history
- Background entry point: event routing and resumable jobs
- Profile-independent Password Generator dialog: transient Web Crypto output,
  option controls, strength feedback, and explicit clipboard copy

### Action-popup flow

The action popup reads the current tab through the typed platform adapter after
an explicit toolbar or page-context-menu action. A missing URL on a privileged
browser page and a URL rejected by the shared allowlist both become an expected,
non-retryable unsupported-page state before bookmark data is queried.

For profiles using Warn or Prevent duplicate handling, the application layer
compares the canonical URL across the active profile before the editor appears.
It returns each distinct matching parent folder so presentation can show up to
three folder names and summarize the remainder without exposing bookmark titles
or addresses. The popup repeats the lookup immediately before persistence to
cover edited URLs and concurrent changes. An approved Warn decision is scoped
to the canonical URL that was checked, and a later decision preserves the
editor's transient values. Storage access remains behind repository contracts;
presentation components receive services through explicit dependencies.

Full-application image selection and action-popup visible-page capture feed a
shared, dependency-free crop pipeline. The popup omits file selection because
browser-owned action popups close when an operating-system picker takes focus.
Crop geometry, zoom, source data, and preview output remain in React state. The
pipeline validates source dimensions, renders the selected region to a canvas,
strips source metadata through re-encoding, and returns bounded PNG or WebP
data. IndexedDB receives only the chosen result through the bookmark or folder
save transaction. Popup automatic crop uses the same pipeline and keeps the
original source available until Save bookmark.

Password generation is a profile-independent domain operation. The domain
module validates the selected groups and length, uses rejection sampling with
`crypto.getRandomValues`, guarantees at least one character from every enabled
group, and shuffles the result. The dialog owns all options and generated values
in local React state and clears them on close. Clipboard writing is injected by
the application surface and occurs only after an explicit Copy action; no
repository or messaging protocol carries generated values.

## Dependency direction

```text
Presentation -> Application -> Domain
     |              |
     v              v
Messaging       Repository contracts
     |              |
     v              v
Platform         Storage implementations
```

Domain code has no outward dependencies. Platform and storage implementations
depend on contracts, never the reverse.

## Background-worker lifecycle

The background entry point is a restartable event processor, not a daemon.
Listeners register synchronously. Each event opens required resources, loads
durable state, performs a bounded operation, persists the result, and releases
resources. Long tasks use checkpoints and idempotent steps.

### Browser-session preflight

The background entry point initiates preflight once per browser session. The
workflow is resumable: every completed phase and its validated result are
persisted before the next phase starts, so a suspended Manifest V3 worker can
continue safely. Browser startup is the preferred trigger, while an extension UI
request is also an idempotent trigger for browser sessions where the startup
event was missed or preflight was interrupted.

Preflight checks storage and profile existence before any extension UI is
displayed. It then resolves the browser language to an available application
locale, falling back to American English. If an active profile exists, its
stored language preference overrides the browser-derived locale after the
profile and settings have been validated. No untranslated or partially loaded
main interface is rendered between these stages.

The completed preflight snapshot contains capability results and stable startup
metadata, not a mutable in-memory copy of all profile content. Each new-tab
surface requests the snapshot and reads the active profile's current persisted
data through the versioned messaging protocol. This avoids repeating
browser-session checks while ensuring profile changes made in another tab are
not hidden by a stale startup cache.

The webpage preview implements the browser-independent portion through a local
preflight adapter. It runs before React mounts, loads and validates the active
profile through the existing initialization service, resolves browser and
profile language priority, applies localization, and returns typed unavailable
results for extension-only capabilities. After first-profile creation, the same
preflight path runs again rather than constructing a ready state in the React
component. React reports completion only after the resulting snapshot has been
committed to the UI.

The WXT background entry point registers install, startup, and runtime-message
listeners synchronously. It runs database/profile readiness once per browser
session and stores a schema-validated metadata snapshot in
`browser.storage.session`. A versioned Zod-validated `preflight.get` request can
retrieve the snapshot. Invalid requests and unexpected failures return stable,
non-sensitive error codes. Theme application and document language attributes
remain UI-surface responsibilities because extension workers have no DOM or
`matchMedia` access.

## State ownership

- IndexedDB owns profiles, shared activity history and application log options,
  independent profile recording gates,
  bookmark trees, customization, recovery snapshots, and resumable
  synchronization state in metadata.
- The schema-32 `folderWallpapers` store owns optimized profile-local folder
  background data. Folder and default-style records store opaque references;
  repositories hydrate appearance reads and remove unreferenced images.
- Current recovery snapshots reside in the primary database's schema-38
  `backupSnapshots` store behind `BackupRepository`. A verified migration
  preserves the old database as an unchanged historical copy. Current recovery
  depends on primary-database availability. `ManageBackups` owns ordinary backup
  orchestration; the Import writer commits data, included history, required
  safety snapshots, remembered destinations, and retention in one transaction.
  React receives services through composition and does not access databases.
  See [ADR-012](DECISIONS.md#adr-012-colocate-current-recovery-snapshots-for-atomic-imports).
- The schema-23 `undoHistory` IndexedDB table owns bounded undo/redo patches.
  Browser session storage owns only an opaque session ID, shared across packaged
  extension surfaces and tab-scoped in the webpage preview. Closing the last
  extension tab or normal browser window does not clear history. History
  preparation is scheduled after React's UI-ready commit and document load,
  outside preflight; an earlier mutation initializes history on demand.
  Initialization under the Web Locks adapter creates a marker when missing.
  Separate post-load maintenance uses the same lock and removes only obsolete
  sessions after rechecking the active marker. Preview markers use a one-shot BroadcastChannel
  presence probe to protect other live tabs. Marker reads must succeed before
  cleanup; failed or malformed reads preserve all rows. Cleanup diagnostics and
  failure notices are isolated from current-session history. Each surface also keeps a local
  promise queue. Capacity failures apply oldest-first retention and synchronize
  only successfully persisted entries; other failures retain an unavailable
  diagnostic state.
  Creation captures only the destination folder lineage plus the created item;
  edits, favorite changes, style changes, and deletion capture only the affected
  item or deleted subtree, its favorites, and required folder ancestry. These
  repository-scoped reads preserve complete rollback data without loading the
  rest of the profile or unrelated image payloads. Recovery snapshots remain a
  separate durable system and never contain session undo state. Normal history
  appends write only the new or status-changed patch and remove expired IDs;
  unchanged image-bearing history records are not rewritten.
- `browser.storage.local` owns only small browser-integrated preferences and
  boot metadata when IndexedDB is not suitable.
- `browser.storage.session` owns the validated background-preflight snapshot for
  the current browser session. It contains stable startup metadata and, when
  ready, only the opaque active profile ID. Profile content remains in
  IndexedDB. If session storage is unavailable, preflight safely reruns.
- React state owns control values and short-lived view state.
- Import parsing and Export capture, estimates, serialization, and encryption
  run in local dedicated workers. Import preparation and atomic IndexedDB saves
  use a separate dialog-owned worker and share the synchronization Web Lock at
  commit. Worker messages are versioned and runtime validated. Output reaches
  the browser download adapter as a Blob. No file, password, or Import/Export
  job payload is durably stored for resume; interruption requires a new attempt.
- React state exclusively owns Password Generator values and options and image
  crop originals, geometry, zoom, and pending results until the owning dialog
  closes or saves.
- Zustand owns cross-component transient state within a single surface.
- A surface-local notification service owns FIFO admission and independent
  timeout clocks. Waiting cards receive their full duration on admission;
  only mouse hover pauses a visible card. React observes those clocks and
  arranges admitted cards according to the active profile's settings. A manual
  popover raises notifications above other top-layer content, with its portal
  hosted inside the active modal so notification controls remain interactive.
  A card-owned opacity Web Animation runs only on mount, avoiding CSS entrance
  restarts when the top-layer host changes and avoiding translated overflow.
  Admission is bounded by both the profile's count limit and measured viewport
  space. An inert, hidden copy of the next FIFO card measures its height without
  timers or live-region announcements. ResizeObserver and viewport resize
  remeasure wrapping and available space. Oversized cards scroll internally;
  the stack never requires scrolling to reveal an admitted card.
  Unsupported top-layer behavior and failed actions produce failure-isolated,
  content-free diagnostics; routine card and pointer activity is not logged.
- Synchronization, toolbar-popup saves, and successful app mutations publish a
  versioned, Zod-validated BroadcastChannel message containing only profile and
  affected-item identifiers. Each profile also has a monotonic content revision
  in IndexedDB metadata so a suspended tab can detect a missed message. Tabs
  decide locally whether to refresh visible content, refresh only navigation
  state, coalesce deferred work, or ignore the change. If the displayed folder
  was removed, the tab follows its previous path to the closest surviving
  ancestor or the profile root. Active-profile selection uses a separate
  serialized activation message and atomic durable revision; receiving
  profile-bound surfaces discard old-profile transient state and open Home.
- Browser APIs own native bookmarks, permissions, tabs, and windows.

## Feature modules

Feature folders may expose domain operations, application services, presentation
components, and tests, but must use shared platform and storage contracts.
Cross-feature imports should pass through explicit public module entry points.

## Error model

Expected failures use typed errors or result objects with stable codes, safe user
messages, and optional developer context. Unexpected exceptions are captured at
entry-point boundaries. Sensitive record content is never included in logs.

## Code documentation

Exported functions, services, interfaces, and non-obvious orchestration logic
use concise JSDoc or focused inline comments. Documentation explains contracts,
ordering, lifecycle, side effects, fallbacks, and architectural reasons that are
not evident from types and names. Comments do not paraphrase straightforward
assignments, control flow, or test expectations. Tests use descriptive suite and
case names as their primary behavioral documentation, with comments only when a
fixture or timing constraint is otherwise unclear.

## Folder-tab background handoff

Folder-tab opening uses the versioned `folder-tab` runtime protocol. The
background validates the manager-page sender and repository ownership, creates
an inactive temporary extension page, and persists its destination in
`storage.session`. The temporary page requests readiness; the background
validates its binding and activates it. The page then replaces itself with the
canonical manager URL. Activation failure keeps the binding retryable after
worker restart.

Claims derive tab ownership from the browser sender, not message fields.
Independent keys prevent concurrent tabs from overwriting each other's
destinations. Closing a tab removes its binding; browser session end clears
the store. There is no durable database migration.

Bindings preserve the former query destination on reload and only apply to the
matching initialized profile. They do not change profile selection, startup
preferences, or other tabs. Temporary creation intents expire after two minutes;
requests prune expired intents and reject excessive pending/bound records.

Chrome hides both blank and extension-page tab URLs without optional tab access.
Readiness therefore verifies the browser-provided sender page and tab, not a
`tabs.get()` URL. Navigation is local to the requesting document, so leaving it
cannot trigger a later worker redirect of another document. Early requests
retry up to 50 times at 100 ms intervals in the page, never in the worker.

Failure displays a localized error with a focused Retry button. Retry requests
readiness again without opening another tab. Interrupted creation can leave
this recoverable page; it is never automatically duplicated or recovered by
guessing ownership of other tabs. New tabs use no query, fragment, or handoff
token. Existing query links remain accepted unchanged.

## URL match snapshots

Search owns a transient URL matches session. Its application loader reads every
profile through existing managers and rejects the whole scan on any read or URL
validation failure. Entering the mode reads fresh sources; matching
level, scope, and literal filtering operate on the last successful snapshot.
Request generations prevent late results from replacing a newer session.

The storage adapter observes committed bookmark, folder, and profile mutations
through Dexie's cross-context storage event. The active visible match view
debounces bursts and serializes reads; hidden views defer work and revalidate on
return. New sessions invalidate abandoned reads. This covers editing, transfers,
restores, synchronization, Undo/Redo, and profile metadata changes without adding
publish hooks or observing log/settings writes. The manual Refresh control is
removed; Retry remains available after failures.

Automatic rereads retain the displayed snapshot when grouping and display
inputs are equivalent, regardless of record order. The pure source comparator
checks membership, ownership, titles, URLs, folder ancestry, and profile names;
it excludes image data and metadata that item actions always reread. Existing
results remain enabled without an added loading row during automatic rereads.
Initial scans and explicit Retry retain loading feedback; failures still mark
prior results outdated. A quiet unchanged success can clear a prior error.

The pure domain engine uses collision-safe structured keys, full stored equality
for Exact, and bundled `tldts` private/public suffix rules for Site. It neither
changes bookmark records nor shares save-time duplicate policy. Groups and
members are paged in the UI, with complete filtered membership totals. Failed
refresh retains old results and marks them outdated. Safe result opening reuses
the existing Search callback. No schema, runtime protocol, permission, remote
lookup, persistent settings, or browser-history behavior changes are required.

URL-match member actions read fresh source-profile metadata and validated
settings through application contracts. `ManageProfiles.getProfileSettings`
reads without activation. Confirmed individual deletion uses existing bounded
Undo capture and content-change publication for the source profile. The optional
bookmark-only deletion contract is checked again inside the repository's
readwrite transaction, preventing stale result IDs from deleting folders.

The UI removes a committed deletion from its transient snapshot before an
automatic full refresh; failed refresh cannot resurrect it. Get info is nested
inside Search, contains its cancel event, and restores its trigger focus.
No serialized format, schema version, runtime protocol, or permission changes
are required. Ordinary Search opening remains unchanged.

URL-match Open folder reads the fresh bookmark and containing folder with source
ownership checks before navigation. A different owner uses the existing profile
activation/publication flow; its explicit destination is installed before the
resumed preflight state so startup preferences do not replace it. The action
closes Search and uses the current manager tab. Failed target resolution leaves
the active profile unchanged.

URL-match scan state and options remain owned by UrlMatchesPanel. Its toolbar
is portaled into SearchDialog's query row so URL match options shares the input layout
without introducing imperative scan handles or duplicate state. Matching level
and Scope regroup the snapshot immediately from a native child options dialog;
child Escape is contained and focus restores to its trigger. No stored settings
or runtime protocols change.

Folder view reads use a surface-local generation. Starting a newer folder load
or clearing profile-bound content invalidates older results before they can
publish content or navigation state. Cross-context refresh also rechecks its
captured profile and folder after asynchronous reads. Superseded work returns
without changing breadcrumb identity or reporting an unrelated operation error.
The generation is transient and does not change durable records or protocols.

Activity-log view filters and ordering apply immediately and transiently in a
native child view-options dialog. Recording and retention controls live in
Settings > Activity and commit through its Save action. The main log requests
clear confirmation through the application-owned ConfirmationService. Only a
positive decision invokes the existing profile-owned clear operation; canceled
or failed decisions do not mutate records. Notification delivery is isolated from
log operations. No record grouping, startup protocol, retention, or schema changes
are part of this UI increment.

## Activity history transfer boundary

Profile capture excludes activity records from new recovery snapshots. Native
export assembly emits empty legacy activity arrays and verifies older nested
snapshots before replacing their activity arrays in the exported copy. Digests
and byte sizes describe that copy; stored snapshots remain unchanged. Native
import remapping discards activity, and the writer never inserts those records.
Replace and new-profile recovery leave the current activity table untouched.
No database or file-format version changes are required: existing activity
fields remain readable, with empty arrays in newly captured payloads.

Schema 39 owns shared activity records, session headers, and a bounded startup
queue. Existing local rows become Earlier activity without invented browser
membership. Shared options are initialized once from the active profile; its
recording gate and every other profile gate remain independent. Conversion is
one IndexedDB upgrade transaction, with source validation and count verification.
Failed upgrades roll back; older application binaries cannot open schema 39.

Observed browser startup creates a new identity. Worker restarts and additional
surfaces reuse the browser session marker through a validated worker request.
An explicit extension update can recover its known marker from extension local
storage; missing exact identity otherwise creates a detected group. The
coordination marker is independent of retained log history. No clean shutdown
is inferred. Local webpage preview uses a detected tab-session identity because
the page cannot observe browser startup. Real-browser reload/update and crash
behavior remains a manual verification requirement across supported targets.

Background preflight precedes surface startup. Ordinary logging writes are
scheduled without blocking primary operations. Up to 128 waiting ordinary events
are kept in IndexedDB during preflight; oldest waiting events are dropped on
overflow and counted in the header. Filtering does not suppress essential header
outcomes. A primary cached preflight can only establish that checks ended when
recovering an interrupted log queue; it never restores erased startup details.

The UI subscribes to shared IndexedDB changes. It pages 50 groups and 50 matching
events per expanded group, preserves reader position, and exposes New events
when following is paused. Local calendar-day unions are transient and do not
change stored timestamps. Shared-option updates and reset preserve master gates.

## Sparse activity admission

The domain capture policy excludes routine success and expected rejection before
row IDs or durable append. Callers classify only fixed reasons and preserve
notification feedback separately. The repository atomically coalesces bounded
local incidents across surfaces and worker resumes; success signals resolve
matching failures. Primary mutation commit checkpoints distinguish later Undo or
view failures from failed persistence. Synchronization summaries describe only
operations in the final wake, avoiding invented counts across resumed work.

## Folder path presentation

The navigation separator adapter selects a backslash for Windows and a forward
slash elsewhere. Display paths join intact names with spaces around that
separator. Search and URL-match domain functions receive it explicitly; they
remain independent of browser APIs. Get info, Import destination summaries,
Synchronization folder labels, and Notes breadcrumbs use the same convention.
URLs, durable identities, reconciliation keys, and transfer formats are not
reformatted. Copied parent paths match the displayed path.
