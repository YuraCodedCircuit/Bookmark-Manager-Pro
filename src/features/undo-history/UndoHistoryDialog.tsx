import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useTranslation } from 'react-i18next';

import { BookmarkIcon } from '../../components/icons/BookmarkIcon';
import { ChevronIcon } from '../../components/icons/ChevronIcon';
import { ClearIcon } from '../../components/icons/ClearIcon';
import { FolderIcon } from '../../components/icons/FolderIcon';
import type { UndoHistoryService } from '../../application/undo-history/undo-history-service';
import type { UndoHistoryEntry } from '../../domain/undo-history';
import {
  formatDateTime,
  type DateTimeFormatPreference,
} from '../../shared/date-time-format';

interface Props {
  dateTimeFormat?: DateTimeFormatPreference;
  isOpen: boolean;
  onClose(): void;
  onHistoryChanged(): void | Promise<void>;
  onHistoryClearCompleted(): void | Promise<void>;
  onHistoryClearFailed(): void;
  onOperationCompleted(
    direction: 'redo' | 'undo',
    itemType: 'bookmark' | 'folder',
  ): void | Promise<void>;
  onOperationFailed(direction: 'redo' | 'undo'): void;
  profileId: string;
  requestClearConfirmation(): Promise<boolean>;
  service: UndoHistoryService;
}

