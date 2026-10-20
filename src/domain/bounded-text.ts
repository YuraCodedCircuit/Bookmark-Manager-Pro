import { MAX_NATIVE_EXPORT_FILE_BYTES } from './file-limits';

/** Counts UTF-8 bytes without allocating a second large text buffer. */
export function utf8TextBytes(value: string): number {
  if (!/[^\p{ASCII}]/u.test(value)) return value.length;
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

/** Stops output expansion before retaining more than the serialized-file budget. */
export class BoundedText {
  private readonly parts: string[] = [];
  private size = 0;
  constructor(
    private readonly separator = '',
    private readonly limit = MAX_NATIVE_EXPORT_FILE_BYTES,
  ) {}
  push(...parts: string[]): void {
    for (const part of parts) {
      const text = (this.parts.length ? this.separator : '') + part;
      if (text.length > this.limit - this.size)
        throw new Error('export-too-large');
      const size = utf8TextBytes(text);
      if (size > this.limit - this.size) throw new Error('export-too-large');
      this.size += size;
      this.parts.push(text);
    }
  }
  join(): string {
    return this.parts.join('');
  }
}
