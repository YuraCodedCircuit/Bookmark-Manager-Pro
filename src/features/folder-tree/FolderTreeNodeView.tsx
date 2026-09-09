import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChevronIcon } from '../../components/icons/ChevronIcon';
import { FolderIcon } from '../../components/icons/FolderIcon';
import type { FolderTreeNode } from './folder-tree-data';

interface FolderTreeNodeViewProps {
  filterQuery: string;
  initiallyExpandedFolderIds?: ReadonlySet<string>;
  node: FolderTreeNode;
  parentPath: readonly string[];
  onSelect: (path: readonly string[], id: string) => void;
  selectedFolderId?: string;
}

export function FolderTreeNodeView({
  filterQuery,
  initiallyExpandedFolderIds,
  node,
  parentPath,
  onSelect,
  selectedFolderId,
}: FolderTreeNodeViewProps) {
  const { t } = useTranslation();
  const hasChildren = Boolean(node.children?.length);
  const [isExpanded, setIsExpanded] = useState(
    initiallyExpandedFolderIds?.has(node.id) ?? hasChildren,
  );
  const isFiltering = filterQuery.length > 0;
  const isEffectivelyExpanded = isFiltering || isExpanded;
  const path = [...parentPath, node.name];

  const normalizedName = node.name.toLocaleLowerCase();
  const matchStart = normalizedName.indexOf(filterQuery.toLocaleLowerCase());
  const matchEnd = matchStart + filterQuery.length;

  return (
    <li
      aria-expanded={hasChildren ? isEffectivelyExpanded : undefined}
      className="folder-tree__item"
      role="treeitem"
    >
      <div className="folder-tree__row">
        {hasChildren ? (
          <button
            aria-label={t(
              isEffectivelyExpanded
                ? 'folderTree.collapse'
                : 'folderTree.expand',
              { name: node.name },
            )}
            className="folder-tree__toggle"
            disabled={isFiltering}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            type="button"
          >
            <ChevronIcon data-expanded={isEffectivelyExpanded} />
          </button>
        ) : (
          <span aria-hidden="true" className="folder-tree__toggle-spacer" />
        )}

        <button
          aria-current={node.id === selectedFolderId ? 'true' : undefined}
          className="folder-tree__folder"
          onClick={() => onSelect(path, node.id)}
          type="button"
        >
          <FolderIcon />
          <span>
            {matchStart >= 0 && filterQuery.length > 0 ? (
              <>
                {node.name.slice(0, matchStart)}
                <mark>{node.name.slice(matchStart, matchEnd)}</mark>
                {node.name.slice(matchEnd)}
              </>
            ) : (
              node.name
            )}
          </span>
        </button>
      </div>

      {hasChildren && isEffectivelyExpanded ? (
        <ul role="group">
          {node.children?.map((child) => (
            <FolderTreeNodeView
              key={child.id}
              filterQuery={filterQuery}
              {...(initiallyExpandedFolderIds
                ? { initiallyExpandedFolderIds }
                : {})}
              node={child}
              onSelect={onSelect}
              parentPath={path}
              {...(selectedFolderId ? { selectedFolderId } : {})}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
