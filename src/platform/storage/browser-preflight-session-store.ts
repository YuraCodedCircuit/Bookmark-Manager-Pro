import browser from 'webextension-polyfill';

import type { BackgroundPreflightSnapshot } from '../../messaging/background-protocol';
import type { BackgroundSessionSnapshotStore } from '../../application/preflight/run-background-preflight';

const SNAPSHOT_KEY = 'backgroundPreflightSnapshotV1';

/** Stores only stable startup metadata for the current browser session. */
export class BrowserPreflightSessionStore implements BackgroundSessionSnapshotStore {
  async read(): Promise<unknown> {
    const values = await browser.storage.session.get(SNAPSHOT_KEY);
    return values[SNAPSHOT_KEY];
  }

  async write(snapshot: BackgroundPreflightSnapshot): Promise<void> {
    await browser.storage.session.set({ [SNAPSHOT_KEY]: snapshot });
  }
}
