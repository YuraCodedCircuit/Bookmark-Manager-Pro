import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import type { ManageActivityLog } from '../../application/activity-log/manage-activity-log';
import { defaultActivityLogSettings } from '../../application/activity-log/manage-activity-log';
import { ClearIcon } from '../../components/icons/ClearIcon';
import type {
  ActivityLogEntry,
  ActivityLogLevel,
  ActivityLogSettings,
} from '../../domain/activity-log';
import { downloadTextFile } from '../../platform/files/download-text-file';
import { formatDateTime } from '../../shared/date-time-format';
import type { DateTimeFormatPreference } from '../../shared/date-time-format';
import type { NotificationInput } from '../../application/notification/notification-service';

interface Props {
  activityLog: Pick<
    ManageActivityLog,
    | 'clear'
    | 'createExport'
    | 'getSettings'
    | 'list'
    | 'record'
    | 'updateSettings'
  >;
  isOpen: boolean;
  onClose(): void;
  onNotify?(input: NotificationInput): void;
  profileId: string;
  dateTimeFormat?: DateTimeFormatPreference;
}

type LevelFilter = 'ALL' | ActivityLogLevel;

const ignoreNotification = () => undefined;

function DisclosureChevron({
  direction,
}: {
  direction: 'down' | 'right' | 'up';
}) {
  return (
    <span
      aria-hidden="true"
      className={`activity-log__chevron activity-log__chevron--${direction}`}
    />
  );
}

/** A stable detail row with native hover help and a screen-reader description. */
function DetailRow({
  help,
  id,
  label,
  value,
}: {
  help: string;
  id: string;
  label: string;
  value: ReactNode;
}) {
  const helpId = `${id}-help`;
  return (
    <div
      aria-describedby={helpId}
      className="activity-log__detail-row"
      title={help}
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
      <span className="visually-hidden" id={helpId}>
        {help}
      </span>
    </div>
  );
}

