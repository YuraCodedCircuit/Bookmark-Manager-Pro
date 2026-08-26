import { describe, expect, it } from 'vitest';

import { addHttpsToHostLikeUrl, safeBookmarkUrlSchema } from './bookmark-url';

describe('safeBookmarkUrlSchema', () => {
  it('offers HTTPS only for clearly host-like values', () => {
    expect(addHttpsToHostLikeUrl('example.com/path')).toBe(
      'https://example.com/path',
    );
    expect(addHttpsToHostLikeUrl('localhost:5173')).toBe(
      'https://localhost:5173',
    );
    expect(addHttpsToHostLikeUrl('127.0.0.1:5173/')).toBe(
      'https://127.0.0.1:5173/',
    );
    expect(addHttpsToHostLikeUrl('javascript:alert(1)')).toBeUndefined();
    expect(addHttpsToHostLikeUrl('not an address')).toBeUndefined();
  });

  it.each([
    ['https://example.com/path', 'https://example.com/path'],
    ['http://example.com', 'http://example.com/'],
    ['ftp://example.com/file.txt', 'ftp://example.com/file.txt'],
  ])('accepts and normalizes %s', (input, expected) => {
    expect(safeBookmarkUrlSchema.parse(input)).toBe(expected);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'blob:https://example.com/id',
    'file:///C:/secret.txt',
    'chrome://settings',
    'edge://settings',
    'about:config',
    'moz-extension://id/page.html',
    'chrome-extension://id/page.html',
    'mailto:user@example.com',
    'tel:+15551234567',
    'custom-app://open',
    'https://user:secret@example.com/',
    'https://example.com/\u0000payload',
  ])('rejects unsafe or unsupported input %s', (input) => {
    expect(() => safeBookmarkUrlSchema.parse(input)).toThrow();
  });
});
