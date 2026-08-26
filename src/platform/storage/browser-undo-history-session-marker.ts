import { z } from 'zod';

import type { UndoHistorySessionMarker } from '../../application/undo-history/undo-history-storage';

const SESSION_ID_KEY = 'bookmark-manager-pro.undo-session-id.v1';
const LEGACY_HISTORY_KEY = 'bookmark-manager-pro.undo-history.v1';
const sessionIdSchema = z.uuid();
const SESSION_CHANNEL = 'bookmark-manager-pro.undo-session-presence.v1';

interface SessionStorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  remove(key: string): Promise<void>;
  set(value: Record<string, unknown>): Promise<void>;
}

function extensionSessionStorage(): SessionStorageArea | undefined {
  const candidate = globalThis as typeof globalThis & {
    browser?: { storage?: { session?: SessionStorageArea } };
    chrome?: { storage?: { session?: SessionStorageArea } };
  };
  return (
    candidate.browser?.storage?.session ?? candidate.chrome?.storage?.session
  );
}

/** Keeps only the opaque active undo-session identity in session storage. */
export class BrowserUndoHistorySessionMarker implements UndoHistorySessionMarker {
  private activeSessionId: string | undefined;
  private readonly channel =
    typeof window.BroadcastChannel === 'undefined'
      ? undefined
      : new window.BroadcastChannel(SESSION_CHANNEL);
  private readonly pendingProbes = new Map<string, Set<string>>();

  constructor() {
    if (this.channel)
      this.channel.onmessage = (event: MessageEvent<unknown>) => {
        const message = sessionPresenceMessageSchema.safeParse(event.data);
        if (!message.success) return;
        if (message.data.type === 'probe') {
          if (this.activeSessionId)
            this.channel?.postMessage({
              requestId: message.data.requestId,
              sessionId: this.activeSessionId,
              type: 'present',
            });
          return;
        }
        this.pendingProbes
          .get(message.data.requestId)
          ?.add(message.data.sessionId);
      };
  }

  get sharedAcrossTabs(): boolean {
    return extensionSessionStorage() !== undefined;
  }

  async get(): Promise<string | undefined> {
    const extensionStorage = extensionSessionStorage();
    const raw = extensionStorage
      ? (await extensionStorage.get(SESSION_ID_KEY))[SESSION_ID_KEY]
      : window.sessionStorage.getItem(SESSION_ID_KEY);
    const parsed = sessionIdSchema.safeParse(raw);
    this.activeSessionId = parsed.success ? parsed.data : undefined;
    return this.activeSessionId;
  }

  async set(sessionId: string): Promise<void> {
    const validated = sessionIdSchema.parse(sessionId);
    const extensionStorage = extensionSessionStorage();
    if (extensionStorage) {
      await extensionStorage.set({ [SESSION_ID_KEY]: validated });
      this.activeSessionId = validated;
      return;
    }
    window.sessionStorage.setItem(SESSION_ID_KEY, validated);
    this.activeSessionId = validated;
  }

  async getOtherActiveSessionIds(): Promise<readonly string[] | undefined> {
    if (this.sharedAcrossTabs) return [];
    if (!this.channel) return undefined;
    const requestId = crypto.randomUUID();
    const sessionIds = new Set<string>();
    this.pendingProbes.set(requestId, sessionIds);
    this.channel.postMessage({ requestId, type: 'probe' });
    await new Promise((resolve) => window.setTimeout(resolve, 75));
    this.pendingProbes.delete(requestId);
    return [...sessionIds];
  }

  async removeLegacyHistory(): Promise<void> {
    const extensionStorage = extensionSessionStorage();
    if (extensionStorage) {
      await extensionStorage.remove(LEGACY_HISTORY_KEY);
      return;
    }
    window.sessionStorage.removeItem(LEGACY_HISTORY_KEY);
  }
}

const sessionPresenceMessageSchema = z.discriminatedUnion('type', [
  z.object({ requestId: z.uuid(), type: z.literal('probe') }),
  z.object({
    requestId: z.uuid(),
    sessionId: z.uuid(),
    type: z.literal('present'),
  }),
]);
