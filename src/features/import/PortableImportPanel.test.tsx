import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../localization/i18n';
import {
  PortableImportPanel,
  type ImportDestinations,
} from './PortableImportPanel';
import type { PortableImportItem } from '../../domain/portable-import';

const id = (value: number) =>
  `11111111-1111-4111-8111-${String(value).padStart(12, '0')}`;
const items: PortableImportItem[] = [
  {
    id: 'folder',
    parentId: null,
    title: 'Imported folder',
    kind: 'folder',
    index: 0,
  },
  {
    id: 'a',
    parentId: 'folder',
    title: 'Visible bookmark',
    kind: 'bookmark',
    index: 0,
  },
  {
    id: 'b',
    parentId: 'folder',
    title: 'Hidden bookmark',
    kind: 'bookmark',
    index: 1,
  },
  {
    id: 'empty',
    parentId: null,
    title: 'Empty folder',
    kind: 'folder',
    index: 1,
  },
];
const originalShowModal = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  for (const [key, original] of [
    ['showModal', originalShowModal],
    ['close', originalClose],
  ] as const) {
    if (original)
      Object.defineProperty(HTMLDialogElement.prototype, key, original);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
});

function setup(
  override: Partial<ImportDestinations> = {},
  options: Partial<
    Pick<
      Parameters<typeof PortableImportPanel>[0],
      'format' | 'preferences' | 'items' | 'csvColumns'
    >
  > = {},
) {
  const loadFolders = vi.fn(async (profileId: string) => [
    {
      id: id(3),
      parentId: null,
      isRoot: true,
      profileId,
      title: 'Home',
      createdAt: 1,
    },
  ]);
  const report = vi.fn();
  render(
    <PortableImportPanel
      items={items}
      report={report}
      {...options}
      destinations={{
        activeProfileId: id(1),
        loadProfiles: async () =>
          [1, 2].map((value) => ({
            profile: {
              id: id(value),
              username: `Profile ${value}`,
              createdAt: 1,
              updatedAt: 1,
            },
            isActive: value === 1,
            bookmarkCount: 0,
            folderCount: 0,
          })),
        loadFolders,
        ...override,
      }}
    />,
  );
  return { report, loadFolders };
}
describe('portable import review', () => {
  it('ignores a superseded destination failure and reloads only the selected profile', async () => {
    let rejectOld: (error: Error) => void = () => {};
    const loadFolders = vi.fn<ImportDestinations['loadFolders']>((profileId) =>
      profileId === id(2)
        ? new Promise((_, reject) => {
            rejectOld = reject;
          })
        : Promise.resolve([
            {
              id: id(3),
              parentId: null,
              isRoot: true,
              profileId,
              title: 'Active Home',
              createdAt: 1,
            },
          ]),
    );
    const { report } = setup({ loadFolders });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Destination folder' }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Destination profile' }),
    );
    const child = screen.getByRole('dialog', {
      name: 'Choose destination profile',
    });
    fireEvent.click(within(child).getByRole('radio', { name: 'Profile 2' }));
    await waitFor(() => expect(loadFolders).toHaveBeenCalledWith(id(2)));
    fireEvent.click(within(child).getByRole('radio', { name: 'Profile 1' }));
    await waitFor(() => expect(loadFolders).toHaveBeenCalledTimes(3));
    rejectOld(new Error('superseded'));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Destination folder' }),
      ).toHaveTextContent('Active Home'),
    );
    expect(report).not.toHaveBeenCalled();
    expect(loadFolders.mock.calls.map(([profileId]) => profileId)).toEqual([
      id(1),
      id(2),
      id(1),
    ]);
  });
  it('allows an empty destination without loading other profiles or retaining the previous tree', async () => {
    const loadProfiles = vi.fn(async () =>
      [1, 2].map((value) => ({
        profile: {
          id: id(value),
          username: `Profile ${value}`,
          createdAt: 1,
          updatedAt: 1,
        },
        isActive: value === 1,
        bookmarkCount: 0,
        folderCount: 0,
      })),
    );
    const loadFolders = vi.fn(async (profileId: string) =>
      profileId === id(2)
        ? []
        : [
            {
              id: id(3),
              parentId: null,
              isRoot: true,
              profileId,
              title: 'Active Home',
              createdAt: 1,
            },
          ],
    );
    const { report } = setup({ loadProfiles, loadFolders });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Destination folder' }),
      ).toHaveTextContent('Active Home'),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Destination profile' }),
    );
    const child = screen.getByRole('dialog', {
      name: 'Choose destination profile',
    });
    fireEvent.click(within(child).getByRole('radio', { name: 'Profile 2' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Destination folder' }),
      ).toBeEnabled(),
    );
    fireEvent.click(within(child).getByRole('button', { name: 'Close' }));
    expect(
      screen.getByRole('button', { name: 'Destination folder' }),
    ).toHaveTextContent('Home');
    fireEvent.click(screen.getByRole('button', { name: 'Destination folder' }));
    const folders = screen.getByRole('dialog', {
      name: 'Choose destination folder',
    });
    expect(within(folders).queryByText('Active Home')).not.toBeInTheDocument();
    expect(within(folders).getByRole('button', { name: 'Home' })).toBeVisible();
    expect(loadProfiles).toHaveBeenCalledTimes(1);
    expect(loadFolders.mock.calls.map(([profileId]) => profileId)).toEqual([
      id(1),
      id(2),
    ]);
    expect(report).not.toHaveBeenCalled();
  });
  it('reviews CSV using supported file columns in a flat checkbox table without links', async () => {
    setup(
      {},
      {
        format: 'csv',
        csvColumns: ['url', 'title', 'note'],
        items: [
          {
            id: 'csv:0',
            parentId: null,
            index: 0,
            kind: 'bookmark',
            title: 'Synthetic',
            csvValues: {
              url: 'https://example.com/',
              title: 'Synthetic',
              note: '<script>inert</script>',
            },
          },
        ],
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Review items' }));
    const child = screen.getByRole('dialog', { name: 'Review imported items' });
    expect(child).toHaveClass('import-child--wide');
    expect(child).toHaveAccessibleDescription(
      'Select which bookmarks will be saved.',
    );
    expect(
      within(child)
        .getByText('Select which bookmarks will be saved.')
        .closest('header'),
    ).not.toBeNull();
    expect(child.querySelector('footer')).not.toHaveTextContent(
      'Excluded items',
    );
    expect(
      within(child)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Include', 'URL', 'Title', 'Note']);
    expect(within(child).getByText('<script>inert</script>')).toBeVisible();
    expect(within(child).queryByRole('link')).not.toBeInTheDocument();
    expect(child.querySelector('script')).toBeNull();
    fireEvent.click(within(child).getByRole('checkbox', { name: 'Synthetic' }));
    expect(within(child).getByRole('status')).toHaveTextContent(
      '0 bookmarks · 0 folders',
    );
  });
  it('selects a destination without activating it and defaults to that profile Home', async () => {
    const test = setup();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Destination profile' }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Destination profile' }),
    );
    const child = screen.getByRole('dialog', {
      name: 'Choose destination profile',
    });
    fireEvent.click(within(child).getByRole('radio', { name: 'Profile 2' }));
    await waitFor(() => expect(test.loadFolders).toHaveBeenCalledWith(id(2)));
    fireEvent.click(within(child).getByRole('button', { name: 'Close' }));
    expect(
      screen.getByRole('button', { name: 'Destination profile' }),
    ).toHaveTextContent('Profile 2');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Destination folder' }),
      ).toHaveTextContent('Home'),
    );
    expect(test.report).not.toHaveBeenCalled();
  });
  it('applies folder exclusions to hidden descendants and preserves selected empty folders', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Review items' }));
    const child = screen.getByRole('dialog', { name: 'Review imported items' });
    expect(child).toHaveAccessibleDescription(
      'Select which bookmarks and folders will be saved.',
    );
    expect(
      within(child)
        .getByText('Select which bookmarks and folders will be saved.')
        .closest('header'),
    ).not.toBeNull();
    const filter = within(child).getByRole('searchbox');
    fireEvent.change(filter, { target: { value: 'Visible' } });
    expect(
      within(child).getByRole('checkbox', { name: 'Visible bookmark' }),
    ).toBeChecked();
    expect(
      within(child).queryByRole('checkbox', { name: 'Hidden bookmark' }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(child).getByRole('checkbox', { name: 'Imported folder' }),
    );
    expect(within(child).getByRole('status')).toHaveTextContent(
      '0 bookmarks · 1 folder',
    );
    fireEvent.change(filter, { target: { value: '' } });
    fireEvent.click(
      within(child).getByRole('button', { name: 'Collapse Imported folder' }),
    );
    expect(
      within(child).queryByRole('checkbox', { name: 'Hidden bookmark' }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(child).getByRole('button', { name: 'Expand Imported folder' }),
    );
    expect(
      within(child).getByRole('checkbox', { name: 'Hidden bookmark' }),
    ).not.toBeChecked();
    fireEvent.click(
      within(child).getByRole('checkbox', { name: 'Visible bookmark' }),
    );
    expect(
      within(child).getByRole('checkbox', { name: 'Imported folder' }),
    ).toBePartiallyChecked();
    expect(within(child).getByRole('status')).toHaveTextContent(
      '1 bookmark · 2 folders',
    );
    fireEvent.keyDown(filter, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review items' })).toHaveFocus();
  });
  it('reports missing destination roots and offers retry without silently substituting a folder', async () => {
    const loadFolders = vi
      .fn<ImportDestinations['loadFolders']>()
      .mockResolvedValueOnce([
        {
          id: id(4),
          parentId: id(99),
          isRoot: false,
          profileId: id(1),
          title: 'Orphan',
          createdAt: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: id(3),
          parentId: null,
          isRoot: true,
          profileId: id(1),
          title: 'Home',
          createdAt: 1,
        },
      ]);
    const test = setup({ loadFolders });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'destination could not be loaded',
    );
    expect(
      screen.getByRole('button', { name: 'Destination folder' }),
    ).toBeDisabled();
    expect(test.report).toHaveBeenCalledWith({
      level: 'ERROR',
      code: 'import.destination.failed',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Destination folder' }),
      ).toBeEnabled(),
    );
  });
  it('preserves HTML folders without a contents-only shortcut', () => {
    setup({}, { format: 'html' });
    expect(
      screen.queryByRole('button', { name: 'Choose contents-only folders' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review items' }));
    const review = screen.getByRole('dialog', {
      name: 'Review imported items',
    });
    expect(
      within(review).getByRole('checkbox', { name: 'Imported folder' }),
    ).toBeChecked();
    expect(within(review).getByRole('status')).toHaveTextContent(
      '2 bookmarks · 2 folders',
    );
  });
  it('pages large reviews without excluding off-page rows or changing selection', async () => {
    setup(
      {},
      {
        items: Array.from({ length: 201 }, (_, index) => ({
          id: String(index),
          parentId: null,
          title: `Synthetic ${index}`,
          kind: 'bookmark' as const,
          index,
        })),
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Review items' }));
    const review = screen.getByRole('dialog', {
      name: 'Review imported items',
    });
    expect(
      within(review).getAllByRole('checkbox', { hidden: true }),
    ).toHaveLength(200);
    fireEvent.click(within(review).getByRole('button', { name: 'Next page' }));
    expect(
      within(review).getByText('Page 2 of 2', { exact: true }),
    ).toBeVisible();
    fireEvent.click(
      within(review).getByLabelText('Synthetic 200', { exact: true }),
    );
    expect(
      within(review).getByText('200 bookmarks', { exact: false }),
    ).toBeVisible();
    fireEvent.click(
      within(review).getByRole('button', {
        name: 'Previous page',
      }),
    );
    expect(
      within(review)
        .getAllByRole('checkbox', { hidden: true })
        .every((input) => (input as HTMLInputElement).checked),
    ).toBe(true);
  });
  it('automatically opens item review only when the originating preference enables it', () => {
    setup(
      {},
      {
        preferences: {
          autoOpenReview: true,
          rememberDestination: false,
          closeAfterSuccess: false,
          rememberedFolders: {},
        },
      },
    );
    expect(
      screen.getByRole('dialog', {
        name: 'Review imported items',
      }),
    ).toBeVisible();
  });
  it('requires a folder choice when a remembered destination is missing', async () => {
    const test = setup(
      {},
      {
        preferences: {
          autoOpenReview: false,
          rememberDestination: true,
          closeAfterSuccess: false,
          rememberedFolders: { [id(1)]: id(99) },
        },
      },
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Destination folder' }),
      ).toBeEnabled(),
    );
    expect(
      screen.getByRole('button', { name: 'Destination folder' }),
    ).toHaveTextContent('Choose destination folder');
    expect(test.report).toHaveBeenCalledWith({
      level: 'WARN',
      code: 'import.destination.missing',
    });
    expect(
      screen.getByText(
        'The remembered folder no longer exists. Choose a destination folder.',
      ),
    ).toBeVisible();
  });
});
