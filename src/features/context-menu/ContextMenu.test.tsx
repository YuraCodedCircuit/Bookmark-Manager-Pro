import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import type { Bookmark } from '../../domain/bookmark';
import type { Folder } from '../../domain/folder';
import { ContextMenu } from './ContextMenu';

const bookmark: Bookmark = {
  cardAppearance: { kind: 'color', value: '#123456' },
  createdAt: 1,
  id: '22222222-2222-4222-8222-222222222222',
  index: 0,
  note: '',
  parentId: '11111111-1111-4111-8111-111111111111',
  profileId: 'df6f88b6-10c7-43d7-b516-a063b77db6c6',
  tags: [],
  title: 'Example',
  updatedAt: 1,
  url: 'https://example.com/',
};

afterEach(cleanup);

describe('ContextMenu bookmark link commands', () => {
  it.each([
    ['edge', 'Open link in new tab', 'Open link in new window', 'Copy link'],
    [
      'chrome',
      'Open link in new tab',
      'Open link in new window',
      'Copy link address',
    ],
    ['firefox', 'Open Link in New Tab', 'Open Link in New Window', 'Copy Link'],
  ] as const)(
    'uses %s terminology',
    (browserFamily, newTabLabel, newWindowLabel, copyLabel) => {
      render(
        <ContextMenu
          browserFamily={browserFamily}
          onClose={vi.fn()}
          request={{
            kind: 'bookmark',
            target: { kind: 'bookmark', value: bookmark },
            x: 20,
            y: 20,
          }}
        />,
      );

      const menu = screen.getByRole('menu', { name: 'Bookmark actions' });
      const open = within(menu).getByRole('menuitem', {
        name: browserFamily === 'firefox' ? 'Open Link' : 'Open link',
      });
      expect(open).toHaveFocus();
      expect(open.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(
        within(menu).getByRole('menuitem', { name: newTabLabel }),
      ).toBeVisible();
      expect(
        within(menu).getByRole('menuitem', { name: newWindowLabel }),
      ).toBeVisible();
      expect(
        within(menu).getByRole('menuitem', { name: copyLabel }),
      ).toBeVisible();
      expect(
        within(menu).queryByRole('menuitem', { name: /private|incognito/i }),
      ).toBeNull();
    },
  );
});

describe('ContextMenu folder commands', () => {
  it.each(['chrome', 'edge', 'firefox', 'unknown'] as const)(
    'uses folder terminology for %s',
    (browserFamily) => {
      const folder: Folder = {
        ...bookmark,
        backgroundAppearance: { kind: 'none' },
        bookmarkView: 'card',
        detailsTableTransparency: 0,
        includeNavigationBackground: false,
        navigationTransparency: 45,
        isRoot: false,
      };
      render(
        <ContextMenu
          browserFamily={browserFamily}
          onClose={vi.fn()}
          request={{
            kind: 'bookmark',
            target: { kind: 'folder', value: folder },
            x: 20,
            y: 20,
          }}
        />,
      );
      const open = screen.getByRole('menuitem', {
        name: browserFamily === 'firefox' ? 'Open Folder' : 'Open folder',
      });
      expect(open).toHaveFocus();
      expect(open.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(
        screen.getByRole('menuitem', {
          name:
            browserFamily === 'firefox'
              ? 'Open Folder in New Tab'
              : 'Open folder in new tab',
        }),
      ).toBeVisible();
      expect(screen.queryByRole('menuitem', { name: /open link/i })).toBeNull();
    },
  );
});
