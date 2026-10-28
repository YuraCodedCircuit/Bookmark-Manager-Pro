import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import type {
  BookmarkSearchResult,
  SearchProfileSource,
} from '../../domain/bookmark-search';
import {
  filterUrlMatches,
  groupUrlMatches,
  sameUrlMatchSources,
  urlMatchLevels,
  type UrlMatchLevel,
  type UrlMatchMember,
} from '../../domain/url-matches';
import type { UrlMatchDetails } from '../../application/search/url-match-actions';
import { ItemInfoDialog } from '../item-info/ItemInfoDialog';
import { ContextMenuIcon } from '../context-menu/ContextMenuIcon';
import { getPathSeparator } from '../../platform/navigation/path-separator';
import type { UrlMatchScanOutcome } from '../../application/search/url-match-snapshot';
import {
  resolveBookmarkClickOpening,
  type BookmarkClickOpening,
} from '../../shared/bookmark-click-opening';
import { ChevronIcon } from '../../components/icons/ChevronIcon';
import { ClearIcon } from '../../components/icons/ClearIcon';

interface Props {
  active: boolean;
  toolbarHost?: HTMLElement | null;
  activeProfileId: string;
  filter: string;
  bookmarkOpening: 'current-tab' | 'new-tab';
  loadSnapshot(): Promise<readonly SearchProfileSource[]>;
  subscribeChanges?: ((listener: () => void) => () => void) | undefined;
  onInspect?(member: UrlMatchMember): Promise<UrlMatchDetails>;
  onDelete?(member: UrlMatchMember): Promise<boolean>;
  onOpenFolder?(member: UrlMatchMember): Promise<void>;
  onCopyInfo?(details: UrlMatchDetails, value: string): Promise<void>;
  onScan(
    outcome: UrlMatchScanOutcome,
    explicit: boolean,
    notifyFailure: boolean,
  ): void | Promise<void>;
  onOpenResult(
    result: BookmarkSearchResult,
    opening: BookmarkClickOpening,
  ): void | Promise<void>;
}