/** Durable activity-log surface backed by the active profile's log service. */
export function BookmarkActivityLogDialog({
  activityLog,
  isOpen,
  onClose,
  onNotify = ignoreNotification,
  profileId,
  dateTimeFormat = 'browser',
}: Props) {
  const { t, i18n } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [entries, setEntries] = useState<readonly ActivityLogEntry[]>([]);
  const [settings, setSettings] = useState<ActivityLogSettings>(() =>
    defaultActivityLogSettings(profileId),
  );
  const [level, setLevel] = useState<LevelFilter>('ALL');
  const [category, setCategory] = useState('ALL');
  const [dateRange, setDateRange] = useState('ALL');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /** Keeps log-operation diagnostics best-effort and free of recursive failures. */
  const recordSafely = useCallback(
    async (input: Parameters<ManageActivityLog['record']>[1]) => {
      try {
        await activityLog.record(profileId, input);
      } catch {
        console.error('activity-log-operation-record-failed');
      }
    },
    [activityLog, profileId],
  );

  /** Refreshes visible records without changing a completed primary operation. */
  const refreshEntriesSafely = useCallback(async () => {
    try {
      setEntries(await activityLog.list(profileId));
    } catch {
      console.error('activity-log-refresh-failed');
    }
  }, [activityLog, profileId]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterNow, setFilterNow] = useState(() => Date.now());

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.documentElement.style.overflowY;
    document.documentElement.style.overflowY = 'hidden';
    let cancelled = false;
    const load = async () => {
      const startedAt = performance.now();
      try {
        const [loadedEntries, loadedSettings] = await Promise.all([
          activityLog.list(profileId),
          activityLog.getSettings(profileId),
        ]);
        if (!cancelled) {
          setFilterNow(Date.now());
          setEntries(loadedEntries);
          setSettings(loadedSettings);
          setError(null);
        }
      } catch {
        await recordSafely({
          action: 'Load',
          category: 'Application',
          dataChanged: false,
          durationMs: Math.round(performance.now() - startedAt),
          eventCode: 'ACTIVITY-LOG-LOAD-FAILED',
          itemType: 'Activity log',
          itemsAffected: 0,
          kind: 'DIAGNOSTIC',
          level: 'ERROR',
          message: t('activityLog.messages.loadFailed'),
          outcome: 'Failed',
          source: 'Activity log window',
        });
        if (!cancelled) {
          setError(t('activityLog.loadError'));
          onNotify({
            level: 'error',
            message: t('activityLog.messages.loadFailed'),
            title: t('notifications.errorTitle'),
          });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      document.documentElement.style.overflowY = previousOverflow;
    };
  }, [activityLog, isOpen, onNotify, profileId, recordSafely, t]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const ageDays = (filterNow - entry.timestamp) / 86_400_000;
      const matchesDate =
        dateRange === 'ALL' ||
        (dateRange === 'TODAY' ? ageDays < 1 : ageDays <= 7);
      return (
        (level === 'ALL' || entry.level === level) &&
        (category === 'ALL' || entry.category === category) &&
        matchesDate &&
        (!normalizedQuery ||
          `${entry.message} ${entry.eventCode} ${entry.category}`
            .toLowerCase()
            .includes(normalizedQuery))
      );
    });
  }, [category, dateRange, entries, filterNow, level, query]);

  const saveSettings = async (next: ActivityLogSettings) => {
    const startedAt = performance.now();
    setSettings(next);
    const input = {
      activityEnabled: next.activityEnabled,
      autoDeleteOldest: next.autoDeleteOldest,
      diagnosticsEnabled: next.diagnosticsEnabled,
      enabled: next.enabled,
      includeDiagnosticsExport: next.includeDiagnosticsExport,
      maximumStorageMb: next.maximumStorageMb,
      minimumLevel: next.minimumLevel,
      retentionCount: next.retentionCount,
    };
    try {
      await activityLog.updateSettings(profileId, input);
      await recordSafely({
        action: 'Update',
        category: 'Application',
        dataChanged: true,
        durationMs: Math.round(performance.now() - startedAt),
        eventCode: 'ACTIVITY-LOG-SETTINGS-UPDATE-COMPLETE',
        itemType: 'Activity log settings',
        itemsAffected: 1,
        kind: 'DIAGNOSTIC',
        level: 'INFO',
        message: t('activityLog.messages.settingsUpdated'),
        outcome: 'Succeeded',
        source: 'Activity log window',
      });
      await refreshEntriesSafely();
      setError(null);
      onNotify({
        level: 'success',
        message: t('activityLog.messages.settingsUpdated'),
        title: t('notifications.activityLogSettingsSavedTitle'),
      });
    } catch {
      await recordSafely({
        action: 'Update',
        category: 'Application',
        dataChanged: false,
        durationMs: Math.round(performance.now() - startedAt),
        eventCode: 'ACTIVITY-LOG-SETTINGS-UPDATE-FAILED',
        itemType: 'Activity log settings',
        itemsAffected: 0,
        kind: 'DIAGNOSTIC',
        level: 'ERROR',
        message: t('activityLog.messages.settingsUpdateFailed'),
        outcome: 'Failed',
        source: 'Activity log window',
      });
      setError(t('activityLog.saveError'));
      onNotify({
        level: 'error',
        message: t('activityLog.messages.settingsUpdateFailed'),
        title: t('notifications.errorTitle'),
      });
    }
  };

  const settingInput = (patch: Partial<ActivityLogSettings>) =>
    void saveSettings({ ...settings, ...patch, profileId });

  const clearEntries = async () => {
    const startedAt = performance.now();
    try {
      await activityLog.clear(profileId);
      await recordSafely({
        action: 'Clear',
        category: 'Application',
        dataChanged: true,
        durationMs: Math.round(performance.now() - startedAt),
        eventCode: 'ACTIVITY-LOG-CLEAR-COMPLETE',
        itemType: 'Activity log entries',
        itemsAffected: entries.length,
        kind: 'ACTIVITY',
        level: 'INFO',
        message: t('activityLog.messages.cleared'),
        outcome: 'Succeeded',
        source: 'Activity log window',
      });
      await refreshEntriesSafely();
      setConfirmingClear(false);
      setError(null);
      onNotify({
        level: 'success',
        message: t('activityLog.messages.cleared'),
        title: t('notifications.activityLogClearedTitle'),
      });
    } catch {
      await recordSafely({
        action: 'Clear',
        category: 'Application',
        dataChanged: false,
        durationMs: Math.round(performance.now() - startedAt),
        eventCode: 'ACTIVITY-LOG-CLEAR-FAILED',
        itemType: 'Activity log entries',
        itemsAffected: 0,
        kind: 'DIAGNOSTIC',
        level: 'ERROR',
        message: t('activityLog.messages.clearFailed'),
        outcome: 'Failed',
        source: 'Activity log window',
      });
      setError(t('activityLog.clearError'));
      onNotify({
        level: 'error',
        message: t('activityLog.messages.clearFailed'),
        title: t('notifications.errorTitle'),
      });
    }
  };

  const exportEntries = async () => {
    const startedAt = performance.now();
    try {
      downloadTextFile(await activityLog.createExport(profileId));
      await recordSafely({
        action: 'Export',
        category: 'Application',
        dataChanged: false,
        durationMs: Math.round(performance.now() - startedAt),
        eventCode: 'ACTIVITY-LOG-EXPORT-COMPLETE',
        itemType: 'Activity log export',
        itemsAffected: entries.length,
        kind: 'ACTIVITY',
        level: 'INFO',
        message: t('activityLog.messages.exported'),
        outcome: 'Succeeded',
        source: 'Activity log window',
      });
      await refreshEntriesSafely();
      setError(null);
      onNotify({
        level: 'success',
        message: t('activityLog.messages.exported'),
        title: t('notifications.activityLogExportedTitle'),
      });
    } catch {
      await recordSafely({
        action: 'Export',
        category: 'Application',
        dataChanged: false,
        durationMs: Math.round(performance.now() - startedAt),
        eventCode: 'ACTIVITY-LOG-EXPORT-FAILED',
        itemType: 'Activity log export',
        itemsAffected: 0,
        kind: 'DIAGNOSTIC',
        level: 'ERROR',
        message: t('activityLog.messages.exportFailed'),
        outcome: 'Failed',
        source: 'Activity log window',
      });
      setError(t('activityLog.exportError'));
      onNotify({
        level: 'error',
        message: t('activityLog.messages.exportFailed'),
        title: t('notifications.errorTitle'),
      });
    }
  };

  return (
    <dialog
      aria-labelledby="activity-log-title"
      className="profile-window activity-log-window"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <header className="profile-window__header activity-log__header">
        <div>
          <div className="activity-log__title-row">
            <h1 id="activity-log-title">{t('activityLog.title')}</h1>
            <span>{t('activityLog.localBadge')}</span>
          </div>
          <p>{t('activityLog.summary')}</p>
        </div>
        <button
          aria-label={t('activityLog.close')}
          onClick={onClose}
          type="button"
        >
          <ClearIcon />
        </button>
      </header>
      <section
        aria-label={t('activityLog.filters.label')}
        className="activity-log__filters"
      >
        <fieldset>
          <legend>{t('activityLog.filters.level')}</legend>
          <div className="activity-log__levels">
            {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((value) => (
              <button
                aria-pressed={level === value}
                key={value}
                onClick={() => setLevel(value)}
                type="button"
              >
                {t(`activityLog.levels.${value.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          <span>{t('activityLog.filters.category')}</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="ALL">{t('activityLog.categories.all')}</option>
            <option value="Application">
              {t('activityLog.categories.application')}
            </option>
            <option value="Bookmarks">
              {t('activityLog.categories.bookmarks')}
            </option>
            <option value="Profiles">
              {t('activityLog.categories.profiles')}
            </option>
          </select>
        </label>
        <label>
          <span>{t('activityLog.filters.date')}</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="ALL">{t('activityLog.dates.all')}</option>
            <option value="TODAY">{t('activityLog.dates.today')}</option>
            <option value="SEVEN_DAYS">
              {t('activityLog.dates.sevenDays')}
            </option>
          </select>
        </label>
        <label className="activity-log__search">
          <span>{t('activityLog.filters.search')}</span>
          <input
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('activityLog.filters.searchPlaceholder')}
            type="search"
            value={query}
          />
        </label>
      </section>
      {error ? (
        <p className="activity-log__error" role="alert">
          {error}
        </p>
      ) : null}
      <section
        aria-label={t('activityLog.eventsLabel')}
        className="activity-log__events"
      >
        {filteredEntries.length ? (
          <ol>
            {filteredEntries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const time = formatDateTime(
                entry.timestamp,
                dateTimeFormat,
                i18n.language,
              );
              const detailRows: Array<[string, ReactNode]> = [
                ['eventCode', entry.eventCode],
                ['outcome', entry.outcome],
                ['source', entry.source],
                ['action', entry.action],
                ['itemType', entry.itemType],
                ['itemsAffected', entry.itemsAffected],
                [
                  'dataChanged',
                  t(
                    entry.dataChanged
                      ? 'activityLog.details.yes'
                      : 'activityLog.details.no',
                  ),
                ],
                [
                  'duration',
                  t('activityLog.details.milliseconds', {
                    count: entry.durationMs,
                  }),
                ],
                ['application', entry.applicationVersion],
                ['schemaVersion', entry.schemaVersion],
                ['browserTarget', entry.browserTarget],
                [
                  'operationId',
                  <code key="operation">{entry.operationId}</code>,
                ],
              ];
              return (
                <li
                  className={`activity-log__event activity-log__event--${entry.level.toLowerCase()}`}
                  key={entry.id}
                >
                  <button
                    aria-expanded={isExpanded}
                    className="activity-log__event-summary"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    type="button"
                  >
                    <DisclosureChevron
                      direction={isExpanded ? 'down' : 'right'}
                    />
                    <time>{time}</time>
                    <strong>
                      {t(`activityLog.levels.${entry.level.toLowerCase()}`)}
                    </strong>
                    <span>{entry.message}</span>
                    <small>
                      {t(
                        `activityLog.categories.${entry.category.toLowerCase()}`,
                      )}
                    </small>
                  </button>
                  {isExpanded ? (
                    <dl className="activity-log__details">
                      {detailRows.map(([key, value]) => (
                        <DetailRow
                          help={t(`activityLog.details.help.${key}`)}
                          id={`${entry.id}-${key}`}
                          key={key}
                          label={t(`activityLog.details.${key}`)}
                          value={value}
                        />
                      ))}
                    </dl>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="activity-log__empty">
            <strong>{t('activityLog.empty.title')}</strong>
            <span>{t('activityLog.empty.summary')}</span>
          </div>
        )}
      </section>
      <section className="activity-log__settings">
        <button
          aria-expanded={settingsOpen}
          className="activity-log__settings-toggle"
          onClick={() => setSettingsOpen((value) => !value)}
          type="button"
        >
          <strong>{t('activityLog.settings.title')}</strong>
          <DisclosureChevron direction={settingsOpen ? 'up' : 'down'} />
        </button>
        {settingsOpen ? (
          <div className="activity-log__settings-grid">
            <label>
              <input
                checked={settings.activityEnabled}
                onChange={(e) =>
                  settingInput({ activityEnabled: e.target.checked })
                }
                type="checkbox"
              />{' '}
              {t('activityLog.settings.activity')}
            </label>
            <label>
              <input
                checked={settings.diagnosticsEnabled}
                onChange={(e) =>
                  settingInput({ diagnosticsEnabled: e.target.checked })
                }
                type="checkbox"
              />{' '}
              {t('activityLog.settings.diagnostics')}
            </label>
            <label>
              <span>{t('activityLog.settings.minimumLevel')}</span>
              <select
                value={settings.minimumLevel}
                onChange={(e) =>
                  settingInput({
                    minimumLevel: e.target.value as ActivityLogLevel,
                  })
                }
              >
                <option>INFO</option>
                <option>WARN</option>
                <option>ERROR</option>
              </select>
            </label>
            <label>
              <span>{t('activityLog.settings.retention')}</span>
              <input
                min="100"
                onChange={(e) =>
                  settingInput({
                    retentionCount: Math.max(100, Number(e.target.value)),
                  })
                }
                type="number"
                value={settings.retentionCount}
              />
            </label>
            <label>
              <span>{t('activityLog.settings.maximumSize')}</span>
              <select
                value={settings.maximumStorageMb}
                onChange={(e) =>
                  settingInput({ maximumStorageMb: Number(e.target.value) })
                }
              >
                <option value="10">10 MB</option>
                <option value="25">25 MB</option>
                <option value="50">50 MB</option>
              </select>
            </label>
            <label>
              <input
                checked={settings.autoDeleteOldest}
                onChange={(e) =>
                  settingInput({ autoDeleteOldest: e.target.checked })
                }
                type="checkbox"
              />{' '}
              {t('activityLog.settings.autoDelete')}
            </label>
            <label>
              <input
                checked={settings.includeDiagnosticsExport}
                onChange={(e) =>
                  settingInput({ includeDiagnosticsExport: e.target.checked })
                }
                type="checkbox"
              />{' '}
              {t('activityLog.settings.includeDiagnostics')}
            </label>
            <button
              className="profile-button"
              onClick={() =>
                void saveSettings(defaultActivityLogSettings(profileId))
              }
              type="button"
            >
              {t('activityLog.settings.reset')}
            </button>
          </div>
        ) : null}
      </section>
      <footer className="activity-log__footer">
        {confirmingClear ? (
          <div className="activity-log__confirmation" role="alert">
            <span>{t('activityLog.clear.confirm')}</span>
            <button
              className="profile-button profile-button--danger"
              onClick={() => void clearEntries()}
              type="button"
            >
              {t('activityLog.clear.clearLog')}
            </button>
            <button
              className="profile-button"
              onClick={() => setConfirmingClear(false)}
              type="button"
            >
              {t('activityLog.clear.cancel')}
            </button>
          </div>
        ) : (
          <button
            className="profile-button profile-button--danger"
            onClick={() => setConfirmingClear(true)}
            type="button"
          >
            {t('activityLog.clear.action')}
          </button>
        )}
        {!confirmingClear ? (
          <div className="activity-log__export">
            <button
              className="profile-button"
              onClick={() => void exportEntries()}
              type="button"
            >
              {t('activityLog.export.action')}
            </button>
            <small>{t('activityLog.export.ready')}</small>
          </div>
        ) : null}
      </footer>
    </dialog>
  );
}
