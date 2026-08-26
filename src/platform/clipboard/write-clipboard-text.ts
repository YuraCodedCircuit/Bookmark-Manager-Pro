/**
 * Writes one value after an explicit user action. Clipboard reading and
 * background clipboard access are intentionally unsupported.
 */
export async function writeClipboardText(value: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error('clipboard-write-unavailable');
  }
  await navigator.clipboard.writeText(value);
}