/** Owns the Search snapshot, profile context, and single-bookmark action lifecycle. */
export function UrlMatchesPanel({
  active,
  toolbarHost,
  activeProfileId,
  filter,
  bookmarkOpening,
  loadSnapshot,
  subscribeChanges,
  onInspect,
  onDelete,
  onOpenFolder,
  onCopyInfo,
  onScan,
  onOpenResult,
}: Props) {
  const { t } = useTranslation();
  const pathSeparator = getPathSeparator();
  const titlePrefix = useId();
  const [snapshot, setSnapshot] = useState<
    readonly SearchProfileSource[] | null
  >(null);
  const [level, setLevel] = useState<UrlMatchLevel>('exact');
  const [allProfiles, setAllProfiles] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [limits, setLimits] = useState<ReadonlyMap<string, number>>(new Map());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [details, setDetails] = useState<UrlMatchDetails | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsDialog = useRef<HTMLDialogElement>(null);
  const optionsTrigger = useRef<HTMLButtonElement>(null);
  const closeOptions = () => {
    setOptionsOpen(false);
    requestAnimationFrame(() => optionsTrigger.current?.focus());
  };
  useEffect(() => {
    const dialog = optionsDialog.current;
    if (!dialog) return;
    if (optionsOpen && active && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      requestAnimationFrame(() => dialog.querySelector('select')?.focus());
    } else if ((!optionsOpen || !active) && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [optionsOpen, active]);
  const infoTrigger = useRef<HTMLButtonElement | null>(null);
  const lifecycle = useRef({ mounted: true, active });
  useEffect(() => {
    lifecycle.current.active = active;
  }, [active]);
  useEffect(() => {
    const state = lifecycle.current;
    state.mounted = true;
    return () => {
      state.mounted = false;
    };
  }, []);
  const request = useRef(0);
  const latest = useRef({ loadSnapshot, onScan });
  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    latest.current = { loadSnapshot, onScan };
  }, [loadSnapshot, onScan]);
  const lastOutcome = useRef<UrlMatchScanOutcome | null>(null);
  const scanState = useRef({ running: false, queued: false, explicit: false });
  const refresh = useCallback(async (explicit: boolean) => {
    const state = scanState.current;
    if (state.running) {
      state.queued = true;
      state.explicit ||= explicit;
      if (explicit) setLoading(true);
      ++request.current;
      return;
    }
    state.running = true;
    let announce = explicit;
    // Existing results stay interactive and stationary during automatic rereads.
    setLoading(snapshotRef.current === null || explicit);
    try {
      do {
        state.queued = false;
        state.explicit = false;
        const id = ++request.current;
        const scanExplicit = announce;
        const report = (outcome: UrlMatchScanOutcome) => {
          const notifyFailure = outcome !== lastOutcome.current;
          lastOutcome.current = outcome;
          void Promise.resolve()
            .then(() =>
              latest.current.onScan(outcome, scanExplicit, notifyFailure),
            )
            .catch(() => console.error('url-matches-feedback-failed'));
        };
        try {
          const next = await latest.current.loadSnapshot();
          if (id === request.current && lifecycle.current.mounted) {
            if (
              snapshotRef.current === null ||
              !sameUrlMatchSources(snapshotRef.current, next)
            ) {
              setSnapshot(next);
              snapshotRef.current = next;
            }
            setFailed(false);
            report('complete');
          }
        } catch {
          if (id === request.current && lifecycle.current.mounted) {
            setFailed(true);
            report(snapshotRef.current ? 'outdated' : 'failed');
          }
        }
        announce = state.explicit;
      } while (
        state.queued &&
        lifecycle.current.mounted &&
        lifecycle.current.active &&
        document.visibilityState !== 'hidden'
      );
    } finally {
      state.running = false;
      if (lifecycle.current.mounted && scanState.current === state)
        setLoading(false);
    }
  }, []);

  const inspect = async (
    member: UrlMatchMember,
    trigger: HTMLButtonElement,
  ) => {
    if (!onInspect || busy) return;
    const id = request.current;
    setBusy(true);
    setActionError('');
    infoTrigger.current = trigger;
    try {
      const next = await onInspect(member);
      if (
        lifecycle.current.mounted &&
        lifecycle.current.active &&
        id === request.current
      )
        setDetails(next);
    } catch {
      if (
        lifecycle.current.mounted &&
        lifecycle.current.active &&
        id === request.current
      ) {
        setActionError(t('urlMatches.infoFailed'));
        requestAnimationFrame(() => {
          if (trigger.isConnected) trigger.focus();
        });
      }
    } finally {
      if (lifecycle.current.mounted) setBusy(false);
    }
  };

  const remove = async (member: UrlMatchMember, trigger: HTMLButtonElement) => {
    if (!onDelete || busy) return;
    setBusy(true);
    setActionError('');
    try {
      if (!(await onDelete(member)) || !lifecycle.current.mounted) return;
      // The committed removal stays removed even if the subsequent scan fails.
      const next =
        snapshotRef.current?.map((source) => ({
          ...source,
          bookmarks: source.bookmarks.filter(
            (item) =>
              source.profileId !== member.profileId ||
              item.id !== member.item.id,
          ),
        })) ?? null;
      snapshotRef.current = next;
      setSnapshot(next);
      if (lifecycle.current.active) await refresh(false);
    } catch {
      if (lifecycle.current.mounted)
        setActionError(t('urlMatches.deleteFailed'));
    } finally {
      if (lifecycle.current.mounted) {
        setBusy(false);
        requestAnimationFrame(() => {
          if (lifecycle.current.active)
            (trigger.isConnected ? trigger : optionsTrigger.current)?.focus();
        });
      }
    }
  };

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    const lifetime = request;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      // A committed change invalidates an older in-flight read immediately.
      ++request.current;
      if (timer !== undefined) clearTimeout(timer);
      if (document.visibilityState === 'hidden') return;
      timer = setTimeout(() => {
        timer = undefined;
        if (!disposed) void refresh(false);
      }, 100);
    };
    const visible = () => {
      if (document.visibilityState === 'hidden') {
        ++request.current;
        scanState.current.queued = false;
        scanState.current = { running: false, queued: false, explicit: false };
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
      } else schedule();
    };
    const unsubscribe = subscribeChanges?.(schedule);
    document.addEventListener('visibilitychange', visible);
    // Strict Mode can dispose its trial mount before starting storage work.
    queueMicrotask(() => {
      if (!disposed && document.visibilityState !== 'hidden')
        void refresh(false);
    });
    return () => {
      disposed = true;
      ++lifetime.current;
      scanState.current.queued = false;
      scanState.current = { running: false, queued: false, explicit: false };
      if (timer !== undefined) clearTimeout(timer);
      unsubscribe?.();
      document.removeEventListener('visibilitychange', visible);
    };
  }, [active, activeProfileId, refresh, subscribeChanges]);

  const grouped = useMemo(
    () =>
      groupUrlMatches(
        snapshot ?? [],
        level,
        activeProfileId,
        allProfiles,
        pathSeparator,
      ),
    [snapshot, level, activeProfileId, allProfiles, pathSeparator],
  );
  const groups = useMemo(
    () => filterUrlMatches(grouped, filter),
    [grouped, filter],
  );
  const pages = Math.max(1, Math.ceil(groups.length / 50));
  const currentPage = Math.min(page, pages - 1);
  const total = groups.reduce(
    (count, group) => count + group.members.length,
    0,
  );
  // Filter changes reset paging without replacing or rescanning the snapshot.
  const [previousFilter, setPreviousFilter] = useState(filter);
  if (previousFilter !== filter) {
    setPreviousFilter(filter);
    if (page !== 0) setPage(0);
  }

  // The panel retains scan ownership while its toolbar shares the query row.
  const toolbar = (
    <>
      <button
        className="search-window__options-toggle"
        type="button"
        ref={optionsTrigger}
        aria-haspopup="dialog"
        aria-controls={`${titlePrefix}-options`}
        onClick={() => setOptionsOpen(true)}
      >
        {t('urlMatches.options')}
        <ChevronIcon />
      </button>
    </>
  );
  return (
    <section
      className="url-matches"
      hidden={!active}
      aria-label={t('urlMatches.title')}
    >
      {toolbarHost ? (
        createPortal(toolbar, toolbarHost)
      ) : (
        <div className="url-matches__toolbar">{toolbar}</div>
      )}
      <dialog
        ref={optionsDialog}
        id={`${titlePrefix}-options`}
        className="search-options-window url-matches__options-window"
        aria-labelledby={`${titlePrefix}-options-title`}
        onCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          closeOptions();
        }}
      >
        <header className="search-options-window__header">
          <h2 id={`${titlePrefix}-options-title`}>{t('urlMatches.options')}</h2>
          <button
            type="button"
            aria-label={t('urlMatches.closeOptions')}
            className="search-options-window__close"
            onClick={closeOptions}
          >
            <ClearIcon />
          </button>
        </header>
        <div className="url-matches__controls search-options-window__content">
          <label>
            {t('urlMatches.level')}
            <select
              value={level}
              onChange={(event) => {
                setLevel(event.target.value as UrlMatchLevel);
                setPage(0);
              }}
            >
              {urlMatchLevels.map((value) => (
                <option key={value} value={value}>
                  {t(`urlMatches.levels.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('urlMatches.scope')}
            <select
              value={allProfiles ? 'all' : 'current'}
              onChange={(event) => {
                setAllProfiles(event.target.value === 'all');
                setPage(0);
              }}
            >
              <option value="current">{t('urlMatches.currentProfile')}</option>
              <option value="all">{t('urlMatches.allProfiles')}</option>
            </select>
          </label>
        </div>
        <footer className="search-options-window__footer">
          <button type="button" onClick={closeOptions}>
            {t('searchWindow.options.closeAction')}
          </button>
        </footer>
      </dialog>
      <div role="status" aria-live="polite">
        {loading ? <p>{t('urlMatches.loading')}</p> : null}
        {failed ? (
          <p className="url-matches__error">
            {t(snapshot ? 'urlMatches.outdated' : 'urlMatches.failed')}{' '}
            <button
              type="button"
              disabled={loading}
              onClick={() => void refresh(true)}
            >
              {t('urlMatches.retry')}
            </button>
          </p>
        ) : null}
        {snapshot && groups.length > 0 ? (
          <p>
            {t('urlMatches.totals', {
              groups: t('urlMatches.groupCount', { count: groups.length }),
              bookmarks: t('urlMatches.memberCount', { count: total }),
            })}
          </p>
        ) : null}
      </div>
      {actionError ? (
        <p role="alert" className="url-matches__error">
          {actionError}
        </p>
      ) : null}
      <div aria-busy={loading}>
        {snapshot && !groups.length && !loading && !failed ? (
          <p role="status" className="search-window__empty">
            {t('urlMatches.empty')}
          </p>
        ) : null}
        {groups.slice(currentPage * 50, (currentPage + 1) * 50).map((group) => {
          const open = expanded.has(group.key);
          const limit = limits.get(group.key) ?? 50;
          return (
            <section className="url-matches__group" key={group.key}>
              <h3>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={t('urlMatches.groupSummary', {
                    key: group.label,
                    members: t('urlMatches.memberCount', {
                      count: group.members.length,
                    }),
                  })}
                  onClick={() =>
                    setExpanded((current) => {
                      const next = new Set(current);
                      if (open) next.delete(group.key);
                      else next.add(group.key);
                      return next;
                    })
                  }
                >
                  <ChevronIcon
                    className={open ? 'search-window__chevron--open' : ''}
                  />
                  <span>{group.label}</span>
                  <span>
                    {t('urlMatches.memberCount', {
                      count: group.members.length,
                    })}
                  </span>
                </button>
              </h3>
              {open ? (
                <>
                  <ul>
                    {group.members.slice(0, limit).map((member) => (
                      <li
                        className="url-matches__row"
                        key={JSON.stringify([member.profileId, member.item.id])}
                      >
                        <button
                          type="button"
                          className="url-matches__member"
                          disabled={busy}
                          onClick={(event) =>
                            void onOpenResult(
                              member,
                              resolveBookmarkClickOpening(
                                bookmarkOpening,
                                event,
                              ),
                            )
                          }
                        >
                          <strong
                            id={`${titlePrefix}-${member.profileId}-${member.item.id}`}
                          >
                            {member.item.title}
                          </strong>
                          <span>{member.item.url}</span>
                          <small>
                            {t('urlMatches.folder', {
                              path: member.parentPath,
                            })}
                          </small>
                          <span className="url-matches__ownership">
                            <span className="url-matches__profile">
                              {t('urlMatches.profile', {
                                profile: member.profileName,
                              })}
                            </span>
                            {allProfiles &&
                            member.profileId === activeProfileId ? (
                              <span className="profile-status">
                                {t('profiles.active')}
                              </span>
                            ) : null}
                          </span>
                        </button>
                        {onInspect || onDelete || onOpenFolder ? (
                          <div className="url-matches__actions">
                            {onInspect ? (
                              <button
                                type="button"
                                aria-describedby={`${titlePrefix}-${member.profileId}-${member.item.id}`}
                                disabled={busy || loading}
                                onClick={(event) =>
                                  void inspect(member, event.currentTarget)
                                }
                              >
                                <ContextMenuIcon name="info" />
                                {t('urlMatches.getInfo')}
                              </button>
                            ) : null}
                            {onOpenFolder ? (
                              <button
                                type="button"
                                aria-describedby={`${titlePrefix}-${member.profileId}-${member.item.id}`}
                                disabled={busy || loading}
                                onClick={async (event) => {
                                  const trigger = event.currentTarget;
                                  setBusy(true);
                                  setActionError('');
                                  try {
                                    await onOpenFolder(member);
                                  } catch {
                                    if (
                                      lifecycle.current.mounted &&
                                      lifecycle.current.active
                                    )
                                      setActionError(
                                        t('urlMatches.openFolderFailed'),
                                      );
                                  } finally {
                                    if (lifecycle.current.mounted) {
                                      setBusy(false);
                                      if (
                                        lifecycle.current.active &&
                                        trigger.isConnected
                                      )
                                        requestAnimationFrame(() =>
                                          trigger.focus(),
                                        );
                                    }
                                  }
                                }}
                              >
                                <ContextMenuIcon name="open" />
                                {t('urlMatches.openFolder')}
                              </button>
                            ) : null}
                            {onDelete ? (
                              <button
                                type="button"
                                aria-describedby={`${titlePrefix}-${member.profileId}-${member.item.id}`}
                                className="profile-button--danger"
                                disabled={busy || loading}
                                onClick={(event) =>
                                  void remove(member, event.currentTarget)
                                }
                              >
                                <ContextMenuIcon name="delete" />
                                {t('urlMatches.delete')}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {group.members.length > limit ? (
                    <button
                      type="button"
                      onClick={() =>
                        setLimits((current) =>
                          new Map(current).set(group.key, limit + 50),
                        )
                      }
                    >
                      {t('urlMatches.showMore')}
                    </button>
                  ) : null}
                </>
              ) : null}
            </section>
          );
        })}
      </div>
      {groups.length > 50 ? (
        <nav aria-label={t('urlMatches.pages')} className="url-matches__pages">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            {t('urlMatches.previous')}
          </button>
          <span>{t('urlMatches.page', { page: currentPage + 1, pages })}</span>
          <button
            type="button"
            disabled={currentPage + 1 >= pages}
            onClick={() => setPage(currentPage + 1)}
          >
            {t('urlMatches.next')}
          </button>
        </nav>
      ) : null}
      {details ? (
        <ItemInfoDialog
          profileName={
            details.member.profileId !== activeProfileId
              ? details.member.profileName
              : undefined
          }
          item={{ kind: 'bookmark', value: details.member.item }}
          parentName={details.member.parentPath}
          dateTimeFormat={details.settings.dateTimeFormat ?? 'browser'}
          onClose={() => {
            setDetails(null);
            requestAnimationFrame(() => infoTrigger.current?.focus());
          }}
          onCopy={async (_field, value) => {
            if (!onCopyInfo) throw new Error('url-match-copy-unavailable');
            await onCopyInfo(details, value);
          }}
        />
      ) : null}
    </section>
  );
}
