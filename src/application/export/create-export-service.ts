import { BackupDatabase } from '../../storage/backup-database';
import { BookmarkManagerDatabase } from '../../storage/database';
import { DexieBackupRepository } from '../../storage/dexie-backup-repository';
import { ExportProfiles } from './export-profiles';

/** Opens database handles only during a foreground export and closes them on every outcome. */
export function createExportService(): Pick<
  ExportProfiles,
  'create' | 'estimate'
> {
  const withService = async <T>(
    run: (service: ExportProfiles) => Promise<T>,
  ): Promise<T> => {
    const primary = new BookmarkManagerDatabase();
    const backups = new BackupDatabase();
    try {
      return await run(
        new ExportProfiles(new DexieBackupRepository(backups, primary)),
      );
    } finally {
      primary.close();
      backups.close();
    }
  };
  return {
    create: (...args) => withService((service) => service.create(...args)),
    estimate: (...args) => withService((service) => service.estimate(...args)),
  };
}
