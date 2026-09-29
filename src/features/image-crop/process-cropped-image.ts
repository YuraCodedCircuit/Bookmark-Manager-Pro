import type { CropRect, ImageDimensions } from './crop-geometry';

export const MAX_CROP_SOURCE_WIDTH = 7680;
export const MAX_CROP_SOURCE_HEIGHT = 4320;
export const MAX_CROP_OUTPUT_EDGE = 870;
export const MAX_CROP_DATA_URL_LENGTH = 1_500_000;

export class ImageCropError extends Error {
  constructor(readonly reason: 'decode' | 'dimensions' | 'encode' | 'size') {
    super(`image-crop-${reason}`);
    this.name = 'ImageCropError';
  }
}

interface DecodedCropSource extends ImageDimensions {
  readonly source: CanvasImageSource;
  close(): void;
}

interface ImageCropDependencies {
  decode(source: string): Promise<DecodedCropSource>;
  encode(
    canvas: HTMLCanvasElement,
    type: 'image/png' | 'image/webp',
    quality: number,
  ): string;
}

function decodeCropSource(source: string): Promise<DecodedCropSource> {
  return new Promise((resolve, reject) => {
    if (!/^data:image\/(?:bmp|jpeg|png|webp);base64,/.test(source)) {
      reject(new ImageCropError('decode'));
      return;
    }
    const image = new Image();
    image.onload = () =>
      resolve({
        close: () => undefined,
        height: image.naturalHeight,
        source: image,
        width: image.naturalWidth,
      });
    image.onerror = () => reject(new ImageCropError('decode'));
    image.src = source;
  });
}

function hasTransparency(context: CanvasRenderingContext2D): boolean {
  const pixels = context.getImageData(
    0,
    0,
    context.canvas.width,
    context.canvas.height,
  ).data;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] !== 255) return true;
  }
  return false;
}

function renderCrop(
  decoded: DecodedCropSource,
  crop: CropRect,
  scale: number,
): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(crop.width * scale));
  canvas.height = Math.max(1, Math.round(crop.height * scale));
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new ImageCropError('encode');
  context.drawImage(
    decoded.source,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return { canvas, context };
}

/** Produces a bounded local crop without persisting or transmitting image data. */
export async function processCroppedImage(
  source: string,
  crop: CropRect,
  dependencies: ImageCropDependencies = {
    decode: decodeCropSource,
    encode: (canvas, type, quality) => canvas.toDataURL(type, quality),
  },
): Promise<string> {
  const decoded = await dependencies.decode(source);
  try {
    if (
      decoded.width < 1 ||
      decoded.height < 1 ||
      decoded.width > MAX_CROP_SOURCE_WIDTH ||
      decoded.height > MAX_CROP_SOURCE_HEIGHT
    ) {
      throw new ImageCropError('dimensions');
    }
    if (
      crop.x < 0 ||
      crop.y < 0 ||
      crop.width < 1 ||
      crop.height < 1 ||
      crop.x + crop.width > decoded.width ||
      crop.y + crop.height > decoded.height
    ) {
      throw new ImageCropError('dimensions');
    }

    const baseScale = Math.min(
      1,
      MAX_CROP_OUTPUT_EDGE / crop.width,
      MAX_CROP_OUTPUT_EDGE / crop.height,
    );
    const attempts = [
      { quality: 0.85, scale: 1 },
      { quality: 0.75, scale: 0.85 },
      { quality: 0.65, scale: 0.7 },
      { quality: 0.55, scale: 0.55 },
    ];
    let transparent: boolean | undefined;
    for (const attempt of attempts) {
      const rendered = renderCrop(decoded, crop, baseScale * attempt.scale);
      transparent ??= hasTransparency(rendered.context);
      const result = dependencies.encode(
        rendered.canvas,
        transparent ? 'image/png' : 'image/webp',
        attempt.quality,
      );
      if (result.length <= MAX_CROP_DATA_URL_LENGTH) return result;
    }
    throw new ImageCropError('size');
  } finally {
    decoded.close();
  }
}

/** Decodes source dimensions while enforcing the cropper's decompression bound. */
export async function inspectCropSource(
  source: string,
  decode: ImageCropDependencies['decode'] = decodeCropSource,
): Promise<ImageDimensions> {
  const decoded = await decode(source);
  try {
    if (
      decoded.width < 1 ||
      decoded.height < 1 ||
      decoded.width > MAX_CROP_SOURCE_WIDTH ||
      decoded.height > MAX_CROP_SOURCE_HEIGHT
    ) {
      throw new ImageCropError('dimensions');
    }
    return { height: decoded.height, width: decoded.width };
  } finally {
    decoded.close();
  }
}
