import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ImageCropError,
  MAX_CROP_DATA_URL_LENGTH,
  processCroppedImage,
} from './process-cropped-image';

afterEach(() => vi.restoreAllMocks());

function mockContext(alpha = 255) {
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    canvas: document.createElement('canvas'),
    drawImage,
    getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, alpha]) }),
  } as unknown as CanvasRenderingContext2D);
  return drawImage;
}

function dependencies(width: number, height: number) {
  const close = vi.fn();
  const encode = vi.fn(
    (canvas: HTMLCanvasElement, type: string) =>
      `data:${type};base64,${canvas.width}x${canvas.height}`,
  );
  return {
    close,
    dependencies: {
      decode: vi.fn(async () => ({
        close,
        height,
        source: document.createElement('canvas'),
        width,
      })),
      encode,
    },
    encode,
  };
}

describe('processCroppedImage', () => {
  it.each([
    ['top left', { height: 200, width: 300, x: 0, y: 0 }],
    ['top right', { height: 200, width: 300, x: 700, y: 0 }],
    ['bottom left', { height: 200, width: 300, x: 0, y: 800 }],
    ['bottom right', { height: 200, width: 300, x: 700, y: 800 }],
  ])('renders exact %s source coordinates', async (_corner, crop) => {
    const drawImage = mockContext();
    const mocks = dependencies(1000, 1000);
    await processCroppedImage(
      'data:image/png;base64,source',
      crop,
      mocks.dependencies,
    );
    expect(drawImage).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height,
    );
  });

  it('bounds opaque output to 870px and encodes WebP at 85 percent', async () => {
    mockContext();
    const mocks = dependencies(1920, 1080);
    const result = await processCroppedImage(
      'data:image/png;base64,source',
      { height: 1080, width: 1920, x: 0, y: 0 },
      mocks.dependencies,
    );

    expect(result).toContain('870x489');
    expect(mocks.encode).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      'image/webp',
      0.85,
    );
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it('preserves transparency with PNG and never upscales', async () => {
    mockContext(0);
    const mocks = dependencies(100, 80);
    await processCroppedImage(
      'data:image/png;base64,source',
      { height: 80, width: 100, x: 0, y: 0 },
      mocks.dependencies,
    );
    const canvas = mocks.encode.mock.calls[0]?.[0];
    expect(canvas).toMatchObject({ height: 80, width: 100 });
    expect(mocks.encode.mock.calls[0]?.[1]).toBe('image/png');
  });

  it('rejects oversized decoded sources', async () => {
    mockContext();
    const mocks = dependencies(7681, 100);
    await expect(
      processCroppedImage(
        'data:image/png;base64,source',
        { height: 100, width: 100, x: 0, y: 0 },
        mocks.dependencies,
      ),
    ).rejects.toEqual(new ImageCropError('dimensions'));
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it('fails safely after bounded size-reduction attempts', async () => {
    mockContext();
    const mocks = dependencies(100, 100);
    mocks.dependencies.encode = vi.fn(() =>
      'x'.repeat(MAX_CROP_DATA_URL_LENGTH + 1),
    );
    await expect(
      processCroppedImage(
        'data:image/png;base64,source',
        { height: 100, width: 100, x: 0, y: 0 },
        mocks.dependencies,
      ),
    ).rejects.toEqual(new ImageCropError('size'));
    expect(mocks.dependencies.encode).toHaveBeenCalledTimes(4);
  });
});
