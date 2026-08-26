# Logging Service

The logging service stores bounded, privacy-safe operational metadata for the
active local profile. Presentation code depends on `ManageActivityLog`; the
application service depends on `ActivityLogRepository`; Dexie implements the
repository in the storage layer.

## Capture policy

Activity and diagnostic capture are controlled independently. Diagnostics also
honor the configured minimum `INFO`, `WARN`, or `ERROR` level. Records contain
stable event codes, outcomes, generic source/action/item categories, counts,
timing, application and schema versions, browser family/version, and random
operation IDs. They never contain bookmark titles, URLs, folder names, search
text, usernames, profile icons, imported content, encryption material, or raw
exceptions.

Webpage preflight records `INFO` after successful completion and `WARN` when
extension-only capabilities are unavailable in the webpage environment. A
localization-load failure records `ERROR` before the original failure continues.
These triggers run only after an active profile is available. Storage-unavailable,
first-run, and early recovery states cannot write a profile-owned record.

Background preflight records `INFO` after active-profile readiness is validated.
If the browser-session snapshot cannot be read, preflight safely reruns. If the
snapshot cannot be written, it records `WARN` when an active profile logger is
available and continues without caching. Logging failures emit only the stable
`background-preflight-activity-log-write-failed` developer diagnostic and never
change readiness results. Routine worker startup does not show a notification.

Implemented profile mutations record `INFO` after success and `ERROR` after a
failed create, update, duplicate, delete, or switch. Logging is best-effort:
failure to write a record emits only a non-sensitive developer diagnostic and
does not replace the primary operation result.

Bookmark and folder creation record `INFO` after the item is persisted and the
open-folder view reloads. Validation or persistence failures record `ERROR`.
These records identify only the generic item type and affected count; the title,
URL, folder name, appearance value, and parent identifier are never recorded.

## Retention

When automatic removal is enabled, the service applies both the configured
record count and an estimated serialized-size ceiling after writes and settings
changes. Oldest records are deleted first. IndexedDB owns durable state; no
timer, module-level queue, or open transaction is expected to survive background
worker suspension.

## Export and deletion

Clear removes all activity records for the active profile after UI confirmation.
Export creates a UTF-8 `.log` text file through an explicit browser download.
A one-time comment header records the export format, export timestamp,
application version, browser target/version, operating system/version, and
database schema version. Environment values are not repeated for every event.

After a blank separator, each event occupies exactly one line:

```text
local-ISO-timestamp [LEVEL] [Source] Message | Event code: CODE | Outcome: Result | ...
```

The timestamp includes a numeric UTC offset. Profile IDs are omitted. Diagnostic
entries are excluded unless the profile setting explicitly includes them.
Newlines, square brackets, and field separators are neutralized in formatted
values to prevent forged log records. The service does not request arbitrary
file-system access and cannot silently maintain a file outside browser storage.
