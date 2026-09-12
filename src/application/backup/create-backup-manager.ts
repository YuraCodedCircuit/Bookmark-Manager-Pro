import { runWithBrowserLock } from '../../platform/concurrency/run-with-browser-session-lock';
import { BackupDatabase } from '../../storage/backup-database';
import { BookmarkManagerDatabase } from '../../storage/database';
import { DexieBackupRepository } from '../../storage/dexie-backup-repository';
import { ManageBackups } from './manage-backups';

/** Composes the backup service with a cross-tab exclusive operation lock. */
export function createBackupManager(): ManageBackups {
  return new ManageBackups(
    new DexieBackupRepository(
      new BackupDatabase(),
      new BookmarkManagerDatabase(),
    ),
    undefined,
    undefined,
    (run) => runWithBrowserLock('bookmark-manager-pro.backup-operation', run),
  );
}
