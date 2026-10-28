import browser from 'webextension-polyfill';
import { z } from 'zod';
import type { ActivitySessionIdentity } from '../../domain/activity-log';
import { backgroundPreflightSnapshotSchema } from '../../messaging/background-protocol';

const KEY = 'activityBrowserSessionV1';
const identitySchema = z.object({
  id: z.uuid(),
  startedAt: z.number().int().nonnegative(),
  origin: z.enum(['startup', 'detected']),
});

/** Worker restarts reuse session storage. Explicit updates may recover known identity. */
let inFlight: Promise<ActivitySessionIdentity> | undefined;
export function browserActivitySession(
  reason?: 'startup' | 'update',
): Promise<ActivitySessionIdentity> {
  if (!reason && inFlight) return followLatest(inFlight);
  const previous = inFlight;
  const operation = (async () => {
    if (previous) await previous;
    return resolveIdentity(reason);
  })();
  inFlight = operation;
  void operation
    .finally(() => {
      if (inFlight === operation) inFlight = undefined;
    })
    .catch(() => undefined);
  return followLatest(operation);
}

/** A startup observed during detection supersedes that still-pending response. */
async function followLatest(operation: Promise<ActivitySessionIdentity>) {
  let pending = operation;
  let result = await pending;
  while (inFlight && inFlight !== pending) {
    pending = inFlight;
    result = await pending;
  }
  return result;
}
async function resolveIdentity(
  reason?: 'startup' | 'update',
): Promise<ActivitySessionIdentity> {
  const stored = identitySchema.safeParse(
    (await browser.storage.session.get(KEY))[KEY],
  );
  if (reason !== 'startup' && stored.success) {
    const snapshot = (
      await browser.storage.session.get('backgroundPreflightSnapshotV1')
    ).backgroundPreflightSnapshotV1;
    return {
      ...stored.data,
      ...(backgroundPreflightSnapshotSchema.safeParse(snapshot).success
        ? { preflightComplete: true }
        : {}),
    };
  }
  if (reason === 'update') {
    const previous = identitySchema.safeParse(
      (await browser.storage.local.get(KEY))[KEY],
    );
    if (previous.success) {
      await browser.storage.session.set({ [KEY]: previous.data });
      return previous.data;
    }
  }
  const identity = {
    id: crypto.randomUUID(),
    startedAt: Date.now(),
    origin: reason === 'startup' ? ('startup' as const) : ('detected' as const),
  };
  await browser.storage.session.set({ [KEY]: identity });
  await browser.storage.local.set({ [KEY]: identity });
  return identity;
}

/** Surfaces request the worker's identity instead of racing to create their own. */
export async function requestActivitySession(): Promise<ActivitySessionIdentity> {
  const response: unknown = await browser.runtime.sendMessage({
    protocolVersion: 1,
    type: 'activity-session.get',
  });
  return identitySchema
    .extend({ preflightComplete: z.boolean().optional() })
    .parse(response);
}
