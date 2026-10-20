import {
  backupSnapshotSchema,
  digestBackupPayload,
  encodeBackupPayload,
} from '../domain/backup';
import type { BookmarkManagerDatabase } from './database';
import type { BackupDatabase } from './backup-database';

/** Copies and verifies legacy recovery data before atomically marking it migrated.
 * The old database is preserved; retries never overwrite newer main-store data.
 */
export async function migrateBackupSnapshots(
  primary: BookmarkManagerDatabase,
  legacy: BackupDatabase,
): Promise<void> {
  const key = `backup-migration:v1:${legacy.name}`;
  if (await primary.metadata.get(key)) return;
  const snapshots = (await legacy.snapshots.toArray()).map((row) =>
    backupSnapshotSchema.parse(row),
  );
  for (const snapshot of snapshots) {
    const size = encodeBackupPayload(snapshot.payload).byteLength;
    if (size !== snapshot.sizeBytes || size > 256 * 1024 * 1024)
      throw new Error('backup-migration-size-invalid');
    if ((await digestBackupPayload(snapshot.payload)) !== snapshot.digest)
      throw new Error('backup-migration-integrity-failed');
  }
  await primary.transaction(
    'rw',
    [primary.backupSnapshots, primary.metadata],
    async () => {
      if (await primary.metadata.get(key)) return;
      for (const snapshot of snapshots) {
        const existing = await primary.backupSnapshots.get(snapshot.id);
        if (existing && JSON.stringify(existing) !== JSON.stringify(snapshot))
          throw new Error('backup-migration-conflict');
        if (!existing) await primary.backupSnapshots.add(snapshot);
        const stored = await primary.backupSnapshots.get(snapshot.id);
        if (JSON.stringify(stored) !== JSON.stringify(snapshot))
          throw new Error('backup-migration-verification-failed');
      }
      await primary.metadata.put({
        key,
        value: { version: 1, count: snapshots.length },
      });
    },
  );
}
