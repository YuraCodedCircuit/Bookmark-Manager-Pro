# Architecture Decision Log

This file records decisions that materially affect architecture, compatibility,
privacy, data formats, dependencies, or scope.

## Accepted

### ADR-001: Use a shared TypeScript WebExtension codebase

Status: Accepted

Use TypeScript and WXT to generate Chrome, Firefox, and Edge builds. Browser
differences remain behind platform adapters rather than separate applications.

### ADR-002: Use React for extension surfaces

Status: Accepted

Use React for the large new-tab interface, popup, settings, and focused windows.
Keep domain logic outside React so it remains independently testable.

### ADR-003: Store structured data in IndexedDB

Status: Accepted

Use Dexie over IndexedDB for profiles, bookmark trees, customization, history,
jobs, and recovery data. Reserve browser storage for small browser-integrated
preferences and boot metadata.

### ADR-004: Exclude online radio

Status: Accepted

Do not include online radio in the new product. This avoids persistent audio,
offscreen-document, permission, and cross-browser lifecycle complexity.

### ADR-005: Build as a greenfield product

Status: Accepted

Create a new product and data model without compatibility requirements for
earlier Bookmark Manager Pro versions. There are no active users whose data or
workflows must be preserved. Earlier implementation details may inform product
ideas, but they are not requirements and will not receive migration support.

### ADR-006: Use Motion for interface animation

Status: Accepted

Use Motion for React for coordinated interface transitions. Prefer its mini
entry point when the Web Animations API covers the required behavior, preserve
keyboard and modal lifecycles until exit animations complete, and replace
spatial movement with a short opacity transition when reduced motion is
requested.

### ADR-007: Support browser versions 140 and newer

Status: Accepted

Support Chrome 140+, Microsoft Edge 140+, and Firefox 140+. WXT produces a
browser-specific Manifest V3 package for each target, and each manifest declares
version 140 as its minimum. A compatibility claim requires automated or manual
verification on the corresponding browser.

This shared baseline keeps the platform adapters and test matrix manageable
while allowing the application to use the browser capabilities required by its
extension surfaces. Raising the minimum version is a deliberate compatibility
change and must be documented in both browser requirements and release notes.

### ADR-008: Bound locally stored images

Status: Accepted

Accept PNG, JPEG, and BMP uploads no larger than 1,000,000 bytes. Store images as
validated data URLs with a maximum encoded length of 1,500,000 characters.
These rules apply to profile icons, bookmark and folder images, and other image
fields governed by the shared domain schemas.

Capture visible-page screenshots as JPEG. If a captured data URL exceeds the
encoded limit, resize and recompress it; reject it if it still exceeds the
limit. These per-image limits prevent a single image from consuming an
unbounded portion of local browser storage. The browser continues to control
the total storage quota.

## Proposed decisions

- Export container format and cryptographic parameters
- Overall storage quota, warnings, and cleanup behavior
- Search indexing strategy for very large bookmark sets
- Synchronization conflict policy

New records should include context, decision, alternatives, consequences, and
status. Replaced decisions remain in the log and link to their successors.
