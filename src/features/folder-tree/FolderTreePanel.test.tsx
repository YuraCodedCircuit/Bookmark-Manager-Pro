import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { FolderTreePanel } from './FolderTreePanel';

afterEach(cleanup);

const folder = {
  backgroundAppearance: { kind: 'none' as const },
  bookmarkView: 'card' as const,
  cardAppearance: { kind: 'color' as const, value: '#123456' },
  createdAt: 2,
  detailsTableTransparency: 0,
  id: '11111111-1111-4111-8111-111111111111',
  includeNavigationBackground: false,
  index: 0,
  isRoot: false,
  navigationTransparency: 45,
  note: '',
  parentId: '33333333-3333-4333-8333-333333333333',
  profileId: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
  tags: [],
  title: 'Pinned folder',
  updatedAt: 2,
};

describe('FolderTreePanel', () => {
  it('orders shortcuts before search and removes favorites with the pin button', async () => {
    const user = userEvent.setup();
    const onRemoveFavorite = vi.fn();
    render(
      <FolderTreePanel
        favorites={[{ kind: 'folder', value: folder }]}
        folderTree={{ id: folder.id, name: 'Home' }}
        isOpen
        onAfterClose={vi.fn()}
        onClose={vi.fn()}
        onOpenItem={vi.fn()}
        onRemoveFavorite={onRemoveFavorite}
        onSelect={vi.fn()}
        recent={[{ kind: 'folder', value: folder }]}
      />,
    );
    const panel = screen.getByRole('dialog', { name: 'Folder tree' });
    const text = panel.textContent ?? '';
    expect(text.indexOf('Favorites')).toBeLessThan(text.indexOf('Recent'));
    expect(text.indexOf('Recent')).toBeLessThan(text.indexOf('Filter folders'));
    await user.click(
      within(panel).getByRole('button', {
        name: 'Remove Pinned folder from favorites',
      }),
    );
    expect(onRemoveFavorite).toHaveBeenCalledWith({
      kind: 'folder',
      value: folder,
    });
  });
});
