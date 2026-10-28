import type browser from 'webextension-polyfill';
import {
  folderTabRequestSchema,
  folderTabResponseSchema,
  folderTabRecordSchema,
  folderTabPendingSchema,
  type FolderTabResponse,
} from '../../messaging/folder-tab-protocol';

const PREFIX = 'folderTabV1:';

/** Signals a deleted destination while keeping ordinary startup preferences available. */
export class FolderTabMissingDestinationError extends Error {
  constructor() {
    super('folder-tab-destination-missing');
  }
}

/** Injects browser and repository boundaries without storing worker-local destinations. */
export interface FolderTabDependencies {
  pageUrl: string;
  pendingPageUrl: string;
  extensionId: string;
  read(key: string): Promise<unknown>;
  keys(): Promise<string[]>;
  write(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  exists(profileId: string, folderId: string): Promise<boolean>;
  create(): Promise<number>;
  activate(tabId: number): Promise<void>;
}

/** Binds an inactive placeholder before loading the manager, preventing early claims. */
export function createFolderTabHandler(deps: FolderTabDependencies) {
  return async (
    message: unknown,
    sender: browser.Runtime.MessageSender,
  ): Promise<FolderTabResponse> => {
    const parsed = folderTabRequestSchema.safeParse(message);
    const senderUrl =
      sender.url && URL.canParse(sender.url) ? new URL(sender.url) : undefined;
    if (senderUrl) {
      senderUrl.search = '';
      senderUrl.hash = '';
    }
    if (
      !parsed.success ||
      sender.id !== deps.extensionId ||
      senderUrl?.href !==
        (parsed.success && parsed.data.type === 'folder-tab.ready'
          ? deps.pendingPageUrl
          : deps.pageUrl) ||
      sender.tab?.id === undefined ||
      (sender.frameId !== undefined && sender.frameId !== 0)
    )
      return { status: 'failed', errorCode: 'INVALID_REQUEST' };
    const request = parsed.data;
    if (request.type === 'folder-tab.ready') {
      try {
        const raw = await deps.read(PREFIX + sender.tab.id);
        if (raw === undefined) return { status: 'waiting' };
        const record = folderTabRecordSchema.safeParse(raw);
        if (!record.success)
          return { status: 'failed', errorCode: 'UNAVAILABLE' };
        await deps.activate(sender.tab.id);
        // Only the requesting placeholder navigates itself after this response.
        return { status: 'ready' };
      } catch {
        return { status: 'failed', errorCode: 'UNAVAILABLE' };
      }
    }
    if (request.type === 'folder-tab.claim') {
      try {
        const raw = await deps.read(PREFIX + sender.tab.id);
        if (raw === undefined) return { status: 'none' };
        const record = folderTabRecordSchema.safeParse(raw);
        if (!record.success)
          return { status: 'failed', errorCode: 'UNAVAILABLE' };
        // Preserve startup profile selection: a folder request never changes profiles.
        if (record.data.profileId !== request.profileId)
          return { status: 'none' };
        if (!(await deps.exists(request.profileId, record.data.folderId)))
          return { status: 'failed', errorCode: 'MISSING_DESTINATION' };
        return { status: 'destination', folderId: record.data.folderId };
      } catch {
        return { status: 'failed', errorCode: 'UNAVAILABLE' };
      }
    }
    let tabId: number | undefined;
    const operationKey = `folderTabPendingV1:${crypto.randomUUID()}`;
    try {
      if (!(await deps.exists(request.profileId, request.folderId)))
        return { status: 'failed', errorCode: 'MISSING_DESTINATION' };
      // Persist intent first. Interrupted unbound creation is never automatically retried.
      const keys = await deps.keys();
      const pendingKeys = keys.filter((key) =>
        key.startsWith('folderTabPendingV1:'),
      );
      let activePending = pendingKeys.length;
      for (const key of pendingKeys) {
        const value = folderTabPendingSchema.safeParse(await deps.read(key));
        if (!value.success || value.data.expiresAt < Date.now()) {
          await deps.remove(key);
          activePending--;
        }
      }
      if (
        keys.filter((key) => key.startsWith(PREFIX)).length >= 100 ||
        activePending >= 100
      )
        return { status: 'failed', errorCode: 'UNAVAILABLE' };
      await deps.write(operationKey, {
        version: 1,
        profileId: request.profileId,
        folderId: request.folderId,
        expiresAt: Date.now() + 120_000,
      });
      tabId = await deps.create();
      await deps.write(PREFIX + tabId, {
        version: 1,
        profileId: request.profileId,
        folderId: request.folderId,
      });
      return { status: 'opened' };
    } catch {
      if (tabId !== undefined) {
        await deps
          .remove(PREFIX + tabId)
          .catch(() => console.error('folder-tab-cleanup-failed'));
      }
      return {
        status: 'failed',
        errorCode: tabId === undefined ? 'UNAVAILABLE' : 'TAB_FAILED',
      };
    } finally {
      await deps
        .remove(operationKey)
        .catch(() => console.error('folder-tab-cleanup-failed'));
    }
  };
}

/** Requests a clean manager tab; failures never fall back to a query URL. */
export async function openFolderTab(
  profileId: string,
  folderId: string,
): Promise<void> {
  const { default: browser } = await import('webextension-polyfill');
  const result = folderTabResponseSchema.parse(
    await browser.runtime.sendMessage({
      protocolVersion: 1,
      type: 'folder-tab.open',
      profileId,
      folderId,
    }),
  );
  if (result.status !== 'opened') throw new Error('folder-tab-open-failed');
}

/** Reads only this browser-assigned tab's binding, preserving ordinary startup when absent. */
export async function claimFolderTab(
  profileId: string,
): Promise<string | undefined> {
  // Web preview has no extension messaging; its normal startup remains unchanged.
  if (
    !['chrome-extension:', 'moz-extension:'].includes(window.location.protocol)
  )
    return undefined;
  const { default: browser } = await import('webextension-polyfill');
  const result = folderTabResponseSchema.parse(
    await browser.runtime.sendMessage({
      protocolVersion: 1,
      type: 'folder-tab.claim',
      profileId,
    }),
  );
  if (result.status === 'failed') {
    if (result.errorCode === 'MISSING_DESTINATION')
      throw new FolderTabMissingDestinationError();
    throw new Error('folder-tab-claim-failed');
  }
  if (result.status === 'destination') return result.folderId;
  if (result.status === 'none') return undefined;
  throw new Error('folder-tab-claim-response-invalid');
}

/** Removes only the closed tab's binding; the browser clears all bindings at session end. */
export async function removeFolderTab(tabId: number): Promise<void> {
  const { default: browser } = await import('webextension-polyfill');
  await browser.storage.session.remove(PREFIX + tabId);
}
