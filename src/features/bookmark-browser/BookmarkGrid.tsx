import {
  cloneElement,
  Fragment,
  type HTMLAttributes,
  type ReactElement,
  type Ref,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Modifier,
} from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';

import { BookmarkCard } from './BookmarkCard';
import { BookmarkDetailsTable } from './BookmarkDetailsTable';
import type { Bookmark } from '../../domain/bookmark';
import type { Folder } from '../../domain/folder';
import type { ProfileSettings } from '../../domain/profile-settings';
import { appearanceStyle } from '../../shared/appearance-style';
import { organizeBookmarkItems } from './organize-bookmark-items';
import {
  resolveDropZone,
  resolveReorderIndex,
  resolveTargetRatio,
  isSameVisiblePositionDrop,
} from './drag-drop-intent';

type DropIntent = {
  kind: 'after' | 'before' | 'inside';
  targetId: string;
};

interface BookmarkGridProps {
  bookmarks: readonly Bookmark[];
  contentRef: Ref<HTMLElement>;
  folders: readonly Folder[];
  bookmarkOpening?: NonNullable<ProfileSettings['bookmarkOpening']>;
  folderOpening?: NonNullable<ProfileSettings['folderOpening']>;
  interactionLocked?: boolean;
  onOpenFolder: (folder: Folder) => void;
  onOpenBookmark?: (bookmark: Bookmark) => void;
  requestConfirmation?: (
    message: string,
    action: 'move' | 'open',
  ) => Promise<boolean>;
  onMoveItem?: (input: {
    destinationIndex: number;
    destinationParentId: string;
    itemId: string;
    onValidated: () => void;
    openDestination: boolean;
  }) => Promise<void>;
  currentFolderId?: string | undefined;
  view: Pick<
    ProfileSettings,
    | 'bookmarkView'
    | 'cardSize'
    | 'bookmarkSortBy'
    | 'bookmarkSortDirection'
    | 'bookmarkGroupBy'
  > & {
    cardSpacing?: NonNullable<ProfileSettings['cardSpacing']>;
    dateTimeFormat?: NonNullable<ProfileSettings['dateTimeFormat']>;
    detailsTableTransparency?: number;
    confirmFolderDrop?: boolean | undefined;
    dragAndDropEnabled?: boolean | undefined;
    dropIntoFoldersEnabled?: boolean | undefined;
    folderDropHoverDelay?: 400 | 600 | 900 | undefined;
    openFolderAfterDrop?: boolean | undefined;
    faviconDisplay?: 'available' | 'initials' | undefined;
    missingFavicon?: 'built-in' | 'initials' | 'none' | undefined;
    folderIcon?: 'initials' | 'none' | undefined;
  };
}

