import Dexie, { type EntityTable } from 'dexie';

import type { BackupSnapshot } from '../domain/backup';

/** Separate recovery store that remains readable when the primary database fails. */
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
