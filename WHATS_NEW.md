# What's New in 0.2.0

Released September 10, 2026.

This release adds guided synchronization between an extension folder and a
browser bookmarks folder.

## Highlights

- Choose whether changes flow from the browser, from the extension, or in both
  directions. Extension-only notes, tags, styles, images, and favorites remain
  local.
- Select both folders with searchable folder trees, review a read-only preview,
  and resolve duplicate matches or competing changes before enabling sync.
- Active synchronization runs automatically for the current profile. Clear
  status and recovery actions cover pausing, revoked bookmark access, missing
  folders, conflicts, retrying, and disconnecting.
- Bookmark permission remains optional until browser folder access is needed.
  Revoking access pauses synchronization without deleting bookmarks.

## Known limitation

- Recovery snapshots are unavailable because the backup service is not yet
  implemented.

## Full changelog

See the [complete changelog](./CHANGELOG.md) for the permanent release history.
