import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { FolderStyleDialog } from './FolderStyleDialog';

vi.mock('../../shared/optimize-folder-wallpaper', () => ({
  optimizeFolderWallpaper: vi.fn(
    async (file: File, allowLargeSource: boolean) => {
      if (
        !['image/png', 'image/jpeg', 'image/bmp'].includes(file.type) ||
        file.size > (allowLargeSource ? 10_000_000 : 1_000_000)
      ) {
        throw new Error('wallpaper-rejected');
      }
      return 'data:image/webp;base64,b3B0aW1pemVk';
    },
  ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('FolderStyleDialog', () => {
  it('keeps every section collapsed initially and opens at most one', async () => {
    const user = userEvent.setup();
    render(
      <FolderStyleDialog
        appearance={{ kind: 'color', value: '#0b121a' }}
        bookmarkGroupBy="none"
        bookmarkSortBy="manual"
        bookmarkSortDirection="ascending"
        bookmarkView="card"
        cardSize="medium"
        cardSpacing="comfortable"
        detailsTableTransparency={0}
        folderName="Home"
        isOpen
        includeNavigationBackground={false}
        navigationTransparency={45}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Customize folder style',
    });
    const view = within(dialog).getByText('Folder view').closest('details');
    const background = within(dialog)
      .getByText('Folder background')
      .closest('details');
    const navigation = within(dialog)
      .getByText('Navigation panel')
      .closest('details');
    if (!view || !background || !navigation)
      throw new Error('folder-style-section-not-found');

    expect(view).not.toHaveAttribute('open');
    expect(background).not.toHaveAttribute('open');
    expect(navigation).not.toHaveAttribute('open');

    await user.click(within(dialog).getByText('Folder view'));
    expect(view).toHaveAttribute('open');
    await user.click(within(dialog).getByText('Folder background'));
    expect(view).not.toHaveAttribute('open');
    expect(background).toHaveAttribute('open');
    expect(navigation).not.toHaveAttribute('open');

    await user.click(within(dialog).getByText('Folder background'));
    expect(background).not.toHaveAttribute('open');

    await user.click(within(dialog).getByText('Navigation panel'));
    expect(navigation).toHaveAttribute('open');
    fireEvent(dialog, new Event('close'));
    expect(navigation).not.toHaveAttribute('open');
  });

  it('reports an oversized image without retaining an inline error', async () => {
    const user = userEvent.setup();
    const onImageRejected = vi.fn(() => {
      throw new Error('notification-unavailable');
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <FolderStyleDialog
        appearance={{ kind: 'color', value: '#0b121a' }}
        bookmarkGroupBy="none"
        bookmarkSortBy="manual"
        bookmarkSortDirection="ascending"
        bookmarkView="card"
        cardSize="medium"
        cardSpacing="comfortable"
        detailsTableTransparency={0}
        folderName="Home"
        isOpen
        includeNavigationBackground={false}
        navigationTransparency={45}
        onClose={vi.fn()}
        onImageRejected={onImageRejected}
        onSave={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Customize folder style',
    });
    await user.click(within(dialog).getByText('Folder background'));
    await user.click(within(dialog).getByLabelText('Image'));
    const input = within(dialog).getByLabelText('Choose background image');
    fireEvent.change(input, {
      target: {
        files: [
          new File([new Uint8Array(1_000_001)], 'large.png', {
            type: 'image/png',
          }),
        ],
      },
    });

    await waitFor(() => expect(onImageRejected).toHaveBeenCalledOnce());
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.change(input, {
      target: {
        files: [new File(['text'], 'not-an-image.txt', { type: 'text/plain' })],
      },
    });
    await waitFor(() => expect(onImageRejected).toHaveBeenCalledTimes(2));

    fireEvent.change(input, {
      target: {
        files: [new File(['small'], 'small.png', { type: 'image/png' })],
      },
    });
    expect(
      await within(dialog).findByAltText('Selected folder background image'),
    ).toHaveAttribute('src', 'data:image/webp;base64,b3B0aW1pemVk');
  });

  it('accepts a larger source only when the profile setting allows it', async () => {
    const onImageRejected = vi.fn();
    render(
      <FolderStyleDialog
        allowLargeWallpaperImports
        appearance={{ kind: 'color', value: '#0b121a' }}
        bookmarkGroupBy="none"
        bookmarkSortBy="manual"
        bookmarkSortDirection="ascending"
        bookmarkView="card"
        cardSize="medium"
        cardSpacing="comfortable"
        detailsTableTransparency={0}
        folderName="Home"
        isOpen
        includeNavigationBackground={false}
        navigationTransparency={45}
        onClose={vi.fn()}
        onImageRejected={onImageRejected}
        onSave={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Customize folder style',
    });
    await userEvent.click(within(dialog).getByText('Folder background'));
    await userEvent.click(within(dialog).getByLabelText('Image'));
    fireEvent.change(within(dialog).getByLabelText('Choose background image'), {
      target: {
        files: [
          new File([new Uint8Array(1_000_001)], 'large.jpg', {
            type: 'image/jpeg',
          }),
        ],
      },
    });
    expect(
      await within(dialog).findByAltText('Selected folder background image'),
    ).toHaveAttribute('src', 'data:image/webp;base64,b3B0aW1pemVk');
    expect(onImageRejected).not.toHaveBeenCalled();
  });

  it('generates random color and gradient values', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.75)
      .mockReturnValueOnce(0.25);
    render(
      <FolderStyleDialog
        appearance={{ kind: 'color', value: '#0b121a' }}
        bookmarkGroupBy="none"
        bookmarkSortBy="manual"
        bookmarkSortDirection="ascending"
        bookmarkView="card"
        cardSize="medium"
        cardSpacing="comfortable"
        detailsTableTransparency={0}
        folderName="Home"
        isOpen
        includeNavigationBackground={false}
        navigationTransparency={45}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Customize folder style',
    });
    await user.click(within(dialog).getByText('Folder background'));
    await user.click(
      within(dialog).getByRole('button', { name: 'Generate random color' }),
    );
    expect(within(dialog).getByLabelText('Background color')).toHaveValue(
      '#000000',
    );

    await user.click(within(dialog).getByLabelText('Gradient'));
    await user.click(
      within(dialog).getByRole('button', {
        name: 'Generate random gradient',
      }),
    );
    expect(within(dialog).getByLabelText('Gradient color 1')).toHaveValue(
      '#000000',
    );
    expect(within(dialog).getByLabelText('Gradient color 2')).toHaveValue(
      '#800000',
    );
    expect(within(dialog).getByLabelText('Gradient color 3')).toHaveValue(
      '#c00000',
    );
    expect(within(dialog).getByLabelText('Gradient direction')).toHaveValue(90);
    expect(
      within(dialog).getByText(
        'Random gradient generated: #000000, #800000, #c00000 at 90 degrees.',
      ),
    ).toBeInTheDocument();
  });

  it('prefills and saves a three-color gradient for the open folder', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(
      <FolderStyleDialog
        appearance={{ kind: 'color', value: '#0b121a' }}
        bookmarkGroupBy="none"
        bookmarkSortBy="manual"
        bookmarkSortDirection="ascending"
        bookmarkView="card"
        cardSize="medium"
        cardSpacing="comfortable"
        detailsTableTransparency={0}
        folderName="Home"
        isOpen
        includeNavigationBackground={false}
        navigationTransparency={45}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Customize folder style',
    });
    expect(
      within(dialog).getByText(
        'Customize the display and background for Home.',
      ),
    ).toBeVisible();
    await user.click(within(dialog).getByText('Folder background'));
    await user.click(within(dialog).getByLabelText('Image'));
    const imageFit = within(dialog).getByLabelText(
      'Choose a fit for your image',
    );
    expect(within(imageFit).getAllByRole('option')).toHaveLength(6);
    expect(imageFit).toHaveValue('fill');
    await user.click(within(dialog).getByText('Folder view'));
    await user.selectOptions(
      within(dialog).getByLabelText('Card size'),
      'large',
    );
    await user.selectOptions(
      within(dialog).getByLabelText('Card spacing'),
      'spacious',
    );
    await user.selectOptions(within(dialog).getByLabelText('Sort by'), 'title');
    await user.selectOptions(
      within(dialog).getByLabelText('Direction'),
      'descending',
    );
    await user.selectOptions(
      within(dialog).getByLabelText('Group bookmarks by'),
      'type',
    );
    await user.selectOptions(within(dialog).getByLabelText('View'), 'details');
    const tableTransparency = within(dialog).getByLabelText(
      'Table background transparency: 0%',
    );
    fireEvent.change(tableTransparency, { target: { value: '35' } });
    await user.click(within(dialog).getByText('Folder background'));
    await user.click(within(dialog).getByLabelText('Gradient'));
    fireEvent.change(within(dialog).getByLabelText('Gradient color 1'), {
      target: { value: '#112233' },
    });
    const direction = within(dialog).getByLabelText('Gradient direction');
    const slider = within(dialog).getByLabelText('Gradient direction slider');
    expect(direction).toHaveAttribute('type', 'number');
    expect(direction).toHaveAttribute('min', '0');
    expect(direction).toHaveAttribute('max', '359');
    fireEvent.change(slider, { target: { value: '127' } });
    expect(direction).toHaveValue(127);
    await user.click(within(dialog).getByText('Navigation panel'));
    const navigationTransparency =
      within(dialog).getByLabelText('Transparency: 45%');
    expect(navigationTransparency).toBeDisabled();
    await user.click(
      within(dialog).getByLabelText('Include the navigation panel'),
    );
    fireEvent.change(navigationTransparency, { target: { value: '70' } });
    await user.click(
      within(dialog).getByRole('button', { name: 'Save style' }),
    );
    expect(onSave).toHaveBeenCalledWith({
      appearance: {
        colors: ['#112233', '#2f7de1', '#9250bd'],
        direction: 127,
        kind: 'gradient',
      },
      bookmarkGroupBy: 'type',
      bookmarkSortBy: 'title',
      bookmarkSortDirection: 'descending',
      bookmarkView: 'details',
      cardSize: 'large',
      cardSpacing: 'spacious',
      detailsTableTransparency: 35,
      includeNavigationBackground: true,
      navigationTransparency: 70,
    });
  });

  it('removes the folder background and only shows table transparency for Details', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(
      <FolderStyleDialog
        appearance={{ kind: 'color', value: '#0b121a' }}
        bookmarkGroupBy="none"
        bookmarkSortBy="manual"
        bookmarkSortDirection="ascending"
        bookmarkView="card"
        cardSize="medium"
        cardSpacing="comfortable"
        detailsTableTransparency={20}
        folderName="Home"
        isOpen
        includeNavigationBackground={false}
        navigationTransparency={45}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Customize folder style',
    });
    expect(
      within(dialog).queryByText('Table background transparency: 20%'),
    ).not.toBeInTheDocument();
    await user.click(within(dialog).getByText('Folder view'));
    await user.selectOptions(within(dialog).getByLabelText('View'), 'details');
    expect(
      within(dialog).getByLabelText('Table background transparency: 20%'),
    ).toBeVisible();
    expect(
      within(dialog).getByText(
        'This controls the Details table background for the current folder.',
      ),
    ).toHaveClass('content-editor__help');
    expect(
      within(dialog).getByText(
        'The current theme adds a readability overlay above the folder background.',
      ),
    ).toHaveClass('content-editor__help');
    await user.click(within(dialog).getByText('Folder background'));
    await user.click(within(dialog).getByLabelText('No background'));
    await user.click(
      within(dialog).getByRole('button', { name: 'Save style' }),
    );
    expect(onSave).toHaveBeenCalledWith({
      appearance: { kind: 'none' },
      bookmarkGroupBy: 'none',
      bookmarkSortBy: 'manual',
      bookmarkSortDirection: 'ascending',
      bookmarkView: 'details',
      cardSize: 'medium',
      cardSpacing: 'comfortable',
      detailsTableTransparency: 20,
      includeNavigationBackground: false,
      navigationTransparency: 45,
    });
  });

  it('reloads every saved value from the current folder each time it opens', async () => {
    const user = userEvent.setup();
    const common = {
      onClose: vi.fn(),
      onSave: vi.fn(async () => undefined),
    };
    const { rerender } = render(
      <FolderStyleDialog
        {...common}
        appearance={{ kind: 'color', value: '#112233' }}
        bookmarkGroupBy="none"
        bookmarkSortBy="manual"
        bookmarkSortDirection="ascending"
        bookmarkView="card"
        cardSize="medium"
        cardSpacing="comfortable"
        detailsTableTransparency={0}
        folderName="First"
        includeNavigationBackground={false}
        isOpen
        navigationTransparency={45}
      />,
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Customize folder style',
    });
    await user.click(within(dialog).getByText('Folder view'));
    await user.selectOptions(within(dialog).getByLabelText('View'), 'list');
    await user.click(within(dialog).getByText('Folder background'));
    await user.click(within(dialog).getByLabelText('No background'));

    const nextFolderProps = {
      appearance: {
        fit: 'span' as const,
        kind: 'image' as const,
        value: 'data:image/png;base64,AA==',
      },
      bookmarkGroupBy: 'domain' as const,
      bookmarkSortBy: 'updatedAt' as const,
      bookmarkSortDirection: 'descending' as const,
      bookmarkView: 'details' as const,
      cardSize: 'large' as const,
      cardSpacing: 'spacious' as const,
      detailsTableTransparency: 64,
      folderName: 'Second',
      includeNavigationBackground: true,
      navigationTransparency: 22,
    };
    rerender(<></>);
    rerender(<FolderStyleDialog {...common} {...nextFolderProps} isOpen />);

    const reopenedDialog = screen.getByRole('dialog', {
      name: 'Customize folder style',
    });
    await user.click(within(reopenedDialog).getByText('Folder view'));
    expect(within(reopenedDialog).getByLabelText('View')).toHaveValue(
      'details',
    );
    expect(within(reopenedDialog).getByLabelText('Card size')).toHaveValue(
      'large',
    );
    expect(within(reopenedDialog).getByLabelText('Card spacing')).toHaveValue(
      'spacious',
    );
    expect(within(reopenedDialog).getByLabelText('Sort by')).toHaveValue(
      'updatedAt',
    );
    expect(within(reopenedDialog).getByLabelText('Direction')).toHaveValue(
      'descending',
    );
    expect(
      within(reopenedDialog).getByLabelText('Group bookmarks by'),
    ).toHaveValue('domain');
    expect(
      within(reopenedDialog).getByLabelText(
        'Table background transparency: 64%',
      ),
    ).toHaveValue('64');
    await user.click(within(reopenedDialog).getByText('Folder background'));
    expect(within(reopenedDialog).getByLabelText('Image')).toBeChecked();
    expect(
      within(reopenedDialog).getByLabelText('Choose a fit for your image'),
    ).toHaveValue('span');
    expect(
      within(reopenedDialog).getByAltText('Selected folder background image'),
    ).toHaveAttribute('src', 'data:image/png;base64,AA==');
    await user.click(within(reopenedDialog).getByText('Navigation panel'));
    expect(
      within(reopenedDialog).getByLabelText('Include the navigation panel'),
    ).toBeChecked();
    expect(
      within(reopenedDialog).getByLabelText('Transparency: 22%'),
    ).toHaveValue('22');
  });
});
