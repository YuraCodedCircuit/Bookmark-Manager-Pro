import type { ExportPayload } from '../../domain/profile-export';
import type { PortableImportItem } from '../../domain/portable-import';

/** File contents stay in a dialog-owned request and are never persisted as a job. */
export type ImportRequest =
  | {
      kind: 'native';
      payload: ExportPayload;
      selected: string[];
      originProfileId: string;
    }
  | {
      kind: 'portable';
      items: PortableImportItem[];
      profileId: string;
      folderId: string;
      originProfileId: string;
    };

/** A reviewed, one-use save plan. Stale destination data requires preparing and confirming again. */
export interface ImportSavePlan {
  bookmarks: number;
  folders: number;
  profiles: number;
  duplicates: number;
  excluded: number;
  duplicatePolicy: 'allow' | 'warn' | 'prevent';
  synchronizationPaused?: boolean;
  /** Destination backup policy resolved while preparing this reviewed transaction. */
  snapshotMode:
    'enabled' | 'disabled' | 'automatic-disabled' | 'not-needed' | 'no-changes';
  commit(signal: AbortSignal): Promise<{ profileIds: string[] }>;
}

/** Owns dialog-scoped database handles; closing disposes unfinished processing. */
export interface ImportWriter {
  /** Original failure for controlled diagnosis only; never render it or send it to logs. */
  readonly diagnosticFailure?: unknown;
  prepare(request: ImportRequest, signal: AbortSignal): Promise<ImportSavePlan>;
  close(): void;
}
