import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import type { Bookmark } from '../../domain/bookmark';
import type { Folder } from '../../domain/folder';
import { ItemInfoDialog } from './ItemInfoDialog';

const bookmark: Bookmark = {
  cardAppearance: { kind: 'color', value: '#123456' },
  createdAt: Date.UTC(2026, 7, 9, 14, 30),
  id: '22222222-2222-4222-8222-222222222222',
  index: 0,
  note: '',
  parentId: '11111111-1111-4111-8111-111111111111',
  profileId: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
  tags: [],
  title: 'Example',
  updatedAt: Date.UTC(2026, 7, 10, 14, 30),
  url: 'https://example.com/',
};

afterEach(cleanup);

describe('ItemInfoDialog', () => {
  it('shows bookmark metadata and copies only the selected displayed value', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn().mockResolvedValue(undefined);
    render(
      <ItemInfoDialog
        item={{ kind: 'bookmark', value: bookmark }}
        onClose={vi.fn()}
        onCopy={onCopy}
        parentName="Home"
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Get info' });
    expect(dialog).toBeVisible();
    expect(
      dialog.querySelector('.item-info-dialog__primary-rows'),
    ).toBeInTheDocument();
    expect(
      dialog.querySelector('.item-info-dialog__scroll-region'),
    ).toBeInTheDocument();
    expect(screen.getByText('https://example.com/')).toBeVisible();
    expect(screen.getByText('Bookmark')).toBeVisible();
    expect(screen.getByText('Home')).toBeVisible();
    expect(screen.queryByText('Technical details')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Created' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Copy Last modified' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Copy ID' })).not.toBeVisible();
    await user.click(screen.getByText('More details'));
    const copyId = screen.getByRole('button', { name: 'Copy ID' });
    expect(copyId).toBeVisible();
    await user.click(copyId);
    expect(onCopy).toHaveBeenCalledWith('id', bookmark.id);
    expect(screen.getByText('Copied')).toBeInTheDocument();
    expect(screen.getByText('Appearance type')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Copy Position' }));
    expect(onCopy).toHaveBeenLastCalledWith('position', '1');
  });

  it('omits the URL row for folders', () => {
    const folder: Folder = {
      backgroundAppearance: { kind: 'none' },
      bookmarkView: 'card',
      cardAppearance: {
        kind: 'gradient',
        colors: ['#111111', '#222222', '#333333'],
        direction: 45,
      },
      createdAt: 1,
      detailsTableTransparency: 0,
      id: '33333333-3333-4333-8333-333333333333',
      includeNavigationBackground: false,
      index: 0,
      isRoot: false,
      navigationTransparency: 45,
      note: '',
      parentId: '11111111-1111-4111-8111-111111111111',
      profileId: bookmark.profileId,
      tags: [],
      title: 'Folder',
      updatedAt: 2,
    };
    render(
      <ItemInfoDialog
        item={{ kind: 'folder', value: folder }}
        onClose={vi.fn()}
        onCopy={vi.fn()}
        parentName="Home"
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Copy URL' }),
    ).not.toBeInTheDocument();
  });
});
