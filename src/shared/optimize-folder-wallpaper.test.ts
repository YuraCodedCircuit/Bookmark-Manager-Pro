import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  optimizeFolderWallpaper,
  WallpaperOptimizationError,
} from './optimize-folder-wallpaper';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function installCanvas(alpha = 255) {
  const context = {
    canvas: { height: 0, width: 0 },
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray([0, 0, 0, alpha]),
    })),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    function (this: HTMLCanvasElement) {
      context.canvas = this;
      return context as unknown as CanvasRenderingContext2D;
    },
  );
  return context;
}

function dependencies(width: number, height: number) {
  const close = vi.fn();
  const encode = vi.fn(
    async (_canvas: HTMLCanvasElement, type: string) =>
      new Blob(['optimized'], { type }),
  );
  return {
    close,
    encode,
    value: {
      decode: vi.fn(async () => ({
        close,
        height,
        source: document.createElement('canvas'),
        width,
      })),
      encode,
      inspect: vi.fn(async () => ({ height, width })),
    },
  };
}

describe('optimizeFolderWallpaper', () => {
  it('rejects a forged PNG before browser decoding', async () => {
    const decode = vi.fn();
    vi.stubGlobal('createImageBitmap', decode);
    await expect(
      optimizeFolderWallpaper(
        new File(['not a png'], 'wallpaper.png', { type: 'image/png' }),
        false,
      ),
    ).rejects.toMatchObject({ reason: 'decode' });
    expect(decode).not.toHaveBeenCalled();
  });

  it('reads the encoded PNG dimensions before allocating decoded pixels', async () => {
    const bytes = new Uint8Array(24);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(bytes.buffer);
    view.setUint32(16, 7681);
    view.setUint32(20, 4320);
    const decode = vi.fn();
    vi.stubGlobal('createImageBitmap', decode);
    await expect(
      optimizeFolderWallpaper(
        new File([bytes], 'wallpaper.png', { type: 'image/png' }),
        false,
      ),
    ).rejects.toMatchObject({ reason: 'dimensions' });
    expect(decode).not.toHaveBeenCalled();
  });

  it('rejects a source above the standard limit unless large imports are enabled', async () => {
    const file = new File([new Uint8Array(1_000_001)], 'wallpaper.jpg', {
      type: 'image/jpeg',
    });
    await expect(optimizeFolderWallpaper(file, false)).rejects.toMatchObject({
      reason: 'size',
    });
    installCanvas();
    const deps = dependencies(1920, 1080);
    await expect(
      optimizeFolderWallpaper(file, true, deps.value),
    ).resolves.toMatch(/^data:image\/webp;base64,/);
  });

  it('rejects dimensions above the 8K safety ceiling before decoding', async () => {
    installCanvas();
    const deps = dependencies(7681, 4320);
    await expect(
      optimizeFolderWallpaper(
        new File(['image'], 'wallpaper.jpg', { type: 'image/jpeg' }),
        false,
        deps.value,
      ),
    ).rejects.toEqual(new WallpaperOptimizationError('dimensions'));
    expect(deps.value.decode).not.toHaveBeenCalled();
    expect(deps.close).not.toHaveBeenCalled();
  });

  it('resizes to the 4K output bound and encodes opaque sources as WebP', async () => {
    installCanvas();
    const deps = dependencies(7680, 4320);
    await optimizeFolderWallpaper(
      new File(['image'], 'wallpaper.bmp', { type: 'image/bmp' }),
      false,
      deps.value,
    );
    const canvas = deps.encode.mock.calls[0]?.[0];
    expect(canvas).toMatchObject({ width: 3840, height: 2160 });
    expect(deps.encode).toHaveBeenCalledWith(canvas, 'image/webp');
    expect(deps.close).toHaveBeenCalledOnce();
  });

  it('retains PNG only when the optimized pixels contain transparency', async () => {
    installCanvas(128);
    const deps = dependencies(1200, 800);
    await optimizeFolderWallpaper(
      new File(['image'], 'wallpaper.png', { type: 'image/png' }),
      false,
      deps.value,
    );
    expect(deps.encode).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      'image/png',
    );
  });

  it('rejects an optimized result that exceeds the durable image bound', async () => {
    installCanvas();
    const deps = dependencies(3840, 2160);
    deps.value.encode.mockResolvedValue(
      new Blob([new Uint8Array(4_400_001)], { type: 'image/webp' }),
    );
    await expect(
      optimizeFolderWallpaper(
        new File(['image'], 'wallpaper.jpg', { type: 'image/jpeg' }),
        false,
        deps.value,
      ),
    ).rejects.toMatchObject({ reason: 'size' });
    expect(deps.close).toHaveBeenCalledOnce();
  });
});
