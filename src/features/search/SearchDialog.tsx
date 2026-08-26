import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BookmarkIcon } from '../../components/icons/BookmarkIcon';
import { ChevronIcon } from '../../components/icons/ChevronIcon';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { FolderIcon } from '../../components/icons/FolderIcon';
import { ContextMenuIcon } from '../context-menu/ContextMenuIcon';
import { SearchOptions } from './SearchOptions';
import {
  searchBookmarks,
  type BookmarkSearchResult,
  type SearchPreferences,
  type SearchProfileSource,
} from '../../domain/bookmark-search';

interface Props {
  activeProfileId: string;
  bookmarkOpening: 'current-tab' | 'new-tab';
  currentFolderId: string;
  initialPreferences: SearchPreferences;
  isLoading: boolean;
  isOpen: boolean;
  loadFailed: boolean;
  onClose(): void;
  onOpenResult(result: BookmarkSearchResult): void | Promise<void>;
  onWebSearch(query: string): Promise<void>;
  onWebUnavailable(): void;
  sources: readonly SearchProfileSource[];
  webSearchAvailable: boolean;
}

/** Presents local search and an API-only web-search action suggestion. */
export function SearchDialog({
  activeProfileId,
  bookmarkOpening,
  currentFolderId,
  initialPreferences,
  isLoading,
  isOpen,
  loadFailed,
  onClose,
  onOpenResult,
  onWebSearch,
  onWebUnavailable,
  sources,
  webSearchAvailable,
}: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const firstResultRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<'bookmarks' | 'web'>('bookmarks');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [preferences, setPreferences] = useState(initialPreferences);
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

  const results = useMemo(
    () =>
      mode === 'bookmarks'
        ? searchBookmarks({
            activeProfileId,
            currentFolderId,
            preferences,
            query: deferredQuery,
            sources,
          })
        : [],
    [
      activeProfileId,
      currentFolderId,
      deferredQuery,
      mode,
      preferences,
      sources,
    ],
  );
  const groupByProfile = preferences.allProfiles && sources.length > 1;
  const groups = useMemo(() => {
    if (!groupByProfile) return [['', results] as const];
    const grouped = new Map<string, BookmarkSearchResult[]>();
    for (const result of results)
      grouped.set(result.profileName, [
        ...(grouped.get(result.profileName) ?? []),
        result,
      ]);
    return [...grouped.entries()];
  }, [groupByProfile, results]);
  const normalizedQuery = query.trim();
  const resetTransientState = () => {
    setQuery('');
    setOptionsOpen(false);
    setMode('bookmarks');
  };
  const closeSearch = () => {
    resetTransientState();
    onClose();
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
          <h1 id="search-window-title">{t('searchWindow.title')}</h1>
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
        </div>
        <div className="search-window__query-row">
          <label className="search-window__query">
            <span>{t('searchWindow.queryLabel')}</span>
            <input
              aria-describedby="search-window-query-help"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' && firstResultRef.current) {
                  event.preventDefault();
                  firstResultRef.current.focus();
                }
              }}
              placeholder={t(
                mode === 'web'
                  ? 'searchWindow.webPlaceholder'
                  : 'searchWindow.bookmarkPlaceholder',
              )}
              ref={inputRef}
              type="search"
              value={query}
            />
          </label>
          {mode === 'bookmarks' ? (
            <button
              aria-controls="search-window-options"
              aria-expanded={optionsOpen}
              className="search-window__options-toggle"
              onClick={() => setOptionsOpen((open) => !open)}
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
          {t('searchWindow.queryHelp')}
        </p>
      </section>

      {mode === 'bookmarks' && optionsOpen ? (
        <SearchOptions
          className="search-window__options"
          onChange={setPreferences}
          preferences={preferences}
          profileCount={sources.length}
        />
      ) : null}

      <section aria-live="polite" className="search-window__results">
        {normalizedQuery.length < 2 ? (
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
            {groups.map(([profileName, profileResults]) => (
              <section
                className="search-window__result-group"
                key={profileName || 'results'}
              >
                {profileName ? <h3>{profileName}</h3> : null}
                <ul>
                  {profileResults.map((result, index) => (
                    <li key={`${result.profileId}:${result.item.id}`}>
                      <button
                        className="search-window__result"
                        onClick={() => {
                          resetTransientState();
                          void onOpenResult(result);
                        }}
                        ref={
                          index === 0 && profileName === groups[0]?.[0]
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
                          <strong>{result.item.title}</strong>
                          {'url' in result.item ? (
                            <span>{result.item.url}</span>
                          ) : null}
                          <small>{result.parentPath}</small>
                        </span>
                        <span className="search-window__match-label">
                          {t(`searchWindow.fields.${result.matchedField}`)}
                        </span>
                      </button>
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
