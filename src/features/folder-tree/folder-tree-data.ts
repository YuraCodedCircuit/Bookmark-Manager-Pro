export interface FolderTreeNode {
  id: string;
  name: string;
  children?: readonly FolderTreeNode[];
}

export const folderTree: FolderTreeNode = {
  id: 'home',
  name: 'Home',
  children: [
    {
      id: 'work',
      name: 'Work',
      children: [
        { id: 'project-docs', name: 'Project Docs' },
        { id: 'design-resources', name: 'Design Resources' },
        {
          id: 'research',
          name: 'Research',
          children: [
            { id: 'mdn-web-docs', name: 'MDN Web Docs' },
            { id: 'reference-library', name: 'Reference Library' },
          ],
        },
      ],
    },
    {
      id: 'personal',
      name: 'Personal',
      children: [
        { id: 'reading-list', name: 'Reading List' },
        { id: 'saved-articles', name: 'Saved Articles' },
      ],
    },
  ],
};
