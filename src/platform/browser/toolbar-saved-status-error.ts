export class ToolbarSavedStatusPermissionDeniedError extends Error {
  constructor() {
    super('toolbar-saved-status-permission-denied');
    this.name = 'ToolbarSavedStatusPermissionDeniedError';
  }
}
