import type { ExportDownloadFile } from './export-worker-client';

/** Hands a local export to the browser; completion on disk is not observable. */
export function downloadExportFile(file: ExportDownloadFile): void {
  const url = URL.createObjectURL(
    typeof file.content === 'string'
      ? new Blob([file.content], { type: file.mimeType })
      : file.content,
  );
  const link = document.createElement('a');
  link.download = file.filename;
  link.href = url;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
