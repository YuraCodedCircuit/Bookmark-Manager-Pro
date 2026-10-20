import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { folderSchema } from './folder';
import { NOTE_BODY_MAX_BYTES } from './note';
import {
  decodeNativeExport,
  encodeNativeExport,
  isValidExportPassword,
  inspectNativeExport,
  validateExport,
  type ExportPayload,
} from './profile-export';

const id = '11111111-1111-4111-8111-111111111111';
const imageId = '22222222-2222-4222-8222-222222222222';
function payload(): ExportPayload {
  return {
    format: 'bookmark-manager-pro',
    version: 1,
    createdAt: 1,
    categories: ['bookmarks'],
    restoreSynchronization: 'paused',
    backups: [],
    profiles: [
      {
        formatVersion: 3,
        databaseSchemaVersion: 32,
        applicationVersion: '0.6.2',
        profile: {
          id,
          username: 'Synthetic profile',
          icon: 'data:image/png;base64,YQ==',
          createdAt: 1,
          updatedAt: 1,
        },
        bookmarks: [],
        folders: [],
        favorites: [],
        folderWallpapers: [
          {
            id: imageId,
            profileId: id,
            createdAt: 1,
            dataUrl: 'data:image/png;base64,YQ==',
          },
        ],
      },
    ],
  };
}
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('native export v1', () => {
  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///private',
    'https://user:password@example.com/',
  ])(
    'rejects unsafe native URLs even with a matching plaintext checksum: %#',
    async (url) => {
      const source = payload();
      source.profiles[0]!.folders = [
        folderSchema.parse({
          id,
          profileId: id,
          parentId: null,
          title: 'Home',
          tags: [],
          note: '',
          cardAppearance: { kind: 'color', value: '#123456' },
          backgroundAppearance: { kind: 'none' },
          index: 0,
          isRoot: true,
          createdAt: 1,
          updatedAt: 1,
        }),
      ];
      source.profiles[0]!.bookmarks = [
        {
          id: imageId,
          profileId: id,
          parentId: id,
          title: 'Inert <script>text</script>',
          url: 'https://example.com/',
          tags: [],
          note: '',
          cardAppearance: { kind: 'color', value: '#123456' },
          index: 0,
          createdAt: 1,
          updatedAt: 1,
        },
      ];
      expect(
        await decodeNativeExport(await encodeNativeExport(source)),
      ).toEqual(source);
      source.profiles[0]!.bookmarks[0]!.url = url;
      const hash = new Uint8Array(
        await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(JSON.stringify(source)),
        ),
      );
      const digest = Array.from(hash, (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
      await expect(
        decodeNativeExport(
          JSON.stringify({
            format: 'Bookmark Manager Pro export v1',
            encrypted: false,
            digest,
            payload: source,
          }),
        ),
      ).rejects.toThrow();
    },
  );
  it('enforces existing note body limits in UTF-8 bytes', () => {
    const source = payload();
    source.profiles[0]!.noteFolders = [
      {
        id: imageId,
        profileId: id,
        parentId: null,
        title: 'Notes',
        createdAt: 1,
        isHome: true,
      },
    ];
    source.profiles[0]!.notes = [
      {
        id,
        profileId: id,
        folderId: imageId,
        title: 'Note',
        body: '\u00e9'.repeat(NOTE_BODY_MAX_BYTES / 2),
        important: false,
        createdAt: 1,
        modifiedAt: 1,
        revision: 1,
      },
    ];
    expect(validateExport(source).profiles[0]!.notes).toHaveLength(1);
    source.profiles[0]!.notes[0]!.body += '\u00e9';
    expect(() => validateExport(source)).toThrow('export-note-size-limit');
  });
  it('accepts deep bookmark hierarchies while rejecting cycles', () => {
    const source = payload();
    source.profiles[0]!.folders = Array.from({ length: 130 }, (_, index) =>
      folderSchema.parse({
        id: `33333333-3333-4333-8333-${String(index).padStart(12, '0')}`,
        profileId: id,
        parentId:
          index === 0
            ? null
            : `33333333-3333-4333-8333-${String(index - 1).padStart(12, '0')}`,
        title: 'Synthetic folder',
        tags: [],
        note: '',
        cardAppearance: { kind: 'color', value: '#123456' },
        backgroundAppearance: { kind: 'none' },
        index: 0,
        isRoot: index === 0,
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    expect(validateExport(source).profiles[0]!.folders).toHaveLength(130);
    source.profiles[0]!.folders[1]!.parentId =
      source.profiles[0]!.folders.at(-1)!.id;
    expect(() => validateExport(source)).toThrow('export-invalid-folder-tree');
  });
  it('inspects the unlock requirement without exposing a payload or deriving a key', async () => {
    const plain = await encodeNativeExport(payload());
    const encrypted = await encodeNativeExport(payload(), 'Aa1!');
    const derive = vi.spyOn(crypto.subtle, 'deriveKey');
    try {
      expect(inspectNativeExport(plain)).toEqual({ encrypted: false });
      expect(inspectNativeExport(encrypted)).toEqual({ encrypted: true });
      expect(derive).not.toHaveBeenCalled();
    } finally {
      derive.mockRestore();
    }
  });

  it.each([
    { iterations: 1_000_000_000 },
    { cipher: 'AES-CBC' },
    { salt: 'A'.repeat(24) },
    { salt: 'A'.repeat(21) + 'B==' },
    { nonce: '!'.repeat(16) },
    { ciphertext: '' },
    { ciphertext: 'AQ==' },
    { ciphertext: 'A===BBBB' },
    { format: 'Bookmark Manager Pro export v2' },
  ])(
    'rejects malformed encrypted metadata before password derivation: %#',
    async (change) => {
      const encrypted: Record<string, unknown> = JSON.parse(
        await encodeNativeExport(payload(), 'Aa1!'),
      );
      const content = JSON.stringify({ ...encrypted, ...change });
      const derive = vi.spyOn(crypto.subtle, 'deriveKey');
      try {
        expect(() => inspectNativeExport(content)).toThrow();
        await expect(decodeNativeExport(content, 'Aa1!')).rejects.toThrow();
        expect(derive).not.toHaveBeenCalled();
      } finally {
        derive.mockRestore();
      }
    },
  );

  it('preserves selected profile and exact local image bytes without encryption', async () => {
    const source = payload();
    expect(await decodeNativeExport(await encodeNativeExport(source))).toEqual(
      source,
    );
  });
  it('encrypts with unique salt and nonce and accepts a four-character password', async () => {
    const password = 'Aa1!';
    const source = payload();
    const first = await encodeNativeExport(source, password);
    const second = await encodeNativeExport(source, password);
    expect(first).not.toEqual(second);
    expect(first).not.toContain('Synthetic profile');
    expect(first).not.toContain('data:image');
    expect(await decodeNativeExport(first, password)).toEqual(source);
    await expect(decodeNativeExport(first, 'wrong password')).rejects.toThrow();
    await expect(decodeNativeExport(first)).rejects.toThrow(
      'export-password-required',
    );
  });
  it('rejects tampered plaintext, encrypted bytes, future versions and truncated files', async () => {
    const plain = await encodeNativeExport(payload());
    await expect(
      decodeNativeExport(plain.replace('Synthetic profile', 'Changed profile')),
    ).rejects.toThrow('export-integrity-failed');
    const encrypted = JSON.parse(
      await encodeNativeExport(payload(), 'LongEnoughPassword1!'),
    );
    encrypted.ciphertext =
      (encrypted.ciphertext[0] === 'A' ? 'B' : 'A') +
      encrypted.ciphertext.slice(1);
    await expect(
      decodeNativeExport(JSON.stringify(encrypted), 'LongEnoughPassword1!'),
    ).rejects.toThrow();
    const future = JSON.parse(plain);
    future.payload.version = 2;
    await expect(decodeNativeExport(JSON.stringify(future))).rejects.toThrow();
    await expect(decodeNativeExport(plain.slice(0, -5))).rejects.toThrow();
  });
  it('decodes an existing v1 file with a password outside the new allowlist', async () => {
    const password = 'A long 🔐 password';
    const source = payload();
    const salt = new Uint8Array(16).fill(1);
    const nonce = new Uint8Array(12).fill(2);
    const encode = (text: string) => new TextEncoder().encode(text);
    const material = await crypto.subtle.importKey(
      'raw',
      encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600_000 },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
    );
    const format = 'Bookmark Manager Pro export v1';
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
        additionalData: encode(format),
        tagLength: 128,
      },
      key,
      encode(JSON.stringify(source)),
    );
    const file = JSON.stringify({
      format,
      encrypted: true,
      kdf: 'PBKDF2-SHA256',
      iterations: 600_000,
      cipher: 'AES-256-GCM',
      salt: Buffer.from(salt).toString('base64'),
      nonce: Buffer.from(nonce).toString('base64'),
      ciphertext: Buffer.from(ciphertext).toString('base64'),
    });
    expect(await decodeNativeExport(file, password)).toEqual(source);
  });
  it('rejects short passwords, duplicate profiles and assets owned by another profile', async () => {
    await expect(encodeNativeExport(payload(), 'Aa1')).rejects.toThrow(
      'export-password-too-short',
    );
    const duplicate = payload();
    duplicate.profiles.push(duplicate.profiles[0]!);
    expect(() => validateExport(duplicate)).toThrow('export-duplicate-profile');
    const crossed = payload();
    crossed.profiles[0]!.folderWallpapers![0]!.profileId = imageId;
    expect(() => validateExport(crossed)).toThrow('export-profile-mismatch');
  });
});

