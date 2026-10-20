import Dexie, { type EntityTable } from 'dexie';

import type { BackupSnapshot } from '../domain/backup';

/** Legacy recovery source retained unchanged after verified migration into schema 38. */
export class BackupDatabase extends Dexie {
  readonly snapshots!: EntityTable<BackupSnapshot, 'id'>;

  constructor(name = 'bookmark-manager-pro-backups') {
    super(name);
    this.version(1).stores({
      snapshots:
        '&id, profileId, [profileId+createdAt], type, trigger, createdAt',
    });
  }
}
