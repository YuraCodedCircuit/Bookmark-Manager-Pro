import { animate } from 'motion/mini';
import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ContextMenuIcon } from '../context-menu/ContextMenuIcon';
import { writeClipboardText } from '../../platform/clipboard/write-clipboard-text';
import { prefersReducedMotion } from '../../shared/use-prefers-reduced-motion';
import type { EditableTextControl } from './editable-text-control';

export interface EditableTextContextMenuRequest {
  selectionEnd: number;
  selectionStart: number;
  target: EditableTextControl;
  x: number;
  y: number;
}

interface EditableTextContextMenuProps {
  onClose: () => void;
  onOperationFailed: () => void;
  onPastePermissionDenied: () => void;
  request: EditableTextContextMenuRequest;
}

type EditableMenuAction = 'clear' | 'copy' | 'cut' | 'paste' | 'selectAll';

const menuItems: readonly {
  icon: 'copy' | 'cut' | 'delete' | 'paste' | 'select-all';
  key: EditableMenuAction;
  shortcut?: string;
}[] = [
  { icon: 'cut', key: 'cut', shortcut: 'Ctrl+X' },
  { icon: 'copy', key: 'copy', shortcut: 'Ctrl+C' },
  { icon: 'paste', key: 'paste', shortcut: 'Ctrl+V' },
  { icon: 'select-all', key: 'selectAll', shortcut: 'Ctrl+A' },
  { icon: 'delete', key: 'clear' },
];

/** Provides app-owned editing commands without intercepting native shortcuts. */
export function EditableTextContextMenu({
  onClose,
  onOperationFailed,
  onPastePermissionDenied,
  request,
}: EditableTextContextMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const hasSelection = request.selectionEnd > request.selectionStart;
  const hasValue = request.target.value.length > 0;

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
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
      if (!menuRef.current?.contains(event.target as Node)) onClose();
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

  const replaceSelection = (value: string) => {
    const availableLength =
      request.target.maxLength < 0
        ? value.length
        : Math.max(
            0,
            request.target.maxLength -
              (request.target.value.length -
                (request.selectionEnd - request.selectionStart)),
          );
    request.target.setRangeText(
      value.slice(0, availableLength),
      request.selectionStart,
      request.selectionEnd,
      'end',
    );
    request.target.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const closeAndRestoreFocus = () => {
    onClose();
    window.requestAnimationFrame(() =>
      request.target.focus({ preventScroll: true }),
    );
  };

  const runAction = async (action: EditableMenuAction) => {
    request.target.focus({ preventScroll: true });
    try {
      if (action === 'copy' || action === 'cut') {
        await writeClipboardText(
          request.target.value.slice(
            request.selectionStart,
            request.selectionEnd,
          ),
        );
        if (action === 'cut') replaceSelection('');
      } else if (action === 'paste') {
        const { requestAndReadClipboardText } =
          await import('../../platform/clipboard/read-clipboard-text');
        replaceSelection(await requestAndReadClipboardText());
      } else if (action === 'selectAll') {
        request.target.select();
      } else {
        request.target.setRangeText('', 0, request.target.value.length, 'end');
        request.target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'ClipboardReadPermissionDeniedError'
      )
        onPastePermissionDenied();
      else onOperationFailed();
    } finally {
      closeAndRestoreFocus();
    }
  };

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

  const menu = (
    <div
      aria-label={t('editableContextMenu.label')}
      className="context-menu"
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeAndRestoreFocus();
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
      <div className="context-menu__group" role="group">
        {menuItems.map((item) => (
          <button
            disabled={
              item.key === 'copy' || item.key === 'cut'
                ? !hasSelection
                : (item.key === 'clear' || item.key === 'selectAll') &&
                  !hasValue
            }
            key={item.key}
            onClick={() => void runAction(item.key)}
            role="menuitem"
            type="button"
          >
            <ContextMenuIcon name={item.icon} />
            <span className="context-menu__label">
              {t(`editableContextMenu.items.${item.key}`)}
            </span>
            {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
          </button>
        ))}
      </div>
    </div>
  );

  return createPortal(menu, request.target.closest('dialog') ?? document.body);
}
