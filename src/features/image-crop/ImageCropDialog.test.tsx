import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { ImageCropDialog } from './ImageCropDialog';

vi.mock('./process-cropped-image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./process-cropped-image')>()),
  inspectCropSource: vi.fn(async () => ({ height: 1000, width: 1000 })),
  processCroppedImage: vi.fn(async () => 'data:image/webp;base64,cropped'),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ImageCropDialog', () => {
  it('supports precise keyboard adjustment and applies a transient crop', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <ImageCropDialog
        onApply={onApply}
        onCancel={vi.fn()}
        source="data:image/png;base64,source"
      />,
    );

    const region = await screen.findByRole('group', { name: 'Crop region' });
    expect(screen.getByRole('combobox', { name: 'Crop shape' })).toHaveValue(
      'card',
    );
    region.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByLabelText('Top')).toHaveValue(38);
    await user.click(screen.getByRole('button', { name: 'Apply crop' }));
    expect(onApply).toHaveBeenCalledWith(
      'data:image/webp;base64,cropped',
      expect.objectContaining({ shape: 'card', zoom: 1 }),
    );
  });

  it('cancels without applying changes', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onCancel = vi.fn();
    render(
      <ImageCropDialog
        onApply={onApply}
        onCancel={onCancel}
        source="data:image/png;base64,source"
      />,
    );
    await screen.findByRole('group', { name: 'Crop region' });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('switches to Free when a resize handle changes the crop size', async () => {
    const user = userEvent.setup();
    render(
      <ImageCropDialog
        onApply={vi.fn()}
        onCancel={vi.fn()}
        source="data:image/png;base64,source"
      />,
    );
    await screen.findByRole('group', { name: 'Crop region' });
    const shape = screen.getByRole('combobox', { name: 'Crop shape' });
    screen.getByRole('button', { name: 'Resize from the right' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(shape).toHaveValue('free');
  });

  it('switches to Free when exact width or height is changed', async () => {
    const user = userEvent.setup();
    render(
      <ImageCropDialog
        onApply={vi.fn()}
        onCancel={vi.fn()}
        source="data:image/png;base64,source"
      />,
    );
    await screen.findByRole('group', { name: 'Crop region' });
    await user.clear(screen.getByLabelText('Width'));
    await user.type(screen.getByLabelText('Width'), '900');
    expect(screen.getByRole('combobox', { name: 'Crop shape' })).toHaveValue(
      'free',
    );
  });

  it('updates the selected source area when zoom changes', async () => {
    render(
      <ImageCropDialog
        onApply={vi.fn()}
        onCancel={vi.fn()}
        source="data:image/png;base64,source"
      />,
    );
    await screen.findByRole('group', { name: 'Crop region' });
    const initialWidth = Number(
      (screen.getByLabelText('Width') as HTMLInputElement).value,
    );
    fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), {
      target: { value: '3' },
    });
    expect(screen.getByLabelText('Width')).toHaveValue(
      Math.round(initialWidth / 3),
    );
    expect(screen.getByText(/Output:/)).toHaveTextContent('333 x 309 pixels');
  });
});
