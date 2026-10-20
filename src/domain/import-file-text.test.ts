import { describe, expect, it } from 'vitest';
import { decodeImportFileText } from './import-file-text';

describe('import file decoding', () => {
  it('preserves valid UTF-8 symbols and consumes an optional UTF-8 BOM', () => {
    const content = '<script>plain text</script> & "quoted" \u{1F516}';
    expect(
      decodeImportFileText(new TextEncoder().encode('\uFEFF' + content)),
    ).toBe(content);
  });
  it.each([[], [0xc3, 0x28], [0xe2, 0x82], [0xff, 0xfe, 0x41, 0x00]])(
    'rejects empty, malformed, truncated, and non-UTF-8 bytes: %#',
    (...bytes) =>
      expect(() => decodeImportFileText(new Uint8Array(bytes))).toThrow(),
  );
});
