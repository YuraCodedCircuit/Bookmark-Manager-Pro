# What's New in 0.2.5

Released September 11, 2026.

This release keeps open Bookmark Manager Pro tabs current after content and
profile changes, while strengthening concurrent editing safeguards.

## Highlights

- Content changes from synchronization, the toolbar popup, or another app tab
  now appear in every open tab showing an affected folder. Hidden tabs update
  when they become visible instead of performing unnecessary background reads.
- If an open folder is deleted, the tab moves to the closest available parent
  and explains the change. Switching profiles also opens the selected profile's
  Home folder across profile-bound app surfaces.
- Simultaneous bookmark or folder creation now preserves a valid item order,
  and an editor cannot overwrite an item that changed after the editor opened.
- Shared undo history no longer reports a storage-write error when another open
  extension surface receives an already-saved update.

## Full changelog

See the [complete changelog](./CHANGELOG.md) for the permanent release history.