describe('new export password policy', () => {
  it.each(['Aa1!', 'Abc1', 'Aa1!@#$%^&*-_=+?'])(
    'accepts the allowed ASCII password %s',
    (password) => expect(isValidExportPassword(password)).toBe(true),
  );
  it.each([
    '',
    'Aa1',
    'aaaa',
    'AAAA',
    '1234',
    'abc1',
    'ABC1',
    'Abcd',
    'Aa1 ',
    'Aa1\n',
    'Aa1\t',
    'Aa1\0',
    'Aa1é',
    'Aa1🔐',
    'Aa1<',
    'Aa1>',
    'Aa1"',
    "Aa1'",
    'Aa1`',
    'Aa1\\',
    'Aa1/',
    'Aa1;',
    'Aa1:',
    'Aa1|',
    'Aa1(',
    'Aa1)',
    'Aa1[',
    'Aa1]',
    'Aa1{',
    'Aa1}',
    'Aa1,',
    'Aa1.',
    'Aa1~',
    'Aa1\u007f',
  ])(
    'rejects invalid input case %# at the encoder boundary',
    async (password) => {
      expect(isValidExportPassword(password)).toBe(false);
      await expect(encodeNativeExport(payload(), password)).rejects.toThrow(
        password.length < 4
          ? 'export-password-too-short'
          : 'export-password-invalid',
      );
    },
  );
});
