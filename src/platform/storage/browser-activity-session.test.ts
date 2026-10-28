import { beforeEach, describe, expect, it, vi } from 'vitest';
const data = vi.hoisted(() => ({
  session: {} as Record<string, unknown>,
  local: {} as Record<string, unknown>,
}));
vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      session: {
        get: vi.fn(async (key: string) => ({ [key]: data.session[key] })),
        set: vi.fn(async (value: Record<string, unknown>) => {
          Object.assign(data.session, value);
        }),
      },
      local: {
        get: vi.fn(async (key: string) => ({ [key]: data.local[key] })),
        set: vi.fn(async (value: Record<string, unknown>) => {
          Object.assign(data.local, value);
        }),
      },
    },
  },
}));
import { browserActivitySession } from './browser-activity-session';
beforeEach(() => {
  data.session = {};
  data.local = {};
});
describe('browser activity session identity', () => {
  it('returns the observed startup identity to concurrent detection callers', async () => {
    const detection = browserActivitySession();
    const startup = browserActivitySession('startup');
    const concurrent = browserActivitySession();
    const identities = await Promise.all([detection, startup, concurrent]);
    expect(new Set(identities.map((identity) => identity.id)).size).toBe(1);
    expect(identities.every((identity) => identity.origin === 'startup')).toBe(
      true,
    );
  });

  it('reuses durable session identity after a fresh worker module loads', async () => {
    const original = await browserActivitySession('startup');
    vi.resetModules();
    const restarted = await import('./browser-activity-session');
    expect(await restarted.browserActivitySession()).toEqual(original);
  });

  it('shares one identity across simultaneous surfaces and worker requests', async () => {
    const [first, second] = await Promise.all([
      browserActivitySession(),
      browserActivitySession(),
    ]);
    expect(first).toEqual(second);
    expect(first.origin).toBe('detected');
    expect(await browserActivitySession()).toEqual(first);
  });
  it('rotates only on observed browser startup and preserves known updates', async () => {
    const first = await browserActivitySession('startup');
    const next = await browserActivitySession('startup');
    expect(next.id).not.toBe(first.id);
    expect(next.origin).toBe('startup');
    data.session = {};
    expect(await browserActivitySession('update')).toEqual(next);
  });
  it('labels missing exact identity as detected rather than inventing startup', async () => {
    const previous = await browserActivitySession('startup');
    data.session = {};
    const recovered = await browserActivitySession();
    expect(recovered.id).not.toBe(previous.id);
    expect(recovered.origin).toBe('detected');
  });
  it('rejects malformed stored identities without trusting their fields', async () => {
    data.session.activityBrowserSessionV1 = {
      id: 'personal-content',
      origin: 'startup',
      startedAt: -1,
    };
    const result = await browserActivitySession();
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.origin).toBe('detected');
  });
});
