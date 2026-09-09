# What's New in 0.1.5

Released September 9, 2026.

This update improves folder selection, settings search, appearance controls,
and Chrome and Edge layout behavior.

## Highlights

- Settings search now finds labels and text throughout Settings, marks matching
  categories, and highlights matches in the selected category.
- The Save current URL popup includes a searchable folder tree for choosing
  where a bookmark is saved. It starts with the newest folder selected.
- New folders now use Home's blue gradient and matching navigation background
  at 70-percent transparency. Existing folder styles remain unchanged.
- What's new opens once after a normal extension upgrade and shows the notes
  for the installed version. Settings > General can disable announcements.

## Appearance and navigation

- Color and Gradient appearances include a random-generation button.
- Auto-closing notifications display a countdown line that pauses with the
  notification. Its color can be customized in Notifications settings.
- Folder trees scroll horizontally without moving their filter or shortcuts.
- Truncated Favorites and Recent titles appear in full when hovered.

## Fixes

- Removed extra right-edge space in the main window and Save current URL popup
  in Chrome and Edge. Opening a dialog on a scrolling main page can cause a
  small content-width shift.
- Runtime validation works with the extension's Content Security Policy.
- The Save URL to Bookmark Manager Pro context-menu command restores itself
  after extension reloads and browser cleanup in Chrome and Edge.

## Full changelog

See the [complete changelog](./CHANGELOG.md) for the permanent release history.
