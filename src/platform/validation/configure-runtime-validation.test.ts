import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { configureRuntimeValidation } from './configure-runtime-validation';

describe('configureRuntimeValidation', () => {
  afterEach(() => {
    z.config({ jitless: true });
  });

  it('keeps Zod validation in CSP-compatible jitless mode', () => {
    z.config({ jitless: false });

    configureRuntimeValidation();

    expect(z.config().jitless).toBe(true);
    expect(z.object({ id: z.string() }).safeParse({ id: 42 }).success).toBe(
      false,
    );
  });

  it('rejects oversized constrained arrays before validating their elements', () => {
    configureRuntimeValidation();
    let evaluated = 0;
    const item = z.preprocess((value) => {
      evaluated++;
      return value;
    }, z.string());

    const result = z.array(item).max(2).safeParse(Array(100).fill(null));

    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues).toEqual([
        expect.objectContaining({ code: 'too_big' }),
      ]);
    expect(evaluated).toBe(0);
  });
});
