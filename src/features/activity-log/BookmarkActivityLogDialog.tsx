import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ManageActivityLog } from '../../application/activity-log/manage-activity-log';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { ChevronIcon } from '../../components/icons/ChevronIcon';
import { ClearableInput } from '../../components/ClearableInput';
import type {
  ActivityLogEntry,
  ActivityLogSettings,
  ActivitySession,
} from '../../domain/activity-log';
import {
  localDay,
  matchesActivityDate,
  type ActivityDateSelection,
} from '../../domain/activity-log-dates';
import {
  formatDateTime,
  type DateTimeFormatPreference,
} from '../../shared/date-time-format';
import type { NotificationInput } from '../../application/notification/notification-service';
import { ActivityLogDateDialog } from './ActivityLogDateDialog';
import { ActivityLogProfileDialog } from './ActivityLogProfileDialog';
import { setLogDialogOpen } from './native-dialog';
import packageMetadata from '../../../package.json';
import { DialogBadges } from '../../components/DialogBadges';
import { activityLogBadges } from './activity-log-badges';

type Service = Pick<
  ManageActivityLog,
  'clear' | 'getSettings' | 'list' | 'record' | 'updateSettings'
> &
  Partial<
    Pick<
      ManageActivityLog,
      | 'sessions'
      | 'profiles'
      | 'full'
      | 'subscribe'
      | 'currentSession'
      | 'updateOptions'
    >
  >;
interface Props {
  activityLog: Service;
  isOpen: boolean;
  onClose(): void;
  onOpenSettings?(): void;
  requestClearConfirmation(sessionId?: string): Promise<boolean>;
  onNotify?(input: NotificationInput): void;
  profileId: string;
  dateTimeFormat?: DateTimeFormatPreference;
}
const ignoreNotification = () => undefined;

/** Tests the latest matching event edge in either presentation direction. */
function latestVisible(
  container: HTMLElement | null,
  order: ActivityLogSettings['eventOrder'],
): boolean {
  const edge = container
    ?.querySelector<HTMLElement>('[data-latest="true"]')
    ?.getBoundingClientRect();
  const viewport = container?.getBoundingClientRect();
  if (!edge || !viewport) return false;
  const position = order === 'oldest' ? edge.bottom : edge.top;
  return position >= viewport.top - 8 && position <= viewport.bottom + 8;
}

