export type CropShape = 'card' | 'free' | 'landscape' | 'square';

export interface CropRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface ImageDimensions {
  height: number;
  width: number;
}

export type CropHandle =
  | 'east'
  | 'north'
  | 'north-east'
  | 'north-west'
  | 'south'
  | 'south-east'
  | 'south-west'
  | 'west';

const CARD_RATIO = 1.08;
const LANDSCAPE_RATIO = 16 / 9;

export function cropShapeRatio(shape: CropShape): number | undefined {
  if (shape === 'card') return CARD_RATIO;
  if (shape === 'landscape') return LANDSCAPE_RATIO;
  if (shape === 'square') return 1;
  return undefined;
}

function boundedMinimum(limit: number): number {
  return Math.min(32, Math.max(1, limit));
}

/** Returns the largest centered crop of the requested shape within a boundary. */
export function centeredCrop(
  boundary: CropRect | ImageDimensions,
  shape: CropShape,
): CropRect {
  const boundaryX = 'x' in boundary ? boundary.x : 0;
  const boundaryY = 'y' in boundary ? boundary.y : 0;
  const ratio = cropShapeRatio(shape);
  if (!ratio) {
    return {
      height: boundary.height,
      width: boundary.width,
      x: boundaryX,
      y: boundaryY,
    };
  }
  const width = Math.min(boundary.width, boundary.height * ratio);
  const height = width / ratio;
  return {
    height,
    width,
    x: boundaryX + (boundary.width - width) / 2,
    y: boundaryY + (boundary.height - height) / 2,
  };
}

/** Clamps crop geometry to finite source-image coordinates and minimum sizes. */
export function clampCrop(
  crop: CropRect,
  dimensions: ImageDimensions,
): CropRect {
  const minimumWidth = boundedMinimum(dimensions.width);
  const minimumHeight = boundedMinimum(dimensions.height);
  const width = Math.min(
    dimensions.width,
    Math.max(minimumWidth, Number.isFinite(crop.width) ? crop.width : 0),
  );
  const height = Math.min(
    dimensions.height,
    Math.max(minimumHeight, Number.isFinite(crop.height) ? crop.height : 0),
  );
  return {
    height,
    width,
    x: Math.min(
      dimensions.width - width,
      Math.max(0, Number.isFinite(crop.x) ? crop.x : 0),
    ),
    y: Math.min(
      dimensions.height - height,
      Math.max(0, Number.isFinite(crop.y) ? crop.y : 0),
    ),
  };
}

/** Moves a crop without permitting any edge to leave the source image. */
export function moveCrop(
  crop: CropRect,
  deltaX: number,
  deltaY: number,
  dimensions: ImageDimensions,
): CropRect {
  return clampCrop(
    { ...crop, x: crop.x + deltaX, y: crop.y + deltaY },
    dimensions,
  );
}

/** Scales a crop around its center so editor zoom changes selected source pixels. */
export function zoomCrop(
  crop: CropRect,
  previousZoom: number,
  nextZoom: number,
  dimensions: ImageDimensions,
): CropRect {
  const safePreviousZoom = Math.max(1, previousZoom);
  const safeNextZoom = Math.max(1, nextZoom);
  const scale = safePreviousZoom / safeNextZoom;
  const centerX = crop.x + crop.width / 2;
  const centerY = crop.y + crop.height / 2;
  const width = crop.width * scale;
  const height = crop.height * scale;
  return clampCrop(
    {
      height,
      width,
      x: centerX - width / 2,
      y: centerY - height / 2,
    },
    dimensions,
  );
}

/** Changes aspect ratio inside the current crop without restoring excluded pixels. */
export function changeCropShape(crop: CropRect, shape: CropShape): CropRect {
  return centeredCrop(crop, shape);
}

/** Resizes a crop from one handle while retaining bounds and an optional ratio. */
export function resizeCrop(
  crop: CropRect,
  handle: CropHandle,
  deltaX: number,
  deltaY: number,
  dimensions: ImageDimensions,
  ratio?: number,
): CropRect {
  let left = crop.x;
  let top = crop.y;
  let right = crop.x + crop.width;
  let bottom = crop.y + crop.height;
  if (handle.includes('west')) left += deltaX;
  if (handle.includes('east')) right += deltaX;
  if (handle.includes('north')) top += deltaY;
  if (handle.includes('south')) bottom += deltaY;

  if (ratio) {
    const horizontal = handle.includes('east') || handle.includes('west');
    const vertical = handle.includes('north') || handle.includes('south');
    let width = right - left;
    let height = bottom - top;
    if (horizontal && (!vertical || Math.abs(deltaX) >= Math.abs(deltaY))) {
      height = width / ratio;
    } else {
      width = height * ratio;
    }
    if (handle.includes('west')) left = right - width;
    else right = left + width;
    if (handle.includes('north')) top = bottom - height;
    else bottom = top + height;
  }

  const resized = clampCrop(
    { height: bottom - top, width: right - left, x: left, y: top },
    dimensions,
  );
  if (!ratio) return resized;

  // Re-center a ratio-locked crop after clamping so minimums and image edges
  // cannot leave a subtly distorted selection.
  const centerX = resized.x + resized.width / 2;
  const centerY = resized.y + resized.height / 2;
  const width = Math.min(
    resized.width,
    resized.height * ratio,
    dimensions.width,
  );
  const height = width / ratio;
  return clampCrop(
    { height, width, x: centerX - width / 2, y: centerY - height / 2 },
    dimensions,
  );
}

export function roundedCrop(crop: CropRect): CropRect {
  return {
    height: Math.round(crop.height),
    width: Math.round(crop.width),
    x: Math.round(crop.x),
    y: Math.round(crop.y),
  };
}
