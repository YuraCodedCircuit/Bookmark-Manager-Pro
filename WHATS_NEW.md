# What's New in 0.6.1

Released October 5, 2026.

This release makes everyday bookmark changes faster, improves familiar mouse
and form controls, and fixes several Firefox and image-handling workflows.

## Highlights

- **Faster bookmark and folder changes** - Save, edit, favorite, style, and
  delete operations now prepare Undo data only for affected records instead of
  scanning unrelated profile content.
- **More predictable link opening** - Ctrl+click always opens a bookmark in a
  new tab, and Ctrl+Shift+click always opens it in a new window, regardless of
  the saved opening preference.
- **Clearer controls and information** - File selectors, radio buttons, and
  checkboxes match the application style; nonempty single-line fields offer a
  Clear action; card titles and addresses reveal their complete values on
  hover; and About includes browser-matched review and project links.

## Bug Fixes

- Firefox can show optional tab-access and Clipboard Read prompts directly from
  the corresponding user action.
- Canceling an image picker keeps its application window open and preserves the
  current draft. The transient toolbar popup omits uploaded-image selection,
  while Screenshot remains available and full application editors retain local
  image uploads.
- New folders with image backgrounds save the wallpaper and folder record in
  the same local transaction.

## Full Changelog

See the [complete changelog](./CHANGELOG.md) for the permanent release history.