/** Presents searchable, profile-isolated operations owned by the session service. */
export function UndoHistoryDialog({
  dateTimeFormat = 'browser',
  isOpen,
  onClose,
  onHistoryChanged,
  onHistoryClearCompleted,
  onHistoryClearFailed,
  onOperationCompleted,
  onOperationFailed,
  profileId,
  requestClearConfirmation,
  service,
}: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grouped' | 'timeline'>('timeline');
  const [availability, setAvailability] = useState('all');
  const [itemType, setItemType] = useState('all');
  const [action, setAction] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const historyState = useSyncExternalStore(
    service.store.subscribe,
    service.store.getState,
    service.store.getInitialState,
  );

  const clearHistory = async () => {
    try {
      if (!(await requestClearConfirmation())) return;
      await service.clear(profileId);
      await onHistoryClearCompleted();
    } catch {
      onHistoryClearFailed();
    }
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      searchRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.documentElement.style.overflowY;
    document.documentElement.style.overflowY = 'hidden';
    return () => {
      document.documentElement.style.overflowY = previousOverflow;
    };
  }, [isOpen]);

  const entries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = historyState.entries
      .filter((entry) => entry.profileId === profileId)
      .filter((entry) => {
        const searchableText =
          `${entryTitle(entry, t)} ${t(`undoHistory.actions.${entry.action}`)}`.toLocaleLowerCase();
        return (
          (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
          (availability === 'all' || entry.status === availability) &&
          (itemType === 'all' || entry.itemType === itemType) &&
          (action === 'all' || entry.action === action)
        );
      });
    const chronological = [...filtered].sort((left, right) =>
      sort === 'newest'
        ? right.createdAt - left.createdAt
        : left.createdAt - right.createdAt,
    );
    return chronological;
  }, [
    action,
    availability,
    historyState.entries,
    itemType,
    profileId,
    query,
    sort,
    t,
  ]);

  const groups = useMemo(() => {
    const grouped = new Map<string, UndoHistoryEntry[]>();
    for (const entry of entries)
      grouped.set(entry.itemId, [...(grouped.get(entry.itemId) ?? []), entry]);
    return [...grouped.entries()];
  }, [entries]);
  const timelineEntries = useMemo(
    () => groups.flatMap(([, itemEntries]) => itemEntries),
    [groups],
  );
  const hasProfileHistory = historyState.entries.some(
    (entry) => entry.profileId === profileId,
  );

  const runHistoryOperation = async (entry: UndoHistoryEntry) => {
    const direction = entry.status === 'redo' ? 'redo' : 'undo';
    try {
      if (direction === 'redo') await service.redo(profileId, entry.id);
      else await service.undo(profileId, entry.id);
      await onHistoryChanged();
      await onOperationCompleted(direction, entry.itemType);
    } catch {
      onOperationFailed(direction);
    }
  };

  const renderEntry = (
    entry: UndoHistoryEntry,
    index: number,
    itemEntries: readonly UndoHistoryEntry[],
  ) => {
    const context = entryContext(entry);
    const connector = connectorPosition(index, itemEntries.length);
    return (
      <li
        className={`undo-history__entry undo-history__entry--connector-${connector}`}
        data-item-id={entry.itemId}
        key={entry.id}
      >
        <span aria-hidden="true" className="undo-history__item-icon">
          {entry.itemType === 'folder' ? <FolderIcon /> : <BookmarkIcon />}
        </span>
        <span className="undo-history__entry-copy">
          <strong title={entryTitle(entry, t)}>{entryTitle(entry, t)}</strong>
          <span
            className="undo-history__entry-context"
            title={context.fullText}
          >
            {t(`undoHistory.actions.${entry.action}`)}
            {context.parts.map((part) => (
              <span className="undo-history__context-part" key={part}>
                <span aria-hidden="true"> · </span>
                {part}
              </span>
            ))}
          </span>
        </span>
        <time dateTime={new Date(entry.createdAt).toISOString()}>
          {formatDateTime(entry.createdAt, dateTimeFormat)}
        </time>
        <span
          className={`undo-history__status undo-history__status--${entry.status}`}
        >
          {t(`undoHistory.status.${entry.status}`)}
        </span>
        <button
          className="profile-button"
          disabled={
            historyState.busy ||
            entry.status === 'unavailable' ||
            !service.canApply(
              profileId,
              entry.id,
              entry.status === 'redo' ? 'redo' : 'undo',
            )
          }
          onClick={() => void runHistoryOperation(entry)}
          type="button"
        >
          {t(
            `undoHistory.commands.${entry.status === 'redo' ? 'redo' : 'undo'}`,
          )}
        </button>
      </li>
    );
  };

  return (
    <dialog
      aria-labelledby="undo-history-title"
      className="profile-window undo-history-window"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <section className="undo-history__top">
        <header className="profile-window__header">
          <div>
            <h1 id="undo-history-title">{t('undoHistory.title')}</h1>
            <p>{t('undoHistory.summary')}</p>
          </div>
          <button
            aria-label={t('undoHistory.close')}
            onClick={onClose}
            type="button"
          >
            <ClearIcon />
          </button>
        </header>
        <div className="undo-history__search-row">
          <label>
            <span>{t('undoHistory.search')}</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('undoHistory.searchPlaceholder')}
              ref={searchRef}
              type="search"
              value={query}
            />
          </label>
          <button
            aria-expanded={filtersOpen}
            aria-controls="undo-history-options"
            className="profile-button undo-history__filter-toggle"
            onClick={() => setFiltersOpen((open) => !open)}
            type="button"
          >
            {t('undoHistory.filters')}
            <ChevronIcon
              className={filtersOpen ? 'undo-history__chevron--open' : ''}
            />
          </button>
        </div>
        {filtersOpen ? (
          <div className="undo-history__options" id="undo-history-options">
            <label>
              <span>{t('undoHistory.options.view')}</span>
              <select
                value={view}
                onChange={(event) => setView(event.target.value as typeof view)}
              >
                <option value="timeline">
                  {t('undoHistory.options.timeline')}
                </option>
                <option value="grouped">
                  {t('undoHistory.options.grouped')}
                </option>
              </select>
            </label>
            <label>
              <span>{t('undoHistory.options.show')}</span>
              <select
                value={availability}
                onChange={(event) => setAvailability(event.target.value)}
              >
                <option value="all">{t('undoHistory.options.all')}</option>
                <option value="undo">{t('undoHistory.status.undo')}</option>
                <option value="redo">{t('undoHistory.status.redo')}</option>
                <option value="unavailable">
                  {t('undoHistory.status.unavailable')}
                </option>
              </select>
            </label>
            <label>
              <span>{t('undoHistory.options.itemType')}</span>
              <select
                value={itemType}
                onChange={(event) => setItemType(event.target.value)}
              >
                <option value="all">{t('undoHistory.options.allTypes')}</option>
                <option value="bookmark">
                  {t('undoHistory.options.bookmarks')}
                </option>
                <option value="folder">
                  {t('undoHistory.options.folders')}
                </option>
              </select>
            </label>
            <label>
              <span>{t('undoHistory.options.action')}</span>
              <select
                value={action}
                onChange={(event) => setAction(event.target.value)}
              >
                <option value="all">
                  {t('undoHistory.options.allActions')}
                </option>
                <option value="created">
                  {t('undoHistory.actions.created')}
                </option>
                <option value="deleted">
                  {t('undoHistory.actions.deleted')}
                </option>
                <option value="edited">
                  {t('undoHistory.actions.edited')}
                </option>
                <option value="favorite">
                  {t('undoHistory.actions.favorite')}
                </option>
                <option value="moved">{t('undoHistory.actions.moved')}</option>
                <option value="styled">
                  {t('undoHistory.actions.styled')}
                </option>
              </select>
            </label>
            <label>
              <span>{t('undoHistory.options.sort')}</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as typeof sort)}
              >
                <option value="newest">
                  {t('undoHistory.options.newest')}
                </option>
                <option value="oldest">
                  {t('undoHistory.options.oldest')}
                </option>
              </select>
            </label>
          </div>
        ) : null}
      </section>

      <section
        aria-label={t('undoHistory.listLabel')}
        className="undo-history__list"
      >
        {entries.length ? (
          view === 'timeline' ? (
            <ol className="undo-history__timeline">
              {timelineEntries.map((entry) => {
                const itemEntries = groups.find(
                  ([itemId]) => itemId === entry.itemId,
                )![1];
                return renderEntry(
                  entry,
                  itemEntries.indexOf(entry),
                  itemEntries,
                );
              })}
            </ol>
          ) : (
            <div className="undo-history__groups">
              {groups.map(([itemId, itemEntries]) => (
                <details key={itemId} open>
                  <summary>
                    {entryTitle(itemEntries[0]!, t)}
                    <span>{itemEntries.length}</span>
                  </summary>
                  <ol>
                    {itemEntries.map((entry, index) =>
                      renderEntry(entry, index, itemEntries),
                    )}
                  </ol>
                </details>
              ))}
            </div>
          )
        ) : (
          <div className="undo-history__empty" role="status">
            <strong>
              {t(
                hasProfileHistory
                  ? 'undoHistory.emptyTitle'
                  : 'undoHistory.noHistoryTitle',
              )}
            </strong>
            <span>
              {t(
                hasProfileHistory
                  ? 'undoHistory.emptyMessage'
                  : 'undoHistory.noHistoryMessage',
              )}
            </span>
          </div>
        )}
      </section>

      <footer className="undo-history__footer">
        <span>{t('undoHistory.sessionCount', { count: entries.length })}</span>
        <div className="undo-history__footer-actions">
          <button
            className="profile-button undo-history__clear"
            disabled={historyState.busy || entries.length === 0}
            onClick={clearHistory}
            type="button"
          >
            {t('undoHistory.clearAll')}
          </button>
          <button
            className="profile-button profile-button--primary"
            onClick={onClose}
            type="button"
          >
            {t('undoHistory.closeButton')}
          </button>
        </div>
      </footer>
    </dialog>
  );
}

