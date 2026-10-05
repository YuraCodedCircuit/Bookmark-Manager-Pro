import browser from 'webextension-polyfill';
import type { Permissions } from 'webextension-polyfill/namespaces/permissions';
import { BookmarkManagerDatabase } from '../../storage/database';
import { ToolbarSavedStatusPermissionDeniedError } from './toolbar-saved-status-error';

const tabsPermission: Permissions.Permissions = { permissions: ['tabs'] };

export { ToolbarSavedStatusPermissionDeniedError };

/** Requests the optional URL visibility needed for proactive per-tab status. */
export async function requestToolbarSavedStatusPermission(): Promise<void> {
  if (!(await browser.permissions.request(tabsPermission)))
    throw new ToolbarSavedStatusPermissionDeniedError();
}

/** Releases optional tab access when no active profile setting needs it. */
export async function removeToolbarSavedStatusPermissionIfUnused(): Promise<void> {
  const database = new BookmarkManagerDatabase();
  try {
    const settings = await database.profileSettings.toArray();
    if (settings.some((value) => value.showSavedStatusOnToolbar)) return;
    await browser.permissions.remove(tabsPermission);
  } finally {
    database.close();
  }
}

/** Asks the restartable worker to recompute visible per-tab indicators. */
export async function refreshToolbarSavedStatus(): Promise<void> {
  await browser.runtime.sendMessage({
    protocolVersion: 1,
    type: 'toolbar-saved-status.refresh',
  });
}
