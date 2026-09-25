export const STANDARD_WALLPAPER_SOURCE_BYTES = 1_000_000;
export const LARGE_WALLPAPER_SOURCE_BYTES = 10_000_000;
export const MAX_WALLPAPER_SOURCE_WIDTH = 7680;
export const MAX_WALLPAPER_SOURCE_HEIGHT = 4320;
export const MAX_WALLPAPER_OUTPUT_WIDTH = 3840;
export const MAX_WALLPAPER_OUTPUT_HEIGHT = 2160;
export const MAX_WALLPAPER_OUTPUT_BYTES = 4_400_000;

const acceptedWallpaperTypes = new Set([
  'image/bmp',
  'image/jpeg',
  'image/png',
]);

export type WallpaperOptimizationFailure =
  'decode' | 'dimensions' | 'encode' | 'size' | 'type';

export class WallpaperOptimizationError extends Error {
  constructor(
    readonly reason: WallpaperOptimizationFailure,
    options?: ErrorOptions,
  ) {
    super(`wallpaper-optimization-${reason}`, options);
  }
}

interface DecodedWallpaper {
  readonly height: number;
  readonly source: CanvasImageSource;
  readonly width: number;
  close(): void;
}

interface WallpaperOptimizerDependencies {
  decode(file: File): Promise<DecodedWallpaper>;
  encode(
    canvas: HTMLCanvasElement,
    type: 'image/png' | 'image/webp',
  ): Promise<Blob>;
  inspect(
    file: File,
  ): Promise<{ readonly height: number; readonly width: number }>;
}

function readUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, false);
}

async function inspectWallpaper(
  file: File,
): Promise<{ readonly height: number; readonly width: number }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    file.type === 'image/png' &&
    bytes.length >= 24 &&
    bytes
      .slice(0, 8)
      .every(
        (value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index],
      )
  ) {
    return { height: view.getUint32(20), width: view.getUint32(16) };
  }
  if (
    file.type === 'image/bmp' &&
    bytes.length >= 26 &&
    bytes[0] === 0x42 &&
    bytes[1] === 0x4d
  ) {
    return {
      height: Math.abs(view.getInt32(22, true)),
      width: Math.abs(view.getInt32(18, true)),
    };
  }
  if (
    file.type === 'image/jpeg' &&
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8
  ) {
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
      const length = readUint16(view, offset + 2);
      if (length < 2 || offset + length + 2 > bytes.length) break;
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        return {
          height: readUint16(view, offset + 5),
          width: readUint16(view, offset + 7),
        };
      }
      offset += length + 2;
    }
  }
  throw new WallpaperOptimizationError('decode');
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/png' | 'image/webp',
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new WallpaperOptimizationError('encode'));
      },
      type,
      type === 'image/webp' ? 0.85 : undefined,
    );
  });
}

async function decodeWallpaper(file: File): Promise<DecodedWallpaper> {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      close: () => bitmap.close(),
      height: bitmap.height,
      source: bitmap,
      width: bitmap.width,
    };
  } catch (bitmapCause) {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return {
        close: () => URL.revokeObjectURL(url),
        height: image.naturalHeight,
        source: image,
        width: image.naturalWidth,
      };
    } catch (cause) {
      URL.revokeObjectURL(url);
      throw new WallpaperOptimizationError('decode', {
        cause: cause ?? bitmapCause,
      });
    }
  }
}

function hasTransparency(context: CanvasRenderingContext2D): boolean {
  const { data } = context.getImageData(
    0,
    0,
    context.canvas.width,
    context.canvas.height,
  );
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] !== 255) return true;
  }
  return false;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new WallpaperOptimizationError('encode'));
    reader.onerror = () => reject(new WallpaperOptimizationError('encode'));
    reader.readAsDataURL(blob);
  });
}

/** Validates, bounds, and locally encodes a folder wallpaper for durable storage. */
export async function optimizeFolderWallpaper(
  file: File,
  allowLargeSource: boolean,
  dependencies: WallpaperOptimizerDependencies = {
    decode: decodeWallpaper,
    encode: canvasToBlob,
    inspect: inspectWallpaper,
  },
): Promise<string> {
  const maximumBytes = allowLargeSource
    ? LARGE_WALLPAPER_SOURCE_BYTES
    : STANDARD_WALLPAPER_SOURCE_BYTES;
  if (file.size > maximumBytes) throw new WallpaperOptimizationError('size');
  if (!acceptedWallpaperTypes.has(file.type)) {
    throw new WallpaperOptimizationError('type');
  }

  const inspected = await dependencies.inspect(file);
  if (
    inspected.width < 1 ||
    inspected.height < 1 ||
    inspected.width > MAX_WALLPAPER_SOURCE_WIDTH ||
    inspected.height > MAX_WALLPAPER_SOURCE_HEIGHT
  ) {
    throw new WallpaperOptimizationError('dimensions');
  }
  const decoded = await dependencies.decode(file);
  try {
    if (
      decoded.width !== inspected.width ||
      decoded.height !== inspected.height
    ) {
      throw new WallpaperOptimizationError('decode');
    }
    const scale = Math.min(
      1,
      MAX_WALLPAPER_OUTPUT_WIDTH / decoded.width,
      MAX_WALLPAPER_OUTPUT_HEIGHT / decoded.height,
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(decoded.width * scale));
    canvas.height = Math.max(1, Math.round(decoded.height * scale));
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new WallpaperOptimizationError('encode');
    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
    const outputType =
      file.type === 'image/png' && hasTransparency(context)
        ? 'image/png'
        : 'image/webp';
    const optimized = await dependencies.encode(canvas, outputType);
    if (optimized.size > MAX_WALLPAPER_OUTPUT_BYTES) {
      throw new WallpaperOptimizationError('size');
    }
    return blobToDataUrl(optimized);
  } finally {
    decoded.close();
  }
}
