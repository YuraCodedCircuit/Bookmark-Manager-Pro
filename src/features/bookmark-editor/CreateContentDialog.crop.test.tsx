import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import {
  inspectCropSource,
  processCroppedImage,
} from '../image-crop/process-cropped-image';
import { CreateContentDialog } from './CreateContentDialog';

vi.mock('../image-crop/process-cropped-image', () => ({
  inspectCropSource: vi.fn(async () => ({ height: 1080, width: 1920 })),
  processCroppedImage: vi.fn(async () =>
    Promise.resolve('data:image/webp;base64,automatic'),
  ),
}));

vi.mock('../image-crop/ImageCropDialog', () => ({
  ImageCropDialog: ({
    initialSession,
    onApply,
    source,
  }: {
    initialSession?: {
      crop: { height: number; width: number; x: number; y: number };
      shape: 'card' | 'free';
      zoom: number;
    };
    onApply(
      result: string,
      session: {
        crop: { height: number; width: number; x: number; y: number };
        shape: 'free';
        zoom: number;
      },
    ): void;
    source: string;
  }) => (
    <>
      <output data-testid="crop-source">
        {source}|{initialSession ? JSON.stringify(initialSession) : 'none'}
      </output>
      <button
        onClick={() =>
          onApply('data:image/webp;base64,cropped', {
            crop: { height: 200, width: 200, x: 0, y: 0 },
            shape: 'free',
            zoom: 1,
          })
        }
        type="button"
      >
        Apply mocked crop
      </button>
    </>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CreateContentDialog crop integration', () => {
  it('uses Fit after applying a free crop so no second center crop occurs', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn(async () => undefined);
    render(
      <CreateContentDialog
        initialValue={{
          cardAppearance: {
            fit: 'fill',
            kind: 'image',
            value: 'data:image/png;base64,source',
          },
          note: '',
          tags: [],
          title: 'Image folder',
        }}
        isOpen
        kind="folder"
        onClose={vi.fn()}
        onCreate={onCreate}
        parentName="Home"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Crop image' }));
    await user.click(screen.getByRole('button', { name: 'Apply mocked crop' }));
    expect(screen.getByLabelText('Choose a fit for your image')).toHaveValue(
      'fit',
    );
    expect(
      screen.getByText(
        'Crop applied. Image fit changed to Fit so the complete crop remains visible.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save folder' }));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        cardAppearance: {
          fit: 'fit',
          kind: 'image',
          value: 'data:image/webp;base64,cropped',
        },
      }),
    );
  });

  it('auto-crops a popup screenshot while retaining the original for editing', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn(async () => undefined);
    const onAutoCropResult = vi.fn();
    const source = 'data:image/png;base64,original';
    render(
      <CreateContentDialog
        autoCropScreenshot
        initialValue={{
          cardAppearance: { kind: 'color', value: '#2f7de1' },
          note: '',
          tags: [],
          title: 'Current page',
          url: 'https://example.com/',
        }}
        isOpen
        kind="bookmark"
        onAutoCropResult={onAutoCropResult}
        onCaptureScreenshot={vi.fn(async () => source)}
        onClose={vi.fn()}
        onCreate={onCreate}
        parentName="Home"
      />,
    );

    await user.click(screen.getByLabelText('Screenshot'));
    await user.click(
      screen.getByRole('button', { name: 'Capture current page' }),
    );
    expect(
      await screen.findByText(/automatically cropped/i),
    ).toBeInTheDocument();
    expect(inspectCropSource).toHaveBeenCalledWith(source);
    expect(processCroppedImage).toHaveBeenCalledWith(source, {
      height: 1080,
      width: 1166,
      x: 0,
      y: 0,
    });
    expect(onAutoCropResult).toHaveBeenCalledWith('succeeded');

    await user.click(screen.getByRole('button', { name: 'Crop image' }));
    expect(screen.getByTestId('crop-source')).toHaveTextContent(source);
    expect(screen.getByTestId('crop-source')).toHaveTextContent(
      '"shape":"card"',
    );
    expect(screen.getByTestId('crop-source')).toHaveTextContent('"x":0');
    expect(screen.getByTestId('crop-source')).toHaveTextContent('"y":0');
  });

  it('prevents duplicate capture and saving while automatic cropping is pending', async () => {
    const user = userEvent.setup();
    let finishProcessing: ((value: string) => void) | undefined;
    vi.mocked(processCroppedImage).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishProcessing = resolve;
        }),
    );
    const onCaptureScreenshot = vi.fn(
      async () => 'data:image/png;base64,original',
    );
    render(
      <CreateContentDialog
        autoCropScreenshot
        initialValue={{
          cardAppearance: { kind: 'color', value: '#2f7de1' },
          note: '',
          tags: [],
          title: 'Current page',
          url: 'https://example.com/',
        }}
        isOpen
        kind="bookmark"
        onCaptureScreenshot={onCaptureScreenshot}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        parentName="Home"
      />,
    );

    await user.click(screen.getByLabelText('Screenshot'));
    await user.click(
      screen.getByRole('button', { name: 'Capture current page' }),
    );

    const captureButton = await screen.findByRole('button', {
      name: 'Capturing and processing...',
    });
    expect(captureButton).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Save bookmark' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(onCaptureScreenshot).toHaveBeenCalledTimes(1);

    finishProcessing?.('data:image/webp;base64,automatic');
    expect(
      await screen.findByText(/automatically cropped/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save bookmark' })).toBeEnabled();
  });

  it('falls back to the retained original when automatic cropping fails', async () => {
    const user = userEvent.setup();
    const source = 'data:image/png;base64,original';
    vi.mocked(processCroppedImage).mockRejectedValueOnce(
      new Error('encode-failed'),
    );
    const onAutoCropResult = vi.fn();
    render(
      <CreateContentDialog
        autoCropScreenshot
        initialValue={{
          cardAppearance: { kind: 'color', value: '#2f7de1' },
          note: '',
          tags: [],
          title: 'Current page',
          url: 'https://example.com/',
        }}
        isOpen
        kind="bookmark"
        onAutoCropResult={onAutoCropResult}
        onCaptureScreenshot={vi.fn(async () => source)}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        parentName="Home"
      />,
    );

    await user.click(screen.getByLabelText('Screenshot'));
    await user.click(
      screen.getByRole('button', { name: 'Capture current page' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Automatic crop could not be applied. The original screenshot is still available.',
    );
    expect(onAutoCropResult).toHaveBeenCalledWith('fallback');
    await user.click(screen.getByRole('button', { name: 'Crop image' }));
    expect(screen.getByTestId('crop-source')).toHaveTextContent(
      `${source}|none`,
    );
  });
});
