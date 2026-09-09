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
});
