import packageMetadata from '../../../package.json';
import { getBrowserTarget } from '../../platform/browser/browser-target';
import { BookmarkManagerDatabase } from '../../storage/database';
import { DexieActivityLogRepository } from '../../storage/dexie-activity-log-repository';
import { ManageActivityLog } from './manage-activity-log';

/** Composes the durable webpage/extension activity-log service. */
export function createActivityLogService(
  options: { background?: boolean } = {},
): ManageActivityLog {
  const service = new ManageActivityLog(
    new DexieActivityLogRepository(new BookmarkManagerDatabase()),
    {
      applicationVersion: packageMetadata.version,
      browserTarget: getBrowserTarget(globalThis.navigator.userAgent),
    },
    undefined,
    undefined,
    async () => {
      if (globalThis.location?.protocol.endsWith('-extension:')) {
        const adapter =
          await import('../../platform/storage/browser-activity-session');
        return options.background
          ? adapter.browserActivitySession()
          : adapter.requestActivitySession();
      }
      const key = 'activityPreviewSessionV1';
      let id = sessionStorage.getItem(key);
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(key, id);
      }
      return {
        id,
        startedAt: Math.floor(performance.timeOrigin),
        origin: 'detected',
        preflightComplete: !!document.documentElement.dataset.preflightReady,
      };
    },
  );
  const record = service.record.bind(service);
  service.record = (profileId, input, timestamp) => {
    // Preflight has an explicit durable ordering boundary. Ordinary operations
    // enqueue independently and never wait for startup logging or storage.
    if (input.eventCode.includes('PREFLIGHT'))
      return record(profileId, input, timestamp);
    void record(profileId, input, timestamp).catch(() =>
      console.error('activity-log-background-write-failed'),
    );
    return Promise.resolve();
  };
  return service;
}
