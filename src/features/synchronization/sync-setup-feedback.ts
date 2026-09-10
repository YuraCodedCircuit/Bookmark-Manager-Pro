export type SyncSetupEvent =
  | 'accessGranted'
  | 'accessDenied'
  | 'unavailable'
  | 'foldersLoaded'
  | 'loadFailed'
  | 'previewComplete'
  | 'previewIncomplete'
  | 'previewFailed'
  | 'operationFailed';

export const shouldNotifyForSyncSetupEvent = (event: SyncSetupEvent) =>
  event !== 'accessGranted' && event !== 'foldersLoaded';
