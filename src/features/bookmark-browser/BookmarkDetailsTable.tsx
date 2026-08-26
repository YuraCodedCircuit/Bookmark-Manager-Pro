import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Bookmark } from '../../domain/bookmark';
import type { Folder } from '../../domain/folder';
import { appearanceStyle } from '../../shared/appearance-style';
import { formatDateTime } from '../../shared/date-time-format';
import type { DateTimeFormatPreference } from '../../shared/date-time-format';
import type { ProfileSettings } from '../../domain/profile-settings';
import { organizeBookmarkItems } from './organize-bookmark-items';

type SortDirection = 'ascending' | 'descending';
type SortKey =
  'createdAt' | 'domain' | 'index' | 'title' | 'url' | 'updatedAt' | 'type';
type DetailsItem =
  { kind: 'bookmark'; value: Bookmark } | { kind: 'folder'; value: Folder };

interface BookmarkDetailsTableProps {
  bookmarks: readonly Bookmark[];
  folders: readonly Folder[];
  bookmarkOpening?: 'current-tab' | 'new-tab';
  folderOpening?: 'single-click' | 'double-click';
  dateTimeFormat?: DateTimeFormatPreference;
  onOpenFolder: (folder: Folder) => void;
  onOpenBookmark?: (bookmark: Bookmark) => void;
  organization?: Pick<
    ProfileSettings,
    'bookmarkGroupBy' | 'bookmarkSortBy' | 'bookmarkSortDirection'
  >;
  transparency?: number;
}

/** Renders current-folder items as an accessible, locally sortable details table. */
export function BookmarkDetailsTable({
  bookmarks,
  folders,
  bookmarkOpening = 'current-tab',
  folderOpening = 'single-click',
  dateTimeFormat = 'browser',
  onOpenFolder,
  onOpenBookmark,
  organization = {},
  transparency = 0,
}: BookmarkDetailsTableProps) {
  const { i18n, t } = useTranslation();
  const [sort, setSort] = useState<{
    direction: SortDirection;
    key: SortKey;
  }>(() => ({
    direction: organization.bookmarkSortDirection ?? 'ascending',
    key:
      organization.bookmarkSortBy === 'manual'
        ? 'index'
        : (organization.bookmarkSortBy ?? 'index'),
  }));
  const collator = useMemo(
    () =>
      new Intl.Collator(i18n.language, { numeric: true, sensitivity: 'base' }),
    [i18n.language],
  );
  const groups = useMemo(
    () =>
      organizeBookmarkItems(bookmarks, folders, organization, i18n.language, {
        bookmarks: t('bookmarks.bookmarksGroup'),
        folders: t('bookmarks.foldersGroup'),
        noDomain: t('bookmarks.noDomainGroup'),
      }).map((group) => ({
        ...group,
        items: [...group.items].sort((left, right) => {
          const result = compareItems(left, right, sort.key, collator, t);
          return sort.direction === 'ascending' ? result : -result;
        }),
      })),
    [bookmarks, collator, folders, i18n.language, organization, sort, t],
  );

  const changeSort = (key: SortKey) => {
    setSort((current) => ({
      direction:
        current.key === key && current.direction === 'ascending'
          ? 'descending'
          : 'ascending',
      key,
    }));
  };

  return (
    <div
      className="bookmark-details-table__scroller"
      style={
        {
          '--details-table-background-opacity': `${100 - transparency}%`,
          '--details-table-header-opacity': `${(100 - transparency) * 0.12}%`,
        } as React.CSSProperties
      }
    >
      <table className="bookmark-details-table">
        <thead>
          <tr>
            <th className="bookmark-details-table__appearance" scope="col">
              <span className="visually-hidden">
                {t('bookmarks.details.appearance')}
              </span>
            </th>
            <SortableHeader
              direction={sort.key === 'title' ? sort.direction : undefined}
              label={t('bookmarks.details.title')}
              onSort={() => changeSort('title')}
            />
            <SortableHeader
              direction={sort.key === 'url' ? sort.direction : undefined}
              label={t('bookmarks.details.url')}
              onSort={() => changeSort('url')}
            />
            <SortableHeader
              direction={sort.key === 'updatedAt' ? sort.direction : undefined}
              label={t('bookmarks.details.dateModified')}
              onSort={() => changeSort('updatedAt')}
            />
            <SortableHeader
              direction={sort.key === 'type' ? sort.direction : undefined}
              label={t('bookmarks.details.type')}
              onSort={() => changeSort('type')}
            />
          </tr>
        </thead>
        <tbody>
          {groups.flatMap((group) => [
            ...(group.label
              ? [
                  <tr
                    className="bookmark-details-table__group"
                    key={`${group.key}-heading`}
                  >
                    <th colSpan={5} scope="rowgroup">
                      {group.label}
                    </th>
                  </tr>,
                ]
              : []),
            ...group.items.map((item) => (
              <tr
                data-context-menu="bookmark"
                data-item-id={item.value.id}
                data-item-kind={item.kind}
                key={item.value.id}
                tabIndex={-1}
              >
                <td>
                  <span
                    aria-hidden="true"
                    className="bookmark-details-table__thumbnail"
                    style={appearanceStyle(item.value.cardAppearance)}
                  />
                </td>
                <td>
                  {item.kind === 'folder' ? (
                    <button
                      onClick={(event) => {
                        if (
                          folderOpening === 'single-click' ||
                          event.detail === 0
                        )
                          onOpenFolder(item.value);
                      }}
                      onDoubleClick={() => {
                        if (folderOpening === 'double-click')
                          onOpenFolder(item.value);
                      }}
                      type="button"
                    >
                      {item.value.title}
                    </button>
                  ) : (
                    <a
                      href={item.value.url}
                      onClick={(event) => {
                        if (!onOpenBookmark) return;
                        event.preventDefault();
                        onOpenBookmark(item.value);
                      }}
                      rel="noreferrer"
                      target={
                        bookmarkOpening === 'new-tab' ? '_blank' : '_self'
                      }
                    >
                      {item.value.title}
                    </a>
                  )}
                </td>
                <td>{item.kind === 'bookmark' ? item.value.url : ''}</td>
                <td>
                  {formatDateTime(
                    item.value.updatedAt,
                    dateTimeFormat,
                    i18n.language,
                  )}
                </td>
                <td>
                  {t(
                    item.kind === 'folder'
                      ? 'bookmarks.folderType'
                      : 'bookmarks.bookmarkType',
                  )}
                </td>
              </tr>
            )),
          ])}
        </tbody>
      </table>
    </div>
  );
}

