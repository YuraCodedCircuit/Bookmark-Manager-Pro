import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { CreateContentDialog } from './CreateContentDialog';

afterEach(cleanup);

describe('CreateContentDialog edit mode', () => {
  it('offers screenshot appearance only when capture is supplied', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    const screenshot = 'data:image/jpeg;base64,c2NyZWVuc2hvdA==';
    render(
      <CreateContentDialog
        initialValue={{
          cardAppearance: { kind: 'color', value: '#2f7de1' },
          note: '',
          tags: [],
          title: 'Current page',
          url: 'https://example.com/',
        }}
        isOpen
        kind="bookmark"
        onCaptureScreenshot={vi.fn(async () => screenshot)}
        onClose={vi.fn()}
        onCreate={onSave}
        parentName="Home"
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Edit bookmark' });
    await user.click(within(dialog).getByLabelText('Screenshot'));
    await user.click(
      within(dialog).getByRole('button', { name: 'Capture current page' }),
    );
    expect(
      await within(dialog).findByAltText('Captured visible tab'),
    ).toHaveAttribute('src', screenshot);
    await user.click(
      within(dialog).getByRole('button', { name: 'Save bookmark' }),
    );
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        cardAppearance: { fit: 'fill', kind: 'image', value: screenshot },
      }),
    );
  });

  it('does not show screenshot appearance in the normal editor', () => {
    render(
      <CreateContentDialog
        isOpen
        kind="bookmark"
        onClose={vi.fn()}
        onCreate={vi.fn(async () => undefined)}
        parentName="Home"
      />,
    );

    expect(screen.queryByLabelText('Screenshot')).not.toBeInTheDocument();
  });

  it('submits a host without a protocol to application URL handling', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(
      <CreateContentDialog
        isOpen
        kind="bookmark"
        onClose={vi.fn()}
        onCreate={onSave}
        parentName="Home"
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'New bookmark' });
    const url = within(dialog).getByLabelText('URL');
    expect(url).toHaveAttribute('type', 'text');
    expect(url).toHaveAttribute('inputmode', 'url');
    await user.type(within(dialog).getByLabelText('Title'), 'Local app');
    await user.type(url, '127.0.0.1:5173/');
    await user.click(
      within(dialog).getByRole('button', { name: 'Create bookmark' }),
    );

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ url: '127.0.0.1:5173/' }),
    );
  });

  it('prefills every bookmark field and saves the edited value', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(
      <CreateContentDialog
        initialValue={{
          cardAppearance: {
            colors: ['#111111', '#222222', '#333333'],
            direction: 90,
            kind: 'gradient',
          },
          note: 'Saved note',
          tags: ['docs', 'work'],
          title: 'Saved bookmark',
          url: 'https://example.com/path',
        }}
        isOpen
        kind="bookmark"
        onClose={vi.fn()}
        onCreate={onSave}
        parentName="Home"
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Edit bookmark' });
    expect(within(dialog).getByLabelText('Title')).toHaveValue(
      'Saved bookmark',
    );
    expect(within(dialog).getByLabelText('URL')).toHaveValue(
      'https://example.com/path',
    );
    expect(within(dialog).getByLabelText('Tags')).toHaveValue('docs, work');
    expect(within(dialog).getByLabelText('Note')).toHaveValue('Saved note');
    expect(within(dialog).getByLabelText('Gradient')).toBeChecked();
    expect(within(dialog).getByLabelText('Gradient color 1')).toHaveValue(
      '#111111',
    );
    expect(within(dialog).getByLabelText('Gradient direction')).toHaveValue(90);
    expect(within(dialog).getByLabelText('Gradient direction')).toHaveAttribute(
      'type',
      'number',
    );
    expect(
      within(dialog).getByLabelText('Gradient direction slider'),
    ).toHaveValue('90');

    await user.click(
      within(dialog).getByRole('button', { name: 'Save bookmark' }),
    );
    expect(onSave).toHaveBeenCalledWith({
      cardAppearance: {
        colors: ['#111111', '#222222', '#333333'],
        direction: 90,
        kind: 'gradient',
      },
      note: 'Saved note',
      tags: ['docs', 'work'],
      title: 'Saved bookmark',
      url: 'https://example.com/path',
    });
  });

  it('prefills folder image appearance and uses folder edit labels', () => {
    const image = 'data:image/png;base64,aWNvbg==';
    render(
      <CreateContentDialog
        initialValue={{
          cardAppearance: { fit: 'fit', kind: 'image', value: image },
          note: 'Folder note',
          tags: ['local'],
          title: 'Saved folder',
        }}
        isOpen
        kind="folder"
        onClose={vi.fn()}
        onCreate={vi.fn()}
        parentName="Home"
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Edit folder' });
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Saved folder');
    expect(within(dialog).queryByLabelText('URL')).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Image')).toBeChecked();
    expect(
      within(dialog).getByLabelText('Choose a fit for your image'),
    ).toHaveValue('fit');
    expect(within(dialog).getByAltText('Selected card image')).toHaveAttribute(
      'src',
      image,
    );
    expect(
      within(dialog).getByRole('button', { name: 'Save folder' }),
    ).toBeVisible();
  });
});
