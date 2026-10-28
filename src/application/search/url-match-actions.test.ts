import { describe, expect, it, vi } from 'vitest';
import { bookmarkSchema } from '../../domain/bookmark';
import {
  defaultNotificationPreferences,
  profileSettingsSchema,
} from '../../domain/profile-settings';
import { UrlMatchActions } from './url-match-actions';
import type { UrlMatchMember } from '../../domain/url-matches';
import type { NotificationInput } from '../notification/notification-service';

const profileId = '11111111-1111-4111-8111-111111111111';
const otherProfileId = '22222222-2222-4222-8222-222222222222';
const itemId = '33333333-3333-4333-8333-333333333333';
const bookmark = bookmarkSchema.parse({
  id: itemId,
  profileId,
  parentId: otherProfileId,
  title: 'Private title',
  url: 'https://example.com/private',
  note: 'Private note',
  tags: [],
  index: 0,
  createdAt: 1,
  updatedAt: 1,
  cardAppearance: { kind: 'color', value: '#123456' },
});
const member: UrlMatchMember = {
  item: bookmark,
  kind: 'bookmark',
  profileId,
  profileName: 'Private profile',
  parentPath: 'Private folder',
  score: 0,
  matchedField: 'url',
};
const settings = profileSettingsSchema.parse({ profileId, theme: 'dark' });
const setup = () => ({
  readSettings: vi.fn(async () => settings),
  readBookmark: vi.fn(async () => ({ bookmark, parentPath: 'Fresh folder' })),
  confirm: vi.fn(async () => true),
  remove: vi.fn<
    (
      member: UrlMatchMember,
      notify: (input: NotificationInput) => void,
    ) => Promise<void>
  >(async () => undefined),
  writeClipboard: vi.fn(async () => undefined),
  record: vi.fn(async () => undefined),
  notify: vi.fn(),
  messages: {
    deleteComplete: 'Deleted',
    deleteFailed: 'Delete failed',
    infoFailed: 'Info failed',
    copyComplete: 'Copied',
    copyFailed: 'Copy failed',
    title: 'URL matches',
  },
});

