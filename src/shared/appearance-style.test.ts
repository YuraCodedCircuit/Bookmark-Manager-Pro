import { describe, expect, it } from 'vitest';

import type { ImageFit } from '../domain/bookmark';
import { appearanceStyle, folderBackgroundStyle } from './appearance-style';

describe('appearanceStyle', () => {
  it.each([
    ['fill', 'center', 'no-repeat', 'cover'],
    ['fit', 'center', 'no-repeat', 'contain'],
    ['stretch', 'center', 'no-repeat', '100% 100%'],
    ['tile', 'top left', 'repeat', 'auto'],
    ['center', 'center', 'no-repeat', 'auto'],
    ['span', 'center', 'no-repeat', '100% auto'],
  ] satisfies [ImageFit, string, string, string][])(
    'renders the %s image-fit mode with inert background properties',
    (fit, position, repeat, size) => {
      expect(
        appearanceStyle({
          fit,
          kind: 'image',
          value: 'data:image/png;base64,AA==',
        }),
      ).toMatchObject({
        backgroundImage: 'url("data:image/png;base64,AA==")',
        backgroundPosition: position,
        backgroundRepeat: repeat,
        backgroundSize: size,
      });
    },
  );

  it('fixes folder images to the viewport without changing their fit', () => {
    expect(
      folderBackgroundStyle({
        fit: 'fit',
        kind: 'image',
        value: 'data:image/png;base64,AA==',
      }),
    ).toMatchObject({
      backgroundAttachment: 'fixed',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'contain',
    });
  });

  it('does not add fixed attachment to non-image folder backgrounds', () => {
    expect(
      folderBackgroundStyle({ kind: 'color', value: '#123456' }),
    ).not.toHaveProperty('backgroundAttachment');
  });
});
