import { ImportFooter } from './ImportFooter';
import { ImportCounts } from './ImportCounts';
import { ImportFilter } from './ImportFilter';
import { ImportFilename } from './ImportFilename';
import type { CsvColumn } from '../../domain/csv-export';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfileListItem } from '../../application/profile/profile-management-repository';
import type { ImportValidationEvent } from '../../application/import/native-import-session';
import type { FolderTreeSummary } from '../../domain/folder';
import {
  includedPortableItems,
  type PortableImportItem,
} from '../../domain/portable-import';

import { FolderIcon } from '../../components/icons/FolderIcon';
import { BookmarkIcon } from '../../components/icons/BookmarkIcon';
import { ProfileIcon } from '../../components/icons/ProfileIcon';
import { NoteIcon } from '../../components/icons/NoteIcon';
import { ChevronIcon } from '../../components/icons/ChevronIcon';
import { FolderTreePicker } from '../folder-tree/FolderTreePicker';
import {
  buildFolderTree,
  type FolderTreeNode,
} from '../folder-tree/folder-tree-data';
import { ImportChild } from './ImportChild';
import {
  defaultImportPreferences,
  type ImportPreferences,
} from '../../domain/profile-settings';

/** Read-only destination access. Selection never activates or writes to another profile. */
export interface ImportDestinations {
  activeProfileId: string;
  loadProfiles: () => Promise<readonly ProfileListItem[]>;
  loadFolders: (profileId: string) => Promise<readonly FolderTreeSummary[]>;
}