export function BookmarkGrid({
  bookmarks,
  contentRef,
  folders,
  bookmarkOpening = 'current-tab',
  folderOpening = 'single-click',
  interactionLocked = false,
  onOpenFolder,
  onOpenBookmark,
  onMoveItem,
  requestConfirmation = async () => false,
  currentFolderId,
  view,
}: BookmarkGridProps) {
  const { i18n, t } = useTranslation();
  const groups = organizeBookmarkItems(
    bookmarks,
    folders,
    view,
    i18n.language,
    {
      bookmarks: t('bookmarks.bookmarksGroup'),
      folders: t('bookmarks.foldersGroup'),
      noDomain: t('bookmarks.noDomainGroup'),
    },
  );
  const visiblePositions = new Map(
    groups.flatMap((group) =>
      group.items.map(
        (item, position) =>
          [item.value.id, { groupKey: group.key, position }] as const,
      ),
    ),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const hoverTimer = useRef<number | undefined>(undefined);
  const hoveredFolderId = useRef<string | undefined>(undefined);
  const dropIntentRef = useRef<DropIntent | undefined>(undefined);
  const keyboardDrag = useRef(false);
  const pointerX = useRef<number | undefined>(undefined);
  const [activeItemId, setActiveItemId] = useState<string>();
  const [dropIntent, setDropIntentState] = useState<DropIntent>();
  const [movePending, setMovePending] = useState(false);

  const setDropIntent = (intent: DropIntent | undefined) => {
    if (
      dropIntentRef.current?.kind === intent?.kind &&
      dropIntentRef.current?.targetId === intent?.targetId
    )
      return;
    dropIntentRef.current = intent;
    setDropIntentState(intent);
  };

  const resetDragState = () => {
    window.clearTimeout(hoverTimer.current);
    hoveredFolderId.current = undefined;
    keyboardDrag.current = false;
    pointerX.current = undefined;
    setActiveItemId(undefined);
    setDropIntent(undefined);
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (movePending) return;
    keyboardDrag.current = event.activatorEvent instanceof KeyboardEvent;
    pointerX.current = readClientX(event.activatorEvent);
    setActiveItemId(String(event.active.id));
    setDropIntent(undefined);
  };

  const handleDragOver = (event: DragMoveEvent | DragOverEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : undefined;
    const over = event.over;
    const manualReordering = (view.bookmarkSortBy ?? 'manual') === 'manual';
    if (!over || !overId || activeId === overId) {
      window.clearTimeout(hoverTimer.current);
      hoveredFolderId.current = undefined;
      setDropIntent(undefined);
      return;
    }

    const folderTarget = over.data.current?.kind === 'folder';
    const translatedRect = event.active.rect.current.translated;
    const targetX =
      !keyboardDrag.current && pointerX.current !== undefined
        ? pointerX.current
        : translatedRect
          ? translatedRect.left + translatedRect.width / 2
          : over.rect.left + over.rect.width / 2;
    const pointerRatio = resolveTargetRatio(
      targetX,
      over.rect.left,
      over.rect.width,
    );
    const zone = resolveDropZone(pointerRatio, folderTarget);
    const movingItem = [...folders, ...bookmarks].find(
      (item) => item.id === activeId,
    );
    const targetItem = [...folders, ...bookmarks].find(
      (item) => item.id === overId,
    );
    const movingPosition = visiblePositions.get(activeId);
    const targetPosition = visiblePositions.get(overId);

    if (
      zone !== 'inside' ||
      !folderTarget ||
      !(view.dropIntoFoldersEnabled ?? true)
    ) {
      window.clearTimeout(hoverTimer.current);
      hoveredFolderId.current = undefined;
      setDropIntent(
        manualReordering &&
          zone !== 'inside' &&
          movingItem &&
          targetItem &&
          movingPosition &&
          targetPosition &&
          movingPosition.groupKey === targetPosition.groupKey &&
          !isSameVisiblePositionDrop(
            movingPosition.position,
            targetPosition.position,
            zone,
          )
          ? { kind: zone, targetId: overId }
          : undefined,
      );
      return;
    }

    if (keyboardDrag.current) {
      setDropIntent({ kind: 'inside', targetId: overId });
      return;
    }
    if (hoveredFolderId.current === overId) return;
    window.clearTimeout(hoverTimer.current);
    hoveredFolderId.current = overId;
    setDropIntent(undefined);
    hoverTimer.current = window.setTimeout(
      () => setDropIntent({ kind: 'inside', targetId: overId }),
      view.folderDropHoverDelay ?? 600,
    );
  };

  useEffect(() => {
    if (!activeItemId || keyboardDrag.current) return;
    const trackPointer = (event: PointerEvent) => {
      pointerX.current = event.clientX;
    };
    const trackTouch = (event: TouchEvent) => {
      pointerX.current = event.touches.item(0)?.clientX;
    };
    window.addEventListener('pointermove', trackPointer, {
      capture: true,
      passive: true,
    });
    window.addEventListener('touchmove', trackTouch, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener('pointermove', trackPointer, true);
      window.removeEventListener('touchmove', trackTouch, true);
    };
  }, [activeItemId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    window.clearTimeout(hoverTimer.current);
    const activeId = String(event.active.id);
    const intent = dropIntentRef.current;
    if (
      !intent ||
      !onMoveItem ||
      !currentFolderId ||
      activeId === intent.targetId
    ) {
      resetDragState();
      return;
    }
    if (intent.kind === 'inside') {
      if (
        view.confirmFolderDrop &&
        !(await requestConfirmation(t('bookmarks.moveConfirm'), 'move'))
      ) {
        resetDragState();
        return;
      }
      await onMoveItem({
        destinationIndex: Number.MAX_SAFE_INTEGER,
        destinationParentId: intent.targetId,
        itemId: activeId,
        onValidated: () => {
          setMovePending(true);
          resetDragState();
        },
        openDestination: view.openFolderAfterDrop ?? false,
      });
    } else if ((view.bookmarkSortBy ?? 'manual') === 'manual') {
      const target = [...folders, ...bookmarks].find(
        (item) => item.id === intent.targetId,
      );
      const movingItem = [...folders, ...bookmarks].find(
        (item) => item.id === activeId,
      );
      if (target && movingItem)
        await onMoveItem({
          destinationIndex: resolveReorderIndex(
            movingItem.index,
            target.index,
            intent.kind,
          ),
          destinationParentId: currentFolderId,
          itemId: activeId,
          onValidated: () => {
            setMovePending(true);
            resetDragState();
          },
          openDestination: false,
        });
    }
    setMovePending(false);
    resetDragState();
  };

  if (view.bookmarkView === 'details') {
    return (
      <section
        aria-busy={movePending}
        aria-keyshortcuts="Shift+F10"
        aria-label={t('bookmarks.label')}
        className="bookmark-grid bookmark-grid--details"
        ref={contentRef}
        tabIndex={0}
      >
        <BookmarkDetailsTable
          bookmarks={bookmarks}
          key={`${view.bookmarkSortBy ?? 'manual'}:${view.bookmarkSortDirection ?? 'ascending'}:${view.bookmarkGroupBy ?? 'none'}`}
          transparency={view.detailsTableTransparency ?? 0}
          folders={folders}
          bookmarkOpening={bookmarkOpening}
          folderOpening={folderOpening}
          dateTimeFormat={view.dateTimeFormat ?? 'browser'}
          onOpenFolder={onOpenFolder}
          {...(onOpenBookmark ? { onOpenBookmark } : {})}
          organization={view}
        />
      </section>
    );
  }

  const content = (
    <section
      aria-busy={movePending}
      aria-keyshortcuts="Shift+F10"
      aria-label={t('bookmarks.label')}
      className={`bookmark-grid bookmark-grid--${view.bookmarkView} bookmark-grid--${view.cardSize} bookmark-grid--spacing-${view.cardSpacing ?? 'comfortable'}`}
      ref={contentRef}
      tabIndex={0}
    >
      {groups.map((group) => (
        <Fragment key={group.key}>
          {group.label ? (
            <h2 className="bookmark-grid__group-heading">{group.label}</h2>
          ) : null}
          {group.items.map((item) =>
            item.kind === 'folder' ? (
              <DraggableItem
                enabled={
                  (view.dragAndDropEnabled ?? true) &&
                  !interactionLocked &&
                  !movePending
                }
                id={item.value.id}
                insertionEdge={
                  dropIntent?.targetId === item.value.id &&
                  dropIntent.kind !== 'inside'
                    ? dropIntent.kind
                    : undefined
                }
                isDragging={activeItemId === item.value.id}
                isDropTarget={
                  dropIntent?.targetId === item.value.id &&
                  dropIntent.kind === 'inside'
                }
                kind="folder"
                key={item.value.id}
              >
                <button
                  className="bookmark-card bookmark-card--folder"
                  data-context-menu="bookmark"
                  data-item-id={item.value.id}
                  data-item-kind="folder"
                  key={item.value.id}
                  onClick={(event) => {
                    if (folderOpening === 'single-click' || event.detail === 0)
                      onOpenFolder(item.value);
                  }}
                  onDoubleClick={() => {
                    if (folderOpening === 'double-click')
                      onOpenFolder(item.value);
                  }}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="bookmark-card__media"
                    style={appearanceStyle(item.value.cardAppearance)}
                  />
                  <span
                    className={`bookmark-card__details${view.folderIcon === 'none' ? ' bookmark-card__details--without-icon' : ''}`}
                  >
                    {view.folderIcon !== 'none' ? (
                      <span
                        aria-hidden="true"
                        className="bookmark-card__favicon"
                      >
                        {item.value.title.slice(0, 2).toUpperCase()}
                      </span>
                    ) : null}
                    <span className="bookmark-card__copy">
                      <strong>{item.value.title}</strong>
                      <span>{t('bookmarks.folderType')}</span>
                    </span>
                  </span>
                </button>
              </DraggableItem>
            ) : (
              <DraggableItem
                enabled={
                  (view.dragAndDropEnabled ?? true) &&
                  !interactionLocked &&
                  !movePending
                }
                id={item.value.id}
                insertionEdge={
                  dropIntent?.targetId === item.value.id &&
                  dropIntent.kind !== 'inside'
                    ? dropIntent.kind
                    : undefined
                }
                isDragging={activeItemId === item.value.id}
                kind="bookmark"
                key={item.value.id}
              >
                <BookmarkCard
                  bookmark={item.value}
                  faviconDisplay={view.faviconDisplay}
                  key={item.value.id}
                  missingFavicon={view.missingFavicon}
                  opening={bookmarkOpening}
                  {...(onOpenBookmark ? { onOpen: onOpenBookmark } : {})}
                />
              </DraggableItem>
            ),
          )}
        </Fragment>
      ))}
    </section>
  );
  if (!(view.dragAndDropEnabled ?? true) || !onMoveItem) return content;
  return (
    <DndContext
      modifiers={[restrictToContentPanel]}
      onDragCancel={resetDragState}
      onDragEnd={(event) =>
        void handleDragEnd(event).catch(() => {
          setMovePending(false);
          resetDragState();
        })
      }
      onDragMove={handleDragOver}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      {content}
      <DragOverlay dropAnimation={null} modifiers={[restrictToContentPanel]}>
        {activeItemId ? (
          <DragPreview
            bookmark={bookmarks.find((item) => item.id === activeItemId)}
            folder={folders.find((item) => item.id === activeItemId)}
            opening={bookmarkOpening}
            view={view}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DraggableItem({
  children,
  enabled,
  id,
  insertionEdge,
  isDragging = false,
  isDropTarget = false,
  kind,
}: {
  children: ReactElement<HTMLAttributes<HTMLElement>>;
  enabled: boolean;
  id: string;
  insertionEdge?: 'after' | 'before' | undefined;
  isDragging?: boolean;
  isDropTarget?: boolean;
  kind: 'bookmark' | 'folder';
}) {
  const draggable = useDraggable({ data: { kind }, disabled: !enabled, id });
  const droppable = useDroppable({ data: { kind }, disabled: !enabled, id });
  const setNodeRef = (node: HTMLElement | null) => {
    draggable.setNodeRef(node);
    droppable.setNodeRef(node);
  };
  const { role: dragRole, ...dragAttributes } = draggable.attributes;
  void dragRole;
  return (
    <div
      className={`bookmark-drag-item${isDragging ? ' bookmark-drag-item--dragging' : ''}${isDropTarget ? ' bookmark-drag-item--destination' : ''}${insertionEdge ? ` bookmark-drag-item--insert-${insertionEdge}` : ''}`}
      ref={setNodeRef}
      role="group"
    >
      {cloneElement(children, {
        ...dragAttributes,
        ...draggable.listeners,
        ref: draggable.setActivatorNodeRef,
      } as HTMLAttributes<HTMLElement> & { ref: Ref<HTMLElement> })}
    </div>
  );
}

function DragPreview({
  bookmark,
  folder,
  opening,
  view,
}: {
  bookmark?: Bookmark | undefined;
  folder?: Folder | undefined;
  opening: 'current-tab' | 'new-tab';
  view: Pick<
    ProfileSettings,
    'faviconDisplay' | 'folderIcon' | 'missingFavicon'
  >;
}) {
  const { t } = useTranslation();
  if (bookmark)
    return (
      <div aria-hidden="true" className="bookmark-drag-overlay">
        <BookmarkCard
          bookmark={bookmark}
          faviconDisplay={view.faviconDisplay}
          missingFavicon={view.missingFavicon}
          opening={opening}
        />
      </div>
    );
  if (!folder) return null;
  return (
    <div aria-hidden="true" className="bookmark-drag-overlay">
      <div className="bookmark-card bookmark-card--folder">
        <span
          aria-hidden="true"
          className="bookmark-card__media"
          style={appearanceStyle(folder.cardAppearance)}
        />
        <span
          className={`bookmark-card__details${view.folderIcon === 'none' ? ' bookmark-card__details--without-icon' : ''}`}
        >
          {view.folderIcon !== 'none' ? (
            <span aria-hidden="true" className="bookmark-card__favicon">
              {folder.title.slice(0, 2).toUpperCase()}
            </span>
          ) : null}
          <span className="bookmark-card__copy">
            <strong>{folder.title}</strong>
            <span>{t('bookmarks.folderType')}</span>
          </span>
        </span>
      </div>
    </div>
  );
}

/** Keeps the transformed item fully inside the rendered bookmark content panel. */
const restrictToContentPanel: Modifier = ({
  containerNodeRect,
  draggingNodeRect,
  transform,
}) => {
  if (!containerNodeRect || !draggingNodeRect) return transform;
  return {
    ...transform,
    x: Math.min(
      Math.max(transform.x, containerNodeRect.left - draggingNodeRect.left),
      containerNodeRect.right - draggingNodeRect.right,
    ),
    y: Math.min(
      Math.max(transform.y, containerNodeRect.top - draggingNodeRect.top),
      containerNodeRect.bottom - draggingNodeRect.bottom,
    ),
  };
};

/** Reads the starting horizontal coordinate for mouse, pen, and touch drags. */
function readClientX(event: Event): number | undefined {
  if ('clientX' in event && typeof event.clientX === 'number')
    return event.clientX;
  if ('touches' in event) {
    const touchList = event.touches as TouchList;
    return touchList.item(0)?.clientX;
  }
  return undefined;
}
