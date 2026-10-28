import type { Bookmark } from '../../domain/bookmark';
import type { Folder } from '../../domain/folder';
import type { SearchProfileSource } from '../../domain/bookmark-search';
import { urlMatchKey } from '../../domain/url-matches';
import type { RecordActivityInput } from '../activity-log/manage-activity-log';
import type { NotificationInput } from '../notification/notification-service';

/** Reads every profile before publishing; any rejected read invalidates the scan. */
export async function loadUrlMatchSnapshot(dependencies: {
  listProfiles(): Promise<readonly { id: string; name: string }[]>;
  listBookmarks(profileId: string): Promise<readonly Bookmark[]>;
  listFolders(profileId: string): Promise<readonly Folder[]>;
}): Promise<readonly SearchProfileSource[]> {
  const profiles = await dependencies.listProfiles();
  return Promise.all(
    profiles.map(async (profile) => {
      const [bookmarks, folders] = await Promise.all([
        dependencies.listBookmarks(profile.id),
        dependencies.listFolders(profile.id),
      ]);
      for (const bookmark of bookmarks) urlMatchKey(bookmark.url, 'exact');
      return {
        bookmarks,
        folders,
        profileId: profile.id,
        profileName: profile.name,
      };
    }),
  );
}

export type UrlMatchScanOutcome = 'complete' | 'failed' | 'outdated';

/** Reports content-free scan boundaries; feedback failure never changes results. */
export async function reportUrlMatchScan(input: {
  outcome: UrlMatchScanOutcome;
  explicit: boolean;
  notifyFailure?: boolean;
  messages: {
    complete: string;
    failed: string;
    outdated: string;
    title: string;
  };
  record(event: RecordActivityInput): Promise<unknown>;
  notify(notification: NotificationInput): unknown;
}): Promise<void> {
  const success = input.outcome === 'complete';
  const event: RecordActivityInput = {
    action: 'Load',
    category: 'Bookmarks',
    dataChanged: false,
    durationMs: 0,
    eventCode: success
      ? 'URL-MATCHES-SCAN-COMPLETE'
      : input.outcome === 'outdated'
        ? 'URL-MATCHES-SNAPSHOT-OUTDATED'
        : 'URL-MATCHES-SCAN-FAILED',
    itemType: 'URL matches snapshot',
    itemsAffected: 0,
    kind: 'DIAGNOSTIC',
    level: success ? 'INFO' : input.outcome === 'outdated' ? 'WARN' : 'ERROR',
    message:
      input.messages[
        input.outcome === 'outdated'
          ? 'outdated'
          : success
            ? 'complete'
            : 'failed'
      ],
    outcome: success
      ? 'Succeeded'
      : input.outcome === 'outdated'
        ? 'Skipped'
        : 'Failed',
    source: 'URL matches',
  };
  const record = async (value: RecordActivityInput) => {
    try {
      await input.record(value);
    } catch {
      console.error('url-matches-log-write-failed');
    }
  };
  // Notification delivery and durable logging are independent of each other.
  const feedback = async () => {
    if (
      (success && !input.explicit) ||
      (!success && input.notifyFailure === false)
    )
      return;
    try {
      await input.notify({
        id: 'url-matches-scan',
        level: success ? 'success' : 'error',
        message: input.messages[input.outcome],
        title: input.messages.title,
      });
    } catch {
      console.error('url-matches-notification-failed');
    }
  };
  await Promise.all([record(event), feedback()]);
}