describe('profile-owned URL match actions', () => {
  it('classifies an already removed member without hiding its immediate error feedback', async () => {
    const deps = setup();
    deps.readBookmark.mockRejectedValue(
      new Error('url-match-bookmark-missing'),
    );
    await expect(new UrlMatchActions(deps).inspect(member)).rejects.toThrow(
      'url-match-info-failed',
    );
    expect(deps.record).toHaveBeenCalledWith(
      profileId,
      expect.objectContaining({
        eventCode: 'URL-MATCH-LOAD-FAILED',
        reason: 'stale',
      }),
    );
    expect(deps.notify).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error' }),
    );
  });
  it('loads fresh details and source settings without mutation or routine feedback', async () => {
    const deps = setup();
    const result = await new UrlMatchActions(deps).inspect(member);
    expect(result.member.parentPath).toBe('Fresh folder');
    expect(deps.readSettings).toHaveBeenCalledWith(profileId);
    expect(deps.readBookmark).toHaveBeenCalledWith(profileId, itemId);
    expect(deps.record).not.toHaveBeenCalled();
    expect(deps.notify).not.toHaveBeenCalled();
    expect(deps.remove).not.toHaveBeenCalled();
  });
  it('cancels without deleting or emitting success', async () => {
    const deps = setup();
    deps.confirm.mockResolvedValue(false);
    expect(await new UrlMatchActions(deps).delete(member)).toBe(false);
    expect(deps.remove).not.toHaveBeenCalled();
    expect(deps.record).not.toHaveBeenCalled();
  });
  it('reports confirmation delivery failure instead of claiming cancellation', async () => {
    const deps = setup();
    deps.confirm.mockRejectedValue(new Error('private'));
    await expect(new UrlMatchActions(deps).delete(member)).rejects.toThrow(
      'url-match-delete-failed',
    );
    expect(deps.remove).not.toHaveBeenCalled();
    expect(deps.record).toHaveBeenCalledWith(
      profileId,
      expect.objectContaining({
        eventCode: 'URL-MATCH-DELETE-FAILED',
        level: 'ERROR',
      }),
    );
  });
  it('revalidates after confirmation and records deletion only in the owning profile', async () => {
    const deps = setup();
    expect(await new UrlMatchActions(deps).delete(member)).toBe(true);
    expect(deps.readBookmark).toHaveBeenCalledTimes(2);
    expect(deps.readSettings).toHaveBeenCalledTimes(2);
    expect(deps.remove).toHaveBeenCalledWith(
      expect.objectContaining({ profileId, item: bookmark }),
      expect.any(Function),
    );
    expect(deps.record).toHaveBeenCalledWith(
      profileId,
      expect.objectContaining({
        eventCode: 'URL-MATCH-DELETE-COMPLETE',
        level: 'INFO',
        dataChanged: true,
      }),
    );
    expect(deps.notify).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'success' }),
    );
    const feedback = JSON.stringify([
      deps.record.mock.calls,
      deps.notify.mock.calls,
    ]);
    for (const secret of [
      'Private title',
      'Private profile',
      'Private folder',
      'https://example.com',
    ])
      expect(feedback).not.toContain(secret);
  });
  it('fails safely if the bookmark disappears during confirmation', async () => {
    const deps = setup();
    deps.readBookmark
      .mockResolvedValueOnce({ bookmark, parentPath: '' })
      .mockRejectedValueOnce(new Error('secret'));
    await expect(new UrlMatchActions(deps).delete(member)).rejects.toThrow(
      'url-match-delete-failed',
    );
    expect(deps.remove).not.toHaveBeenCalled();
    expect(deps.record).toHaveBeenCalledWith(
      profileId,
      expect.objectContaining({
        eventCode: 'URL-MATCH-DELETE-FAILED',
        level: 'ERROR',
      }),
    );
  });
  it.each(['settings', 'bookmark'] as const)(
    'rejects a mismatched %s owner',
    async (kind) => {
      const deps = setup();
      if (kind === 'settings')
        deps.readSettings.mockResolvedValue({
          ...settings,
          profileId: otherProfileId,
        });
      else
        deps.readBookmark.mockResolvedValue({
          bookmark: { ...bookmark, profileId: otherProfileId },
          parentPath: '',
        });
      await expect(new UrlMatchActions(deps).delete(member)).rejects.toThrow();
      expect(deps.remove).not.toHaveBeenCalled();
      expect(deps.confirm).not.toHaveBeenCalled();
    },
  );
  it('honors disabled source notifications, including Undo degradation', async () => {
    const deps = setup();
    deps.readSettings.mockResolvedValue({
      ...settings,
      notificationPreferences: {
        ...defaultNotificationPreferences,
        enabled: false,
      },
    });
    deps.remove.mockImplementation(async (_member, notify) => {
      notify({ level: 'warning', message: 'Degraded', title: 'URL matches' });
    });
    expect(await new UrlMatchActions(deps).delete(member)).toBe(true);
    expect(deps.notify).not.toHaveBeenCalled();
    expect(deps.record).toHaveBeenCalled();
  });
  it('does not change deletion success when logging or notification delivery fails', async () => {
    const deps = setup();
    deps.record.mockRejectedValue(new Error('private'));
    deps.notify.mockImplementation(() => {
      throw Error('private');
    });
    const diagnostic = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      await expect(new UrlMatchActions(deps).delete(member)).resolves.toBe(
        true,
      );
      expect(diagnostic.mock.calls.flat()).not.toContain('private');
    } finally {
      diagnostic.mockRestore();
    }
  });
  it('reports mutation failure without a success event', async () => {
    const deps = setup();
    const cause = new Error('private');
    deps.remove.mockRejectedValue(cause);
    await expect(
      new UrlMatchActions(deps).delete(member),
    ).rejects.toMatchObject({ message: 'url-match-delete-failed', cause });
    expect(deps.record).toHaveBeenCalledTimes(1);
    expect(deps.record).toHaveBeenCalledWith(
      profileId,
      expect.objectContaining({ level: 'ERROR', dataChanged: false }),
    );
    expect(deps.notify).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error' }),
    );
  });
  it('fails closed without assuming source notification preferences when settings are unavailable', async () => {
    const deps = setup();
    deps.readSettings.mockRejectedValue(new Error('private'));
    await expect(new UrlMatchActions(deps).delete(member)).rejects.toThrow(
      'url-match-delete-failed',
    );
    expect(deps.remove).not.toHaveBeenCalled();
    expect(deps.notify).not.toHaveBeenCalled();
    expect(deps.record).toHaveBeenCalledWith(
      profileId,
      expect.objectContaining({
        level: 'ERROR',
        eventCode: 'URL-MATCH-DELETE-FAILED',
      }),
    );
  });
  it('reports details failures and keeps copy feedback source-owned', async () => {
    const deps = setup();
    deps.readBookmark.mockRejectedValueOnce(new Error('private'));
    const actions = new UrlMatchActions(deps);
    await expect(actions.inspect(member)).rejects.toThrow(
      'url-match-info-failed',
    );
    expect(deps.record).toHaveBeenCalledWith(
      profileId,
      expect.objectContaining({ eventCode: 'URL-MATCH-LOAD-FAILED' }),
    );
    const details = await actions.inspect(member);
    await actions.copy(details, 'Private note');
    expect(deps.writeClipboard).toHaveBeenCalledWith('Private note');
    expect(deps.record).toHaveBeenLastCalledWith(
      profileId,
      expect.objectContaining({ eventCode: 'URL-MATCH-COPY-COMPLETE' }),
    );
    deps.writeClipboard.mockRejectedValueOnce(new Error('private'));
    await expect(actions.copy(details, 'Private note')).rejects.toThrow(
      'url-match-copy-failed',
    );
    expect(deps.record).toHaveBeenLastCalledWith(
      profileId,
      expect.objectContaining({
        eventCode: 'URL-MATCH-COPY-FAILED',
        level: 'ERROR',
      }),
    );
  });
});
