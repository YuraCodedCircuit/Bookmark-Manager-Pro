import { z } from 'zod';

import {
  backupSnapshotSchema,
  digestBackupPayload,
  encodeBackupPayload,
  type BackupSnapshot,
} from '../../domain/backup';
import type {
  BackupRepository,
  CreateSnapshotInput,
} from './backup-repository';

const manualNameSchema = z.string().trim().min(1).max(100).optional();
const MAX_SNAPSHOT_BYTES = 256 * 1024 * 1024;
type RunExclusive = <T>(run: () => Promise<T>) => Promise<T>;

/** Coordinates immutable snapshot creation, verification, retention, and restoration. */
export class ManageBackups {
  constructor(
    private readonly repository: BackupRepository,
    private readonly createId = () => crypto.randomUUID(),
    private readonly now = () => Date.now(),
    private readonly runExclusive: RunExclusive = (run) => run(),
  ) {}

  list(): Promise<readonly BackupSnapshot[]> {
    return this.repository.list();
  }

  async create(input: CreateSnapshotInput): Promise<BackupSnapshot> {
    return this.runExclusive(() => this.createUnlocked(input));
  }

  private async createUnlocked(
    input: CreateSnapshotInput,
  ): Promise<BackupSnapshot> {
    const name = manualNameSchema.parse(input.name?.trim() || undefined);
    const payload = await this.repository.captureProfile(
      z.uuid().parse(input.profileId),
    );
    const digest = await digestBackupPayload(payload);
    const sizeBytes = encodeBackupPayload(payload).byteLength;
    if (sizeBytes > MAX_SNAPSHOT_BYTES)
      throw new Error('backup-snapshot-too-large');
    const createdAt = this.now();
    const snapshot = backupSnapshotSchema.parse({
      id: this.createId(),
      profileId: payload.profile.id,
      profileName: payload.profile.username,
      name: name ?? this.defaultName(input.trigger, createdAt),
      type: input.type,
      trigger: input.trigger,
      createdAt,
      verifiedAt: createdAt,
      sizeBytes,
      digest,
      payload,
    });
    await this.repository.put(snapshot);
    const stored = await this.repository.get(snapshot.id);
    if (
      !stored ||
      (await digestBackupPayload(stored.payload)) !== stored.digest
    ) {
      await this.repository.delete(snapshot.id).catch(() => undefined);
      throw new Error('backup-verification-failed');
    }
    if (stored.type === 'automatic') {
      const retention =
        stored.payload.settings.backupPreferences?.retentionPerTrigger ?? 5;
      const obsolete = (await this.repository.list())
        .filter(
          (item) =>
            item.id !== stored.id &&
            item.profileId === stored.profileId &&
            item.type === 'automatic' &&
            item.trigger === stored.trigger,
        )
        .sort((left, right) => right.createdAt - left.createdAt)
        .slice(retention - 1);
      for (const item of obsolete) await this.repository.delete(item.id);
    }
    return stored;
  }

  delete(snapshotId: string): Promise<void> {
    return this.runExclusive(() => this.repository.delete(snapshotId));
  }

  async restore(snapshotId: string, mode: 'replace' | 'new'): Promise<string> {
    return this.runExclusive(() => this.restoreUnlocked(snapshotId, mode));
  }

  private async restoreUnlocked(
    snapshotId: string,
    mode: 'replace' | 'new',
  ): Promise<string> {
    const snapshot = await this.repository.get(snapshotId);
    if (!snapshot) throw new Error('backup-snapshot-not-found');
    if ((await digestBackupPayload(snapshot.payload)) !== snapshot.digest)
      throw new Error('backup-integrity-failed');
    if (mode === 'replace') {
      await this.createUnlocked({
        profileId: snapshot.profileId,
        trigger: 'restore',
        type: 'safety',
      });
      await this.repository.replaceProfile(
        snapshot.profileId,
        snapshot.payload,
      );
      return snapshot.profileId;
    }
    return this.repository.restoreAsNew(snapshot.payload);
  }

  private defaultName(
    trigger: CreateSnapshotInput['trigger'],
    createdAt: number,
  ): string {
    return `${trigger.replaceAll('-', ' ')} snapshot - ${new Date(createdAt).toLocaleString()}`;
  }
}
