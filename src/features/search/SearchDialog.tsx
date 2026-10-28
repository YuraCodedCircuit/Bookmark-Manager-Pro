import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BookmarkIcon } from '../../components/icons/BookmarkIcon';
import { ChevronIcon } from '../../components/icons/ChevronIcon';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { ClearableInput } from '../../components/ClearableInput';
import { DialogBadges } from '../../components/DialogBadges';
import type { DialogBadgeDefinition } from '../../components/dialog-badges';
import packageMetadata from '../../../package.json';
import { FolderIcon } from '../../components/icons/FolderIcon';
import { getPathSeparator } from '../../platform/navigation/path-separator';
import { ContextMenuIcon } from '../context-menu/ContextMenuIcon';
import { SearchOptions } from './SearchOptions';
import { UrlMatchesPanel } from './UrlMatchesPanel';
import type { UrlMatchDetails } from '../../application/search/url-match-actions';
import type { UrlMatchMember } from '../../domain/url-matches';
import type { UrlMatchScanOutcome } from '../../application/search/url-match-snapshot';
import {
  searchBookmarks,
  type BookmarkSearchResult,
  type SearchPreferences,
  type SearchProfileSource,
} from '../../domain/bookmark-search';
import {
  resolveBookmarkClickOpening,
  type BookmarkClickOpening,
} from '../../shared/bookmark-click-opening';

/** Manually maintained feature status; visible only in the URL matches mode. */
const urlMatchBadges: readonly DialogBadgeDefinition[] = [
  {
    id: 'url-matches-experimental',
    kind: 'experimental',
    titleKey: 'dialogBadges.experimental',
    descriptionKey: 'dialogBadges.urlMatchesExperimental',
  },
];

interface Props {
  activeProfileId: string;
  bookmarkOpening: 'current-tab' | 'new-tab';
  currentFolderId: string;
  initialPreferences: SearchPreferences;
  isLoading: boolean;
  isOpen: boolean;
  loadFailed: boolean;
  onClose(): void;
  onInspectResult?(
    result: BookmarkSearchResult,
    trigger: HTMLButtonElement,
  ): Promise<void>;
  onConfirmResultProfileChange?(): Promise<boolean>;
  onOpenResult(
    result: BookmarkSearchResult,
    opening: BookmarkClickOpening,
  ): void | Promise<void>;
  onWebSearch(query: string): Promise<void>;
  onWebUnavailable(): void;
  onLoadUrlMatches?(): Promise<readonly SearchProfileSource[]>;
  onSubscribeUrlMatchChanges?:
    ((listener: () => void) => () => void) | undefined;
  onInspectUrlMatch?(member: UrlMatchMember): Promise<UrlMatchDetails>;
  /** Opens the fresh containing folder; Bookmarks confirms a profile change first. */
  onOpenUrlMatchFolder?(
    member: BookmarkSearchResult,
    source?: 'Search window' | 'URL matches',
  ): Promise<void>;
  onDeleteUrlMatch?(member: UrlMatchMember): Promise<boolean>;
  onCopyUrlMatchInfo?(details: UrlMatchDetails, value: string): Promise<void>;
  onUrlMatchScan?(
    outcome: UrlMatchScanOutcome,
    explicit: boolean,
    notifyFailure: boolean,
  ): void | Promise<void>;
  sources: readonly SearchProfileSource[];
  webSearchAvailable: boolean;
}