/** Shared live history. Search, filters, expansion, and date drafts are transient. */
export function BookmarkActivityLogDialog({
  activityLog,
  isOpen,
  onClose,
  onOpenSettings,
  requestClearConfirmation,
  onNotify = ignoreNotification,
  profileId,
  dateTimeFormat = 'browser',
}: Props) {
  const { t, i18n } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const options = useRef<HTMLDialogElement>(null);
  const optionsTrigger = useRef<HTMLButtonElement>(null);
  const dateTrigger = useRef<HTMLButtonElement>(null);
  const profileTrigger = useRef<HTMLButtonElement>(null);
  const events = useRef<HTMLElement>(null);
  const follow = useRef(true);
  const loaded = useRef(false);
  const ids = useRef(new Set<string>());
  const [entries, setEntries] = useState<readonly ActivityLogEntry[]>([]);
  const [sessions, setSessions] = useState<readonly ActivitySession[]>([]);
  const [profiles, setProfiles] = useState<
    readonly { id: string; username: string }[]
  >([]);
  const [current, setCurrent] = useState('');
  const [sessionOrder, setSessionOrder] = useState<'newest' | 'oldest'>(
    'newest',
  );
  const [eventOrder, setEventOrder] = useState<'oldest' | 'newest'>('oldest');
  const eventOrderRef = useRef<'oldest' | 'newest'>('oldest');
  const [full, setFull] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [profile, setProfile] = useState('CURRENT');
  const [dates, setDates] = useState<ActivityDateSelection>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [groupStart, setGroupStart] = useState(0);
  const [newEvents, setNewEvents] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) {
      setSessionOrder('newest');
      setEventOrder('oldest');
      setQuery('');
      setLevel('ALL');
      setCategory('ALL');
      setProfile('CURRENT');
      setDates(null);
      setExpanded({});
      setLimits({});
      setGroupStart(0);
      setNewEvents(false);
      setOptionsOpen(false);
      setDateOpen(false);
      setProfileOpen(false);
    }
  }
  const notify = useCallback(
    (input: NotificationInput) => {
      try {
        onNotify(input);
      } catch {
        console.error('activity-log-notification-failed');
      }
    },
    [onNotify],
  );
  const record = useCallback(
    async (eventCode: string, success: boolean, message: string) => {
      try {
        await activityLog.record(null, {
          action: 'Manage log',
          category: 'Application',
          dataChanged: success,
          durationMs: 0,
          eventCode,
          itemType: 'Activity log',
          itemsAffected: 0,
          kind: success ? 'ACTIVITY' : 'DIAGNOSTIC',
          level: success ? 'INFO' : 'ERROR',
          message,
          outcome: success ? 'Succeeded' : 'Failed',
          source: 'Activity log window',
        });
      } catch {
        console.error('activity-log-operation-record-failed');
      }
    },
    [activityLog],
  );
  const load = useCallback(async () => {
    const [rows, groups, names, capacity, identity] = await Promise.all([
      activityLog.list(profileId),
      activityLog.sessions?.() ?? [],
      activityLog.profiles?.() ?? [],
      activityLog.full?.() ?? false,
      activityLog.currentSession?.(),
    ]);
    return { rows, groups, names, capacity, identity };
  }, [activityLog, profileId]);
  useEffect(() => {
    if (!isOpen) return;
    let disposed = false;
    let running = false;
    let again = false;
    let failureReported = false;
    const refresh = async () => {
      if (running) {
        again = true;
        return;
      }
      running = true;
      try {
        do {
          again = false;
          const result = await load();
          if (disposed) return;
          if (failureReported) {
            failureReported = false;
            void record(
              'ACTIVITY-LOG-LOAD-COMPLETE',
              true,
              t('activityLog.title'),
            );
          }
          const container = events.current;
          const anchor = container
            ? Array.from(
                container.querySelectorAll<HTMLElement>('[data-event]'),
              ).find(
                (element) =>
                  element.getBoundingClientRect().bottom >=
                  container.getBoundingClientRect().top,
              )
            : undefined;
          const anchorId = anchor?.dataset.event;
          const offset = anchor?.getBoundingClientRect().top;
          const incoming =
            loaded.current &&
            result.rows.some((entry) => !ids.current.has(entry.id));
          if (
            !loaded.current &&
            eventOrderRef.current === 'oldest' &&
            result.rows.filter(
              (entry) => entry.sessionId === result.identity?.id,
            ).length > 50
          )
            follow.current = false;
          ids.current = new Set(result.rows.map((entry) => entry.id));
          loaded.current = true;
          setEntries(result.rows);
          setSessions(result.groups);
          setProfiles(result.names);
          setFull(result.capacity);
          setCurrent(result.identity?.id ?? '');
          setError(null);
          if (incoming) {
            follow.current =
              follow.current && latestVisible(container, eventOrderRef.current);
            if (follow.current) {
              const id = result.identity?.id;
              if (id)
                setLimits((value) => ({
                  ...value,
                  [id]: result.rows.filter((entry) => entry.sessionId === id)
                    .length,
                }));
              requestAnimationFrame(() =>
                container
                  ?.querySelector<HTMLElement>('[data-latest="true"]')
                  ?.scrollIntoView?.({ block: 'nearest' }),
              );
            } else {
              setNewEvents(true);
              requestAnimationFrame(() => {
                const next = anchorId
                  ? container?.querySelector<HTMLElement>(
                      `[data-event="${anchorId}"]`,
                    )
                  : undefined;
                if (container && next && offset !== undefined)
                  container.scrollTop +=
                    next.getBoundingClientRect().top - offset;
              });
            }
          }
        } while (again);
      } catch {
        if (!disposed) {
          setError(t('activityLog.loadError'));
          if (!failureReported) {
            failureReported = true;
            await record(
              'ACTIVITY-LOG-LOAD-FAILED',
              false,
              t('activityLog.messages.loadFailed'),
            );
            notify({
              level: 'error',
              title: t('notifications.errorTitle'),
              message: t('activityLog.messages.loadFailed'),
            });
          }
        }
      } finally {
        running = false;
      }
    };
    void refresh();
    const unsubscribe = activityLog.subscribe?.(() => {
      void refresh();
    });
    return () => {
      disposed = true;
      unsubscribe?.();
      loaded.current = false;
    };
  }, [isOpen, load, activityLog, record, t, notify]);
  useEffect(() => {
    const element = dialog.current;
    const search = element?.querySelector<HTMLInputElement>(
      '.activity-log__search input',
    );
    // Native showModal must choose Search before it can focus a header badge.
    if (isOpen && search) search.autofocus = true;
    setLogDialogOpen(element, isOpen);
    if (isOpen) search?.focus({ preventScroll: true });
    else {
      follow.current = true;
      eventOrderRef.current = 'oldest';
    }
  }, [isOpen]);
  useEffect(() => {
    const element = options.current;
    setLogDialogOpen(element, isOpen && optionsOpen);
    if (isOpen && optionsOpen)
      requestAnimationFrame(() =>
        element
          ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
          ?.focus(),
      );
  }, [isOpen, optionsOpen]);
  const resetTransient = () => {
    setQuery('');
    setLevel('ALL');
    setCategory('ALL');
    setProfile('CURRENT');
    setDates(null);
    setExpanded({});
    setLimits({});
    setGroupStart(0);
    setNewEvents(false);
    setOptionsOpen(false);
    setDateOpen(false);
    setProfileOpen(false);
    follow.current = true;
  };
  const close = () => {
    resetTransient();
    onClose();
  };
  const closeOptions = () => {
    setOptionsOpen(false);
    requestAnimationFrame(() => optionsTrigger.current?.focus());
  };
  const closeDates = () => {
    setDateOpen(false);
    requestAnimationFrame(() => dateTrigger.current?.focus());
  };
  const closeProfiles = () => {
    setProfileOpen(false);
    requestAnimationFrame(() => profileTrigger.current?.focus());
  };
  const baseMatches = useCallback(
    (entry: ActivityLogEntry) => {
      const target = profile === 'CURRENT' ? profileId : profile;
      return (
        (level === 'ALL' || entry.level === level) &&
        (category === 'ALL' || entry.category === category) &&
        (profile === 'ALL' ||
          (profile === 'APPLICATION'
            ? !entry.profileId
            : !entry.profileId || entry.profileId === target)) &&
        (!query.trim() ||
          `${entry.message} ${entry.eventCode} ${entry.source} ${entry.action}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()))
      );
    },
    [level, category, profile, profileId, query],
  );
  const matching = useMemo(
    () =>
      entries.filter(
        (entry) =>
          baseMatches(entry) && matchesActivityDate(entry.timestamp, dates),
      ),
    [entries, baseMatches, dates],
  );
  const activityDays = useMemo(
    () =>
      new Set(
        entries
          .filter(baseMatches)
          .map((entry) => localDay(new Date(entry.timestamp))),
      ),
    [entries, baseMatches],
  );
  const names = new Map(profiles.map((item) => [item.id, item.username]));
  const profileLabel = (id: string | null) =>
    id
      ? (names.get(id) ?? t('activityRebuild.deletedProfile'))
      : t('activityRebuild.applicationWide');
  const profileChoices = [
    { id: 'ALL', name: t('activityRebuild.allProfiles') },
    {
      id: 'CURRENT',
      name: profileLabel(profileId),
      active: true,
    },
    { id: 'APPLICATION', name: t('activityRebuild.applicationWide') },
    ...[
      ...new Set([
        ...profiles.map((item) => item.id),
        ...entries.flatMap((entry) =>
          entry.profileId ? [entry.profileId] : [],
        ),
      ]),
    ]
      .filter((id) => id !== profileId)
      .map((id) => ({ id, name: profileLabel(id) })),
  ];
  const groups = useMemo(() => {
    const byId = new Map(sessions.map((session) => [session.id, session]));
    const retainedCounts = new Map<string, number>();
    const matchingRows = new Map<string, ActivityLogEntry[]>();
    for (const entry of entries)
      retainedCounts.set(
        entry.sessionId,
        (retainedCounts.get(entry.sessionId) ?? 0) + 1,
      );
    for (const entry of matching) {
      const group = matchingRows.get(entry.sessionId) ?? [];
      group.push(entry);
      matchingRows.set(entry.sessionId, group);
    }
    for (const entry of entries)
      if (!byId.has(entry.sessionId))
        byId.set(entry.sessionId, {
          id: entry.sessionId,
          startedAt: entry.timestamp,
          origin: 'earlier',
          startup: 'not-recorded',
          trimmedCount: 0,
          omittedCount: 0,
          cleared: false,
        });
    return [...byId.values()]
      .map((session) => ({
        session,
        rows: (matchingRows.get(session.id) ?? []).sort(
          (a, b) =>
            (a.timestamp - b.timestamp ||
              a.sequence - b.sequence ||
              a.id.localeCompare(b.id)) * (eventOrder === 'oldest' ? 1 : -1),
        ),
        retained: retainedCounts.get(session.id) ?? 0,
      }))
      .filter(
        (group) =>
          group.rows.length > 0 ||
          (!query &&
            level === 'ALL' &&
            category === 'ALL' &&
            (profile === 'ALL' || profile === 'CURRENT') &&
            dates === null),
      )
      .sort(
        (a, b) =>
          (a.session.startedAt - b.session.startedAt ||
            a.session.id.localeCompare(b.session.id)) *
          (sessionOrder === 'oldest' ? 1 : -1),
      );
  }, [
    sessions,
    entries,
    matching,
    eventOrder,
    sessionOrder,
    query,
    level,
    category,
    profile,
    dates,
  ]);
  const pageStart = Math.min(
    groupStart,
    Math.max(0, Math.floor((groups.length - 1) / 50) * 50),
  );
  const clear = async (sessionId?: string) => {
    if (busy) return;
    setBusy(true);
    const trigger = document.activeElement;
    try {
      if (!(await requestClearConfirmation(sessionId))) return;
      await activityLog.clear(profileId, sessionId);
      await record(
        'ACTIVITY-LOG-CLEAR-COMPLETE',
        true,
        t('activityLog.messages.cleared'),
      );
      const result = await load();
      setEntries(result.rows);
      setSessions(result.groups);
      setFull(result.capacity);
      notify({
        level: 'success',
        title: t('notifications.activityLogClearedTitle'),
        message: t('activityLog.messages.cleared'),
      });
    } catch {
      setError(t('activityLog.clearError'));
      await record(
        'ACTIVITY-LOG-CLEAR-FAILED',
        false,
        t('activityLog.messages.clearFailed'),
      );
      notify({
        level: 'error',
        title: t('notifications.errorTitle'),
        message: t('activityLog.messages.clearFailed'),
      });
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        if (trigger instanceof HTMLElement && trigger.isConnected)
          trigger.focus();
      });
    }
  };
  const time = (timestamp: number) =>
    formatDateTime(timestamp, dateTimeFormat, i18n.language);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="activity-log-title"
      className="profile-window activity-log-window"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header className="profile-window__header activity-log__header">
        <div>
          <div className="dialog-heading-with-badges">
            <h1 id="activity-log-title">{t('activityLog.title')}</h1>
            {isOpen ? (
              <DialogBadges
                badges={activityLogBadges}
                version={packageMetadata.version}
              />
            ) : null}
          </div>
          <p>{t('activityRebuild.summary')}</p>
        </div>
        <button
          type="button"
          aria-label={t('activityLog.close')}
          onClick={close}
        >
          <ClearIcon />
        </button>
      </header>
      <section className="activity-log__toolbar">
        <label className="activity-log__search">
          <span>{t('activityLog.filters.search')}</span>
          <ClearableInput
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setGroupStart(0);
            }}
            placeholder={t('activityLog.filters.searchPlaceholder')}
          />
        </label>
        <button
          ref={optionsTrigger}
          type="button"
          className="profile-button"
          aria-haspopup="dialog"
          onClick={() => setOptionsOpen(true)}
        >
          {t('activityLog.viewOptions')}
        </button>
      </section>
      <p className="activity-log-count" role="status">
        {t('activityRebuild.counts', {
          matching: matching.length,
          retained: entries.length,
        })}
      </p>
      {error ? (
        <p className="activity-log__error" role="alert">
          {error}
          <button
            className="profile-button"
            type="button"
            onClick={() => {
              void load()
                .then((result) => {
                  setEntries(result.rows);
                  setSessions(result.groups);
                  setError(null);
                })
                .catch(() => setError(t('activityLog.loadError')));
            }}
          >
            {t('activityRebuild.retry')}
          </button>
        </p>
      ) : null}
      {full ? (
        <div className="activity-log-capacity" role="alert">
          <strong>{t('activityRebuild.full')}</strong>
          <p>{t('activityRebuild.fullHelp')}</p>
          <button
            type="button"
            className="profile-button profile-button--danger"
            onClick={() => {
              void clear();
            }}
          >
            {t('activityRebuild.clearAll')}
          </button>
          <button
            type="button"
            className="profile-button"
            onClick={onOpenSettings ?? (() => setOptionsOpen(true))}
          >
            {t(
              onOpenSettings
                ? 'activityLog.openSettings'
                : 'activityLog.viewOptions',
            )}
          </button>
        </div>
      ) : null}
      {newEvents ? (
        <button
          className="profile-button"
          type="button"
          onClick={() => {
            setNewEvents(false);
            follow.current = true;
            setExpanded((value) => ({ ...value, [current]: true }));
            setGroupStart(
              Math.floor(
                Math.max(
                  0,
                  groups.findIndex((group) => group.session.id === current),
                ) / 50,
              ) * 50,
            );
            const count = matching.filter(
              (entry) => entry.sessionId === current,
            ).length;
            setLimits((value) => ({ ...value, [current]: count }));
            requestAnimationFrame(() =>
              events.current
                ?.querySelector<HTMLElement>('[data-latest="true"]')
                ?.scrollIntoView?.({ block: 'nearest' }),
            );
          }}
        >
          {t('activityRebuild.newEvents')}
        </button>
      ) : null}
      <section
        ref={events}
        className="activity-log__events"
        aria-label={t('activityLog.eventsLabel')}
        onScroll={() => {
          follow.current = latestVisible(events.current, eventOrder);
        }}
      >
        {groups
          .slice(pageStart, pageStart + 50)
          .map(({ session, rows, retained }) => {
            const open = expanded[session.id] ?? session.id === current;
            const title =
              session.origin === 'earlier'
                ? t('activityRebuild.earlier')
                : `${t(session.origin === 'startup' ? 'activityRebuild.session' : 'activityRebuild.detected')} ${time(session.startedAt)}`;
            const visible = rows.slice(0, limits[session.id] ?? 50);
            const latest =
              eventOrder === 'oldest' ? rows.at(-1)?.id : rows[0]?.id;
            return (
              <section key={session.id} className="activity-session">
                <header className="activity-session__header">
                  <div className="activity-session__title-row">
                    <button
                      className="profile-button activity-session__toggle"
                      type="button"
                      aria-expanded={open}
                      aria-label={title}
                      title={title}
                      onClick={() =>
                        setExpanded((value) => ({
                          ...value,
                          [session.id]: !open,
                        }))
                      }
                    >
                      <ChevronIcon />
                      <span>
                        {session.origin === 'earlier'
                          ? t('activityRebuild.earlier')
                          : time(session.startedAt)}
                      </span>
                    </button>
                    <button
                      className="profile-button profile-button--danger activity-session__clear"
                      type="button"
                      disabled={busy}
                      aria-label={t('activityRebuild.clearSession')}
                      onClick={() => {
                        void clear(session.id);
                      }}
                    >
                      {t('activityRebuild.clearSessionShort')}
                    </button>
                  </div>
                  <p>
                    {t('activityRebuild.sessionSummary', {
                      status: t(`activityRebuild.startup.${session.startup}`),
                      matching: rows.length,
                      retained,
                    })}
                  </p>
                  {session.recordingResumed ? (
                    <p>{t('activityRebuild.recordingResumed')}</p>
                  ) : null}
                  {session.trimmedCount ? (
                    <p>
                      {t('activityRebuild.trimmed', {
                        count: session.trimmedCount,
                      })}
                    </p>
                  ) : null}
                  {session.omittedCount ? (
                    <p>
                      {t('activityRebuild.omitted', {
                        count: session.omittedCount,
                      })}
                    </p>
                  ) : null}
                  {session.cleared ? (
                    <p>{t('activityRebuild.cleared')}</p>
                  ) : null}
                </header>
                {open ? (
                  <>
                    <ol>
                      {visible.map((entry) => (
                        <li
                          key={entry.id}
                          data-event={entry.id}
                          data-latest={
                            session.id === current && entry.id === latest
                          }
                          className={`activity-log__event activity-log__event--${entry.level.toLowerCase()}`}
                        >
                          <details>
                            <summary className="activity-log__event-summary">
                              <span
                                aria-hidden="true"
                                className="activity-log__chevron"
                              />
                              <time>{time(entry.timestamp)}</time>
                              <strong>
                                {t(
                                  `activityLog.levels.${entry.level.toLowerCase()}`,
                                )}
                              </strong>
                              <span>{entry.message}</span>
                              <small>
                                {t(
                                  `activityLog.categories.${entry.category.toLowerCase()}`,
                                )}
                              </small>
                            </summary>
                            <dl className="activity-log__details">
                              <div className="activity-log__detail-row">
                                <dt>{t('activityRebuild.profileFilter')}</dt>
                                <dd>{profileLabel(entry.profileId)}</dd>
                              </div>
                              {(
                                [
                                  'eventCode',
                                  'outcome',
                                  'source',
                                  'action',
                                  'itemType',
                                  'itemsAffected',
                                  'dataChanged',
                                  'durationMs',
                                  'applicationVersion',
                                  'schemaVersion',
                                  'browserTarget',
                                  'operationId',
                                ] as const
                              ).map((key) => {
                                const detail =
                                  key === 'durationMs'
                                    ? 'duration'
                                    : key === 'applicationVersion'
                                      ? 'application'
                                      : key;
                                const value =
                                  key === 'dataChanged'
                                    ? t(
                                        entry.dataChanged
                                          ? 'activityLog.details.yes'
                                          : 'activityLog.details.no',
                                      )
                                    : key === 'durationMs'
                                      ? t('activityLog.details.milliseconds', {
                                          count: entry.durationMs,
                                        })
                                      : entry[key];
                                return (
                                  <div
                                    className="activity-log__detail-row"
                                    key={key}
                                    title={t(
                                      `activityLog.details.help.${detail}`,
                                    )}
                                  >
                                    <dt>
                                      {t(`activityLog.details.${detail}`)}
                                    </dt>
                                    <dd>{String(value)}</dd>
                                    <span className="visually-hidden">
                                      {t(`activityLog.details.help.${detail}`)}
                                    </span>
                                  </div>
                                );
                              })}
                            </dl>
                          </details>
                        </li>
                      ))}
                    </ol>
                    {visible.length < rows.length ? (
                      <button
                        type="button"
                        className="profile-button"
                        onClick={() =>
                          setLimits((value) => ({
                            ...value,
                            [session.id]: (value[session.id] ?? 50) + 50,
                          }))
                        }
                      >
                        {t('activityRebuild.showMoreEvents')}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </section>
            );
          })}
        {!groups.length ? <p>{t('activityLog.empty.title')}</p> : null}
        {pageStart > 0 ? (
          <button
            className="profile-button"
            type="button"
            onClick={() => setGroupStart(Math.max(0, pageStart - 50))}
          >
            {t('activityRebuild.previousSessions')}
          </button>
        ) : null}
        {groups.length > pageStart + 50 ? (
          <button
            className="profile-button"
            type="button"
            onClick={() => setGroupStart(pageStart + 50)}
          >
            {t('activityRebuild.showMoreSessions')}
          </button>
        ) : null}
      </section>
      <dialog
        ref={options}
        className="profile-window activity-log-options"
        aria-labelledby="activity-log-options-title"
        onCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          closeOptions();
        }}
      >
        <header className="profile-window__header">
          <h1 id="activity-log-options-title">
            {t('activityLog.options.title')}
          </h1>
          <button
            type="button"
            aria-label={t('activityLog.options.close')}
            onClick={closeOptions}
          >
            <ClearIcon />
          </button>
        </header>
        <div className="activity-log-options__content">
          <section
            className="activity-log__filters"
            aria-label={t('activityLog.filters.label')}
          >
            <fieldset>
              <legend>{t('activityLog.filters.level')}</legend>
              <div className="activity-log__levels">
                {['ALL', 'INFO', 'WARN', 'ERROR'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={value === level}
                    onClick={() => {
                      setLevel(value);
                      setGroupStart(0);
                    }}
                  >
                    {t(`activityLog.levels.${value.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            </fieldset>
            <label>
              {t('activityLog.filters.category')}
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setGroupStart(0);
                }}
              >
                {['ALL', 'Application', 'Bookmarks', 'Notes', 'Profiles'].map(
                  (value) => (
                    <option key={value} value={value}>
                      {t(`activityLog.categories.${value.toLowerCase()}`)}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              <span id="activity-profile-label">
                {t('activityRebuild.profileFilter')}
              </span>
              <button
                ref={profileTrigger}
                type="button"
                className="profile-button"
                aria-haspopup="dialog"
                aria-labelledby="activity-profile-label activity-profile-selection"
                onClick={() => setProfileOpen(true)}
              >
                <span id="activity-profile-selection">
                  {profileChoices.find((choice) => choice.id === profile)?.name}
                </span>
              </button>
            </label>
            <button
              ref={dateTrigger}
              type="button"
              className="profile-button"
              aria-haspopup="dialog"
              onClick={() => setDateOpen(true)}
            >
              {t('activityLog.filters.date')}:{' '}
              {dates === null
                ? t('activityRebuild.preset.all')
                : t('activityRebuild.custom')}
            </button>
          </section>
          <div className="activity-log__filters">
            <label>
              {t('activityRebuild.sessionOrder')}
              <select
                value={sessionOrder}
                onChange={(event) => {
                  setSessionOrder(event.target.value as 'newest' | 'oldest');
                  setGroupStart(0);
                }}
              >
                {['newest', 'oldest'].map((value) => (
                  <option key={value} value={value}>
                    {t(`activityRebuild.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('activityRebuild.eventOrder')}
              <select
                value={eventOrder}
                onChange={(event) => {
                  const value = event.target.value as 'newest' | 'oldest';
                  eventOrderRef.current = value;
                  setEventOrder(value);
                }}
              >
                {['oldest', 'newest'].map((value) => (
                  <option key={value} value={value}>
                    {t(`activityRebuild.${value}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <footer className="activity-log__footer">
          {onOpenSettings ? (
            <button
              className="profile-button"
              type="button"
              onClick={onOpenSettings}
            >
              {t('activityLog.openSettings')}
            </button>
          ) : null}
          <button
            className="profile-button"
            type="button"
            onClick={closeOptions}
          >
            {t('searchWindow.options.closeAction')}
          </button>
        </footer>
      </dialog>
      {profileOpen && optionsOpen && isOpen ? (
        <ActivityLogProfileDialog
          choices={profileChoices}
          selected={profile}
          onSelect={(id) => {
            setProfile(id);
            setGroupStart(0);
          }}
          onClose={closeProfiles}
        />
      ) : null}
      {dateOpen && isOpen ? (
        <ActivityLogDateDialog
          selection={dates}
          activityDays={activityDays}
          onClose={closeDates}
          onApply={(value) => {
            setDates(value);
            setGroupStart(0);
            closeDates();
          }}
        />
      ) : null}
      <footer className="activity-log__footer">
        <button
          className="profile-button profile-button--danger"
          disabled={busy}
          type="button"
          onClick={() => {
            void clear();
          }}
        >
          {t('activityRebuild.clearAll')}
        </button>
        <button className="profile-button" type="button" onClick={close}>
          {t('searchWindow.options.closeAction')}
        </button>
      </footer>
    </dialog>
  );
}
