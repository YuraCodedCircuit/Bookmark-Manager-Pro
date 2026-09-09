import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { FolderTreePicker } from './FolderTreePicker';

afterEach(cleanup);

const tree = {
  children: [
    {
      children: [{ id: 'reports', name: 'Reports' }],
      id: 'work',
      name: 'Work',
    },
    { id: 'personal', name: 'Personal' },
  ],
  id: 'home',
  name: 'Home',
};

describe('FolderTreePicker', () => {
  it('collapses all branches unless selected-folder ancestors are supplied', () => {
    const { unmount } = render(
      <FolderTreePicker
        folderTree={tree}
        idPrefix="test"
        initiallyExpandedFolderIds={new Set()}
        onSelect={vi.fn()}
        selectedFolderId="home"
      />,
    );

    expect(screen.getByRole('button', { name: 'Expand Home' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Work' }),
    ).not.toBeInTheDocument();

    unmount();
    render(
      <FolderTreePicker
        folderTree={tree}
        idPrefix="test"
        initiallyExpandedFolderIds={new Set(['home', 'work'])}
        onSelect={vi.fn()}
        selectedFolderId="reports"
      />,
    );

    expect(screen.getByRole('button', { name: 'Collapse Home' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Collapse Work' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reports' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('filters with ancestor context and selects a folder-name button', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <FolderTreePicker
        folderTree={tree}
        idPrefix="test"
        onSelect={onSelect}
        selectedFolderId="home"
      />,
    );

    const folderTree = screen.getByRole('navigation', {
      name: 'Folder tree',
    });
    expect(folderTree.parentElement).toHaveClass('folder-tree-scroll');
    expect(
      within(folderTree).getByRole('button', { name: 'Home' }),
    ).toHaveAttribute('aria-current', 'true');

    await user.type(screen.getByLabelText('Filter folders'), 'reports');
    expect(
      within(folderTree).getByRole('button', { name: 'Work' }),
    ).toBeVisible();
    expect(
      within(folderTree).queryByRole('button', { name: 'Personal' }),
    ).not.toBeInTheDocument();

    await user.click(
      within(folderTree).getByRole('button', { name: 'Reports' }),
    );
    expect(onSelect).toHaveBeenCalledWith(
      ['Home', 'Work', 'Reports'],
      'reports',
    );
    expect(screen.getByLabelText('Filter folders')).toHaveValue('');
  });

  it('clears a filter on Escape without invoking the outer escape action', async () => {
    const user = userEvent.setup();
    const onEscapeWithoutFilter = vi.fn();
    render(
      <FolderTreePicker
        folderTree={tree}
        idPrefix="test"
        onEscapeWithoutFilter={onEscapeWithoutFilter}
        onSelect={vi.fn()}
      />,
    );

    const filter = screen.getByLabelText('Filter folders');
    await user.type(filter, 'work');
    await user.keyboard('{Escape}');
    expect(filter).toHaveValue('');
    expect(onEscapeWithoutFilter).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    expect(onEscapeWithoutFilter).toHaveBeenCalledOnce();
  });
});
