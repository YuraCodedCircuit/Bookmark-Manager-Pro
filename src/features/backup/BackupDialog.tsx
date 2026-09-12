import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ManageBackups } from '../../application/backup/manage-backups';
import type {
  ProfileListItem,
  ProfileStorageUsage,
} from '../../application/profile/profile-management-repository';
import type { BackupSnapshot } from '../../domain/backup';
import type { Profile } from '../../domain/profile';
import type { DateTimeFormatPreference } from '../../shared/date-time-format';
import { formatDateTime } from '../../shared/date-time-format';
import { ClearIcon } from '../../components/icons/ClearIcon';

interface BackupDialogProps {
  activeProfile: Profile;
  dateTimeFormat: DateTimeFormatPreference;
  onClose: () => void;
  onRestored: (profileId: string) => Promise<void>;
  onReport?: (event: BackupUiEvent) => void;
  profiles: readonly ProfileListItem[];
  storageUsage: readonly ProfileStorageUsage[];
  service: Pick<ManageBackups, 'create' | 'delete' | 'list' | 'restore'>;
}

export type BackupUiEvent =
  | 'created'
  | 'createFailed'
  | 'deleted'
  | 'deleteFailed'
  | 'loadFailed'
  | 'restored'
  | 'restoreFailed';

type ChildView =
  | { kind: 'create' }
  | { kind: 'details'; snapshot: BackupSnapshot }
  | { kind: 'delete'; snapshot: BackupSnapshot }
  | { kind: 'restore'; snapshot: BackupSnapshot }
  | null;

const PAGE_SIZE = 50;

