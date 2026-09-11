/** Serializes a named cross-tab operation when the Web Locks API is available. */
export function runWithBrowserLock<T>(
  name: string,
  run: () => Promise<T>,
): Promise<T> {
  if (!navigator.locks?.request) return run();
  return new Promise<T>((resolve, reject) => {
    void navigator.locks
      .request(name, async () => {
        try {
          resolve(await run());
        } catch (error) {
          reject(error);
        }
      })
      .catch(reject);
  });
}

/** Serializes history writes across tabs when the Web Locks API is available. */
export function runWithBrowserSessionLock<T>(
  run: () => Promise<T>,
): Promise<T> {
  return runWithBrowserLock('bookmark-manager-pro.undo-history', run);
}
