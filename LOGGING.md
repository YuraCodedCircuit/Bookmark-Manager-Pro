# Logging Service

The logging service stores shared, bounded, privacy-safe application history.
The active profile controls permission to record; switching profiles does not
change visible history. Presentation code depends on `ManageActivityLog`; the
application service depends on `ActivityLogRepository`; Dexie implements the
repository in the storage layer.

## Capture policy

Activity and diagnostic capture are controlled independently. Both honor the
configured minimum `INFO`, `WARN`, or `ERROR` level and enabled categories.
Shared recording and retention options are separate from the profile master
switch. Disabled periods are not buffered or replayed. Records contain
stable event codes, outcomes, generic source/action/item categories, counts,
timing, application and schema versions, browser family/version, and random
operation IDs. They never contain bookmark titles, URLs, folder names, search
text, usernames, profile icons, imported content, encryption material, or raw
exceptions.

Webpage preflight is quiet on success and supported capability limitations. A
localization-load failure records `ERROR` before the original failure continues.
Before any profile exists, minimal application-wide preflight records are
permitted. Once profiles exist, the active profile's gate is authoritative.

Background preflight records actual start and completion at INFO and unexpected
failure at ERROR. Post-update checks retain their distinct preflight codes.
Cached readiness does not replay rows, and generic update success adds no
duplicate completion. Essential outcome metadata remains in the session header even when
row filters exclude those levels. Packaged surfaces request the background
result and initialize their local UI without rerunning webpage capability checks.
If the browser-session snapshot cannot be read, preflight safely reruns. If the
snapshot cannot be written, it records `WARN` when an active profile logger is
available and continues without caching. Logging failures emit only the stable
`background-preflight-activity-log-write-failed` developer diagnostic and never
change readiness results. Routine worker startup does not show a notification.

Profile mutations are quiet on success and record `ERROR` for unexpected primary
failure. A committed mutation followed by failed readback uses WARN. Logging is best-effort:
failure to write a record emits only a non-sensitive developer diagnostic and
does not replace the primary operation result.

Bookmark and folder creation are quiet on success and input validation.
Unexpected persistence failures record `ERROR`; post-commit readback uses WARN.
These records identify only the generic item type and affected count; the title,
URL, folder name, appearance value, and parent identifier are never recorded.

Password Generator opening, automatic initial generation, option changes,
strength calculation, reveal frames, and successful copy do not create activity
records. An unexpected generation or clipboard failure may create an `ERROR`
diagnostic containing only the stable failure category. Expected length
validation does not create a diagnostic. Generated passwords and selected
options never appear in records, developer diagnostics, or notification text.

Image-crop success remains part of the pending editor state and is not logged.
Automatic popup crop fallback may create a privacy-safe `WARN` outcome, but no
image data, URL, title, crop coordinates, zoom value, or clipboard content may
appear in an event. Clipboard-read denial and bookmark-address copy failures use
generic categories only. All logging remains failure-isolated from the primary
edit, crop, paste, copy, or navigation result.

Post-load undo-session maintenance is quiet for completion and supported skips.
Cleanup failure uses WARN; failed durable history writes use ERROR.
It never records bookmark content or session IDs and cannot block startup or
disable current-session history. Notification-layer fallback and failed actions
use content-free diagnostics; routine admission, pointer activity, and timers
are not logged.

## Import and profile Export boundaries

Import records one INFO committed bulk summary, or one WARN terminal summary
when committed work has exclusions, paused synchronization, or failed readback.
Validation, unlock, preparation, cancellation, invalid files, wrong passwords,
and expected destination changes are quiet. Unexpected worker, destination-read,
and primary save failures use ERROR. Deliberately excluded history is quiet.
Success is defined by commit completion, even when later refresh or feedback
fails. Failed requests use the existing Error notifier; successful saves use
Success, and actionable degradation uses Warning, subject to profile settings.

Profile Export is quiet for start, handoff, and cancellation and records
`ERROR` for unexpected load or generation failure. Browser handoff produces Success;
failures produce Error. Successful handoff does not establish disk completion.
Password-free estimates, routine progress, filtering, selection, paging, focus,
and file-card guidance create no operation records or notifications. All
feedback is failure-isolated and honors existing recording/notification
settings. Source content, filenames, paths, passwords, encryption material,
and raw exceptions are excluded.

## Retention

Defaults are 10,000 records and approximately 25 MB of serialized log data.
Automatic cleanup removes oldest completed groups first. An oversized current
group retains its header and startup outcome while oldest rows are trimmed;
the header counts removed rows. Without cleanup, recording pauses at capacity
and the log presents a persistent warning with clear and options actions.
Increasing limits, enabling cleanup, or clearing can resume new recording;
dropped events are not replayed. Session headers are included in the size bound.

