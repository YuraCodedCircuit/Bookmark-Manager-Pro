import { MAX_NATIVE_EXPORT_FILE_BYTES } from './profile-export';

/** Decodes bounded UTF-8 input without silently replacing malformed source bytes. */
export function decodeImportFileText(bytes: Uint8Array): string {
  if (!bytes.byteLength || bytes.byteLength > MAX_NATIVE_EXPORT_FILE_BYTES)
    throw new Error('import-file-size');
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
