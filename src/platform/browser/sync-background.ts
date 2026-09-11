import browser from 'webextension-polyfill';
import { liveQuery } from 'dexie';
import { SyncService } from '../../application/synchronization/sync-service';
import { createActivityLogService } from '../../application/activity-log/create-activity-log-service';
import { BookmarkManagerDatabase } from '../../storage/database';
import { SyncRepository } from '../../storage/sync-repository';
import { parseNativeBookmarkTree } from './sync-bookmarks';
import { createContentChangeBridge } from '../content-change/create-content-change-bridge';

/** Registers restart-safe browser wakes synchronously; IndexedDB owns all progress. */
export function registerSynchronizationBackground() {
  const repository = new SyncRepository(new BookmarkManagerDatabase());
  const activity = createActivityLogService();
  const contentChanges = createContentChangeBridge();
  const service = new SyncService(
    repository,
    {
      hasPermission: () =>
        browser.permissions.contains({ permissions: ['bookmarks'] }),
      readTree: async () =>
        parseNativeBookmarkTree(await browser.bookmarks.getTree()),
      create: async (node) => {
        const siblings = await browser.bookmarks.getChildren(node.parentId!);
        return (
          await browser.bookmarks.create({
            parentId: node.parentId!,
            title: node.title,
            index: Math.min(node.index, siblings.length),
            ...(node.url === undefined ? {} : { url: node.url }),
          })
        ).id;
      },
      write: async (node) => {
        await browser.bookmarks.update(node.id, {
          title: node.title,
          ...(node.url === undefined ? {} : { url: node.url }),
        });
        const siblings = await browser.bookmarks.getChildren(node.parentId!);
        await browser.bookmarks.move(node.id, {
          parentId: node.parentId!,
          index: Math.min(
            node.index,
            siblings.filter((n) => n.id !== node.id).length,
          ),
        });
      },
      remove: (id) => browser.bookmarks.remove(id),
    },
    async (profileId, event) => {
      const failed = event === 'failed',
        degraded = [
          'conflict',
          'skipped',
          'permission',
          'missing-root',
        ].includes(event);
      const logging = activity
        .record(profileId, {
          action: 'Synchronize',
          category: 'Bookmarks',
          dataChanged: event === 'completed',
          durationMs: 0,
          eventCode: `SYNC-${event.toUpperCase()}`,
          itemType: 'Synchronization',
          itemsAffected: 0,
          kind: failed ? 'DIAGNOSTIC' : 'ACTIVITY',
          level: failed ? 'ERROR' : degraded ? 'WARN' : 'INFO',
          message: `Bookmark synchronization: ${event}.`,
          outcome: failed ? 'Failed' : degraded ? 'Skipped' : 'Succeeded',
          source: 'Synchronization service',
        })
        .catch(() => console.error('sync-activity-write-failed'));
      const notification =
        event === 'completed'
          ? Promise.resolve()
          : repository
              .publishFeedback(profileId, event)
              .catch(() => console.error('sync-notification-write-failed'));
      await Promise.all([logging, notification]);
    },
    (change) => contentChanges.publish(change),
  );
  const locked = <T>(work: () => Promise<T>) =>
    globalThis.navigator.locks.request('bookmark-synchronization-v1', work);
  let wakeQueued = false;
  const wake = () => {
    if (wakeQueued) return;
    wakeQueued = true;
    void locked(() => service.wake())
      .catch(() => console.error('sync-wake-failed'))
      .finally(() => {
        wakeQueued = false;
      });
  };
  const listen = () => {
    browser.bookmarks?.onCreated.addListener(wake);
    browser.bookmarks?.onChanged.addListener(wake);
    browser.bookmarks?.onMoved.addListener(wake);
    browser.bookmarks?.onRemoved.addListener(wake);
  };
  listen();
  browser.permissions.onAdded.addListener(() => {
    listen();
    wake();
  });
  browser.permissions.onRemoved.addListener(wake);
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'bookmark-sync') wake();
  });
  browser.runtime.onStartup.addListener(wake);
  browser.runtime.onInstalled.addListener(wake);
  void browser.alarms.create('bookmark-sync', { periodInMinutes: 1 });
  let observed = '';
  liveQuery(async () => {
    const profileId = await repository.activeProfileOrNull();
    return profileId
      ? JSON.stringify([profileId, await repository.tree(profileId)])
      : '';
  }).subscribe({
    next: (signature) => {
      if (signature !== observed) {
        observed = signature;
        wake();
      }
    },
    error: () => console.error('sync-local-observer-failed'),
  });
  wake();
  return (message: unknown) => locked(() => service.command(message));
}
