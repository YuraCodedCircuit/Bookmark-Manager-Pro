import { BrowserIndexedDbAvailability } from '../../platform/storage/browser-indexed-db-availability';
import { DomThemeController } from '../../platform/theme/dom-theme-controller';
import { BookmarkManagerDatabase } from '../../storage/database';
import { DexieInitializationRepository } from '../../storage/dexie-initialization-repository';
import { InitializeApplication } from './initialize-application';

/** Composes the DOM, IndexedDB, and theme adapters used by local initialization. */
export function createBrowserInitializer(): InitializeApplication {
  const database = new BookmarkManagerDatabase();

  return new InitializeApplication(
    new BrowserIndexedDbAvailability(),
    new DexieInitializationRepository(database),
    new DomThemeController(
      document.documentElement,
      window.matchMedia('(prefers-color-scheme: dark)'),
    ),
  );
}
