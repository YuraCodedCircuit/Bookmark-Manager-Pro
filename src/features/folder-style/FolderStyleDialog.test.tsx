import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { FolderStyleDialog } from './FolderStyleDialog';

afterEach(cleanup);

describe('FolderStyleDialog', () => {
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
    await user.selectOptions(within(dialog).getByLabelText('View'), 'list');
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
