import {
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../localization/i18n';
import {
  inspectCropSource,
  processCroppedImage,
} from '../image-crop/process-cropped-image';
import { FolderStyleDialog } from './FolderStyleDialog';
vi.mock('../image-crop/process-cropped-image', () => ({
  MAX_CROP_OUTPUT_EDGE: 870,
  inspectCropSource: vi.fn(async () => ({ width: 1000, height: 600 })),
  processCroppedImage: vi.fn(async () => 'data:image/webp;base64,cropped'),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const source = 'data:image/png;base64,original';
function mount(onCropFailure = vi.fn(async () => undefined)) {
  const onSave = vi.fn(async () => undefined);
  const onClose = vi.fn();
  render(
    <FolderStyleDialog
      appearance={{ kind: 'image', fit: 'fill', value: source }}
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
      onCropFailure={onCropFailure}
      onClose={onClose}
      onSave={onSave}
    />,
  );
  return { onSave, onClose };
}
describe('Folder style crop integration', () => {
  it('places crop after the preview, retains the source for recropping, and saves only on request', async () => {
    const user = userEvent.setup();
    const { onSave } = mount();
    await user.click(screen.getByText('Folder background'));
    const button = screen.getByRole('button', { name: 'Crop image' });
    expect(
      screen.getByAltText('Selected folder background image')
        .nextElementSibling,
    ).toBe(button);
    await user.click(button);
    const crop = screen.getByRole('dialog', { name: 'Crop image' });
    await waitFor(() =>
      expect(
        within(crop).getByRole('button', { name: 'Apply crop' }),
      ).toBeEnabled(),
    );
    await user.click(within(crop).getByRole('button', { name: 'Apply crop' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByAltText('Selected folder background image'),
    ).toHaveAttribute('src', 'data:image/webp;base64,cropped');
    expect(screen.getByLabelText('Choose a fit for your image')).toHaveValue(
      'fit',
    );
    await waitFor(() => expect(button).toHaveFocus());
    await user.click(button);
    expect(inspectCropSource).toHaveBeenLastCalledWith(source);
    await user.click(
      within(screen.getByRole('dialog', { name: 'Crop image' })).getByRole(
        'button',
        { name: 'Cancel' },
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Save style' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        appearance: {
          kind: 'image',
          fit: 'fit',
          value: 'data:image/webp;base64,cropped',
        },
      }),
    );
  });
  it('keeps the existing wallpaper and parent open after cancel or crop failure', async () => {
    const user = userEvent.setup();
    const diagnostic = vi.fn(async () => {
      throw new Error('diagnostic-failed');
    });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { onClose, onSave } = mount(diagnostic);
    await user.click(screen.getByText('Folder background'));
    vi.mocked(processCroppedImage).mockRejectedValueOnce(
      new Error('encode-failed'),
    );
    await user.click(screen.getByRole('button', { name: 'Crop image' }));
    const crop = screen.getByRole('dialog', { name: 'Crop image' });
    await waitFor(() =>
      expect(
        within(crop).getByRole('button', { name: 'Apply crop' }),
      ).toBeEnabled(),
    );
    await user.click(within(crop).getByRole('button', { name: 'Apply crop' }));
    expect(within(crop).getByRole('alert')).toBeVisible();
    expect(diagnostic).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        'folder-wallpaper-crop-diagnostic-failed',
      ),
    );
    consoleError.mockRestore();
    await user.click(within(crop).getByRole('button', { name: 'Cancel' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByAltText('Selected folder background image'),
    ).toHaveAttribute('src', source);
  });
});
