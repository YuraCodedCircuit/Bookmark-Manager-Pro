# Bookmark Manager Pro Help & FAQ

This guide describes the currently implemented Bookmark Manager Pro behavior.
Features marked as unavailable in the application are not described as working.

## Getting started

### 1. What is Bookmark Manager Pro?

Bookmark Manager Pro is a free, local-first browser extension for organizing
bookmarks and folders in a visual, file-manager-style interface.

### 2. Which browsers are supported?

Chrome 140+, Firefox 140+, and Microsoft Edge 140+ are supported. The installed
extension provides browser features that the webpage preview cannot provide.

### 3. Do I need an online account?

No. The application uses local profiles and does not require registration or a
cloud account.

### 4. Why is making a profile necessary?

Every bookmark, folder, preference, and activity setting belongs to a local
profile. One active profile is required so the application knows where to store
new content.

### 5. What information is required to create a profile?

A profile name is required. A local PNG, JPEG, or BMP profile image up to 1 MB
is optional.

### 6. What happens when the application first opens?

It checks whether local storage is working, loads the active profile and its
settings when available, applies the saved language and appearance, and then
shows either profile setup or the main interface.

### 7. Can I use the application without an internet connection?

Local bookmark organization works without an online service. Opening websites
and using Web search still require the browser and network connection needed by
those destinations.

## Profiles and local storage

### 8. Where are profiles stored?

Profiles and their information are saved locally in the browser. Different
browsers and browser profiles do not automatically share this data.

### 9. Can I create more than one profile?

Yes. Manage profiles can create multiple independent local profiles.

### 10. How do I switch profiles?

Open the top-right profile menu, choose Switch profile, and select the profile
to activate.

### 11. Can content be copied between profiles?

The app's Copy, Cut, and Paste commands work within one profile. Switching
profiles clears the pending operation. To add bookmarks to another existing
profile, export them as JSON, HTML, or CSV and select that profile during Import.

### 12. Can I duplicate a profile?

Yes. Duplication creates a separate inactive profile. The active profile's
Profiles settings control whether bookmarks/folders, favorites, appearance,
images, settings, and activity logs are copied, and whether Copy is appended
to the name. Notes, undo history, recovery snapshots, and synchronization
connections are not copied by profile duplication. Native Export and Import
provide a separate way to transfer supported profile data.

### 13. Why can I not delete a profile?

The active profile and the only remaining profile are protected. Switch to
another profile before deleting an inactive profile.

### 14. Does switching profiles change the folder open in another tab?

Yes. Switching the active profile in one app tab switches every profile-bound
app surface to that profile and opens Home. Hidden tabs apply the latest switch
when they become visible. Drafts and profile-bound dialogs close so they cannot
save into the previously active profile.

## Creating and organizing bookmarks and folders

### 15. How do I create a bookmark?

Open the content-panel context menu and choose New bookmark. Enter a title and
a supported HTTP, HTTPS, or FTP address, then save it in the current folder.

### 16. How do I create a folder?

Open the content-panel context menu, choose New folder, provide a title and any
optional appearance information, and save it.

### 17. Which bookmark address types are accepted?

HTTP, HTTPS, and FTP addresses are accepted. Local files, browser settings
pages, extension pages, and addresses that could run scripts are not accepted.
Addresses containing a username or password are also rejected.

### 18. Can bookmarks and folders have the same title?

Yes. Titles do not have to be unique. Folder and website information helps
tell similar items apart in the history window.

### 19. Can I add tags and notes?

Yes. Bookmark and folder editors support comma-separated tags and a note.
Right-click a supported editable text input or textarea to use Cut, Copy,
Paste, Select all, or Clear. Masked password, number, read-only, and disabled
fields do not use this custom menu. Custom Paste asks for the browser's optional
clipboard-read permission when needed; native Ctrl+V continues to work without
that extension permission.
Single-line fields with a Clear input control show it while they contain text
and are editable.
The manager and Save current URL popup use the same editing menu.
Selected text stays visibly highlighted while its editing context menu is open;
Arrow keys navigate the menu, and Escape returns focus to the field.

### 20. How do I edit an item?

Open the item's context menu and choose Edit bookmark or Edit folder. Saving
updates editable content while preserving its identity and location.
Bookmark context actions can also copy the address or open the bookmark in a
new browser window.
An ordinary left click follows the active profile's opening preference.
Ctrl+click always opens the bookmark in a new tab, and Ctrl+Shift+click always
opens it in a new browser window.

### 21. How do I move an item?

Use drag and drop when enabled in Bookmarks settings, or use Cut followed by a
one-shot Paste into the destination folder.

