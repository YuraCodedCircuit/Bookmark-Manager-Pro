# What's New in 0.6.2

Released October 14, 2026.

This release improves independent Undo and Redo, notification behavior, local
storage protection, and image and form controls.

## Highlights

- **Independent Undo and Redo** - The history window can reverse the latest
  eligible change for each independent item without undoing unrelated items.
  Filters opens in a focused modal. History survives closing extension tabs
  for the browser session, with obsolete history cleaned up after a later load.
- **Predictable notifications** - Every trigger receives a separate card.
  Cards follow the saved corner, order, and limit, and wait when the viewport
  has no room. Only hovering a card pauses its timer; other windows do not
  restart or pause it. Error notifications remain until manually closed.
- **Local storage protection** - Required Unlimited Storage permission protects
  extension databases from automatic browser eviction. It does not prevent
  explicit deletion, uninstall, browser-profile loss, or disk failure.
- **Folder background cropping** - Customize folder style now offers Crop image
  below its preview. Crop changes stay pending until Save style.

## Other Improvements

- Welcome highlights opening a new tab to access bookmarks directly.

- Date modified and Type columns fit their longest text automatically.
- Crop image has a top-right X and balanced preview spacing.
- Buttons show subtle theme-aware hover feedback while retaining red
  destructive colors, and input Clear buttons keep a consistent square size.
- The Privacy Policy effective date and permission documentation are updated.

## Known Limitations

Nested crop-dialog keyboard focus return can be intermittent in some host
contexts. Firefox manual verification and store-update testing remain pending.
Unlimited Storage reduces one storage-loss risk; the reported Edge data-loss
incident's original cause has not been established.

## Full Changelog

See the [complete changelog](./CHANGELOG.md) for the permanent release history.
