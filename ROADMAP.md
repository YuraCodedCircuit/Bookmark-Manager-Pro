# Roadmap

This roadmap creates Bookmark Manager Pro as a new, maintainable Manifest V3
WebExtension for Chrome, Firefox, and Microsoft Edge. The product starts with a
new data model and has no compatibility or migration obligation to earlier
versions. Milestones are ordered by dependency and risk rather than promised
release dates.

## Product scope

The first stable release will provide:

- Nested bookmark folders and bookmark tiles
- Multiple independent profiles
- Search, sorting, filtering, and keyboard navigation
- New-tab, popup, settings, and focused editor surfaces
- Theme, tile, icon, typography, and layout customization
- Import, export, backup, restore, and encrypted portable exports
- Undo and redo for supported mutations
- Activity history without sensitive bookmark content in logs
- Optional synchronization with native browser bookmarks
- Chrome, Firefox, and Edge packages from one source tree
- Localized UI with an English source locale

Online radio, cloud accounts, server synchronization, collaboration, and
mobile-browser support are outside the initial scope.

## Phase 0: Product definition and readiness

Phase 0 is completed without application code. Its purpose is to remove product,
data, browser, privacy, accessibility, and delivery ambiguity before the
foundation is created. Internal product-discovery records guide this work and
capture the product owner's answers.

### Step 1: Define the product outcome

- Write a concise problem statement and identify the primary user workflows.
- Define the intended user groups without assuming behavior from an earlier
  extension version.
- Describe the first-release value proposition and the measurable outcomes that
  indicate the product is useful.
- Confirm that the product is local-first and that accounts, cloud storage,
  analytics, advertising, collaboration, mobile browsers, and online radio are
  outside the initial scope.

Deliverables:

- Approved problem statement and product principles.
- Explicit in-scope, deferred, and excluded capability lists.

### Step 2: Prioritize proposed capabilities

- Build a feature matrix that classifies each proposal as include in the first
  release, defer, experiment, or exclude.
- Give each included feature a user benefit, dependencies, major risks, and a
  testable acceptance statement.
- Separate essential workflows from convenience features so that the first
  usable release has a controlled scope.
- Identify assumptions that need prototypes or user research rather than
  treating them as requirements.

Deliverables:

- Approved feature-priority matrix.
- First-release acceptance criteria and deferred-feature register.

### Step 3: Specify complete user workflows

- Map creation, editing, moving, copying, sorting, searching, opening, and
  deleting of bookmarks and folders.
- Map profile creation, switching, duplication, export, restore, and removal.
- Map permissions, native bookmark synchronization, conflicts, cancellation,
  failures, retries, and recovery.
- Define undo and redo boundaries, destructive confirmations, and the behavior
  after focus-changing operations.
- Define empty, loading, unsupported, permission-denied, quota, corruption, and
  partial-failure states.

Deliverables:

- User-flow diagrams and acceptance scenarios for every first-release workflow.
- Catalog of error, recovery, and destructive-operation states.

### Step 4: Design the extension surfaces

- Produce low-fidelity wireframes for the new-tab page, popup, settings, focused
  editor, import/export tools, recovery tools, and activity history.
- Define information hierarchy, responsive constraints, and which tasks belong
  in each surface.
- Specify keyboard navigation, focus order, screen-reader names, drag-and-drop
  alternatives, zoom behavior, reduced motion, high contrast, text expansion,
  and right-to-left layout.
- Validate that popup and independent-window workflows remain usable within
  browser-specific size and focus constraints.

Deliverables:

- Reviewed wireframes and interaction notes.
- Accessibility requirements and keyboard interaction specification.

### Step 5: Define the data and operation contracts

- Finalize the domain concepts, ownership rules, relationships, identifiers,
  ordering behavior, and deletion semantics.
- Define the initial IndexedDB stores, indexes, transaction boundaries, quota
  policy, and recovery guarantees.
- Specify versioning rules for database schemas, portable exports, snapshots,
  durable jobs, and runtime messages.
- Define import validation, URL safety, image constraints, encryption goals,
  activity retention, and what data must never enter logs.
- Define invariants for bookmark trees, profiles, synchronization mappings,
  undo history, and verified snapshots.

Deliverables:

- Initial domain model and storage design review.
- Draft schemas and invariants expressed as documentation, not implementation.

### Step 6: Resolve foundation-blocking decisions

- Select minimum supported Chrome, Firefox, and Edge versions.
- Select the search strategy and representative maximum dataset sizes.
- Define image limits and storage-quota behavior.
- Define native bookmark synchronization directions, identity mapping, conflict
  policy, dry-run behavior, and recovery expectations.
- Select the portable export container and current, cross-browser Web Crypto
  algorithms and parameters.
- Record context, alternatives, consequences, and status for each decision in
  `DECISIONS.md`.