### 22. Can a folder be moved or copied inside itself?

No. Paste is disabled for the source folder and all its descendants, and the
same validation runs again before storage changes.

### 23. How do I delete an item?

Choose Delete from the item's context menu. The configured confirmation
behavior applies before the bookmark or folder tree is removed.

### 24. What does Get info show?

Get info shows the item's appearance, title, type, parent, dates, position, ID,
tags, notes, and bookmark address when applicable. Individual displayed values
can be copied. The appearance preview spans the available width, and More
details stays collapsed until requested.

## Search and Web mode

### 25. How do I open Search?

Choose Search from the profile menu, use the search control in the main header,
or use the configured Search shortcut, which defaults to Ctrl+F. Search options
open as a focused child window and return focus to Search when closed.

### 26. When do bookmark results appear?

Results update while typing after at least two characters.

### 27. What information can bookmark search match?

Search can match selected combinations of titles, addresses, tags, notes, and
folder names.

### 28. Can I search every profile?

Yes. Enable Search all profiles in the search options. Results are grouped by
profile when more than one profile exists.

### 29. Are search queries saved?

The app does not persist queries, results, or search history or write them to
the activity log. Web mode sends the submitted query to the browser's configured
search engine; it is no longer confined to the app at that point.

### 30. How does Web mode work?

When the browser supports built-in search requests, Web mode shows an action for
the current query. Selecting it asks the browser's configured search engine to
perform the search.

### 31. What happens when browser search is unavailable?

The application shows an informational notification and remains in Bookmarks
mode. It does not copy text, simulate keystrokes, or contact a fallback service.

## Password Generator

### 32. Where do I open the Password Generator?

Open the profile menu and choose Password Generator in the Application section.
It remains available even when no profile is active.

### 33. Which password options are available?

Choose a length from 1 through 50, lowercase letters, uppercase letters,
numbers, and no symbols, a safer symbol subset, or all supported symbols. At
least one letter or number group remains enabled, and ambiguous characters are
excluded by default. The selected length must fit at least one character from
every enabled group.

### 34. How are passwords generated and evaluated?

The app uses the browser's secure random generator and includes at least one
character from each selected group. A meter rates the result as Weak, Fair,
Moderate, Strong, or Very Strong.

### 35. Are generated passwords or options saved?

No. Passwords and selected options exist only while the Password Generator
window is open. Closing it clears the state and reopening restores the defaults.
They are never stored in application data, backups, logs, exports, or
notification text.

### 36. How does copying and accessibility feedback work?

Copy writes the current password to the operating-system clipboard only after
activation. Changing an option disables Copy until Generate creates a matching
replacement. The output, controls, strength meter, validation errors, and live
status have accessible labels; announcements never read the password itself.
Reduced motion shortens the reveal, and No animations skips it.

## Copy, cut, paste, undo, and redo

### 37. What does Copy do?

Copy prepares a bookmark or a complete folder tree for a one-shot duplicate in
another valid folder without changing the source.

### 38. What does Cut do?

Cut prepares an item for a one-shot move. The source is not moved until Paste
succeeds.

### 39. Why is Paste disabled?

Paste is available only after Copy or Cut and only for a valid destination in
the same profile.

### 40. What happens after Paste succeeds?

The pending Copy or Cut item is cleared and Paste becomes disabled again.

### 41. What happens if Paste fails?

The source remains unchanged and the pending operation stays available for a
retry.

### 42. How does Ctrl+Z choose an operation?

Ctrl+Z undoes the latest change that can safely be undone in the active
profile. It does not undo changes in another profile.

### 43. Why can more than one Undo button be available in history?

The history window can offer the newest safe operation for each independent
item. This per-item choice does not change the global chronological Ctrl+Z
behavior.

## Appearance and accessibility

### 44. Which folder views are available?

Folders can use Card, List, or Details view with their own sorting, grouping,
spacing, and background settings. Card size and spacing are disabled outside
Card view but keep their saved values for the next time Card view is selected.

### 45. Which backgrounds can a folder or card use?

Bookmark and folder cards can use a solid color, a three-color directional
gradient, or a local PNG, JPEG, or BMP image. A folder's page background also
offers None. Folder wallpaper sources are limited to 1 MB by default.
Appearance settings can allow sources up to 10 MB;
they are resized and compressed locally before only the processed result is
saved.

### 46. Can the folder background extend behind navigation?

Yes. Include the navigation panel extends the folder background behind the top
bar, and a transparency control adds a readability overlay.

### 47. Are local images uploaded?

