import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = resolve(import.meta.dirname, '../../..');

function readPngSize(path: string): { height: number; width: number } {
  const image = readFileSync(path);
  expect(image.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
  };
}

describe('packaged extension icons', () => {
  it.each([16, 32, 48, 128])(
    'provides a PNG with the declared %d-pixel dimensions',
    (size) => {
      expect(
        readPngSize(
          resolve(projectRoot, 'public', `extension-icon-${size}.png`),
        ),
      ).toEqual({ height: size, width: size });
    },
  );

  it.each(['newtab', 'popup'])(
    '%s references the exact-size 32-pixel page icon',
    (page) => {
      const html = readFileSync(
        resolve(projectRoot, 'entrypoints', page, 'index.html'),
        'utf8',
      );

      expect(html).toContain(
        '<link rel="icon" href="/extension-icon-32.png" type="image/png" />',
      );
    },
  );
});