function connectorPosition(
  index: number,
  count: number,
): 'end' | 'middle' | 'single' | 'start' {
  if (count === 1) return 'single';
  if (index === 0) return 'start';
  if (index === count - 1) return 'end';
  return 'middle';
}

function entryContext(entry: UndoHistoryEntry): {
  fullText: string;
  parts: string[];
} {
  if (entry.parentTitle || entry.siteHostname) {
    const parts = [entry.parentTitle, entry.siteHostname].filter(
      (part): part is string => Boolean(part),
    );
    return { fullText: parts.join(' · '), parts };
  }
  const itemCollection =
    entry.itemType === 'bookmark' ? 'bookmarks' : 'folders';
  const afterItem = entry.after[itemCollection].find(
    ({ id }) => id === entry.itemId,
  );
  const beforeItem = entry.before[itemCollection].find(
    ({ id }) => id === entry.itemId,
  );
  const item = afterItem ?? beforeItem;
  if (!item) return { fullText: '', parts: [] };

  const preferredFolders = afterItem
    ? entry.after.folders
    : entry.before.folders;
  const parentTitle = item.parentId
    ? (
        preferredFolders.find(({ id }) => id === item.parentId) ??
        [...entry.after.folders, ...entry.before.folders].find(
          ({ id }) => id === item.parentId,
        )
      )?.title
    : undefined;
  const hostname = 'url' in item ? safeHostname(item.url) : undefined;
  const parts = [parentTitle, hostname].filter((part): part is string =>
    Boolean(part),
  );
  return { fullText: parts.join(' · '), parts };
}

function safeHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname || undefined;
  } catch {
    return undefined;
  }
}

function entryTitle(
  entry: UndoHistoryEntry,
  t: (key: string) => string,
): string {
  const candidates =
    entry.itemType === 'bookmark'
      ? [...entry.after.bookmarks, ...entry.before.bookmarks]
      : [...entry.after.folders, ...entry.before.folders];
  return (
    candidates.find(({ id }) => id === entry.itemId)?.title ??
    t(`undoHistory.itemTypes.${entry.itemType}`)
  );
}