No. Selected profile and appearance images are processed and stored locally
with application data. Original folder-wallpaper files are discarded after
local processing, and folders can share one stored optimized wallpaper.
Bookmark and folder images can be cropped as Card, Free, Square, or Landscape.
Customize folder style also offers Crop image immediately below its image
preview. Applying a crop selects Fit; Cancel or the top-right X keeps the prior
preview. The crop is saved only with Save style or the owning item Save action;
the original and edited result remain temporary until the owning Save action.
Popup screenshots can optionally receive an automatic top-left Card crop while
the original remains available for manual editing until Save bookmark.
The Save current URL toolbar popup offers Color, Gradient, and Screenshot but
omits uploaded-image selection because browsers close action popups when an
operating-system file picker takes focus. Full application editors continue to
support local image selection. Canceling a file picker in those editors keeps
the editor open, clears only the pending filename, and preserves existing form
values.

### 48. Which animation settings are available?

Accessibility settings can follow the system preference, reduce animations, or
disable application animations.

### 49. Is there a high-contrast mode?

Yes. The profile-owned high-contrast option strengthens text, border, focus,
and selection contrast in light and dark themes.

## Keyboard shortcuts

### 50. Can app-local shortcuts be disabled?

Yes. Settings > Shortcuts contains a profile-owned master switch. Native
browser and editable-field behavior remains available.

### 51. Which shortcuts can be changed?

Search, Copy, Cut, Paste, Undo, Redo, and Undo and redo history can be rebound.
Notes commands can also be rebound, including New note, Save, Preview,
Important, and the supported text-formatting and link commands.

### 52. Which key combinations are accepted?

A binding requires a letter or number together with Ctrl, Alt, or Shift.
The app rejects duplicate bindings and certain reserved browser combinations,
including Ctrl+L, Ctrl+N, Ctrl+R, Ctrl+T, Ctrl+W, and Ctrl+Shift+N. Other
combinations may still be intercepted by the browser or operating system.

### 53. How do I cancel shortcut recording?

Press Escape while a shortcut control is recording.

### 54. Can shortcuts be restored?

Yes. Restore resets one changed binding, and Restore all defaults appears when
at least one binding differs from its default.

## Activity log and privacy

### 55. What is stored in the activity log?

The log stores a limited amount of privacy-safe information about actions, such
as whether an action succeeded, its category, duration, browser, and general
item type.

### 56. What is excluded from the activity log?

Bookmark titles and addresses, search queries, usernames, notes, profile
images, copied values, and other personal content are excluded.

### 57. Can activity logging be disabled?

Yes. Settings > Activity has a profile-owned master switch that stops new
activity and technical problem records without deleting existing entries.

### 58. Can the activity log be cleared?

Yes. Clear log requires confirmation and removes the active profile's retained
records.

### 59. What is included in an activity-log export?

The local text export includes safe event information plus basic application,
browser, operating-system, and export details. Profile IDs and personal
bookmark content are omitted.

### 60. Does Bookmark Manager Pro send analytics or telemetry?

No. It does not include analytics, advertising, telemetry, cloud
synchronization, or third-party tracking.

## Storage, deletion, and recovery

### 61. How long is bookmark data retained?

Live bookmark, folder, profile, and settings data remains until changed,
deleted, or removed with the browser's extension data. Undo history, recovery
snapshots, and downloaded exports can retain earlier copies after a live item
is edited or deleted; each has its own retention or deletion behavior.

### 62. How long is undo history retained?

Undo history lasts for the current browser session, even if all app tabs are
closed. After the browser restarts, old history is removed when the app opens.

The history window can undo or redo separate items independently when safe.
Changes that depend on each other stay linked. Filters opens a separate window
above the history list.

### 63. Is activity-history retention limited?

Activity settings specify record-count and estimated-storage limits. When
automatic deletion is enabled, the oldest records are removed to meet those
limits. With automatic deletion disabled, those settings do not prune records;
Clear log remains available.

### 64. What happens when local storage is unavailable?

Startup detects when the browser's local storage is unavailable and shows that
storage cannot be used rather than pretending that data was saved.

### 65. Does uninstalling remove all application data?

Removing the extension or clearing all its extension data removes the local
databases, including recovery snapshots. Files already downloaded outside the
extension and text copied to the system clipboard are not deleted by the app.
Export important information before removing the extension.

### 66. How do recovery snapshots work?

Open the profile menu and choose Backup. Select a profile to create or review
its snapshots. Each row provides Restore, View details, and Delete. Automatic
snapshots can be enabled in Settings > Backup and are retained separately for
each enabled trigger.

