import { describe, expect, it } from 'vitest';

import { parseGradientDirection } from './gradient-direction';

describe('parseGradientDirection', () => {
  it.each([
    ['0', 0],
    ['127', 127],
    ['359', 359],
  ])('accepts sanitized integer degrees %s', (input, expected) => {
    expect(parseGradientDirection(input)).toBe(expected);
  });

  it.each(['', '-1', '360', '45.5', '1e2', '90deg', '<script>'])(
    'rejects unsafe or out-of-range input %s',
    (input) => expect(() => parseGradientDirection(input)).toThrow(),
  );
});
