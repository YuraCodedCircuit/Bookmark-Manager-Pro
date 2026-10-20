# What's New in 0.7.0

Released October 20, 2026.

This release adds local Import and Export, with file review, optional encrypted
exports, and improvements to dialogs, menus, and profile management.

## Highlights

- **Import with review** - Import native profiles or selected bookmarks and
  folders from JSON, HTML, and CSV. Review the contents before saving, choose a
  destination, and resolve duplicate warnings. Folder trees and paged review
  help navigate larger files.
- **Export profiles and bookmarks** - Save selected profiles to a native file
  with stored images, optional backup history, and optional password encryption.
  Export bookmarks as JSON, CSV, or browser-compatible HTML. Configure CSV
  columns and their order in Settings.
- **Local file processing** - Import files, previews, and passwords stay local.
  Passwords are not remembered, and closing the dialog discards transient file
  data. Progress and cancellation are available during supported processing.

## Other Improvements

- Profile lists and backup browsing are easier to navigate, with clearer
  validation and searchable profile selection.
- Bookmark and folder editors keep their actions available while scrolling.
- Dialogs, menus, destructive controls, and bookmark/folder icons use more
  consistent visual feedback.
- Text fields share editing menus and visible selection highlights, including
  the Save current URL popup.
- Item menus distinguish opening links from folders. Firefox uses its native
  UI font and base size throughout the app.
- Privacy documentation explains local file processing, exported profile data,
  and recovery snapshots.

## Compatibility Notes

The storage update moves current recovery snapshots into the primary database.
The original backup database remains available as an unchanged recovery copy.
Export important data before downgrading: older versions do not understand all
data and file formats introduced in this release.

## Full Changelog

See the [complete changelog](./CHANGELOG.md) for the permanent release history.