### 67. What happens during restore?

Restoring an existing profile requires acknowledgment, first creates a safety
snapshot, and then replaces that profile. A snapshot retained for a deleted
profile is restored as a new profile. Synchronization settings are restored in
a paused state and must be reviewed before resuming.

## Bookmark synchronization

### 68. How do I connect an application folder to browser bookmarks?

Open the profile menu and choose Data > Bookmark synchronization. Allow the
optional bookmark permission, select one application folder and one browser
folder, choose a direction, review the preview, and then enable synchronization.

### 69. When do changes appear in another open application tab?

Open app tabs update when bookmarks or folders they are showing change.
This includes edits, moves, deletions, favorites, appearance changes, Undo,
Redo, and bookmark synchronization. Tabs in the background update when they
become visible. The app updates the affected content without refreshing the
whole page.

Saving a bookmark from the toolbar popup uses the same targeted update, so an
open tab showing the destination folder displays the new item automatically.

### 70. What happens if synchronization deletes the folder I am viewing?

The tab opens the closest surviving parent from the previous folder path, or
Home if no ancestor remains. A creation window tied to the removed location
closes, and an Information notification explains the navigation change without
naming the folder.

### 71. What happens if content changes while an editor is open?

If another app tab changes an item being edited, the app refuses to overwrite
that newer version. Reopen the editor to work with the latest values. New items
use the folder's current order when saved, even if another window also adds
items.

## Browser differences and troubleshooting

### 72. Why is a feature unavailable in the webpage preview?

The development preview cannot provide some features that exist only inside an
installed browser extension. Installed builds check whether each browser
feature is available before using it.

### 73. Why did Web mode return to Bookmarks mode?

The current browser surface did not provide its built-in search feature. The
notification explains the fallback without transmitting the query.

### 74. Why did an external-link confirmation appear?

The active profile's Security setting can require confirmation before opening
external bookmark links. FTP addresses always retain their specific warning.

### 75. Can Bookmark Manager Pro run in a private or incognito window?

No. The extension is intentionally unavailable in Chrome Incognito, Edge
InPrivate, and Firefox Private Browsing windows. Open the workflow in a normal
browser window instead.

### 76. Why does the Save current URL popup say that a page cannot be saved?

The browser may withhold the address of a privileged internal page, or the page
may use an unsupported address type. Open an HTTP, HTTPS, or FTP page and try
again. Retrying on the same internal page cannot make its address available.
If no profile exists, the popup offers Create profile and continues the save
flow after profile creation instead of presenting a retry-only error.

### 77. What happens when the current URL is already saved?

The active profile's duplicate setting applies. Allow opens the editor, Warn
asks before another copy is saved, and Prevent blocks another copy. Warn and
Prevent identify up to three distinct folders containing the URL and summarize
any additional folders. A complete long folder name remains available through
its tooltip.

### 78. Why does the interface look different between profiles?

Themes, accessibility choices, folder appearances, views, shortcuts, search
defaults, and other implemented settings are owned by each profile.

### 79. Where can I review application changes and legal information?

The profile menu's Information section contains What's new, Legal & privacy,
and About Bookmark Manager Pro alongside this Help & FAQ window.
About Bookmark Manager Pro links the publisher name to the GitHub project and
offers a review link for installed Firefox or Edge builds.

## Still need help?

Use the project's [GitHub](https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro)
page for questions, bug reports, feature suggestions, and other project
information.

## Notifications

### 80. How are multiple notifications displayed?

When notifications are enabled, each delivered notification receives its own
card, including repeated types.
Settings controls the corner, newest/oldest order, visible limit, and timeouts.
Extra cards wait until a slot and enough viewport space are available. Newest
first places new cards nearest the selected corner; Oldest first puts them
behind older cards. Only hovering a card pauses that card's timer, which resumes
on pointer leave. Opening other windows does not restart or pause timers. Error
notifications remain until manually closed.

## Import and Export

### 81. Where are Import and Export, and which files are supported?

Open the profile menu's Data section and choose Import or Export. Import
accepts native `.bmpro`, Bookmark Manager Pro bookmark JSON, supported
CSV, and Netscape browser bookmark HTML (`.html` or `.htm`). Arbitrary JSON or
HTML documents are not supported. The Choose file card lists the supported
formats before a file is selected.

### 82. Which export format preserves the most information?

Native `.bmpro` preserves the selected profiles and selected categories:
bookmarks and folders with their local images, notes, settings, activity, and
synchronization configuration. Session undo history, browser permissions, and
external browser bookmark trees are not included. Optional backup history
contains full saved snapshots even if fewer current-data categories
are selected. Export initially selects the active profile; other profiles can
be selected explicitly.