/** Presents verified portable hierarchy, destination selection, and reversible item exclusion. */
export function PortableImportPanel({
  items: sourceItems,
  destinations,
  report,
  preferences = defaultImportPreferences,
  format = 'json',
  csvColumns = [],
  onSummaryChange,
  onSelectionChange,
}: {
  items: PortableImportItem[];
  destinations: ImportDestinations;
  report: (event: ImportValidationEvent) => void;
  format?: 'json' | 'html' | 'csv';
  csvColumns?: CsvColumn[];
  preferences?: ImportPreferences;
  onSummaryChange?: (counts: { bookmarks: number; folders: number }) => void;
  onSelectionChange?: (
    selection: {
      profileId: string;
      folderId: string;
      selected: string[];
    } | null,
  ) => void;
}) {
  const { t } = useTranslation();
  const items = sourceItems;
  const callbacks = useRef({ destinations, report });
  useEffect(() => {
    callbacks.current = { destinations, report };
  }, [destinations, report]);
  const [profiles, setProfiles] = useState<readonly ProfileListItem[]>([]);
  const [profileId, setProfileId] = useState(destinations.activeProfileId);
  const [tree, setTree] = useState<FolderTreeNode | null>(null);
  const [folder, setFolder] = useState<{ id: string; path: string } | null>(
    null,
  );
  const [profileLoading, setProfileLoading] = useState(true);
  const [folderLoading, setFolderLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [folderError, setFolderError] = useState(false);
  const [rememberedMissing, setRememberedMissing] = useState(false);
  const [profileRetry, setProfileRetry] = useState(0);
  const [folderRetry, setFolderRetry] = useState(0);
  const [child, setChild] = useState<'profile' | 'folder' | 'review' | null>(
    preferences.autoOpenReview ? 'review' : null,
  );
  const [selected, setSelected] = useState(
    () => new Set(items.map((item) => item.id)),
  );
  const profileButton = useRef<HTMLButtonElement>(null);
  const folderButton = useRef<HTMLButtonElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);

  const restore = useRef<'profile' | 'folder' | 'review' | null>(null);
  useEffect(() => {
    if (child !== null || restore.current === null) return;
    const button =
      restore.current === 'profile'
        ? profileButton
        : restore.current === 'folder'
          ? folderButton
          : reviewButton;
    restore.current = null;
    button.current?.focus();
  }, [child]);
  const close = () => {
    restore.current = child;
    setChild(null);
  };
  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => callbacks.current.destinations.loadProfiles())
      .then((value) => {
        if (!active) return;
        setProfiles(value);
        setProfileLoading(false);
      })
      .catch(() => {
        if (active) {
          setProfileLoading(false);
          setProfileError(true);
          callbacks.current.report({
            level: 'ERROR',
            code: 'import.destination.failed',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [profileRetry]);
  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => callbacks.current.destinations.loadFolders(profileId))
      .then((value) => {
        if (!active) return;
        if (value.some((item) => item.profileId !== profileId))
          throw new Error('import-destination-profile-mismatch');
        if (value.length && !value.some((item) => item.isRoot))
          throw new Error('import-destination-root-missing');
        // Unopened profiles have no stored root yet. This preview-only ID must
        // be resolved to a real Home folder by the writer, never persisted.
        const next = value.length
          ? buildFolderTree(value)
          : {
              id: `import-home:${profileId}`,
              name: t('import.emptyDestinationHome'),
            };
        setTree(next);
        const remembered = preferences.rememberDestination
          ? preferences.rememberedFolders[profileId]
          : undefined;
        const saved = remembered
          ? value.find((item) => item.id === remembered)
          : undefined;
        setRememberedMissing(Boolean(remembered && !saved));
        if (remembered && !saved) {
          setFolder(null);
          callbacks.current.report({
            level: 'WARN',
            code: 'import.destination.missing',
          });
        } else if (saved) setFolder({ id: saved.id, path: saved.title });
        else setFolder({ id: next.id, path: next.name });
        setFolderLoading(false);
      })
      .catch(() => {
        if (active) {
          setFolderLoading(false);
          setFolderError(true);
          callbacks.current.report({
            level: 'ERROR',
            code: 'import.destination.failed',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [
    profileId,
    folderRetry,
    preferences.rememberDestination,
    preferences.rememberedFolders,
    t,
  ]);
  const included = useMemo(
    () => includedPortableItems(items, selected),
    [items, selected],
  );
  useEffect(() => {
    onSelectionChange?.(
      folder &&
        !profileLoading &&
        !folderLoading &&
        !profileError &&
        !folderError
        ? { profileId, folderId: folder.id, selected: [...selected] }
        : null,
    );
  }, [
    onSelectionChange,
    folder,
    profileId,
    selected,
    profileLoading,
    folderLoading,
    profileError,
    folderError,
  ]);
  const counts = {
    bookmarks: included.filter((item) => item.kind === 'bookmark').length,
    folders: included.filter((item) => item.kind === 'folder').length,
  };
  useEffect(() => {
    onSummaryChange?.({ bookmarks: counts.bookmarks, folders: counts.folders });
  }, [onSummaryChange, counts.bookmarks, counts.folders]);
  const profileName =
    profiles.find((item) => item.profile.id === profileId)?.profile.username ??
    t('import.selectDestinationProfile');
  return (
    <>
      <section
        className="export-dialog__section"
        aria-labelledby="import-destination-heading"
      >
        <h2 id="import-destination-heading">
          <span aria-hidden="true">2.</span> {t('import.destination')}
        </h2>
        <span
          className="import-dialog__destination-label"
          id="import-destination-profile-label"
        >
          {t('import.profileLabel')}
        </span>
        <button
          ref={profileButton}
          className="export-dialog__profile-button"
          type="button"
          aria-label={t('import.destinationProfile')}
          aria-haspopup="dialog"
          disabled={profileLoading || profileError}
          onClick={() => setChild('profile')}
        >
          <span className="import-dialog__icon">
            <ProfileIcon />
          </span>
          <span title={profileName}>
            {profileLoading ? t('import.loadingDestinations') : profileName}
          </span>
          <ChevronIcon />
        </button>
        {profileError ? (
          <div role="alert">
            <p>{t('import.destinationFailed')}</p>
            <button
              type="button"
              onClick={() => {
                setProfileLoading(true);
                setProfileError(false);
                setProfileRetry((value) => value + 1);
              }}
            >
              {t('export.retry')}
            </button>
          </div>
        ) : null}
        <span
          className="import-dialog__destination-label"
          id="import-destination-folder-label"
        >
          {t('import.folderLabel')}
        </span>
        <button
          ref={folderButton}
          className="export-dialog__profile-button"
          type="button"
          aria-label={t('import.destinationFolder')}
          aria-haspopup="dialog"
          disabled={folderLoading || folderError || !tree}
          onClick={() => setChild('folder')}
        >
          <span className="import-dialog__icon">
            <FolderIcon />
          </span>
          <span title={folder?.path}>
            {folderLoading
              ? t('import.loadingDestinations')
              : (folder?.path ?? t('import.selectDestinationFolder'))}
          </span>
          <ChevronIcon />
        </button>
        {rememberedMissing ? (
          <p role="status">{t('import.destinationMissing')}</p>
        ) : null}
        {folderError ? (
          <div role="alert">
            <p>{t('import.destinationFailed')}</p>
            <button
              type="button"
              onClick={() => {
                setFolderLoading(true);
                setFolderError(false);
                setFolderRetry((value) => value + 1);
              }}
            >
              {t('export.retry')}
            </button>
          </div>
        ) : null}
      </section>
      <section
        className="export-dialog__section import-dialog__review"
        aria-labelledby="import-portable-review-heading"
      >
        <h2 id="import-portable-review-heading">
          <span aria-hidden="true">3.</span> {t('import.review')}
        </h2>
        <div className="import-dialog__summary">
          <span className="import-dialog__icon">
            <NoteIcon />
          </span>
          <strong>
            <ImportCounts {...counts} />
          </strong>
          <button
            ref={reviewButton}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setChild('review')}
          >
            {t('import.reviewAction')}
          </button>
        </div>
        <div className="import-dialog__notes">
          <p className="export-dialog__hint">{t('import.optionalReview')}</p>
          <p className="export-dialog__hint">{t('import.portableDefaults')}</p>
        </div>
      </section>

      {child === 'profile' ? (
        <DestinationProfiles
          profiles={profiles}
          selected={profileId}
          onChange={(id) => {
            if (id === profileId) return;
            setFolderLoading(true);
            setFolderError(false);
            setProfileId(id);
            setFolder(null);
            setTree(null);
          }}
          onClose={close}
        />
      ) : null}
      {child === 'folder' && tree ? (
        <ImportChild
          title={t('import.selectDestinationFolder')}
          description={t('import.foldersIn', { name: profileName })}
          onClose={close}
        >
          <div className="import-child__body import-destination-tree">
            <FolderTreePicker
              folderTree={tree}
              idPrefix="import-destination"
              {...(folder ? { selectedFolderId: folder.id } : {})}
              onSelect={(path, id) => {
                setFolder({ id, path: path.join(' / ') });
                setRememberedMissing(false);
              }}
            />
          </div>
          <ImportFooter>
            <p className="export-profile-picker__count" title={folder?.path}>
              {folder?.path ?? ''}
            </p>
            <button type="button" onClick={close}>
              {t('import.done')}
            </button>
          </ImportFooter>
        </ImportChild>
      ) : null}
      {child === 'review' ? (
        <ImportedItemReview
          items={items}
          format={format}
          csvColumns={csvColumns}
          selected={selected}
          onChange={setSelected}
          onClose={close}
        />
      ) : null}
    </>
  );
}

function DestinationProfiles({
  profiles,
  selected,
  onChange,
  onClose,
}: {
  profiles: readonly ProfileListItem[];
  selected: string;
  onChange: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const visible = profiles.filter((item) =>
    item.profile.username
      .toLocaleLowerCase()
      .includes(filter.trim().toLocaleLowerCase()),
  );
  return (
    <ImportChild title={t('import.selectDestinationProfile')} onClose={onClose}>
      <div className="import-child__body">
        <ImportFilter
          label={t('import.filterProfiles')}
          value={filter}
          onChange={setFilter}
        />
        <div className="export-profile-picker__list">
          <fieldset className="import-profile-group">
            <legend className="visually-hidden">
              {t('import.selectDestinationProfile')}
            </legend>
            {visible.map(
              ({ profile, isActive, bookmarkCount, folderCount }) => (
                <label
                  className="settings-checkbox-row export-profile-picker__row"
                  key={profile.id}
                >
                  <input
                    type="radio"
                    aria-label={profile.username}
                    name="import-destination-profile"
                    checked={selected === profile.id}
                    onChange={() => onChange(profile.id)}
                  />
                  <span className="import-profile-avatar">
                    <ProfileIcon />
                  </span>
                  <span className="export-profile-picker__identity">
                    <strong>{profile.username}</strong>
                    <span className="export-profile-picker__meta">
                      <ImportCounts
                        bookmarks={bookmarkCount}
                        folders={folderCount}
                      />
                    </span>
                  </span>
                  {isActive ? (
                    <small className="profile-status">
                      {t('profiles.active')}
                    </small>
                  ) : null}
                </label>
              ),
            )}
            {!visible.length ? (
              <p className="folder-tree__empty" role="status">
                {t('import.noMatches')}
              </p>
            ) : null}
          </fieldset>
        </div>
      </div>
      <ImportFooter>
        <p className="export-profile-picker__count">
          <ImportFilename
            name={t('import.destinationSelection', {
              name:
                profiles.find((item) => item.profile.id === selected)?.profile
                  .username ?? '',
            })}
          />
        </p>
        <button type="button" onClick={onClose}>
          {t('import.done')}
        </button>
      </ImportFooter>
    </ImportChild>
  );
}

function ImportedItemReview({
  items,
  format,
  csvColumns,
  selected,
  onChange,
  onClose,
}: {
  items: PortableImportItem[];
  format: 'json' | 'html' | 'csv';
  csvColumns: CsvColumn[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const tableColumns: CsvColumn[] = csvColumns.length ? csvColumns : ['title'];
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(
    () =>
      new Set(
        items.filter((item) => item.kind === 'folder').map((item) => item.id),
      ),
  );
  const children = useMemo(() => {
    const map = new Map<string | null, PortableImportItem[]>();
    for (const item of items) {
      const rows = map.get(item.parentId) ?? [];
      rows.push(item);
      map.set(item.parentId, rows);
    }
    for (const rows of map.values())
      rows.sort((a, b) => a.index - b.index || a.id.localeCompare(b.id));
    return map;
  }, [items]);
  const byId = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const visible = useMemo(() => {
    if (!filter.trim()) return new Set(items.map((item) => item.id));
    const ids = new Set<string>();
    for (const item of items)
      if (
        (format === 'csv'
          ? Object.values(item.csvValues ?? { title: item.title })
          : [item.title]
        ).some((value) =>
          value.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase()),
        )
      ) {
        let current: PortableImportItem | undefined = item;
        while (current && !ids.has(current.id)) {
          ids.add(current.id);
          current = current.parentId ? byId.get(current.parentId) : undefined;
        }
      }
    return ids;
  }, [items, filter, byId, format]);
  const descendants = (id: string) => {
    const ids = [id];
    for (let i = 0; i < ids.length; i++)
      for (const item of children.get(ids[i]!) ?? []) ids.push(item.id);
    return ids;
  };
  const included = useMemo(
    () => includedPortableItems(items, selected),
    [items, selected],
  );
  const ordered = useMemo(() => {
    const rows: { item: PortableImportItem; depth: number }[] = [];
    const stack = (children.get(null) ?? [])
      .map((item) => ({ item, depth: 0 }))
      .reverse();
    while (stack.length) {
      const row = stack.pop()!;
      rows.push(row);
      const nested = children.get(row.item.id) ?? [];
      for (let i = nested.length - 1; i >= 0; i--)
        stack.push({ item: nested[i]!, depth: row.depth + 1 });
    }
    return rows;
  }, [children]);
  const statistics = useMemo(() => {
    const stats = new Map<string, { total: number; selected: number }>();
    for (let i = ordered.length - 1; i >= 0; i--) {
      const item = ordered[i]!.item;
      const current = stats.get(item.id) ?? { total: 0, selected: 0 };
      current.total++;
      current.selected += Number(selected.has(item.id));
      stats.set(item.id, current);
      if (item.parentId) {
        const parent = stats.get(item.parentId) ?? { total: 0, selected: 0 };
        parent.total += current.total;
        parent.selected += current.selected;
        stats.set(item.parentId, parent);
      }
    }
    return stats;
  }, [ordered, selected]);
  const reviewRows = useMemo(() => {
    const rows: typeof ordered = [];
    let hiddenBelow = Infinity;
    for (const row of ordered) {
      if (row.depth > hiddenBelow) continue;
      hiddenBelow = Infinity;
      if (!visible.has(row.item.id)) continue;
      rows.push(row);
      if (!filter.trim() && !expanded.has(row.item.id)) hiddenBelow = row.depth;
    }
    return rows;
  }, [ordered, visible, filter, expanded]);
  const pageSize = 200;
  const pageCount = Math.max(1, Math.ceil(reviewRows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = reviewRows.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const renderRows = () => (
    <ul className="import-review-list">
      {pageRows.map(({ item, depth }) => {
        const stats = statistics.get(item.id)!;
        const count = stats.selected;
        const open = Boolean(filter.trim()) || expanded.has(item.id);
        const nested = children.has(item.id);
        return (
          <li
            key={item.id}
            className="folder-tree__item"
            style={{ marginInlineStart: `${Math.min(depth, 6) * 1.15}rem` }}
          >
            <div className="folder-tree__row import-review-row">
              {nested ? (
                <button
                  className="folder-tree__toggle"
                  type="button"
                  aria-label={t(
                    open ? 'import.collapseItem' : 'import.expandItem',
                    { title: item.title },
                  )}
                  aria-expanded={open}
                  disabled={Boolean(filter.trim())}
                  onClick={() =>
                    setExpanded((value) => {
                      const next = new Set(value);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })
                  }
                >
                  <ChevronIcon data-expanded={open} />
                </button>
              ) : (
                <span
                  className="folder-tree__toggle-spacer"
                  aria-hidden="true"
                />
              )}
              <label className="settings-checkbox-row folder-tree__folder">
                <input
                  type="checkbox"
                  checked={count === stats.total}
                  aria-description={t('import.itemLevel', { level: depth + 1 })}
                  ref={(node) => {
                    if (node)
                      node.indeterminate = count > 0 && count < stats.total;
                  }}
                  onChange={(event) => {
                    const next = new Set(selected);
                    for (const id of descendants(item.id)) {
                      if (event.target.checked) next.add(id);
                      else next.delete(id);
                    }
                    onChange(next);
                  }}
                />
                {item.kind === 'folder' ? <FolderIcon /> : <BookmarkIcon />}
                <span title={item.title}>{item.title}</span>
              </label>
            </div>
          </li>
        );
      })}
    </ul>
  );
  return (
    <ImportChild
      title={t('import.reviewItems')}
      description={t(
        format === 'csv' ? 'import.reviewCsvHelp' : 'import.reviewModalHelp',
      )}
      wide={format === 'csv'}
      onClose={onClose}
    >
      <div className="import-child__body">
        <ImportFilter
          label={t('import.filterItems')}
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(0);
          }}
        />
        <div className="import-review-scroll">
          {format === 'csv' ? (
            <table className="import-review-table">
              <caption className="visually-hidden">
                {t('import.reviewItems')}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t('import.includeItem')}</th>
                  {tableColumns.map((column) => (
                    <th scope="col" key={column}>
                      {t('displaySettings.exportSettings.labels.' + column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map(({ item }) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={item.title}
                        checked={selected.has(item.id)}
                        onChange={(event) => {
                          const next = new Set(selected);
                          if (event.target.checked) next.add(item.id);
                          else next.delete(item.id);
                          onChange(next);
                        }}
                      />
                    </td>
                    {tableColumns.map((column) => (
                      <td key={column}>
                        {item.csvValues?.[column] ??
                          (column === 'title' ? item.title : '')}
                      </td>
                    ))}
                  </tr>
                ))}
                {!visible.size ? (
                  <tr>
                    <td colSpan={tableColumns.length + 1}>
                      <p className="folder-tree__empty" role="status">
                        {t('import.noMatchingItems')}
                      </p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : visible.size ? (
            <div className="folder-tree import-review-tree">{renderRows()}</div>
          ) : (
            <p className="folder-tree__empty" role="status">
              {t('import.noMatchingItems')}
            </p>
          )}
        </div>
        {pageCount > 1 ? (
          <nav
            className="import-review-pages"
            aria-label={t('import.reviewPages')}
          >
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              {t('import.previousPage')}
            </button>
            <span role="status">
              {t('import.pageStatus', {
                page: currentPage + 1,
                count: pageCount,
              })}
            </span>
            <button
              type="button"
              disabled={currentPage === pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              {t('import.nextPage')}
            </button>
          </nav>
        ) : null}
      </div>
      <ImportFooter>
        <p
          className="export-profile-picker__count"
          role="status"
          aria-label={t('import.selectionStatus')}
        >
          <ImportCounts
            bookmarks={
              included.filter((item) => item.kind === 'bookmark').length
            }
            folders={included.filter((item) => item.kind === 'folder').length}
          />
        </p>
        <button type="button" onClick={onClose}>
          {t('import.done')}
        </button>
      </ImportFooter>
    </ImportChild>
  );
}
