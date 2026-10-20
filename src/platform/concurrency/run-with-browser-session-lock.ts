/** Serializes a named cross-tab operation when the Web Locks API is available. */
export function runWithBrowserLock<T>(
  name: string,
  run: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  signal?.throwIfAborted();
  if (!navigator.locks?.request) return run();
  return new Promise<T>((resolve, reject) => {
    const callback = async () => {
      try {
        resolve(await run());
      } catch (error) {
        reject(error);
      }
    };
    void (
      signal
        ? navigator.locks.request(name, { signal }, callback)
        : navigator.locks.request(name, callback)
    ).catch(reject);
  });
}

/** Serializes history writes across tabs when the Web Locks API is available. */
export function runWithBrowserSessionLock<T>(
  run: () => Promise<T>,
): Promise<T> {
  return runWithBrowserLock('bookmark-manager-pro.undo-history', run);
}
