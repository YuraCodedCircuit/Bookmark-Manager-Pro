import { useMemo, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { ClearIcon } from '../../components/icons/ClearIcon';
import { filterFolderTree } from './filter-folder-tree';
import { FolderTreeNodeView } from './FolderTreeNodeView';
import type { FolderTreeNode } from './folder-tree-data';

interface FolderTreePickerProps {
  folderTree: FolderTreeNode;
  filterInputRef?: RefObject<HTMLInputElement | null>;
  idPrefix: string;
  initiallyExpandedFolderIds?: ReadonlySet<string>;
  onEscapeWithoutFilter?: () => void;
  onSelect: (path: readonly string[], folderId: string) => void;
  selectedFolderId?: string;
}

/** Renders the shared filterable folder tree without imposing a panel shell. */
export function FolderTreePicker({
  folderTree,
  filterInputRef: suppliedFilterInputRef,
  idPrefix,
  initiallyExpandedFolderIds,
  onEscapeWithoutFilter,
  onSelect,
  selectedFolderId,
}: FolderTreePickerProps) {
  const { t } = useTranslation();
  const localFilterInputRef = useRef<HTMLInputElement>(null);
  const filterInputRef = suppliedFilterInputRef ?? localFilterInputRef;
  const [filterQuery, setFilterQuery] = useState('');
  const normalizedFilterQuery = filterQuery.trim();
  const filteredTree = useMemo(
    () => filterFolderTree(folderTree, normalizedFilterQuery),
    [folderTree, normalizedFilterQuery],
  );
  const filterId = `${idPrefix}-folder-filter`;

  return (
    <div
      className="folder-tree-picker"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        if (filterQuery.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          setFilterQuery('');
        } else {
          if (onEscapeWithoutFilter) {
            event.preventDefault();
            event.stopPropagation();
          }
          onEscapeWithoutFilter?.();
        }
      }}
    >
      <div className="folder-tree-filter">
        <label className="visually-hidden" htmlFor={filterId}>
          {t('folderTree.filterLabel')}
        </label>
        <input
          autoComplete="off"
          id={filterId}
          onChange={(event) => setFilterQuery(event.target.value)}
          placeholder={t('folderTree.filterPlaceholder')}
          ref={filterInputRef}
          spellCheck="false"
          type="search"
          value={filterQuery}
        />
        {filterQuery.length > 0 ? (
          <button
            aria-label={t('folderTree.clearFilter')}
            onClick={() => {
              setFilterQuery('');
              filterInputRef.current?.focus();
            }}
            type="button"
          >
            <ClearIcon />
          </button>
        ) : null}
      </div>
      <div className="folder-tree-scroll">
        <nav aria-label={t('folderTree.label')} className="folder-tree">
          {filteredTree === null ? (
            <p className="folder-tree__empty" role="status">
              {t('folderTree.noResults')}
            </p>
          ) : (
            <ul role="tree">
              <FolderTreeNodeView
                filterQuery={normalizedFilterQuery}
                node={filteredTree}
                onSelect={(path, folderId) => {
                  setFilterQuery('');
                  onSelect(path, folderId);
                }}
                parentPath={[]}
                {...(initiallyExpandedFolderIds
                  ? { initiallyExpandedFolderIds }
                  : {})}
                {...(selectedFolderId ? { selectedFolderId } : {})}
              />
            </ul>
          )}
        </nav>
      </div>
    </div>
  );
}