## Local-only history and deletion

Clear all sessions and Clear this session each require a separate destructive
confirmation. Filters never narrow deletion. Clearing preserves settings and
live browser identity, removes retained startup details, and never restores
erased preflight from the primary startup cache. Successful clearing does not
repopulate history with a clear event.

The activity service has no export or clipboard path. Native exports, nested
backup history, recovery, and imported older files exclude activity/session
records. Existing local history is converted and retained independently of
profiles; deleting or duplicating a profile does not delete or copy history.
Internal profile references resolve to current local names or Deleted profile.

## Folder-tab background handoff

Folder-tab opening and usable destination loading are quiet. Creation or storage failures record
`FOLDER-OPEN-NEW-TAB-FAILED`; startup failures use `INITIAL-FOLDER-LOAD-FAILED`.
Deleted destinations use `FOLDER-TAB-DESTINATION-MISSING` at WARN while preserving
ordinary startup preferences. Normal startup without a matching binding and
routine session cleanup are intentionally unlogged navigation, not failures.

Unauthorized messages are rejected without recording attacker-controlled data.
Cleanup diagnostics use fixed console codes. No destination IDs or tokens enter
activity messages or notification text. These records honor the existing
profile capture controls; logging and notification failure do not change tab
opening results. Errors persist, startup errors offer Retry, and a missing
destination produces a Warning. Successful navigation produces no notification.

Temporary-page readiness failures use the fixed console ERROR diagnostic
`folder-tab-readiness-failed` and an inline error with Retry. A trusted profile
has not been delivered to that page, so it cannot write profile-owned activity
or apply profile notification preferences. It does not create notifications.

## URL matches

Completed snapshot reads are quiet. Failed reads record
`URL-MATCHES-SCAN-FAILED` at ERROR; retaining usable old results instead emits
one `URL-MATCHES-SNAPSHOT-OUTDATED` at WARN. Existing
profile recording preferences govern capture. Messages use fixed localized text
without titles, URLs, filters, folder paths, profile names, or exception content.

Explicit refresh success receives a Success notification; failures receive a
persistent Error. Consecutive identical failures suppress duplicate notices
while unchanged durable incidents coalesce. Profile notification preferences
remain authoritative. Logging and notification errors use fixed developer
diagnostics and cannot alter results. Mode navigation, filtering, expansion,
and paging do not notify or record separate interaction events. Entering the
mode does perform a scan, whose completion/failure is an operation boundary.

URL-match actions are quiet on success and record source-profile unexpected
`-FAILED` events at ERROR. Expected stale-member rejection is quiet.
Metadata read failures use `URL-MATCH-LOAD-FAILED`; routine Get info opening
remains unlogged. Deletion cancellation does not record a mutation or notify.
Existing Undo and content-publication degradation events retain source ownership
and source notification enablement. A failed active-folder reread after deletion
uses `URL-MATCH-VIEW-REFRESH-DEGRADED` at WARN without changing deletion success.

Delete and Copy success notifications confirm completion; errors persist. Source
notification preferences gate delivery, and active-surface controls remain in
effect. If source settings cannot be read, inline failure feedback remains and
no source preference is assumed. Messages exclude URLs, titles, profile names,
paths, copied values, and raw errors. Feedback failures use fixed diagnostics
without changing mutation results. Auto-refresh scan failure is reported by the
existing scan boundary, separately from the completed deletion.

URL-match folder navigation is quiet on success. URL-MATCH-FOLDER-OPEN-FAILED records ERROR in
the target profile with content-free diagnostics. Failure displays a persistent
localized Error. Completed cross-profile Open folder navigation shows a localized
Information notice explaining the switch and destination opening, gated by the
destination profile's notification settings. Same-profile navigation stays quiet.
The notice excludes personal content and delivery failure cannot fail navigation. Missing target
resolution cannot switch profiles. Icon sizing and Active badge rendering add
no logs or notifications.

Superseded folder/navigation reads are intentional transient cancellation and
remain unlogged. They cannot publish old profile content or unrelated errors
after newer navigation. Current-operation failures retain existing ERROR and
notification boundaries; discarding obsolete work does not hide current failures.

Activity-log options opening, closing, and filtering remain quiet navigation.
Settings and clear operations are quiet on success and retain unexpected ERROR
failure boundaries. A failed clear-confirmation delivery records
ACTIVITY-LOG-CLEAR-FAILED without deleting records; cancellation remains quiet.
Notification delivery failures use a fixed developer diagnostic and cannot turn
a completed log operation into an operation failure. Browser-session groups
retain essential startup and recording-resume status separately from event rows.

