import { animate } from 'motion/mini';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ContextMenuIcon, type ContextMenuIconName } from './ContextMenuIcon';
import type { Bookmark } from '../../domain/bookmark';
import type { Folder } from '../../domain/folder';
import { prefersReducedMotion } from '../../shared/use-prefers-reduced-motion';

export type ContextMenuKind = 'bookmark' | 'empty-area';

export interface ContextMenuRequest {
  kind: ContextMenuKind;
  target?:
    { kind: 'bookmark'; value: Bookmark } | { kind: 'folder'; value: Folder };
  x: number;
  y: number;
}

interface ContextMenuProps {
  disabledKeys?: ReadonlySet<string>;
  isTargetFavorite?: boolean;
  onAction?: (key: string) => void;
  onClose: () => void;
  request: ContextMenuRequest;
}

interface MenuItem {
  icon: ContextMenuIconName;
  key: string;
  shortcut?: string;
  tone?: 'danger';
}

const noDisabledItems = new Set<string>();

const bookmarkGroups: readonly (readonly MenuItem[])[] = [
  [
    { icon: 'open', key: 'open' },
    { icon: 'open-new', key: 'openNewTab' },
  ],
  [
    { icon: 'edit', key: 'edit' },
    { icon: 'copy', key: 'copy', shortcut: 'Ctrl+C' },
    { icon: 'duplicate', key: 'duplicate' },
    { icon: 'cut', key: 'cut', shortcut: 'Ctrl+X' },
  ],
  [
    { icon: 'pin', key: 'favorite' },
    { icon: 'info', key: 'info' },
    { icon: 'delete', key: 'delete', tone: 'danger' },
  ],
];

const emptyAreaGroups: readonly (readonly MenuItem[])[] = [
  [
    { icon: 'bookmark-add', key: 'newBookmark' },
    { icon: 'folder-add', key: 'newFolder' },
  ],
  [
    { icon: 'paste', key: 'paste', shortcut: 'Ctrl+V' },
    { icon: 'folder-style', key: 'customizeFolderStyle' },
  ],
  [{ icon: 'search', key: 'search', shortcut: 'Ctrl+F' }],
];

export function ContextMenu({
  disabledKeys = noDisabledItems,
  isTargetFavorite = false,
  onAction,
  onClose,
  request,
}: ContextMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const groups = request.kind === 'bookmark' ? bookmarkGroups : emptyAreaGroups;

  useLayoutEffect(() => {
    const menu = menuRef.current;

    if (!menu) {
      return;
    }

    const viewportGutter = 8;
    const bounds = menu.getBoundingClientRect();
    const left = Math.min(
      Math.max(viewportGutter, request.x),
      window.innerWidth - bounds.width - viewportGutter,
    );
    const top = Math.min(
      Math.max(viewportGutter, request.y),
      window.innerHeight - bounds.height - viewportGutter,
    );

    menu.style.left = `${Math.max(viewportGutter, left)}px`;
    menu.style.top = `${Math.max(viewportGutter, top)}px`;
    menu.style.visibility = 'visible';
    menu
      .querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
      ?.focus();

    if (!prefersReducedMotion() && typeof menu.animate === 'function') {
      animate(
        menu,
        { opacity: [0, 1], transform: ['scale(0.97)', 'scale(1)'] },
        { duration: 0.12, ease: 'easeOut' },
      );
    }
  }, [request]);

  useEffect(() => {
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };
    const closeOnViewportChange = () => onClose();

    document.addEventListener('pointerdown', closeOnPointerDown);
    window.addEventListener('blur', closeOnViewportChange);
    window.addEventListener('resize', closeOnViewportChange);
    window.addEventListener('scroll', closeOnViewportChange, true);

    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      window.removeEventListener('blur', closeOnViewportChange);
      window.removeEventListener('resize', closeOnViewportChange);
      window.removeEventListener('scroll', closeOnViewportChange, true);
    };
  }, [onClose]);

  const moveFocus = (direction: 1 | -1) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) ?? [],
    );
    const currentIndex = items.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    const nextIndex = (currentIndex + direction + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  return (
    <div
      aria-label={t('contextMenu.label')}
      className="context-menu"
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          moveFocus(1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          moveFocus(-1);
        }
      }}
      ref={menuRef}
      role="menu"
      style={{ left: request.x, top: request.y, visibility: 'hidden' }}
    >
      {groups.map((group, groupIndex) => (
        <div className="context-menu__group" key={group[0]?.key} role="group">
          {group.map((item) => (
            <button
              className={
                item.tone === 'danger'
                  ? 'context-menu__item--danger'
                  : undefined
              }
              disabled={disabledKeys.has(item.key)}
              key={item.key}
              onClick={() => {
                onAction?.(item.key);
                onClose();
              }}
              role="menuitem"
              type="button"
            >
              <ContextMenuIcon name={item.icon} />
              <span className="context-menu__label">
                {t(
                  item.key === 'edit' && request.target?.kind === 'folder'
                    ? 'contextMenu.items.editFolder'
                    : item.key === 'favorite'
                      ? isTargetFavorite
                        ? 'contextMenu.items.removeFavorite'
                        : 'contextMenu.items.addFavorite'
                      : `contextMenu.items.${item.key}`,
                )}
              </span>
              {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
            </button>
          ))}
          {groupIndex < groups.length - 1 ? <hr /> : null}
        </div>
      ))}
    </div>
  );
}
