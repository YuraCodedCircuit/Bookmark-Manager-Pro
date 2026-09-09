import { useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { useAnimatedSidePanel } from '../../components/side-panel/use-animated-side-panel';
import { FolderTreePicker } from './FolderTreePicker';
import type { FolderTreeNode } from './folder-tree-data';
import type { NavigationItem } from '../../application/bookmark/manage-bookmarks';
import { PinIcon } from '../../components/icons/PinIcon';
import { FolderIcon } from '../../components/icons/FolderIcon';
import { BookmarkIcon } from '../../components/icons/BookmarkIcon';

interface FolderTreePanelProps {
  isOpen: boolean;
  folderTree: FolderTreeNode;
  favorites: readonly NavigationItem[];
  recent: readonly NavigationItem[];
  onAfterClose: () => void;
  onClose: () => void;
  onSelect: (path: readonly string[], folderId: string) => void;
  onOpenItem: (item: NavigationItem) => void;
  onRemoveFavorite: (item: NavigationItem) => void;
}

export function FolderTreePanel({
  folderTree,
  favorites,
  isOpen,
  onAfterClose,
  onClose,
  onOpenItem,
  onRemoveFavorite,
  onSelect,
  recent,
}: FolderTreePanelProps) {
  const { t } = useTranslation();
  const filterInputRef = useRef<HTMLInputElement>(null);
  const firstShortcutRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useAnimatedSidePanel({
    closedTransform: 'translateX(-100%)',
    initialFocusRef:
      favorites.length > 0 || recent.length > 0
        ? firstShortcutRef
        : filterInputRef,
    isOpen,
    onAfterClose,
  });
  const closePanel = () => onClose();

  return (
    <dialog
      aria-label={t('folderTree.label')}
      className="side-panel folder-tree-panel"
      onCancel={(event) => {
        event.preventDefault();
        closePanel();
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target) {
          closePanel();
        }
      }}
      ref={dialogRef}
      tabIndex={-1}
    >
      <NavigationSection
        items={favorites}
        labelId="folder-tree-favorites-title"
        label={t('folderTree.favorites')}
        onOpenItem={onOpenItem}
        onRemoveFavorite={onRemoveFavorite}
        {...(favorites.length > 0 ? { firstItemRef: firstShortcutRef } : {})}
      />
      <NavigationSection
        items={recent}
        labelId="folder-tree-recent-title"
        label={t('folderTree.recent')}
        onOpenItem={onOpenItem}
        {...(favorites.length === 0 ? { firstItemRef: firstShortcutRef } : {})}
      />
      <FolderTreePicker
        filterInputRef={filterInputRef}
        folderTree={folderTree}
        idPrefix="navigation"
        onEscapeWithoutFilter={closePanel}
        onSelect={onSelect}
      />
    </dialog>
  );
}

function NavigationSection({
  items,
  firstItemRef,
  label,
  labelId,
  onOpenItem,
  onRemoveFavorite,
}: {
  items: readonly NavigationItem[];
  firstItemRef?: RefObject<HTMLButtonElement | null>;
  label: string;
  labelId: string;
  onOpenItem: (item: NavigationItem) => void;
  onRemoveFavorite?: (item: NavigationItem) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="folder-tree-shortcuts" aria-labelledby={labelId}>
      <h2 id={labelId}>{label}</h2>
      {items.length === 0 ? (
        <p>{t('folderTree.noShortcutItems')}</p>
      ) : (
        <ul>
          {items.map((item, index) => (
            <li key={`${item.kind}-${item.value.id}`}>
              <button
                className="folder-tree-shortcuts__open"
                onClick={() => onOpenItem(item)}
                ref={index === 0 ? firstItemRef : undefined}
                title={item.value.title}
                type="button"
              >
                {item.kind === 'folder' ? <FolderIcon /> : <BookmarkIcon />}
                <span>{item.value.title}</span>
              </button>
              {onRemoveFavorite ? (
                <button
                  aria-label={t('folderTree.removeFavorite', {
                    title: item.value.title,
                  })}
                  className="folder-tree-shortcuts__pin"
                  onClick={() => onRemoveFavorite(item)}
                  type="button"
                >
                  <PinIcon filled />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
