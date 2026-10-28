import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  it('contains cancellation when nested inside another dialog', () => {
    const onClose = vi.fn();
    const parentCancel = vi.fn();
    render(
      <dialog open aria-label="Parent" onCancel={parentCancel}>
        <ItemInfoDialog
          item={{ kind: 'bookmark', value: bookmark }}
          parentName="Home"
          onClose={onClose}
          onCopy={vi.fn()}
        />
      </dialog>,
    );
    fireEvent(
      screen.getByRole('dialog', { name: 'Get info' }),
      new Event('cancel', { bubbles: true, cancelable: true }),
    );
    expect(onClose).toHaveBeenCalledOnce();
    expect(parentCancel).not.toHaveBeenCalled();
  });
  it('shows bookmark metadata and copies only the selected displayed value', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn().mockResolvedValue(undefined);
    render(
      <ItemInfoDialog
        item={{ kind: 'bookmark', value: bookmark }}
        onClose={vi.fn()}
        onCopy={onCopy}
        parentName="Home / Projects / References"
        profileName="Other profile"
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Get info' });
    expect(dialog).toBeVisible();
    expect(screen.getByText('Other profile', { exact: true })).toBeVisible();
    expect(
      screen.getByText('Home / Projects / References', { exact: true }),
    ).toBeVisible();
    expect(dialog.querySelector('.item-info-dialog__type-icon')).toContainHTML(
      '<svg',
    );
    expect(
      dialog.querySelector('.item-info-dialog__type-icon'),
    ).toHaveAttribute('aria-hidden', 'true');
    expect(
      dialog.querySelector('.item-info-dialog__primary-rows'),
    ).toBeInTheDocument();
    expect(
      dialog.querySelector('.item-info-dialog__scroll-region'),
    ).toBeInTheDocument();
    expect(screen.getByText('https://example.com/')).toBeVisible();
    expect(screen.getByText('Bookmark')).toBeVisible();
    expect(screen.queryByText('Technical details')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Created' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Copy Profile' }));
    expect(onCopy).toHaveBeenCalledWith('profile', 'Other profile');
    await user.click(
      screen.getByRole('button', { name: 'Copy Parent folder' }),
    );
    expect(onCopy).toHaveBeenCalledWith(
      'parent',
      'Home / Projects / References',
    );
    expect(
      screen.getByRole('button', { name: 'Copy Last modified' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Copy ID' })).not.toBeVisible();
    await user.click(screen.getByText('More details'));
    expect(
      screen.queryByRole('button', { name: 'Copy Tags' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Copy Note' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('More details').closest('details')).toHaveAttribute(
      'open',
    );
    const copyId = screen.getByRole('button', { name: 'Copy ID' });
    expect(copyId).toBeVisible();
    await user.click(copyId);
    expect(onCopy).toHaveBeenCalledWith('id', bookmark.id);
    expect(screen.getByText('Copied')).toBeInTheDocument();
    expect(screen.getByText('Appearance type')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Copy Position' }));
    expect(onCopy).toHaveBeenLastCalledWith('position', '1');
  });

  it('keeps real values copyable even when their text is None', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn().mockResolvedValue(undefined);
    render(
      <ItemInfoDialog
        item={{
          kind: 'bookmark',
          value: { ...bookmark, tags: ['None'], note: 'None' },
        }}
        onClose={vi.fn()}
        onCopy={onCopy}
        parentName="Home"
      />,
    );
    expect(
      screen.queryByText('Profile', { exact: true }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByText('More details'));
    await user.click(screen.getByRole('button', { name: 'Copy Tags' }));
    expect(onCopy).toHaveBeenCalledWith('tags', 'None');
    await user.click(screen.getByRole('button', { name: 'Copy Note' }));
    expect(onCopy).toHaveBeenCalledWith('note', 'None');
  });

  it('omits copy actions for absent parent and whitespace-only notes', async () => {
    const user = userEvent.setup();
    render(
      <ItemInfoDialog
        item={{ kind: 'bookmark', value: { ...bookmark, note: '   ' } }}
        onClose={vi.fn()}
        onCopy={vi.fn()}
        parentName="None"
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Copy Parent folder' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByText('More details'));
    expect(
      screen.queryByRole('button', { name: 'Copy Note' }),
    ).not.toBeInTheDocument();
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
      title:
        'A long folder title that wraps fully instead of being limited to three lines',
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
    expect(screen.getByTitle(folder.title)).toHaveTextContent(folder.title);
    expect(
      screen
        .getByRole('dialog', { name: 'Get info' })
        .querySelector('.item-info-dialog__type-icon'),
    ).toContainHTML('<svg');
  });
});
