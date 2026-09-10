import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClearIcon } from '../../components/icons/ClearIcon';
import type { SyncNode } from '../../domain/sync-preview';
import { FolderTreePicker } from '../folder-tree/FolderTreePicker';
import type { FolderTreeNode } from '../folder-tree/folder-tree-data';

/** A stacked native modal reuses the navigation panel's filter and tree controls. */
export function SyncFolderDialog({
  nodes,
  side,
  selectedId,
  onSelect,
  onClose,
}: {
  nodes: readonly SyncNode[];
  side: 'extension' | 'browser';
  selectedId: string;
  onSelect(id: string): void;
  onClose(): void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState(selectedId);
  const tree = useMemo(() => {
    const map = new Map<
      string,
      FolderTreeNode & { children: FolderTreeNode[] }
    >();
    for (const node of nodes)
      if (node.url === undefined)
        map.set(node.id, {
          id: node.id,
          name: node.title || t('sync.browserFolder'),
          children: [],
        });
    let root: FolderTreeNode | undefined;
    for (const node of nodes) {
      const item = map.get(node.id);
      if (!item) continue;
      if (node.parentId === null) root = item;
      else map.get(node.parentId)?.children.push(item);
    }
    return root;
  }, [nodes, t]);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    if (dialog && !dialog.open) {
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    inputRef.current?.focus();
    return () => {
      if (dialog?.open && dialog.close) dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  const selectable = nodes.some(
    (node) =>
      node.id === selection &&
      node.url === undefined &&
      (side === 'extension' || node.parentId !== null),
  );
  return (
    <dialog
      ref={ref}
      className="sync-dialog sync-folder-dialog"
      aria-labelledby="sync-folder-title"
      aria-describedby="sync-folder-description"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <header className="sync-dialog__header">
        <div>
          <h1 id="sync-folder-title">{t(`sync.folderPicker.${side}.title`)}</h1>
          <p id="sync-folder-description">
            {t(`sync.folderPicker.${side}.description`)}
          </p>
        </div>
        <button type="button" aria-label={t('sync.close')} onClick={onClose}>
          <ClearIcon />
        </button>
      </header>
      <div className="sync-dialog__body">
        {tree && (
          <FolderTreePicker
            folderTree={tree}
            filterInputRef={inputRef}
            idPrefix={`sync-${side}`}
            initiallyExpandedFolderIds={new Set([tree.id])}
            selectedFolderId={selection}
            onSelect={(_path, id) => setSelection(id)}
            onEscapeWithoutFilter={onClose}
          />
        )}
      </div>
      <footer className="sync-dialog__footer">
        <button type="button" onClick={onClose}>
          {t('sync.cancel')}
        </button>
        <button
          type="button"
          className="sync-dialog__primary"
          disabled={!selectable}
          onClick={() => onSelect(selection)}
        >
          {t('sync.chooseFolder')}
        </button>
      </footer>
    </dialog>
  );
}
