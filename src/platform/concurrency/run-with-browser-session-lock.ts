/** Serializes history writes across tabs when the Web Locks API is available. */
export function runWithBrowserSessionLock<T>(
  run: () => Promise<T>,
): Promise<T> {
  if (!navigator.locks?.request) return run();
  return new Promise<T>((resolve, reject) => {
    void navigator.locks
      .request('bookmark-manager-pro.undo-history', async () => {
        try {
          resolve(await run());
        } catch (error) {
          reject(error);
        }
      })
      .catch(reject);
  });
}