## Activity-log rebuild: profile transfer boundary

New profile recovery snapshots contain no activity records. Native profile
exports exclude current activity and records embedded in older snapshots.
Original nested snapshot integrity is checked before exporting a sanitized copy
with a new digest and byte size. Import and recovery do not insert, replace, or
merge activity records, including when older payloads contain history.

Existing import, export, and recovery operation feedback remains responsible for
success and failure. These storage transformations introduce no additional user
operation or independent notification. A failed original digest still fails the
operation. Import and restore confirmations explain the history exclusion.
Standalone log export and duplication controls are removed. Existing saved
snapshots are retained without modification
so their original integrity checks remain valid.

## Session ordering and live presentation

Background startup retains actual outcome in session metadata. Browser
startup rotates the shared marker; additional pages and worker resumes reuse it.
Explicit updates recover known identity and label post-update checks separately.
Missing identity creates a detected group with detection time, never an invented
browser start or clean shutdown. The webpage preview has no browser-startup API
and uses a detected tab-session marker. Browser coordination markers contain no
profile names, bookmark content, or event payloads.

Ordinary events may wait in a durable 128-entry queue during preflight. Overflow
discards oldest ordinary waiting records and counts omissions in the session
header. Recording-disabled events are never queued. A primary cached preflight
can indicate that a pending attempt ended, but cannot restore a cleared outcome
or turn an unrecorded startup into success. The factory schedules ordinary log
writes without making primary operations await them. Failures emit only fixed
developer diagnostics. Preflight logging runs independently of readiness and
retains the actual start/outcome observation times while serializing its writes.
Cached primary results can finish an existing pending queue after worker
suspension; they cannot recreate erased session details. Synchronization waits
for the real startup checks, never for log writes or queue draining.
Cached snapshots identify post-update checks so worker recovery cannot mistake
their outcome for the original startup outcome.

The log subscribes to shared IndexedDB changes and resolves current profile
names locally. Groups and events each have independent order options. Rendering
is paged in groups of 50, and filters evaluate all retained records. Dates are
unions of local calendar days. Reader position is retained unless already at the
latest edge; otherwise New events offers an explicit jump. Routine filtering,
calendar selection, focus, paging, and window opening remain quiet.

Capacity pause is durable shared state. A persistent Warning offers access to
the log's clear and limit/cleanup controls and honors active-profile notification
preferences. Repeated full-state reads do not repeat the notice. The log also
shows its persistent inline warning. No additional WARN event is forced into a
full log. A failure reading or notifying capacity uses a fixed developer
diagnostic so feedback cannot recursively depend on a failing log store.
Successful import and restore still use their normal success boundaries;
excluding embedded older history retains immediate UI feedback without a durable
warning. Log clear/settings are quiet on success and retain unexpected ERROR boundaries; failed
confirmation leaves data unchanged. Disabled notification delivery never changes
the primary operation outcome.

If packaged background preflight cannot be reached or validated, the surface
still initializes local data without rerunning webpage capability checks. It
reports a fixed runtime-messaging degradation and a preference-gated Warning.
No startup success is invented. Durable logging may also be unavailable because
the worker owns session identity; the fallback uses the fixed
`background-preflight-unavailable` developer warning instead of creating
unrelated groups or logging untrusted exception content. Reopening retries the
background request. Notification delivery remains failure-isolated.

## Sparse capture and incident coalescing

Committed bulk import, snapshot restore, and changed synchronization batches
retain INFO summaries. Actual background startup and post-update preflight
retain INFO start/completion diagnostics. Recovery INFO requires a previously recorded persistent
incident. Routine navigation, copying, item/profile changes, settings, expected
validation, cancellation, optional permission refusal, and supported preview
limitations remain immediate UI feedback without durable rows.

Versioned metadata coalesces unchanged WARN/ERROR incidents by owning profile,
browser session, fixed code, and fixed safe reason in an atomic IndexedDB
transaction. State survives surface and worker restarts. ERROR escalation remains
visible. Successful signals resolve matching incidents without routine success
rows. The state holds at most 128 incidents; evicted incidents may recur. Unknown
versions are preserved and fail open to recording. No timed blanket quota hides
unrelated faults.

Incident metadata is local-only and excluded from transfer formats. Clearing
history or disabling recording clears applicable incident state. Existing rows
are untouched. Durable logging failure uses fixed developer diagnostics without
recursive writes. No delivery-gap count is invented when loss cannot be measured.
