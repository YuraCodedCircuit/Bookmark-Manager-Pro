import { z } from 'zod';
import { validateParentForest } from './parent-forest';
import { MAX_EXPORT_BYTES, MAX_NATIVE_EXPORT_FILE_BYTES } from './file-limits';
export { MAX_EXPORT_BYTES, MAX_NATIVE_EXPORT_FILE_BYTES } from './file-limits';
import {
  NOTE_BODY_MAX_BYTES,
  NOTE_FOLDER_DEPTH_LIMIT,
  noteBodyByteLength,
} from './note';
import {
  backupPayloadSchema,
  backupSnapshotSchema,
  digestBackupPayload,
  encodeBackupPayload,
} from './backup';

export const exportCategories = [
  'bookmarks',
  'notes',
  'settings',
  'activity',
  'synchronization',
] as const;
export type ExportCategory = (typeof exportCategories)[number];
export type ExportFormat = 'bmpro' | 'json' | 'csv' | 'html';
const iterations = 600_000;
const header = 'Bookmark Manager Pro export v1';
const bytes = (value: string) => new TextEncoder().encode(value);

/** Validates new export passwords; decoding preserves existing password compatibility. */
export function isValidExportPassword(password: string): boolean {
  const checks = getExportPasswordRequirements(password);
  return checks.allowed && checks.groups;
}

