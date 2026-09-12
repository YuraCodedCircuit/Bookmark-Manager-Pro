# What's New in 0.4.0

Released September 12, 2026.

This release adds local recovery snapshots for protecting profile data before
important changes.

## Highlights

- Open Backup from the profile menu to create, inspect, filter, sort, restore,
  or delete snapshots for current profiles and retained deleted profiles.
- Optional automatic snapshots can protect a profile before bookmark
  synchronization. Settings control whether this trigger runs and how many
  automatic snapshots it retains.
- Restoring an existing profile first creates a verified safety snapshot.
  Synchronization connections remain paused until they are reviewed.
- Snapshots remain local to the browser profile and are removed if the extension
  is uninstalled or its data is cleared.

## Bug Fixes

- Opening or closing the profile menu no longer restarts notification
  countdowns or triggers a disconnected notification popover error.

## Full changelog

See the [complete changelog](./CHANGELOG.md) for the permanent release history.
