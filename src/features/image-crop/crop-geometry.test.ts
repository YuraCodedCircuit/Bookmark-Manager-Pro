import { describe, expect, it } from 'vitest';

import {
  centeredCrop,
  changeCropShape,
  clampCrop,
  moveCrop,
  resizeCrop,
  zoomCrop,
} from './crop-geometry';

describe('crop geometry', () => {
  const dimensions = { height: 1080, width: 1920 };

  it('centers the largest card crop within the source', () => {
    const crop = centeredCrop(dimensions, 'card');
    expect(crop.height).toBe(1080);
    expect(crop.width).toBeCloseTo(1166.4);
    expect(crop.x).toBeCloseTo(376.8);
    expect(crop.y).toBe(0);
  });

  it('clamps invalid geometry and movement inside the source', () => {
    expect(
      moveCrop(
        clampCrop({ height: 5, width: 5, x: -10, y: -20 }, dimensions),
        3000,
        3000,
        dimensions,
      ),
    ).toEqual({ height: 32, width: 32, x: 1888, y: 1048 });
  });

  it('changes shape without restoring pixels outside the current crop', () => {
    const crop = { height: 400, width: 800, x: 100, y: 200 };
    const square = changeCropShape(crop, 'square');
    expect(square).toEqual({ height: 400, width: 400, x: 300, y: 200 });
  });

  it('keeps a locked ratio when a resize reaches an image edge', () => {
    const resized = resizeCrop(
      { height: 200, width: 216, x: 0, y: 0 },
      'north-west',
      -100,
      -100,
      dimensions,
      1.08,
    );
    expect(resized.x).toBeGreaterThanOrEqual(0);
    expect(resized.y).toBeGreaterThanOrEqual(0);
    expect(resized.width / resized.height).toBeCloseTo(1.08);
  });

  it('zooms into the crop center by selecting fewer source pixels', () => {
    expect(
      zoomCrop({ height: 400, width: 600, x: 100, y: 200 }, 1, 2, dimensions),
    ).toEqual({ height: 200, width: 300, x: 250, y: 300 });
  });

  it('keeps zoomed corner crops inside the source', () => {
    expect(
      zoomCrop({ height: 400, width: 600, x: 0, y: 0 }, 1, 2, dimensions),
    ).toEqual({ height: 200, width: 300, x: 150, y: 100 });
  });
});