Deliverables:

- Accepted ADRs for every choice that affects the project foundation.
- A clearly owned list of non-blocking open questions.

### Step 7: Define browser and permission behavior

- Build a browser capability matrix for every required WebExtension API.
- Identify required and optional permissions and the exact workflow and user
  explanation associated with each permission request.
- Document manifest, background lifecycle, command, window, bookmarks, download,
  and packaging differences among Chrome, Firefox, and Edge.
- Define supported fallbacks and explicit unsupported results.

Deliverables:

- Approved capability and permission matrix.
- Browser acceptance matrix with target versions.

### Step 8: Establish engineering and dependency policy

- Select and pin Node.js LTS, pnpm, TypeScript, WXT, and direct dependencies.
- Review licenses, maintenance, browser support, bundle impact, and transitive
  risk for runtime dependencies.
- Confirm source-module boundaries, public feature APIs, dependency direction,
  error conventions, and privacy-safe diagnostics.
- Define formatting, linting, commit, review, and generated-artifact policies.

Deliverables:

- Approved toolchain and dependency record.
- Documented repository and module conventions.

### Step 9: Design verification and release operations

- Define unit, repository integration, component, accessibility, and Playwright
  coverage expected for each risk area.
- Specify deterministic synthetic fixtures for small, large, malformed,
  corrupted, quota-limited, and cross-browser datasets.
- Set measurable performance budgets for startup, search, rendering, mutation,
  import, export, and worker-resume operations.
- Define continuous-integration checks, browser test versions, package naming,
  checksums, signing, store submission, privacy disclosures, and rollback.
- Create a manual verification record for behavior that cannot be automated.

Deliverables:

- Test strategy, fixture plan, and performance budgets.
- CI, packaging, release, and rollback checklist.

### Step 10: Hold the code-readiness review

- Review all Phase 0 deliverables together and resolve contradictions.
- Confirm that every first-release capability has acceptance criteria, a surface,
  a data owner, required permissions, and a verification approach.
- Confirm that no open decision could force a foundational rewrite.
- Approve the smallest Phase 1 vertical slice: an installable extension shell
  with localization, error boundaries, platform adapters, and automated checks.

Exit criteria:

- Product scope, user workflows, wireframes, and accessibility behavior are
  approved.
- Initial domain, storage, messaging, security, and privacy contracts are
  documented.
- Foundation-blocking ADRs and the browser capability matrix are accepted.
- Toolchain, test strategy, performance budgets, CI, and release process are
  defined.
- The first implementation slice has explicit acceptance and verification
  criteria.

## Phase 1: Engineering foundation

- Initialize WXT, TypeScript, React, ESLint, Prettier, and package scripts.
- Configure separate Chrome, Firefox, and Edge build targets.
- Add Vitest, React Testing Library, and Playwright extension fixtures.
- Establish shared UI tokens, error boundaries, logging, and localization.
- Define typed runtime messages and browser capability adapters.
- Add continuous integration for linting, types, tests, and all browser builds.

Exit criteria:

- A minimal extension loads in all three browsers.
- CI produces installable development packages without warnings or errors.

## Phase 2: Storage and domain model

- Implement Dexie schema versioning and repository interfaces.
- Add profiles, folders, bookmarks, preferences, and customization records.
- Add transactional mutations and durable operation identifiers.
- Implement backup snapshots, restore validation, and schema-upgrade recovery.
- Add bounded activity history with privacy-safe structured events.
- Test upgrades from every committed database schema version.

Exit criteria:

- Domain behavior is independent of React and browser UI surfaces.
- Failed multi-record operations leave the database consistent.

## Phase 3: Core bookmark manager

- Build the new-tab file-manager interface.
- Implement nested navigation, breadcrumbs, pagination or virtualization.
- Add create, edit, move, reorder, copy, and delete operations.
- Add multi-selection, context menus, keyboard commands, and focus recovery.
- Implement indexed search, sorting, filtering, and empty states.
- Add bounded undo and redo with transaction-aware inverse operations.

Exit criteria:

- Large representative datasets remain responsive.
- Keyboard-only and screen-reader workflows cover all core mutations.

## Phase 4: Profiles and customization

- Implement profile creation, duplication, switching, import, and removal.
- Add themes and reusable design tokens.
- Add tile colors, gradients, images, icons, typography, and layout settings.
- Validate image types, dimensions, encoded size, and storage quotas.
- Prevent one profile's settings or cached state from leaking into another.

Exit criteria:

- Profiles are isolated and portable.
- Customization remains usable at supported zoom and contrast settings.

## Phase 5: Extension surfaces and browser integration

- Build the compact popup and focused add/edit bookmark window.
- Build settings, import/export, backup, and activity-history surfaces.
- Add commands, context menus, notifications, and active-tab capture.
- Implement native browser bookmark synchronization behind an adapter.
- Add conflict previews, direction controls, dry runs, and recovery snapshots.

