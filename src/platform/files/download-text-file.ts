import type { ActivityLogExport } from '../../application/activity-log/manage-activity-log';

/** Starts a user-initiated browser download and promptly releases its object URL. */
export function downloadTextFile(file: ActivityLogExport): void {
  const url = URL.createObjectURL(
    new Blob([file.content], { type: file.mimeType }),
  );
  const link = document.createElement('a');
  link.download = file.filename;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
