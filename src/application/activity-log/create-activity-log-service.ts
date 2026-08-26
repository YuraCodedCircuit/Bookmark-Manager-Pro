import packageMetadata from '../../../package.json';
import {
  getBrowserTarget,
  getOperatingSystemInfo,
} from '../../platform/browser/browser-target';
import { BookmarkManagerDatabase } from '../../storage/database';
import { DexieActivityLogRepository } from '../../storage/dexie-activity-log-repository';
import { ManageActivityLog } from './manage-activity-log';

/** Composes the durable webpage/extension activity-log service. */
export function createActivityLogService(): ManageActivityLog {
  const operatingSystem = getOperatingSystemInfo(
    window.navigator.userAgent,
    window.navigator.platform,
  );
  return new ManageActivityLog(
    new DexieActivityLogRepository(new BookmarkManagerDatabase()),
    {
      applicationVersion: packageMetadata.version,
      browserTarget: getBrowserTarget(window.navigator.userAgent),
      operatingSystem: operatingSystem.name,
      operatingSystemVersion: operatingSystem.version,
    },
  );
}
