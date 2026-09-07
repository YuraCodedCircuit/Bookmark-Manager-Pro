import { afterEach, describe, expect, it, vi } from 'vitest';

import { createActivityLogService } from './create-activity-log-service';

describe('createActivityLogService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('can be composed inside a Manifest V3 service worker without window', () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('navigator', {
      platform: 'Win32',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
    });

    expect(() => createActivityLogService()).not.toThrow();
  });
});
