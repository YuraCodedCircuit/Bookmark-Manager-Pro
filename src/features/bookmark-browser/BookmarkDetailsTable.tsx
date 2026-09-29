import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';

import type { Bookmark } from '../../domain/bookmark';
import type { Folder } from '../../domain/folder';
import { appearanceStyle } from '../../shared/appearance-style';
import { formatDateTime } from '../../shared/date-time-format';
import type { DateTimeFormatPreference } from '../../shared/date-time-format';
import {
  defaultDetailsColumnOrder,
  detailsColumnOrderSchema,
  type DetailsColumn,
  type ProfileSettings,
} from '../../domain/profile-settings';
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
  columnOrder?: readonly DetailsColumn[];
  onColumnOrderChange?: (order: readonly DetailsColumn[]) => Promise<void>;
  showColumnOrderControls?: boolean;
  hideHeaderWhenEmpty?: boolean;
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
  columnOrder: requestedColumnOrder = defaultDetailsColumnOrder,
  onOpenFolder,
  onOpenBookmark,
  onColumnOrderChange,
  organization = {},
  showColumnOrderControls = false,
  hideHeaderWhenEmpty = true,
  transparency = 0,
}: BookmarkDetailsTableProps) {
  const { i18n, t } = useTranslation();
  const requestedOrder = useMemo(
    () => detailsColumnOrderSchema.parse(requestedColumnOrder),
    [requestedColumnOrder],
  );
  const [pendingColumnOrder, setPendingColumnOrder] = useState<
    | {
        base: readonly DetailsColumn[];
        order: readonly DetailsColumn[];
      }
    | undefined
  >();
  const columnOrder =
    pendingColumnOrder &&
    sameColumnOrder(requestedOrder, pendingColumnOrder.base)
      ? pendingColumnOrder.order
      : requestedOrder;
  const showHeader =
    bookmarks.length > 0 || folders.length > 0 || !hideHeaderWhenEmpty;
  const [selectedColumn, setSelectedColumn] = useState<DetailsColumn>('title');
  const [columnOrderStatus, setColumnOrderStatus] = useState('');
  const [isColumnOrderSaving, setIsColumnOrderSaving] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
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

  const saveColumnOrder = async (nextOrder: readonly DetailsColumn[]) => {
    const validatedOrder = detailsColumnOrderSchema.parse(nextOrder);
    setPendingColumnOrder({ base: requestedOrder, order: validatedOrder });
    setIsColumnOrderSaving(true);
    setColumnOrderStatus('');
    try {
      await onColumnOrderChange?.(validatedOrder);
      setColumnOrderStatus(t('bookmarks.details.columnOrderSaved'));
    } catch {
      setPendingColumnOrder((pending) =>
        pending && sameColumnOrder(pending.order, validatedOrder)
          ? undefined
          : pending,
      );
      setColumnOrderStatus(t('bookmarks.details.columnOrderSaveFailed'));
    } finally {
      setIsColumnOrderSaving(false);
    }
  };

  const moveColumn = (column: DetailsColumn, direction: -1 | 1) => {
    const currentIndex = columnOrder.indexOf(column);
    const destinationIndex = currentIndex + direction;
    if (
      isColumnOrderSaving ||
      currentIndex < 0 ||
      destinationIndex < 0 ||
      destinationIndex >= columnOrder.length
    )
      return;
    void saveColumnOrder(
      arrayMove([...columnOrder], currentIndex, destinationIndex),
    );
  };

  const handleColumnDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || isColumnOrderSaving) return;
    const currentIndex = columnOrder.indexOf(active.id as DetailsColumn);
    const destinationIndex = columnOrder.indexOf(over.id as DetailsColumn);
    if (currentIndex < 0 || destinationIndex < 0) return;
    void saveColumnOrder(
      arrayMove([...columnOrder], currentIndex, destinationIndex),
    );
  };

  const columnLabel = (column: DetailsColumn) =>
    t(`bookmarks.details.${column === 'updatedAt' ? 'dateModified' : column}`);

  const renderItemCell = (item: DetailsItem, column: DetailsColumn) => {
    if (column === 'appearance')
      return (
        <td key={column}>
          <span
            aria-hidden="true"
            className="bookmark-details-table__thumbnail"
            style={appearanceStyle(item.value.cardAppearance)}
          />
        </td>
      );
    if (column === 'title')
      return (
        <td key={column}>
          {item.kind === 'folder' ? (
            <button
              onClick={(event) => {
                if (folderOpening === 'single-click' || event.detail === 0)
                  onOpenFolder(item.value);
              }}
              onDoubleClick={() => {
                if (folderOpening === 'double-click') onOpenFolder(item.value);
              }}
              title={item.value.title}
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
              target={bookmarkOpening === 'new-tab' ? '_blank' : '_self'}
              title={item.value.title}
            >
              {item.value.title}
            </a>
          )}
        </td>
      );
    if (column === 'url')
      return (
        <td key={column}>
          {item.kind === 'bookmark' ? (
            <span title={item.value.url}>{item.value.url}</span>
          ) : (
            ''
          )}
        </td>
      );
    if (column === 'updatedAt')
      return (
        <td key={column}>
          {formatDateTime(item.value.updatedAt, dateTimeFormat, i18n.language)}
        </td>
      );
    return (
      <td key={column}>
        {t(
          item.kind === 'folder'
            ? 'bookmarks.folderType'
            : 'bookmarks.bookmarkType',
        )}
      </td>
    );
  };

  if (!showHeader) return null;

  return (
    <DndContext
      accessibility={{
        announcements: {
          onDragCancel: ({ active }) =>
            t('bookmarks.details.dragCancelled', {
              column: columnLabel(active.id as DetailsColumn),
            }),
          onDragEnd: ({ active, over }) =>
            over
              ? t('bookmarks.details.dragDropped', {
                  column: columnLabel(active.id as DetailsColumn),
                })
              : t('bookmarks.details.dragCancelled', {
                  column: columnLabel(active.id as DetailsColumn),
                }),
          onDragMove: () => undefined,
          onDragOver: ({ active, over }) =>
            over
              ? t('bookmarks.details.dragOver', {
                  column: columnLabel(active.id as DetailsColumn),
                  target: columnLabel(over.id as DetailsColumn),
                })
              : undefined,
          onDragStart: ({ active }) =>
            t('bookmarks.details.dragStarted', {
              column: columnLabel(active.id as DetailsColumn),
            }),
        },
        screenReaderInstructions: {
          draggable: t('bookmarks.details.dragInstructions'),
        },
      }}
      onDragEnd={handleColumnDragEnd}
      sensors={sensors}
    >
      <div
        aria-busy={isColumnOrderSaving}
        className="bookmark-details-table__scroller"
        style={
          {
            '--details-table-background-opacity': `${100 - transparency}%`,
            '--details-table-header-opacity': `${(100 - transparency) * 0.12}%`,
          } as React.CSSProperties
        }
      >
        {showColumnOrderControls ? (
          <div className="bookmark-details-table__column-controls">
            <label>
              <span>{t('bookmarks.details.selectedColumn')}</span>
              <select
                disabled={isColumnOrderSaving}
                onChange={(event) =>
                  setSelectedColumn(event.target.value as DetailsColumn)
                }
                value={selectedColumn}
              >
                {columnOrder.map((column) => (
                  <option key={column} value={column}>
                    {columnLabel(column)}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={
                isColumnOrderSaving || columnOrder.indexOf(selectedColumn) === 0
              }
              onClick={() => moveColumn(selectedColumn, -1)}
              type="button"
            >
              {t('bookmarks.details.moveLeft')}
            </button>
            <button
              disabled={
                isColumnOrderSaving ||
                columnOrder.indexOf(selectedColumn) === columnOrder.length - 1
              }
              onClick={() => moveColumn(selectedColumn, 1)}
              type="button"
            >
              {t('bookmarks.details.moveRight')}
            </button>
            <button
              disabled={
                isColumnOrderSaving ||
                columnOrder.every(
                  (column, index) =>
                    column === defaultDetailsColumnOrder[index],
                )
              }
              onClick={() => void saveColumnOrder(defaultDetailsColumnOrder)}
              type="button"
            >
              {t('bookmarks.details.resetColumnOrder')}
            </button>
          </div>
        ) : null}
        <p aria-live="polite" className="visually-hidden">
          {columnOrderStatus}
        </p>
        <table className="bookmark-details-table">
          <colgroup>
            {columnOrder.map((column) => (
              <col
                className={`bookmark-details-table__${column === 'appearance' ? 'appearance' : column === 'updatedAt' ? 'date' : column === 'type' ? 'type' : 'flexible'}-column`}
                key={column}
              />
            ))}
          </colgroup>
          {showHeader ? (
            <thead>
              <SortableContext
                items={[...columnOrder]}
                strategy={horizontalListSortingStrategy}
              >
                <tr>
                  {columnOrder.map((column) => (
                    <SortableHeader
                      column={column}
                      direction={
                        column !== 'appearance' && sort.key === column
                          ? sort.direction
                          : undefined
                      }
                      disabled={isColumnOrderSaving}
                      key={column}
                      label={columnLabel(column)}
                      reorderLabel={t('bookmarks.details.reorderColumn', {
                        column: columnLabel(column),
                      })}
                      onMove={(direction) => moveColumn(column, direction)}
                      onSort={
                        column === 'appearance'
                          ? undefined
                          : () => changeSort(column)
                      }
                    />
                  ))}
                </tr>
              </SortableContext>
            </thead>
          ) : null}
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
                  {columnOrder.map((column) => renderItemCell(item, column))}
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
    </DndContext>
  );
}

interface SortableHeaderProps {
  column: DetailsColumn;
  direction: SortDirection | undefined;
  disabled: boolean;
  label: string;
  onMove: (direction: -1 | 1) => void;
  onSort: (() => void) | undefined;
  reorderLabel: string;
}

/** Exposes table sort state to sighted and screen-reader users. */
function SortableHeader({
  column,
  direction,
  disabled,
  label,
  onMove,
  onSort,
  reorderLabel,
}: SortableHeaderProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ disabled, id: column });
  return (
    <th
      {...(onSort ? { 'aria-sort': direction ?? 'none' } : {})}
      ref={setNodeRef}
      scope="col"
      style={{
        transform: CSS.Transform.toString(
          transform ? { ...transform, scaleX: 1, scaleY: 1 } : null,
        ),
        transition,
      }}
    >
      <div className="bookmark-details-table__header-content">
        {onSort ? (
          <button
            className="bookmark-details-table__sort-button"
            onClick={onSort}
            type="button"
          >
            <span>{label}</span>
            <span
              aria-hidden="true"
              className="bookmark-details-table__sort-icon"
            >
              {direction === 'ascending'
                ? '↑'
                : direction === 'descending'
                  ? '↓'
                  : '↕'}
            </span>
          </button>
        ) : (
          <span className="visually-hidden">{label}</span>
        )}
        <button
          {...attributes}
          {...listeners}
          aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
          aria-label={reorderLabel}
          className="bookmark-details-table__drag-handle"
          disabled={disabled}
          onKeyDown={(event) => {
            if (!event.altKey) return;
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              onMove(-1);
            } else if (event.key === 'ArrowRight') {
              event.preventDefault();
              onMove(1);
            }
          }}
          type="button"
        >
          <span aria-hidden="true">::</span>
        </button>
      </div>
    </th>
  );
}

function sameColumnOrder(
  left: readonly DetailsColumn[],
  right: readonly DetailsColumn[],
): boolean {
  return left.every((column, index) => column === right[index]);
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
