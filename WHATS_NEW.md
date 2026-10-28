# What's New in 0.7.1

Released October 28, 2026.

This release adds URL matches in Search, shared activity history organized by
browser session, and improvements to navigation, dialogs, and startup recovery.

## Highlights

- **Find matching web addresses** - Open Search and choose URL matches to review
  related bookmarks in one or all profiles. Inspect their details, open their
  parent folders, or remove unwanted copies with confirmation and Undo. This
  feature is marked Experimental while its matching behavior is evaluated.
- **Review shared activity history** - Activity history now spans profiles and
  groups records by browser session. View options controls the displayed records;
  Settings > Activity controls recording and how much history is kept.
- **Keep activity history local** - Profile exports, recovery copies, imports,
  restores, and profile duplication no longer transfer activity records. Existing
  local history stays in place when importing or restoring profile data.

## Other Improvements

- Search results offer item details and navigation to the parent folder, with
  confirmation before switching profiles.
- Activity history highlights startup checks and errors, groups repeated
  problems, and confirms clearing a session or all history.
- Local profiles remain usable when some startup checks are unavailable.
- Folder paths follow the operating system's style, and Get info shows complete
  titles and folder paths with clearer profile context.
- Folder style keeps its title and actions visible while settings scroll.
- Image cropping keeps its preview separate from controls and shows resize
  directions. Firefox input selection stays aligned with editing menus.
- Long profile names remain accessible, Details view distinguishes folders and
  bookmarks with icons, and folder tabs keep internal IDs out of the address bar.
- Validation rejects oversized data collections before processing their elements
  to reduce excessive memory use.

## Compatibility Notes

The local storage update groups existing records under Earlier activity and
applies the configured history limits after conversion. Activity history has no
export or copy action. Export important profile data before downgrading: older
versions cannot open the updated local database, and exports do not include
activity history.

## Full Changelog

See the [complete changelog](./CHANGELOG.md) for the permanent release history.
