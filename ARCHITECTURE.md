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
selection, search, mutation history, synchronization plans, and portable
exports.

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
notifications, storage, downloads, and alarms. Capability checks select a
Chromium or Firefox implementation when behavior differs.

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
- Import/export page: validated preview, progress, cancellation, and recovery
- Activity page: privacy-safe operational history
- Background entry point: event routing and resumable jobs

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

- IndexedDB owns profiles, profile-scoped activity logs and logging settings,
  bookmark trees, customization, recovery snapshots, and jobs.
- The schema-23 `undoHistory` IndexedDB table owns bounded undo/redo patches.
  Browser session storage owns only an opaque session ID, shared across packaged
  extension surfaces and tab-scoped in the webpage preview. Startup under the
  Web Locks adapter creates a marker when missing and removes rows belonging to
  stale, non-active sessions. Preview markers use a one-shot BroadcastChannel
  presence probe to protect other live tabs. Marker reads must succeed before
  cleanup; read failures preserve all rows. Each surface also keeps a local
  promise queue. Capacity failures apply oldest-first retention and synchronize
  only successfully persisted entries; other failures retain an unavailable
  diagnostic state.
- `browser.storage.local` owns only small browser-integrated preferences and
  boot metadata when IndexedDB is not suitable.
- `browser.storage.session` owns the validated background-preflight snapshot for
  the current browser session. It contains stable startup metadata and, when
  ready, only the opaque active profile ID. Profile content remains in
  IndexedDB. If session storage is unavailable, preflight safely reruns.
- React state owns control values and short-lived view state.
- Zustand owns cross-component transient state within a single surface.
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