/** Returns independent requirements for the export password checklist. */
export function getExportPasswordRequirements(password: string) {
  return {
    allowed:
      password.length >= 4 && !/[^A-Za-z0-9!@#$%^&*_=+?-]/u.test(password),
    groups:
      /[a-z]/u.test(password) &&
      /[A-Z]/u.test(password) &&
      /[0-9]/u.test(password),
  };
}

const exportProfileSchema = backupPayloadSchema.partial().required({
  profile: true,
  formatVersion: true,
  databaseSchemaVersion: true,
  applicationVersion: true,
});
export const exportPayloadSchema = z.object({
  format: z.literal('bookmark-manager-pro'),
  version: z.literal(1),
  createdAt: z.number().int().nonnegative(),
  categories: z
    .array(z.enum(exportCategories))
    .min(1)
    .max(exportCategories.length),
  restoreSynchronization: z.literal('paused'),
  profiles: z.array(exportProfileSchema).min(1).max(1000),
  backups: z.array(backupSnapshotSchema).max(10000),
});
export type ExportPayload = z.infer<typeof exportPayloadSchema>;
const envelopeSchema = z.discriminatedUnion('encrypted', [
  z.object({
    format: z.literal(header),
    encrypted: z.literal(false),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    payload: exportPayloadSchema,
  }),
  z.object({
    format: z.literal(header),
    encrypted: z.literal(true),
    kdf: z.literal('PBKDF2-SHA256'),
    iterations: z.literal(iterations),
    cipher: z.literal('AES-256-GCM'),
    salt: z.string().length(24),
    nonce: z.string().length(16),
    ciphertext: z.string().max(MAX_EXPORT_BYTES * 2),
  }),
]);

function base64(input: Uint8Array): string {
  let result = '';
  for (let offset = 0; offset < input.length; offset += 32768)
    result += String.fromCharCode(...input.subarray(offset, offset + 32768));
  return btoa(result);
}
/** Checks encoding before allocation or expensive password derivation. */
function base64ByteLength(input: string): number {
  if (input.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(input))
    throw new Error('export-invalid-encoding');
  const padding = input.endsWith('==') ? 2 : input.endsWith('=') ? 1 : 0;
  const bodyLength = input.length - padding;
  if (input.slice(0, bodyLength).includes('='))
    throw new Error('export-invalid-encoding');
  if (padding > 0) {
    const last = input.charAt(bodyLength - 1);
    const value =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(
        last,
      );
    if (
      bodyLength === 0 ||
      value < 0 ||
      (value & (padding === 2 ? 15 : 3)) !== 0
    )
      throw new Error('export-invalid-encoding');
  }
  return (input.length / 4) * 3 - padding;
}

function unbase64(input: string): Uint8Array<ArrayBuffer> {
  base64ByteLength(input);
  return Uint8Array.from(atob(input), (c) => c.charCodeAt(0));
}

function readNativeEnvelope(content: string) {
  if (
    content.length > MAX_NATIVE_EXPORT_FILE_BYTES ||
    bytes(content).byteLength > MAX_NATIVE_EXPORT_FILE_BYTES
  )
    throw new Error('export-too-large');
  const envelope = envelopeSchema.parse(JSON.parse(content));
  if (envelope.encrypted) {
    if (
      base64ByteLength(envelope.salt) !== 16 ||
      base64ByteLength(envelope.nonce) !== 12
    )
      throw new Error('export-invalid-encoding');
    const ciphertextBytes = base64ByteLength(envelope.ciphertext);
    if (ciphertextBytes < 16 || ciphertextBytes > MAX_EXPORT_BYTES + 16)
      throw new Error('export-invalid-ciphertext-size');
  }
  return envelope;
}

/**
 * Returns only the unlock requirement after validating native v1 envelope
 * metadata and encoding. Does not authenticate ciphertext or validate payload
 * integrity; callers must decode successfully before exposing imported data.
 */
export function inspectNativeExport(content: string): { encrypted: boolean } {
  return { encrypted: readNativeEnvelope(content).encrypted };
}
async function digest(value: string): Promise<string> {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes(value))),
    (n) => n.toString(16).padStart(2, '0'),
  ).join('');
}
async function key(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    bytes(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Checks parent references and bounded depth without repeatedly walking shared ancestors. */
function validateParentDepth(
  rows: readonly { id: string; parentId: string | null }[],
  limit: number,
  error: string,
): void {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const depths = new Map<string, number>();
  for (const row of rows) {
    const path: string[] = [];
    const seen = new Set<string>();
    let cursor: string | null = row.id;
    while (cursor !== null && !depths.has(cursor)) {
      const current = byId.get(cursor);
      if (!current || seen.has(cursor)) throw new Error(error);
      seen.add(cursor);
      path.push(cursor);
      if (path.length > limit + 1) throw new Error('export-depth-limit');
      cursor = current.parentId;
    }
    let depth = cursor === null ? -1 : depths.get(cursor)!;
    for (const id of path.reverse()) {
      if (++depth > limit) throw new Error('export-depth-limit');
      depths.set(id, depth);
    }
  }
}

/** Validates ownership, dependencies, and bounded hierarchies without writing to storage. */
export function validateExport(input: unknown): ExportPayload {
  const payload = exportPayloadSchema.parse(input);
  const profileIds = new Set<string>();
  if (new Set(payload.categories).size !== payload.categories.length)
    throw new Error('export-duplicate-category');
  for (const profile of payload.profiles) {
    const id = profile.profile.id;
    if (profileIds.has(id)) throw new Error('export-duplicate-profile');
    profileIds.add(id);
    for (const category of payload.categories) {
      const required =
        category === 'bookmarks'
          ? ['bookmarks', 'folders', 'favorites', 'folderWallpapers']
          : category === 'notes'
            ? ['notes', 'noteFolders']
            : category === 'settings'
              ? ['settings', 'activityLogSettings']
              : category === 'activity'
                ? ['activity']
                : ['synchronization'];
      if (required.some((field) => !(field in profile)))
        throw new Error('export-missing-category');
    }
    for (const rows of [
      profile.bookmarks,
      profile.folders,
      profile.favorites,
      profile.activity,
      profile.notes,
      profile.noteFolders,
      profile.folderWallpapers,
    ]) {
      if (rows?.some((row) => row.profileId !== id))
        throw new Error('export-profile-mismatch');
    }
    if (profile.settings && profile.settings.profileId !== id)
      throw new Error('export-profile-mismatch');
    if (
      profile.activityLogSettings &&
      profile.activityLogSettings.profileId !== id
    )
      throw new Error('export-profile-mismatch');
    if (profile.synchronization && profile.synchronization.profileId !== id)
      throw new Error('export-profile-mismatch');
    const folders = new Map(
      profile.folders?.map((folder) => [folder.id, folder]),
    );
    const roots = (profile.folders ?? []).filter((folder) => folder.isRoot);
    if (
      folders.size &&
      (roots.length !== 1 ||
        roots[0]!.parentId !== null ||
        [...folders.values()].some(
          (folder) => !folder.isRoot && folder.parentId === null,
        ))
    )
      throw new Error('export-invalid-folder-root');
    const images = new Set(profile.folderWallpapers?.map((image) => image.id));
    validateParentForest(profile.folders ?? [], 'export-invalid-folder-tree');
    for (const folder of folders.values()) {
      if (
        folder.backgroundAppearance.kind === 'image' &&
        folder.backgroundAppearance.imageId &&
        !images.has(folder.backgroundAppearance.imageId)
      )
        throw new Error('export-missing-image');
    }
    if (profile.bookmarks?.some((bookmark) => !folders.has(bookmark.parentId)))
      throw new Error('export-missing-folder');
    const noteFolders = new Set(
      profile.noteFolders?.map((folder) => folder.id),
    );
    validateParentDepth(
      profile.noteFolders ?? [],
      NOTE_FOLDER_DEPTH_LIMIT,
      'export-invalid-note-tree',
    );
    for (const note of profile.notes ?? [])
      if (noteBodyByteLength(note.body) > NOTE_BODY_MAX_BYTES)
        throw new Error('export-note-size-limit');
    const bookmarks = new Set(
      profile.bookmarks?.map((bookmark) => bookmark.id),
    );
    if (
      profile.favorites?.some(
        (favorite) =>
          !(favorite.kind === 'bookmark' ? bookmarks : folders).has(
            favorite.itemId,
          ),
      )
    )
      throw new Error('export-missing-favorite-item');
    if (profile.notes?.some((note) => !noteFolders.has(note.folderId)))
      throw new Error('export-missing-note-folder');
    for (const rows of [
      profile.bookmarks,
      profile.folders,
      profile.notes,
      profile.noteFolders,
      profile.folderWallpapers,
    ]) {
      if (rows && new Set(rows.map((row) => row.id)).size !== rows.length)
        throw new Error('export-duplicate-record');
    }
  }
  for (const snapshot of payload.backups) {
    if (
      !profileIds.has(snapshot.profileId) ||
      snapshot.profileId !== snapshot.payload.profile.id
    )
      throw new Error('export-backup-profile-mismatch');
    validateExport({
      ...payload,
      categories: ['bookmarks', 'settings', 'activity', 'synchronization'],
      profiles: [
        {
          ...snapshot.payload,
          folderWallpapers: snapshot.payload.folderWallpapers ?? [],
        },
      ],
      backups: [],
    });
  }
  return payload;
}

/** Encodes native format v1; encrypted metadata is fixed and authenticated as additional data. */
export async function encodeNativeExport(
  input: ExportPayload,
  password?: string,
): Promise<string> {
  const payload = validateExport(input);
  await verifyBackups(payload);
  for (const profile of payload.profiles)
    if (profile.activity) profile.activity = [];
  for (const snapshot of payload.backups) {
    snapshot.payload.activity = [];
    snapshot.digest = await digestBackupPayload(snapshot.payload);
    snapshot.sizeBytes = encodeBackupPayload(snapshot.payload).byteLength;
  }
  const content = JSON.stringify(payload);
  if (bytes(content).byteLength > MAX_EXPORT_BYTES)
    throw new Error('export-too-large');
  if (password === undefined)
    return JSON.stringify({
      format: header,
      encrypted: false,
      digest: await digest(content),
      payload,
    });
  if (password.length < 4) throw new Error('export-password-too-short');
  if (!isValidExportPassword(password))
    throw new Error('export-password-invalid');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      additionalData: bytes(header),
      tagLength: 128,
    },
    await key(password, salt),
    bytes(content),
  );
  return JSON.stringify({
    format: header,
    encrypted: true,
    kdf: 'PBKDF2-SHA256',
    iterations,
    cipher: 'AES-256-GCM',
    salt: base64(salt),
    nonce: base64(nonce),
    ciphertext: base64(new Uint8Array(encrypted)),
  });
}