/** Presents local search, snapshot-based URL matches, and API-only web search. */
export function SearchDialog({
  activeProfileId,
  bookmarkOpening,
  currentFolderId,
  initialPreferences,
  isLoading,
  isOpen,
  loadFailed,
  onClose,
  onInspectResult,
  onConfirmResultProfileChange,
  onOpenResult,
  onWebSearch,
  onWebUnavailable,
  onLoadUrlMatches,
  onSubscribeUrlMatchChanges,
  onInspectUrlMatch,
  onOpenUrlMatchFolder,
  onDeleteUrlMatch,
  onCopyUrlMatchInfo,
  onUrlMatchScan,
  sources,
  webSearchAvailable,
}: Props) {
  const { t } = useTranslation();
  const pathSeparator = getPathSeparator();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const optionsDialogRef = useRef<HTMLDialogElement>(null);
  const firstResultRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<'bookmarks' | 'web' | 'matches'>(
    'bookmarks',
  );
  const [matchFilter, setMatchFilter] = useState('');
  const [matchToolbarHost, setMatchToolbarHost] =
    useState<HTMLDivElement | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [resultActionBusy, setResultActionBusy] = useState(false);
  const [resultActionError, setResultActionError] = useState('');
  const [preferences, setPreferences] = useState(initialPreferences);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) {
      setMode('bookmarks');
      setMatchFilter('');
      setQuery('');
      setResultActionError('');
      setOptionsOpen(false);
    }
  }
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      setPreferences(initialPreferences);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [initialPreferences, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.documentElement.style.overflowY;
    document.documentElement.style.overflowY = 'hidden';
    return () => {
      document.documentElement.style.overflowY = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const dialog = optionsDialogRef.current;
    if (!dialog) return;
    if (optionsOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      requestAnimationFrame(() => {
        dialog
          .querySelector<HTMLElement>(
            '.search-options-window__content input:not(:disabled), .search-options-window__content select:not(:disabled)',
          )
          ?.focus();
      });
    } else if (!optionsOpen && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [optionsOpen]);

  const results = useMemo(
    () =>
      mode === 'bookmarks'
        ? searchBookmarks({
            activeProfileId,
            currentFolderId,
            preferences,
            query: deferredQuery,
            sources,
            pathSeparator,
          })
        : [],
    [
      activeProfileId,
      currentFolderId,
      deferredQuery,
      mode,
      preferences,
      sources,
      pathSeparator,
    ],
  );
  const groupByProfile = preferences.allProfiles && sources.length > 1;
  const groups = useMemo(() => {
    if (!groupByProfile) return [['', '', results] as const];
    // Display names can repeat; ownership and the Active badge depend on IDs.
    const grouped = new Map<string, BookmarkSearchResult[]>();
    for (const result of results)
      grouped.set(result.profileId, [
        ...(grouped.get(result.profileId) ?? []),
        result,
      ]);
    return [...grouped.entries()].map(
      ([profileId, items]) =>
        [profileId, items[0]?.profileName ?? '', items] as const,
    );
  }, [groupByProfile, results]);
  const normalizedQuery = query.trim();
  const resetTransientState = () => {
    setQuery('');
    setMatchFilter('');
    setOptionsOpen(false);
    setMode('bookmarks');
  };
  const closeSearch = () => {
    resetTransientState();
    onClose();
  };
  const closeOptions = () => {
    setOptionsOpen(false);
    requestAnimationFrame(() => optionsButtonRef.current?.focus());
  };
  return (
    <dialog
      aria-labelledby="search-window-title"
      className="search-window"
      onCancel={(event) => {
        event.preventDefault();
        closeSearch();
      }}
      ref={dialogRef}
    >
      <header className="search-window__header">
        <div>
          <div className="dialog-heading-with-badges">
            <h1 id="search-window-title">{t('searchWindow.title')}</h1>
            {isOpen && mode === 'matches' ? (
              <DialogBadges
                badges={urlMatchBadges}
                version={packageMetadata.version}
              />
            ) : null}
          </div>
          <p>{t('searchWindow.summary')}</p>
        </div>
        <button
          aria-label={t('searchWindow.close')}
          className="search-window__close"
          onClick={closeSearch}
          type="button"
        >
          <ClearIcon />
        </button>
      </header>

      <section className="search-window__controls">
        <div
          aria-label={t('searchWindow.modeLabel')}
          className="search-window__mode"
          role="group"
        >
          <button
            aria-pressed={mode === 'bookmarks'}
            onClick={() => setMode('bookmarks')}
            type="button"
          >
            {t('searchWindow.modes.bookmarks')}
          </button>
          <button
            aria-pressed={mode === 'web'}
            onClick={() => {
              if (webSearchAvailable) setMode('web');
              else onWebUnavailable();
            }}
            type="button"
          >
            {t('searchWindow.modes.web')}
          </button>
          <button
            aria-pressed={mode === 'matches'}
            onClick={() => setMode('matches')}
            type="button"
          >
            {t('urlMatches.title')}
          </button>
        </div>
        <div className="search-window__query-row">
          <label className="search-window__query">
            <span>{t('searchWindow.queryLabel')}</span>
            <ClearableInput
              aria-describedby="search-window-query-help"
              onChange={(event) =>
                mode === 'matches'
                  ? setMatchFilter(event.target.value)
                  : setQuery(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' && firstResultRef.current) {
                  event.preventDefault();
                  firstResultRef.current.focus();
                }
              }}
              placeholder={t(
                mode === 'matches'
                  ? 'urlMatches.filterPlaceholder'
                  : mode === 'web'
                    ? 'searchWindow.webPlaceholder'
                    : 'searchWindow.bookmarkPlaceholder',
              )}
              ref={inputRef}
              type="search"
              value={mode === 'matches' ? matchFilter : query}
            />
          </label>
          <div
            hidden={mode !== 'matches'}
            ref={setMatchToolbarHost}
            className="url-matches__toolbar"
          />
          {mode === 'bookmarks' ? (
            <button
              aria-controls="search-window-options"
              aria-expanded={optionsOpen}
              className="search-window__options-toggle"
              onClick={() => setOptionsOpen((open) => !open)}
              ref={optionsButtonRef}
              type="button"
            >
              {t('searchWindow.options.title')}
              <ChevronIcon
                className={optionsOpen ? 'search-window__chevron--open' : ''}
              />
            </button>
          ) : null}
        </div>
        <p className="search-window__query-help" id="search-window-query-help">
          {t(
            mode === 'matches'
              ? 'urlMatches.filterHelp'
              : 'searchWindow.queryHelp',
          )}
        </p>
      </section>

      <dialog
        aria-labelledby="search-options-title"
        className="search-options-window"
        id="search-window-options"
        onCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          closeOptions();
        }}
        ref={optionsDialogRef}
      >
        <header className="search-options-window__header">
          <h2 id="search-options-title">{t('searchWindow.options.title')}</h2>
          <button
            aria-label={t('searchWindow.options.close')}
            className="search-options-window__close"
            onClick={closeOptions}
            type="button"
          >
            <ClearIcon />
          </button>
        </header>
        <SearchOptions
          className="search-options-window__content"
          onChange={setPreferences}
          preferences={preferences}
          profileCount={sources.length}
        />
        <footer className="search-options-window__footer">
          <button onClick={closeOptions} type="button">
            {t('searchWindow.options.closeAction')}
          </button>
        </footer>
      </dialog>

      <section
        aria-live={mode === 'matches' ? undefined : 'polite'}
        className="search-window__results"
      >
        {isOpen ? (
          <UrlMatchesPanel
            subscribeChanges={onSubscribeUrlMatchChanges}
            toolbarHost={matchToolbarHost}
            active={mode === 'matches'}
            {...(onInspectUrlMatch ? { onInspect: onInspectUrlMatch } : {})}
            {...(onOpenUrlMatchFolder
              ? { onOpenFolder: onOpenUrlMatchFolder }
              : {})}
            {...(onDeleteUrlMatch ? { onDelete: onDeleteUrlMatch } : {})}
            {...(onCopyUrlMatchInfo ? { onCopyInfo: onCopyUrlMatchInfo } : {})}
            activeProfileId={activeProfileId}
            bookmarkOpening={bookmarkOpening}
            filter={matchFilter}
            loadSnapshot={
              onLoadUrlMatches ??
              (() =>
                Promise.reject(new Error('url-matches-loader-unavailable')))
            }
            onScan={onUrlMatchScan ?? (() => undefined)}
            onOpenResult={(result, opening) => {
              resetTransientState();
              return onOpenResult(result, opening);
            }}
          />
        ) : null}
        {resultActionError ? <p role="alert">{resultActionError}</p> : null}
        {mode === 'matches' ? null : normalizedQuery.length < 2 ? (
          <p className="search-window__empty">{t('searchWindow.typeMore')}</p>
        ) : mode === 'web' ? (
          <button
            className="search-window__web-suggestion"
            onClick={() => {
              resetTransientState();
              void onWebSearch(normalizedQuery);
            }}
            ref={firstResultRef}
            type="button"
          >
            <span aria-hidden="true" className="search-window__result-icon">
              <ContextMenuIcon name="search" />
            </span>
            <span>
              <strong>
                {t('searchWindow.searchWebFor', { query: normalizedQuery })}
              </strong>
              <small>
                {t(
                  `searchWindow.opening.${bookmarkOpening === 'new-tab' ? 'newTab' : 'currentTab'}`,
                )}
              </small>
            </span>
          </button>
        ) : isLoading ? (
          <p className="search-window__empty">{t('searchWindow.loading')}</p>
        ) : loadFailed ? (
          <p className="search-window__empty search-window__empty--error">
            {t('searchWindow.loadFailed')}
          </p>
        ) : results.length === 0 ? (
          <p className="search-window__empty">{t('searchWindow.noResults')}</p>
        ) : (
          <>
            <h2>{t('searchWindow.resultCount', { count: results.length })}</h2>
            {groups.map(([profileId, profileName, profileResults]) => (
              <section
                className="search-window__result-group"
                key={profileId || 'results'}
              >
                {profileName ? (
                  <h3>
                    <span>{profileName}</span>
                    {profileId === activeProfileId ? (
                      <span className="profile-status">
                        {t('profiles.active')}
                      </span>
                    ) : null}
                  </h3>
                ) : null}
                <ul>
                  {profileResults.map((result, index) => (
                    <li
                      className="search-window__result-row"
                      key={`${result.profileId}:${result.item.id}`}
                    >
                      <button
                        className="search-window__result"
                        disabled={resultActionBusy}
                        onClick={(event) => {
                          resetTransientState();
                          void onOpenResult(
                            result,
                            result.kind === 'bookmark'
                              ? resolveBookmarkClickOpening(
                                  bookmarkOpening,
                                  event,
                                )
                              : bookmarkOpening,
                          );
                        }}
                        ref={
                          index === 0 && profileId === groups[0]?.[0]
                            ? firstResultRef
                            : undefined
                        }
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          className="search-window__result-icon"
                        >
                          {result.kind === 'folder' ? (
                            <FolderIcon />
                          ) : (
                            <BookmarkIcon />
                          )}
                        </span>
                        <span className="search-window__result-copy">
                          <strong
                            id={`search-result-${result.profileId}-${result.item.id}`}
                          >
                            {result.item.title}
                          </strong>
                          {'url' in result.item ? (
                            <span>{result.item.url}</span>
                          ) : null}
                          <small>{result.parentPath}</small>
                        </span>
                        <span className="search-window__match-label">
                          {t(`searchWindow.fields.${result.matchedField}`)}
                        </span>
                      </button>
                      <div className="search-window__result-actions">
                        {onInspectResult ? (
                          <button
                            type="button"
                            disabled={resultActionBusy}
                            aria-label={t('urlMatches.getInfo')}
                            aria-describedby={`search-result-${result.profileId}-${result.item.id}`}
                            title={t('urlMatches.getInfo')}
                            onClick={async (event) => {
                              setResultActionBusy(true);
                              setResultActionError('');
                              try {
                                await onInspectResult(
                                  result,
                                  event.currentTarget,
                                );
                              } catch {
                                setResultActionError(
                                  t('searchWindow.infoFailed'),
                                );
                              } finally {
                                setResultActionBusy(false);
                              }
                            }}
                          >
                            <ContextMenuIcon name="info" />
                          </button>
                        ) : null}
                        {onOpenUrlMatchFolder ? (
                          <button
                            type="button"
                            disabled={resultActionBusy}
                            aria-label={t('searchWindow.openParentFolder')}
                            aria-describedby={`search-result-${result.profileId}-${result.item.id}`}
                            title={t('searchWindow.openParentFolder')}
                            onClick={async (event) => {
                              const trigger = event.currentTarget;
                              setResultActionBusy(true);
                              setResultActionError('');
                              try {
                                if (
                                  result.profileId !== activeProfileId &&
                                  !(await onConfirmResultProfileChange?.())
                                )
                                  return;
                                await onOpenUrlMatchFolder(
                                  result,
                                  'Search window',
                                );
                              } catch {
                                setResultActionError(
                                  t('searchWindow.resultOpenFailed'),
                                );
                              } finally {
                                setResultActionBusy(false);
                                requestAnimationFrame(() => {
                                  if (
                                    trigger.isConnected &&
                                    trigger.closest('dialog')?.open
                                  )
                                    trigger.focus();
                                });
                              }
                            }}
                          >
                            <ContextMenuIcon name="open" />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </section>
    </dialog>
  );
}