Exit criteria:

- Browser permissions are requested only when required by enabled features.
- Synchronization is repeatable and does not duplicate unchanged records.

## Phase 6: Localization, accessibility, and data portability

- Extract all user-facing strings and add locale validation.
- Add pluralization, date formatting, text expansion, and RTL layout checks.
- Verify validated import of every supported portable export version.
- Add accessible names, focus traps, reduced-motion behavior, and contrast tests.
- Review user-facing permission, privacy, import, upgrade, and recovery text.

Exit criteria:

- Missing translations fail CI or fall back predictably to English.
- Import compatibility is tested against every committed export-format version.

## Phase 7: Security and release readiness

- Threat-model imports, exports, synchronization, URLs, images, and messages.
- Audit Content Security Policy and remove unnecessary permissions.
- Verify encryption metadata, key derivation, tamper detection, and failures.
- Run browser-specific end-to-end, upgrade, recovery, and performance tests.
- Prepare store descriptions, screenshots, privacy disclosures, and packages.
- Document signed-release and rollback procedures.

Exit criteria:

- Chrome, Firefox, and Edge release candidates pass the acceptance matrix.
- No known data-loss, security, schema-upgrade, or accessibility blockers remain.

## Future implementations

The following capabilities are intentionally deferred. Their current Settings
categories remain disabled until the associated behavior, storage contracts,
error handling, accessibility, and cross-browser tests are complete. Inclusion
here describes planned product direction rather than a commitment to a specific
release.

### Additional application languages

- Add complete application and manifest translations beyond the English source
  locale when each translation can be maintained and verified.
- Label application-language choices with the `Language (Region)` format and a
  complete country or region name, such as `English (United States)`, while
  retaining BCP 47 locale codes in stored settings and localization resources.
- Verify fallback behavior, pluralization, text expansion, and localized date
  presentation for every added locale.
- Add bidirectional layout and keyboard verification before shipping the first
  right-to-left language.

Acceptance signal: each shipped locale has complete resources, predictable
English fallback behavior, and passing localization, layout, and accessibility
checks in every supported browser target.

### Import

- Accept documented Bookmark Manager Pro export formats and selected standard
  browser bookmark formats.
- Validate the file version, structure, field sizes, URLs, item relationships,
  and image data before changing stored information.
- Let the user choose the destination profile and preview additions, conflicts,
  replacements, and skipped records.
- Create a recovery snapshot and apply an approved import transactionally so a
  failed import does not leave partial changes.
- Treat imported markup as data and never render it as unsanitized HTML.

### Export

- Let the user export a selected profile or other clearly selected data without
  silently including unrelated profiles.
- Use a documented, versioned, portable format that a future app version can
  validate before importing.
- Explain whether settings, images, activity records, and other optional data are
  included before creating the file.
- Start exports only after an explicit user action and write them to a file chosen
  through the browser. Exporting must not send data to an online service.

### Backup and restore

- Implemented: create complete, verified local recovery snapshots for one
  selected profile; manage them in a dedicated Backup window; and restore a
  current or deleted profile with synchronization paused.
- Implemented: require acknowledgment and a verified safety snapshot before a
  replacement restore, and preserve a deleted profile before removal.
- Implemented: optional automatic snapshots before synchronization with
  configurable per-trigger retention.
- Add automatic triggers when import, profile reset, and destructive database
  upgrade workflows are implemented.
- Add portable backup export so recovery data can survive extension removal or
  browser-data clearing.
- Test backup and restore compatibility for every supported data-format version
  and across Chrome, Firefox, and Edge.

### Planned encrypted exports

- Offer password protection as an optional export choice rather than changing
  ordinary exports without the user's knowledge.
- Use the browser Web Crypto API with authenticated encryption and a standard,
  versioned password-based key derivation scheme.
- Store only the export-format version, key-derivation parameters, salt, nonce,
  ciphertext, and authentication data in the protected container.
- Never persist or log the password, derived key, or decrypted export contents.
- Detect an incorrect password or modified file without importing partial data,
  and explain the failure without exposing sensitive information.
- Select algorithms and parameters during implementation using current browser
  support and security guidance. Custom cryptography is not permitted.
- Document that losing the export password makes the protected file
  unrecoverable; the application will not have a recovery key.

### Advanced settings

- Keep the category disabled until specific advanced controls are approved.
- Add only settings that have a clear user benefit, safe default, understandable
  warning text, and a reliable restore-defaults path.
- Do not use Advanced settings to bypass data validation, browser security, or
  privacy protections.

## Post-release candidates

- Duplicate and broken-link analysis
- Optional bookmark metadata and thumbnail retrieval
- Additional import formats
- Opt-in cloud synchronization after a separate privacy and security design
