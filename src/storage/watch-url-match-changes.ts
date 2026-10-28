import Dexie, { type ObservabilitySet } from 'dexie';

/** Observes committed local/cross-context writes without reading bookmark data. */
export function watchUrlMatchChanges(
  listener: () => void,
  databaseName = 'bookmark-manager-pro',
): () => void {
  const prefixes = ['bookmarks', 'folders', 'profiles'].map(
    (table) => `idb://${databaseName}/${table}/`,
  );
  const changed = (parts: ObservabilitySet) => {
    if (
      Object.keys(parts).some((part) =>
        prefixes.some((prefix) => part.startsWith(prefix)),
      )
    )
      listener();
  };
  Dexie.on('storagemutated', changed);
  return () => Dexie.on.storagemutated.unsubscribe(changed);
}
