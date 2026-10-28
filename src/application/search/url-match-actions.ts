import { bookmarkSchema, type Bookmark } from '../../domain/bookmark';
import {
  defaultNotificationPreferences,
  profileSettingsSchema,
  type ProfileSettings,
} from '../../domain/profile-settings';
import type { UrlMatchMember } from '../../domain/url-matches';
import type { NotificationInput } from '../notification/notification-service';
import type { RecordActivityInput } from '../activity-log/manage-activity-log';

/** Fresh, profile-owned metadata displayed by the existing Get info dialog. */
export interface UrlMatchDetails {
  member: UrlMatchMember;
  settings: ProfileSettings;
}

interface Dependencies {
  readSettings(profileId: string): Promise<ProfileSettings>;
  readBookmark(
    profileId: string,
    itemId: string,
  ): Promise<{ bookmark: Bookmark; parentPath: string }>;
  confirm(profileName: string): Promise<boolean>;
  remove(
    member: UrlMatchMember,
    notify: (input: NotificationInput) => void,
  ): Promise<void>;
  writeClipboard(value: string): Promise<void>;
  record(profileId: string, event: RecordActivityInput): Promise<unknown>;
  notify(input: NotificationInput): unknown;
  messages: {
    deleteComplete: string;
    deleteFailed: string;
    infoFailed: string;
    copyComplete: string;
    copyFailed: string;
    title: string;
  };
}

/** Executes single-bookmark actions without activating the bookmark's profile. */
export class UrlMatchActions {
  constructor(private readonly dependencies: Dependencies) {}

  private async settings(profileId: string): Promise<ProfileSettings> {
    const settings = profileSettingsSchema.parse(
      await this.dependencies.readSettings(profileId),
    );
    if (settings.profileId !== profileId)
      throw new Error('url-match-profile-mismatch');
    return settings;
  }

  private async fresh(
    member: UrlMatchMember,
    settings: ProfileSettings,
  ): Promise<UrlMatchDetails> {
    const context = await this.dependencies.readBookmark(
      member.profileId,
      member.item.id,
    );
    const bookmark = bookmarkSchema.parse(context.bookmark);
    if (
      bookmark.id !== member.item.id ||
      bookmark.profileId !== member.profileId
    )
      throw new Error('url-match-bookmark-mismatch');
    return {
      member: { ...member, item: bookmark, parentPath: context.parentPath },
      settings,
    };
  }

  private notify(
    settings: ProfileSettings | undefined,
    level: NotificationInput['level'],
    message: string,
  ): void {
    if (
      settings &&
      (settings.notificationPreferences ?? defaultNotificationPreferences)
        .enabled
    ) {
      try {
        this.dependencies.notify({
          level,
          message,
          title: this.dependencies.messages.title,
        });
      } catch {
        console.error('url-matches-notification-failed');
      }
    }
  }

  private async record(
    member: UrlMatchMember,
    action: 'Delete' | 'Load' | 'Copy',
    success: boolean,
    message: string,
    cause?: unknown,
  ): Promise<void> {
    try {
      await this.dependencies.record(member.profileId, {
        action,
        category: 'Bookmarks',
        dataChanged: action === 'Delete' && success,
        durationMs: 0,
        eventCode: `URL-MATCH-${action.toUpperCase()}-${success ? 'COMPLETE' : 'FAILED'}`,
        itemType: 'Bookmark',
        itemsAffected: success ? 1 : 0,
        kind: success ? 'ACTIVITY' : 'DIAGNOSTIC',
        level: success ? 'INFO' : 'ERROR',
        message,
        outcome: success ? 'Succeeded' : 'Failed',
        source: 'URL matches',
        ...(cause instanceof Error &&
        [
          'bookmark-not-found',
          'url-match-bookmark-missing',
          'delete-bookmark-not-found',
          'content-changed',
        ].includes(cause.message)
          ? { reason: 'stale' as const }
          : {}),
      });
    } catch {
      console.error('url-matches-log-write-failed');
    }
  }

  /** Reads current metadata; routine dialog opening has no success toast or log. */
  async inspect(member: UrlMatchMember): Promise<UrlMatchDetails> {
    let settings: ProfileSettings | undefined;
    try {
      settings = await this.settings(member.profileId);
      return await this.fresh(member, settings);
    } catch (cause) {
      await this.record(
        member,
        'Load',
        false,
        this.dependencies.messages.infoFailed,
        cause,
      );
      this.notify(settings, 'error', this.dependencies.messages.infoFailed);
      throw new Error('url-match-info-failed', { cause });
    }
  }

  /** Confirms once, revalidates ownership, and delegates to profile-owned Undo. */
  async delete(member: UrlMatchMember): Promise<boolean> {
    let settings: ProfileSettings | undefined;
    try {
      settings = await this.settings(member.profileId);
      await this.fresh(member, settings);
      if (!(await this.dependencies.confirm(member.profileName))) return false;
      settings = await this.settings(member.profileId);
      const current = await this.fresh(member, settings);
      const preferences = settings;
      await this.dependencies.remove(current.member, (input) => {
        if (
          (
            preferences.notificationPreferences ??
            defaultNotificationPreferences
          ).enabled
        ) {
          try {
            this.dependencies.notify(input);
          } catch {
            console.error('url-matches-notification-failed');
          }
        }
      });
    } catch (cause) {
      await this.record(
        member,
        'Delete',
        false,
        this.dependencies.messages.deleteFailed,
        cause,
      );
      this.notify(settings, 'error', this.dependencies.messages.deleteFailed);
      throw new Error('url-match-delete-failed', { cause });
    }
    await this.record(
      member,
      'Delete',
      true,
      this.dependencies.messages.deleteComplete,
    );
    this.notify(settings, 'success', this.dependencies.messages.deleteComplete);
    return true;
  }

  /** Copies only after explicit activation, with owning-profile feedback. */
  async copy(details: UrlMatchDetails, value: string): Promise<void> {
    let settings: ProfileSettings | undefined;
    try {
      settings = await this.settings(details.member.profileId);
      await this.dependencies.writeClipboard(value);
    } catch (cause) {
      await this.record(
        details.member,
        'Copy',
        false,
        this.dependencies.messages.copyFailed,
      );
      this.notify(settings, 'error', this.dependencies.messages.copyFailed);
      throw new Error('url-match-copy-failed', { cause });
    }
    await this.record(
      details.member,
      'Copy',
      true,
      this.dependencies.messages.copyComplete,
    );
    this.notify(settings, 'success', this.dependencies.messages.copyComplete);
  }
}