JSON preserves bookmark/folder hierarchy, titles, URLs, tags, notes, and order.
Browser HTML preserves folders, empty folders, bookmark titles, URLs, and
supported dates, but omits app styles, images, tags, notes, and settings. CSV
contains bookmarks in the columns configured in Settings > Export; URL is
required. CSV cannot preserve empty folders, and its Folder path column is
descriptive text rather than an instruction to recreate folders on import.

### 83. Are exported files encrypted?

Only native `.bmpro` files offer password encryption, and it is off by default.
Enable encryption and enter matching passwords to protect a native export.
New export passwords require at least four characters, including a lowercase
letter, an uppercase letter, and a number. Only ASCII letters, numbers, and
the symbols `!@#$%^&*_=+?-` are accepted; longer passwords are allowed.
Passwords are not saved or recoverable. A forgotten password makes a protected file
unrecoverable through the extension.

Unencrypted native files and all JSON, HTML, and CSV exports are readable by
anyone with access to them. They can contain personal information. Files are
created locally through browser downloads; the browser determines whether a
save-location prompt appears. Success confirms handoff to the browser, not
that the download reached disk. Downloaded files remain after a profile or the
extension is deleted and must be protected or deleted separately.

### 84. Does Import replace existing profiles?

Native imports create separate new profiles and restore any included backup
history. They do not replace existing profiles or switch the active
profile. Imported synchronization stays paused until reviewed.

JSON, HTML, and CSV add selected bookmarks and folders to the chosen existing
profile and destination folder. JSON/HTML preserve supported hierarchy; CSV
saves selected bookmarks flat. Portable items inherit the destination profile's
saved appearance defaults rather than importing styles from those formats.

### 85. How are files validated and duplicates handled?

Import checks the whole file before saving, including its format, addresses,
contents, and size limits. An invalid file is rejected rather than partly
imported. File contents are displayed as text and cannot run scripts.

Review allows items to be excluded. Selecting or excluding a folder also
affects its contents; parent folders needed by selected items stay included.
JSON, HTML, and CSV reviews show up to 200 rows per page and remember selections
on other pages. Native profiles use a separate selection list.

The destination's Allow, Warn, or Prevent duplicate policy applies to portable
imports. Allow preserves duplicates, Warn asks for confirmation, and Prevent
excludes duplicates. The final confirmation shows the actual totals and
exclusions. If the destination changes before saving, prepare and review again.

### 86. Is a snapshot created before importing?

Settings > Import and Settings > Backup share the Before import preference.
Automatic snapshots must also be enabled. Confirmation states whether a
snapshot will be created or why it is not needed or disabled. New native
profiles and imports with no changes need no pre-import snapshot.

When required, the snapshot and imported items are saved together. If the
snapshot cannot be created, the import is not saved. A failed or canceled save
leaves no partial imported items or new snapshot, and keeps existing snapshots.
A successful import may remove older automatic import snapshots according to
the saved retention limit.

### 87. Can a large Import or Export be canceled or resumed?

Yes, unfinished work can be canceled, but it cannot resume from where it
stopped. Large files may take longer or exceed the app's size limits or the
browser's available memory.

Cancel stops export preparation and asks an unfinished import to stop. If
cancellation takes effect before changes are saved, no partial imported items
or new recovery snapshot remain. Changes already saved stay saved; Cancel does
not undo them.

Canceling the import's save confirmation can keep the preview available for
another attempt. Closing Import or leaving the page discards the selected file
and password state. Select the file again to restart. For Export, start another
export; after a download begins, use the browser's download controls to cancel it.

### 88. Can exported data move between browsers?

Yes. Save a native export and import it in another supported browser to move
its selected durable data and optional backup history. Local databases are
not automatically shared. Browser permissions do not transfer, and imported
synchronization remains paused for review. Earlier readers may reject newer
formats or deeply nested files. Keep a verified external file before removing
an extension or its browser profile; local snapshots are removed with that data.

### 89. What happens to old snapshots after migration or profile deletion?

Deleting a profile keeps its recovery snapshots so it can be restored later.
Current snapshots are stored alongside the app's other data and may be
unavailable if that storage fails.

When older backup data is first accessed after an upgrade, the app checks and
copies it to the current storage location. The original copy is kept unchanged.
Deleting a current snapshot does not remove that older copy.

Removing the extension or clearing all its data removes local snapshots,
including older copies. Downloaded exports are unaffected. The Privacy Policy
is available under Information > Legal & privacy in the profile menu.