export function BackupDialog({
  activeProfile,
  dateTimeFormat,
  onClose,
  onReport,
  onRestored,
  profiles,
  service,
  storageUsage,
}: BackupDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const childRef = useRef<HTMLElement>(null);
  const [snapshots, setSnapshots] = useState<readonly BackupSnapshot[]>([]);
  const [profileId, setProfileId] = useState(activeProfile.id);
  const [filter, setFilter] = useState<'all' | 'manual' | 'automatic'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name' | 'size'>(
    'newest',
  );
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [child, setChild] = useState<ChildView>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setError(undefined);
    try {
      setSnapshots(await service.list());
    } catch {
      setError(t('backup.loadFailed'));
      onReport?.('loadFailed');
    }
  }, [onReport, service, t]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();
    void load();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [load]);

  useEffect(() => {
    if (child) childRef.current?.focus();
  }, [child]);

  const currentProfiles = useMemo(
    () =>
      profiles.some(({ profile }) => profile.id === activeProfile.id)
        ? profiles
        : [{ profile: activeProfile, isActive: true }, ...profiles],
    [activeProfile, profiles],
  );
  const profileIds = useMemo(
    () => new Set(currentProfiles.map(({ profile }) => profile.id)),
    [currentProfiles],
  );
  const deletedProfiles = useMemo(() => {
    const byId = new Map<string, { name: string; deletedAt: number }>();
    for (const snapshot of snapshots) {
      if (profileIds.has(snapshot.profileId)) continue;
      const current = byId.get(snapshot.profileId);
      byId.set(snapshot.profileId, {
        name: snapshot.profileName,
        deletedAt: Math.max(current?.deletedAt ?? 0, snapshot.createdAt),
      });
    }
    return [...byId.entries()];
  }, [profileIds, snapshots]);
  const selectedExists = profileIds.has(profileId);
  const visible = useMemo(() => {
    const result = snapshots.filter(
      (snapshot) =>
        snapshot.profileId === profileId &&
        (filter === 'all' ||
          (filter === 'manual'
            ? snapshot.type === 'manual'
            : snapshot.type !== 'manual')),
    );
    result.sort((left, right) =>
      sort === 'oldest'
        ? left.createdAt - right.createdAt
        : sort === 'name'
          ? left.name.localeCompare(right.name)
          : sort === 'size'
            ? right.sizeBytes - left.sizeBytes
            : right.createdAt - left.createdAt,
    );
    return result;
  }, [filter, profileId, snapshots, sort]);

  const complete = async (message: string) => {
    await load();
    setChild(null);
    setStatus(message);
  };

  return (
    <dialog
      aria-describedby="backup-description"
      aria-labelledby="backup-title"
      className="backup-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (child) setChild(null);
        else onClose();
      }}
      ref={dialogRef}
    >
      <div className="backup-dialog__main" inert={child ? true : undefined}>
        <header className="backup-dialog__header">
          <div>
            <h1 id="backup-title">{t('backup.title')}</h1>
            <p id="backup-description">{t('backup.description')}</p>
          </div>
          <button
            aria-label={t('backup.close')}
            className="backup-dialog__close"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            <ClearIcon />
          </button>
        </header>
        <div className="backup-dialog__toolbar">
          <label>
            <span>{t('backup.profile')}</span>
            <select
              onChange={(event) => {
                setProfileId(event.currentTarget.value);
                setLimit(PAGE_SIZE);
              }}
              value={profileId}
            >
              <optgroup label={t('backup.currentProfiles')}>
                {currentProfiles.map(({ profile }) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.username}
                  </option>
                ))}
              </optgroup>
              {deletedProfiles.length ? (
                <optgroup label={t('backup.deletedProfiles')}>
                  {deletedProfiles.map(([id, item]) => (
                    <option key={id} value={id}>
                      {t('backup.deletedProfileOption', {
                        name: item.name,
                        date: formatDateTime(
                          item.deletedAt,
                          dateTimeFormat,
                          undefined,
                          false,
                        ),
                      })}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </label>
          <label>
            <span>{t('backup.type')}</span>
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.currentTarget.value as typeof filter)
              }
            >
              <option value="all">{t('backup.filters.all')}</option>
              <option value="manual">{t('backup.filters.manual')}</option>
              <option value="automatic">{t('backup.filters.automatic')}</option>
            </select>
          </label>
          <label>
            <span>{t('backup.sort')}</span>
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.currentTarget.value as typeof sort)
              }
            >
              <option value="newest">{t('backup.sorts.newest')}</option>
              <option value="oldest">{t('backup.sorts.oldest')}</option>
              <option value="name">{t('backup.sorts.name')}</option>
              <option value="size">{t('backup.sorts.size')}</option>
            </select>
          </label>
          <button
            className="is-primary"
            disabled={!selectedExists || busy}
            onClick={() => setChild({ kind: 'create' })}
            type="button"
          >
            {t('backup.create')}
          </button>
        </div>
        <section
          aria-busy={busy}
          className="backup-dialog__list"
          aria-label={t('backup.snapshotList')}
        >
          {error ? (
            <div className="backup-dialog__empty" role="alert">
              <p>{error}</p>
              <button onClick={() => void load()} type="button">
                {t('backup.retry')}
              </button>
            </div>
          ) : visible.length ? (
            <ul>
              {visible.slice(0, limit).map((snapshot) => (
                <li key={snapshot.id}>
                  <div className="backup-dialog__snapshot-copy">
                    <h2 title={snapshot.name}>{snapshot.name}</h2>
                    <p>
                      {t(`backup.types.${snapshot.type}`)} -{' '}
                      {formatDateTime(snapshot.createdAt, dateTimeFormat)}
                    </p>
                  </div>
                  <span>{formatBytes(snapshot.sizeBytes)}</span>
                  <strong className="backup-dialog__verified">
                    {t('backup.verified')}
                  </strong>
                  <div className="backup-dialog__row-actions">
                    <button
                      className="is-primary"
                      onClick={() => setChild({ kind: 'restore', snapshot })}
                      type="button"
                    >
                      {t('backup.restore')}
                    </button>
                    <button
                      onClick={() => setChild({ kind: 'details', snapshot })}
                      type="button"
                    >
                      {t('backup.viewDetails')}
                    </button>
                    <button
                      className="is-destructive"
                      onClick={() => setChild({ kind: 'delete', snapshot })}
                      type="button"
                    >
                      {t('backup.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="backup-dialog__empty">
              <h2>
                {t(
                  filter === 'automatic'
                    ? 'backup.emptyAutomaticTitle'
                    : filter === 'manual'
                      ? 'backup.emptyManualTitle'
                      : 'backup.emptyTitle',
                )}
              </h2>
              <p>
                {selectedExists
                  ? t(
                      filter === 'automatic'
                        ? 'backup.emptyAutomaticDescription'
                        : filter === 'manual'
                          ? 'backup.emptyManualDescription'
                          : 'backup.emptyDescription',
                    )
                  : t('backup.deletedEmpty')}
              </p>
              {selectedExists && filter !== 'automatic' ? (
                <button
                  className="is-primary"
                  onClick={() => setChild({ kind: 'create' })}
                  type="button"
                >
                  {t('backup.create')}
                </button>
              ) : null}
            </div>
          )}
          {visible.length > limit ? (
            <button
              className="backup-dialog__load-more"
              onClick={() => setLimit((value) => value + PAGE_SIZE)}
              type="button"
            >
              {t('backup.loadMore')}
            </button>
          ) : null}
        </section>
        <footer className="backup-dialog__footer">
          <div>
            <strong>
              {t('backup.summary', {
                count: visible.length,
                size: formatBytes(
                  visible.reduce((sum, item) => sum + item.sizeBytes, 0),
                ),
              })}
            </strong>
            <p>{t('backup.localWarning')}</p>
          </div>
          <button onClick={onClose} type="button">
            {t('backup.close')}
          </button>
        </footer>
      </div>
      <div aria-live="polite" className="visually-hidden">
        {status}
      </div>
      {child ? (
        <div className="backup-dialog__child-backdrop">
          <section
            aria-labelledby="backup-child-title"
            className="backup-dialog__child"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setChild(null);
              }
            }}
            ref={childRef}
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
          >
            {child.kind === 'create' ? (
              <CreateSnapshotForm
                busy={busy}
                estimatedSizeBytes={
                  storageUsage.find((item) => item.profileId === profileId)
                    ?.sizeBytes
                }
                onCancel={() => setChild(null)}
                onCreate={async (name) => {
                  setBusy(true);
                  try {
                    await service.create({
                      ...(name ? { name } : {}),
                      profileId,
                      trigger: 'manual',
                      type: 'manual',
                    });
                    await complete(t('backup.createdStatus'));
                    onReport?.('created');
                  } catch {
                    setError(t('backup.createFailed'));
                    onReport?.('createFailed');
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ) : child.kind === 'details' ? (
              <SnapshotDetails
                onClose={() => setChild(null)}
                snapshot={child.snapshot}
              />
            ) : child.kind === 'delete' ? (
              <ConfirmDelete
                busy={busy}
                onCancel={() => setChild(null)}
                onDelete={async () => {
                  setBusy(true);
                  try {
                    await service.delete(child.snapshot.id);
                    await complete(t('backup.deletedStatus'));
                    onReport?.('deleted');
                  } catch {
                    setError(t('backup.deleteFailed'));
                    onReport?.('deleteFailed');
                  } finally {
                    setBusy(false);
                  }
                }}
                snapshot={child.snapshot}
              />
            ) : (
              <RestoreSnapshot
                busy={busy}
                onCancel={() => setChild(null)}
                onRestore={async () => {
                  setBusy(true);
                  try {
                    const restoredId = await service.restore(
                      child.snapshot.id,
                      selectedExists ? 'replace' : 'new',
                    );
                    await onRestored(restoredId);
                    await complete(t('backup.restoredStatus'));
                    onReport?.('restored');
                  } catch {
                    setError(t('backup.restoreFailed'));
                    onReport?.('restoreFailed');
                  } finally {
                    setBusy(false);
                  }
                }}
                replacing={selectedExists}
                snapshot={child.snapshot}
              />
            )}
          </section>
        </div>
      ) : null}
    </dialog>
  );
}

function CreateSnapshotForm({
  busy,
  estimatedSizeBytes,
  onCancel,
  onCreate,
}: {
  busy: boolean;
  estimatedSizeBytes?: number | undefined;
  onCancel: () => void;
  onCreate: (name?: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void onCreate(data.get('name')?.toString());
      }}
    >
      <h2 id="backup-child-title">{t('backup.create')}</h2>
      <div className="backup-dialog__included-content">
        <strong>{t('backup.includedContent')}</strong>
        <p>{t('backup.includes')}</p>
      </div>
      <label>
        <span>{t('backup.nameOptional')}</span>
        <input
          maxLength={100}
          name="name"
          placeholder={t('backup.namePlaceholder')}
        />
      </label>
      <p className="backup-dialog__estimated-size">
        {t('backup.estimatedSize', {
          size:
            estimatedSizeBytes === undefined
              ? t('backup.estimatedSizeUnavailable')
              : formatBytes(estimatedSizeBytes),
        })}
      </p>
      <div className="backup-dialog__child-actions">
        <button disabled={busy} onClick={onCancel} type="button">
          {t('backup.cancel')}
        </button>
        <button className="is-primary" disabled={busy} type="submit">
          {busy ? t('backup.working') : t('backup.create')}
        </button>
      </div>
    </form>
  );
}

function SnapshotDetails({
  onClose,
  snapshot,
}: {
  onClose: () => void;
  snapshot: BackupSnapshot;
}) {
  const { t } = useTranslation();
  return (
    <>
      <h2 id="backup-child-title">{t('backup.detailsTitle')}</h2>
      <table className="backup-dialog__details">
        <caption className="visually-hidden">
          {t('backup.detailsTitle')}
        </caption>
        <tbody>
          <DetailRow label={t('backup.name')} value={snapshot.name} />
          <DetailRow
            label={t('backup.formatVersion')}
            value={snapshot.payload.formatVersion}
          />
          <DetailRow
            label={t('backup.databaseVersion')}
            value={snapshot.payload.databaseSchemaVersion}
          />
          <DetailRow
            label={t('backup.applicationVersion')}
            value={snapshot.payload.applicationVersion}
          />
          <DetailRow
            label={t('backup.bookmarks')}
            value={snapshot.payload.bookmarks.length}
          />
          <DetailRow
            label={t('backup.folders')}
            value={snapshot.payload.folders.length}
          />
          <DetailRow
            label={t('backup.favorites')}
            value={snapshot.payload.favorites.length}
          />
          <DetailRow
            label={t('backup.activityRecords')}
            value={snapshot.payload.activity.length}
          />
        </tbody>
      </table>
      <div className="backup-dialog__child-actions">
        <button onClick={onClose} type="button">
          {t('backup.close')}
        </button>
      </div>
    </>
  );
}

function ConfirmDelete({
  busy,
  onCancel,
  onDelete,
  snapshot,
}: {
  busy: boolean;
  onCancel: () => void;
  onDelete: () => Promise<void>;
  snapshot: BackupSnapshot;
}) {
  const { t } = useTranslation();
  return (
    <>
      <h2 id="backup-child-title">{t('backup.deleteTitle')}</h2>
      <p>{t('backup.deleteConfirm', { name: snapshot.name })}</p>
      <div className="backup-dialog__child-actions">
        <button disabled={busy} onClick={onCancel} type="button">
          {t('backup.cancel')}
        </button>
        <button
          className="is-destructive"
          disabled={busy}
          onClick={() => void onDelete()}
          type="button"
        >
          {t('backup.delete')}
        </button>
      </div>
    </>
  );
}

function RestoreSnapshot({
  busy,
  onCancel,
  onRestore,
  replacing,
  snapshot,
}: {
  busy: boolean;
  onCancel: () => void;
  onRestore: () => Promise<void>;
  replacing: boolean;
  snapshot: BackupSnapshot;
}) {
  const { t } = useTranslation();
  const [confirmed, setConfirmed] = useState(!replacing);
  return (
    <>
      <h2 id="backup-child-title">{t('backup.restoreTitle')}</h2>
      <p>
        <strong>{snapshot.name}</strong>
      </p>
      <table className="backup-dialog__details">
        <caption className="visually-hidden">
          {t('backup.restoreSummary')}
        </caption>
        <tbody>
          <DetailRow
            label={t('backup.bookmarks')}
            value={snapshot.payload.bookmarks.length}
          />
          <DetailRow
            label={t('backup.folders')}
            value={snapshot.payload.folders.length}
          />
          <DetailRow
            label={t('backup.favorites')}
            value={snapshot.payload.favorites.length}
          />
          <DetailRow
            label={t('backup.activityRecords')}
            value={snapshot.payload.activity.length}
          />
        </tbody>
      </table>
      {replacing ? (
        <div className="backup-dialog__warning">
          {t('backup.replaceWarning')}
        </div>
      ) : null}
      <div className="backup-dialog__information">
        {t('backup.syncPausedWarning')}
      </div>
      {replacing ? (
        <label className="settings-checkbox-row">
          <input
            checked={confirmed}
            onChange={(event) => setConfirmed(event.currentTarget.checked)}
            type="checkbox"
          />
          <span>{t('backup.replaceAcknowledgment')}</span>
        </label>
      ) : null}
      <div className="backup-dialog__child-actions">
        <button disabled={busy} onClick={onCancel} type="button">
          {t('backup.cancel')}
        </button>
        <button
          className="is-primary"
          disabled={busy || !confirmed}
          onClick={() => void onRestore()}
          type="button"
        >
          {busy ? t('backup.working') : t('backup.restore')}
        </button>
      </div>
    </>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{value}</td>
    </tr>
  );
}