interface SortableHeaderProps {
  direction: SortDirection | undefined;
  label: string;
  onSort: () => void;
}

/** Exposes table sort state to sighted and screen-reader users. */
function SortableHeader({ direction, label, onSort }: SortableHeaderProps) {
  return (
    <th aria-sort={direction ?? 'none'} scope="col">
      <button onClick={onSort} type="button">
        <span>{label}</span>
        <span aria-hidden="true" className="bookmark-details-table__sort-icon">
          {direction === 'ascending'
            ? '↑'
            : direction === 'descending'
              ? '↓'
              : '↕'}
        </span>
      </button>
    </th>
  );
}

function compareItems(
  left: DetailsItem,
  right: DetailsItem,
  key: SortKey,
  collator: Intl.Collator,
  translate: (key: string) => string,
): number {
  if (key === 'index') return left.value.index - right.value.index;
  if (key === 'createdAt') return left.value.createdAt - right.value.createdAt;
  if (key === 'updatedAt') return left.value.updatedAt - right.value.updatedAt;
  if (key === 'domain') {
    return collator.compare(
      left.kind === 'bookmark' ? new URL(left.value.url).hostname : '',
      right.kind === 'bookmark' ? new URL(right.value.url).hostname : '',
    );
  }
  if (key === 'url') {
    return collator.compare(
      left.kind === 'bookmark' ? left.value.url : '',
      right.kind === 'bookmark' ? right.value.url : '',
    );
  }
  if (key === 'type') {
    return collator.compare(
      translate(
        left.kind === 'folder'
          ? 'bookmarks.folderType'
          : 'bookmarks.bookmarkType',
      ),
      translate(
        right.kind === 'folder'
          ? 'bookmarks.folderType'
          : 'bookmarks.bookmarkType',
      ),
    );
  }
  return collator.compare(left.value.title, right.value.title);
}
