import { describe, expect, it } from 'vitest';

import { folderTree } from './folder-tree-data';
import { filterFolderTree } from './filter-folder-tree';

describe('filterFolderTree', () => {
  it('keeps a case-insensitive match and its ancestor path', () => {
    expect(filterFolderTree(folderTree, 'mDn')).toEqual({
      id: 'home',
      name: 'Home',
      children: [
        {
          id: 'work',
          name: 'Work',
          children: [
            {
              id: 'research',
              name: 'Research',
              children: [{ id: 'mdn-web-docs', name: 'MDN Web Docs' }],
            },
          ],
        },
      ],
    });
  });

  it('returns no tree when no folder matches', () => {
    expect(filterFolderTree(folderTree, 'missing folder')).toBeNull();
  });

  it('returns the complete tree for an empty query', () => {
    expect(filterFolderTree(folderTree, '   ')).toBe(folderTree);
  });
});
