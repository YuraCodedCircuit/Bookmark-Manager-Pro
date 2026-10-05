# Bookmark Manager Pro Help & FAQ

This guide describes the currently implemented Bookmark Manager Pro behavior.
Features marked as unavailable in the application are not described as working.

## Getting started

### 1. What is Bookmark Manager Pro?

Bookmark Manager Pro is a free, local-first browser extension for organizing
bookmarks and folders in a visual, file-manager-style interface.

### 2. Which browsers are supported?

The project targets current supported versions of Chrome, Firefox, and
Microsoft Edge.

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

Profiles and their information are stored in the application's local browser
storage.

### 9. Can I create more than one profile?

Yes. Manage profiles can create multiple independent local profiles.

### 10. How do I switch profiles?

Open the top-right profile menu, choose Switch profile, and select the profile
to activate.

### 11. Can content be copied between profiles?

No. Copy and Cut are restricted to one profile, and switching profiles clears
the pending one-shot operation.

### 12. Can I duplicate a profile?

Yes. Duplication creates a separate inactive profile while copying the source
profile's currently supported settings and profile details.

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

HTTP, HTTPS, and FTP addresses are accepted after validation. Executable,
inline-data, local-file, browser-internal, extension-internal,
credential-bearing, malformed, and unsupported schemes are rejected.

### 18. Can bookmarks and folders have the same title?

Yes. Titles do not have to be unique. Parent-folder and site information helps
distinguish otherwise similar undo-history entries.

### 19. Can I add tags and notes?

Yes. Bookmark and folder editors support comma-separated tags and a note.
Right-click any editable text field to use Cut, Copy, Paste, Select all, or
Clear. Custom Paste asks for the browser's optional clipboard-read permission
when needed; native Ctrl+V continues to work without that extension permission.
Editable single-line fields also show a Clear input button while they contain
text.

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

No. Queries, results, and search history are not stored or written to the
activity log.

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
excluded by default.

### 34. How are passwords generated and evaluated?

Web Crypto makes unbiased random choices, includes at least one character from
every enabled group, and shuffles the result. A labeled meter classifies the
actual result as Weak, Fair, Moderate, Strong, or Very Strong.

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

Ctrl+Z undoes the newest globally applicable operation by timestamp.

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

An item can use no background, a solid color, a three-color directional
gradient, or a local PNG, JPEG, or BMP image. Folder wallpaper sources are
limited to 1 MB by default. Appearance settings can allow sources up to 10 MB;
they are resized and compressed locally before only the processed result is
saved.

### 46. Can the folder background extend behind navigation?

Yes. Include the navigation panel extends the folder background behind the top
bar, and a transparency control adds a readability overlay.

### 47. Are local images uploaded?

No. Selected profile and appearance images are processed and stored locally
with application data. Original folder-wallpaper files are discarded after
local processing, and folders can share one stored optimized wallpaper.
Bookmark and folder images can be cropped as Card, Free, Square, or Landscape;
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

### 52. Which key combinations are accepted?

A binding requires a letter or number together with Ctrl, Alt, or Shift.
Reserved browser/system combinations and duplicates are rejected.

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

Bookmark, folder, profile, and settings data remains until it is changed or
deleted or the browser removes the extension's stored data.

### 62. How long is undo history retained?

Undo history belongs to the active browser session. A missing session marker on
startup causes stale undo rows to be removed.

### 63. Is activity-history retention limited?

Yes. Activity settings bound retention by record count and estimated storage
size and can automatically remove the oldest records.

### 64. What happens when local storage is unavailable?

Startup detects when the browser's local storage is unavailable and shows that
storage cannot be used rather than pretending that data was saved.

### 65. Does uninstalling remove all application data?

Yes. Removing the extension or clearing its extension data also removes its
local recovery snapshots. Export important information outside the extension
before removing it.

### 66. How do recovery snapshots work?

Open the profile menu and choose Backup. Select a profile to create or review
its snapshots. Each row provides Restore, View details, and Delete. Automatic
snapshots can be enabled in Settings > Backup and are retained separately for
each enabled trigger.

### 67. What happens during restore?

Restoring a current profile requires acknowledgment, first creates a safety
snapshot, and then replaces that profile. A snapshot retained for a deleted
profile is restored as a new profile. Synchronization settings are restored in
a paused state and must be reviewed before resuming.

## Bookmark synchronization

### 68. How do I connect an application folder to browser bookmarks?

Open the profile menu and choose Data > Bookmark synchronization. Allow the
optional bookmark permission, select one application folder and one browser
folder, choose a direction, review the preview, and then enable synchronization.

### 69. When do changes appear in another open application tab?

After synchronization or a successful app mutation changes content, every
visible tab showing an affected parent folder reloads that folder. This includes
create, delete, edit, move, copy, duplicate, cut-and-paste, favorite,
appearance, undo, and redo. A hidden tab waits until visible, and pending
changes are combined before it reads. Unaffected folders are not reloaded, and
the new-tab page itself is not refreshed.

Saving a bookmark from the toolbar popup uses the same targeted update, so an
open tab showing the destination folder displays the new item automatically.

### 70. What happens if synchronization deletes the folder I am viewing?

The tab opens the closest surviving parent from the previous folder path, or
Home if no ancestor remains. A creation window tied to the removed location
closes, and an Information notification explains the navigation change without
naming the folder.

### 71. What happens if content changes while an editor is open?

Saving a bookmark or folder editor fails safely if another surface changed that
item after the editor opened. New bookmarks and folders use the latest stored
sibling order when they are saved, preventing duplicate positions when more
than one creation window is open.

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
