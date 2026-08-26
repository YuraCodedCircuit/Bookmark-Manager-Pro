import type { StorageAvailability } from '../../application/initialization/initialize-application';

export class BrowserIndexedDbAvailability implements StorageAvailability {
  isAvailable(): boolean {
    return typeof globalThis.indexedDB !== 'undefined';
  }
}
