# Bookmark Manager Pro Privacy Policy

**Effective date:** August 24, 2026  
**Publisher:** YuraCodedCircuit

Bookmark Manager Pro is a local-first browser extension for organizing browser
bookmarks. This Privacy Policy explains what information the extension handles,
where it is stored, when information may leave the browser, and the controls
available to users.

## Summary

- Bookmark Manager Pro does not automatically transmit bookmarks, profiles,
  settings, activity records, or undo history to any online service.
- The extension does not include accounts, analytics, advertising, telemetry,
  cloud synchronization, or third-party tracking.
- Bookmark and profile data is stored locally in the browser.
- Information is shared outside extension storage only when a user explicitly
  opens a website, asks the browser's configured search engine to perform a web
  search, or exports information to a local file. Website and search requests
  are handled by the browser under the applicable provider's privacy practices.

## Information handled by the extension

Bookmark Manager Pro may handle the following information to provide its
features:

- Bookmark and folder information, including titles, addresses, tags, notes,
  hierarchy, favorites, ordering, and visual appearance.
- Local profile information, including profile names, profile images, and
  profile-specific preferences.
- Application settings, including display, accessibility, notification,
  shortcut, search, bookmark-opening, and activity-log preferences.
- Privacy-safe activity and diagnostic records. These records describe actions
  and outcomes without storing bookmark titles, addresses, search text, notes,
  profile names, or copied content.
- Temporary undo and redo information required to reverse changes during the
  active browser session.
- Browser and operating-system information shown in or added to a
  user-requested diagnostic export.

## Storage and use

Structured application information is stored locally using browser-managed
IndexedDB. A temporary, opaque undo-session identifier may be stored in
browser-managed session storage. The information is used only to provide the
extension features requested by the user.

Bookmark Manager Pro does not collect or share this information for
advertising, profiling, analytics, or sale.

## Information shared outside extension storage

### Opening bookmarks and external links

When a user opens a bookmark or another external link, the browser sends the
ordinary network request required to visit that address. The destination site
and the browser's network providers process that request under their own terms
and privacy policies. Bookmark Manager Pro does not add tracking parameters.

### Web search

Web search is optional and user initiated. When the browser Search API is
available and a user chooses a web-search suggestion, the extension asks the
browser to search for the entered text using the search engine configured in
that browser. The query is processed by the browser and search provider under
their own terms and privacy policies. The extension sends the query only through
the browser Search API to the configured search engine. It does not use a
separate suggestion service.

### User-requested exports

When a user explicitly exports an activity log, the extension creates a local
plain-text file through the browser. The user controls where that file is saved
and whether it is later shared. Exported activity records exclude bookmark
titles, addresses, profile identifiers, search text, notes, and copied content.

## Browser permissions

- **Storage:** supports browser-managed extension storage and temporary
  session coordination.
- **Search:** allows an explicit user request to be passed to the search engine
  configured in the browser. It is not used to monitor or intercept searches.
- **Active tab:** allows the toolbar popup or page context-menu command to read
  the current page title and address after an explicit user action. It also
  allows an optional visible-tab screenshot requested inside that popup. The
  extension does not capture tabs automatically or in the background.
- **Context menus:** adds the Save URL to Bookmark Manager Pro command to the
  browser's page context menu.

Bookmark Manager Pro requests only permissions used by implemented features.
Browser-specific manifests may express equivalent capabilities differently.

## Retention and deletion

Bookmark, folder, profile, and settings information remains until the user
changes or deletes it or removes the extension's data through browser controls.
An active profile, and the only remaining profile, cannot be deleted while the
application requires it to operate; its individual content can still be
managed.

Activity history is bounded by profile settings and can be disabled, cleared,
or configured to remove older records. Undo and redo history is temporary and
is cleared when its browser-session marker is no longer present. Browser
uninstallation and data-removal behavior is controlled by the browser.

## Security

The extension validates stored and user-provided data, rejects unsafe address
schemes before navigation, uses browser security boundaries, and does not load
remote executable code. No method of local storage is guaranteed to prevent
access by someone who controls the browser profile, device, or operating-system
account.

## Children

Bookmark Manager Pro is a general-purpose productivity tool. It does not
knowingly collect personal information from children or from any other user for
an online service.

## Changes to this policy

This policy may be updated when the extension's implemented data practices
change. The effective date above will be revised, and material changes will be
described in the application changelog.

## Contact

Questions, suggestions, privacy requests, and other official communications
may be submitted through the project's public issue tracker:

https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro/issues