/** Estimates v1 envelope bytes without hashing, encrypting, or receiving a password. */
export function estimateNativeExportBytes(
  input: ExportPayload,
  encrypted: boolean,
): number {
  const payload = validateExport(input);
  for (const profile of payload.profiles)
    if (profile.activity) profile.activity = [];
  for (const snapshot of payload.backups) {
    snapshot.payload.activity = [];
    snapshot.digest = '0'.repeat(64);
    snapshot.sizeBytes = encodeBackupPayload(snapshot.payload).byteLength;
  }
  const payloadSize = bytes(JSON.stringify(payload)).byteLength;
  if (payloadSize > MAX_EXPORT_BYTES) throw new Error('export-too-large');
  if (!encrypted)
    return bytes(
      JSON.stringify({
        format: header,
        encrypted: false,
        digest: '0'.repeat(64),
        payload,
      }),
    ).byteLength;
  const envelopeSize = bytes(
    JSON.stringify({
      format: header,
      encrypted: true,
      kdf: 'PBKDF2-SHA256',
      iterations,
      cipher: 'AES-256-GCM',
      salt: 'A'.repeat(24),
      nonce: 'A'.repeat(16),
      ciphertext: '',
    }),
  ).byteLength;
  // GCM appends a 16-byte tag; base64 expands each three bytes to four characters.
  return envelopeSize + 4 * Math.ceil((payloadSize + 16) / 3);
}

/** Reads and verifies native v1 exports only. Never imports or mutates stored data. */
export async function decodeNativeExport(
  content: string,
  password?: string,
): Promise<ExportPayload> {
  const envelope = readNativeEnvelope(content);
  if (!envelope.encrypted) {
    if ((await digest(JSON.stringify(envelope.payload))) !== envelope.digest)
      throw new Error('export-integrity-failed');
    const payload = validateExport(envelope.payload);
    await verifyBackups(payload);
    return payload;
  }
  if (password === undefined) throw new Error('export-password-required');
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: unbase64(envelope.nonce),
      additionalData: bytes(header),
      tagLength: 128,
    },
    await key(password, unbase64(envelope.salt)),
    unbase64(envelope.ciphertext),
  );
  const payload = validateExport(
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decrypted)),
  );
  await verifyBackups(payload);
  return payload;
}

async function verifyBackups(payload: ExportPayload): Promise<void> {
  for (const snapshot of payload.backups) {
    if ((await digestBackupPayload(snapshot.payload)) !== snapshot.digest)
      throw new Error('export-backup-integrity-failed');
  }
}
