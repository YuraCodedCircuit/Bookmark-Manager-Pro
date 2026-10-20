import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  encodeNativeExport,
  type ExportPayload,
} from '../../domain/profile-export';
import {
  NativeImportSession,
  type ImportValidationEvent,
} from './native-import-session';

function payload(): ExportPayload {
  return {
    format: 'bookmark-manager-pro',
    version: 1,
    createdAt: 1,
    categories: ['bookmarks'],
    restoreSynchronization: 'paused',
    profiles: [
      {
        formatVersion: 3,
        databaseSchemaVersion: 36,
        applicationVersion: '0.6.2',
        profile: {
          id: '11111111-1111-4111-8111-111111111111',
          username: 'Synthetic private profile',
          createdAt: 1,
          updatedAt: 1,
        },
        bookmarks: [],
        folders: [],
        favorites: [],
        folderWallpapers: [],
      },
    ],
    backups: [],
  };
}

beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('in-memory native import session', () => {
  it('exposes only verified plaintext payloads and fixed success events', async () => {
    const source = payload();
    const record = vi.fn<(event: ImportValidationEvent) => void>();
    const session = new NativeImportSession(record);
    const content = await encodeNativeExport(source);
    const pending = session.load(content);
    expect(session.state).toEqual({ phase: 'checking' });
    expect(await pending).toEqual({ phase: 'ready', payload: source });
    expect(record.mock.calls.map(([event]) => event)).toEqual([
      { level: 'INFO', code: 'import.validation.started' },
      { level: 'INFO', code: 'import.validation.ready' },
    ]);
    expect(JSON.stringify(record.mock.calls)).not.toContain(
      'Synthetic private profile',
    );
  });

  it('keeps encrypted content hidden until a successful unlock and permits retry', async () => {
    const source = payload();
    const record = vi.fn<(event: ImportValidationEvent) => void>();
    const session = new NativeImportSession(record);
    const content = await encodeNativeExport(source, 'Aa1!');
    expect(await session.load(content)).toEqual({
      phase: 'locked',
      unlockFailed: false,
    });
    expect(await session.unlock('incorrect')).toEqual({
      phase: 'locked',
      unlockFailed: true,
    });
    expect(session.diagnosticFailure?.code).toBe('import-unlock-failed');
    expect(session.diagnosticFailure?.cause).toBeDefined();
    expect(await session.unlock('Aa1!')).toEqual({
      phase: 'ready',
      payload: source,
    });
    expect(session.diagnosticFailure).toBeUndefined();
    expect(record).toHaveBeenCalledWith({
      level: 'INFO',
      code: 'import.validation.unlock-required',
    });
    expect(record).toHaveBeenCalledWith({
      level: 'ERROR',
      code: 'import.unlock.failed',
    });
    expect(JSON.stringify(record.mock.calls)).not.toMatch(
      /Aa1!|incorrect|Synthetic private profile/,
    );
  });

  it('rejects malformed or tampered files without exposing source values', async () => {
    const record = vi.fn<(event: ImportValidationEvent) => void>();
    const session = new NativeImportSession(record);
    expect(await session.load('{"secret":"private source"')).toEqual({
      phase: 'failed',
      code: 'import-file-invalid',
    });
    expect(session.diagnosticFailure?.cause).toBeInstanceOf(SyntaxError);
    const tampered = (await encodeNativeExport(payload())).replace(
      'Synthetic private profile',
      'Tampered private profile',
    );
    expect(await session.load(tampered)).toEqual({
      phase: 'failed',
      code: 'import-file-invalid',
    });
    expect(record).toHaveBeenCalledWith({
      level: 'ERROR',
      code: 'import.validation.failed',
    });
    expect(JSON.stringify(record.mock.calls)).not.toMatch(
      /secret|private|Tampered/,
    );
  });

  it('cannot publish an unlock result after the session closes', async () => {
    const record = vi.fn<(event: ImportValidationEvent) => void>();
    const session = new NativeImportSession(record);
    await session.load(await encodeNativeExport(payload(), 'Aa1!'));
    const pending = session.unlock('Aa1!');
    session.close();
    expect(session.state).toEqual({ phase: 'closed' });
    expect(await pending).toEqual({ phase: 'closed' });
    expect(session.diagnosticFailure).toBeUndefined();
    expect(record).toHaveBeenCalledWith({
      level: 'WARN',
      code: 'import.validation.cancelled',
    });
    expect(record).not.toHaveBeenCalledWith({
      level: 'INFO',
      code: 'import.validation.ready',
    });
    await expect(session.load('anything')).rejects.toThrow(
      'import-session-closed',
    );
  });

  it('discards superseded plaintext validation instead of overwriting the new file', async () => {
    const session = new NativeImportSession();
    const first = await encodeNativeExport(payload());
    const second = payload();
    const profile = second.profiles[0];
    if (!profile) throw new Error('missing-profile-fixture');
    second.profiles[0] = {
      ...profile,
      profile: { ...profile.profile, username: 'Second profile' },
    };
    const secondFile = await encodeNativeExport(second);
    const pendingFirst = session.load(first);
    await session.load(secondFile);
    await pendingFirst;
    expect(session.state).toEqual({ phase: 'ready', payload: second });
    session.cancel();
    expect(session.state).toEqual({ phase: 'empty' });
    await expect(session.unlock('Aa1!')).rejects.toThrow(
      'import-file-not-locked',
    );
  });

  it.each(['throw', 'reject', 'disabled'] as const)(
    'isolates %s logging from validation',
    async (mode) => {
      const diagnostic = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const record =
        mode === 'disabled'
          ? undefined
          : () => {
              if (mode === 'throw') throw new Error('sensitive logger details');
              return Promise.reject(new Error('sensitive logger details'));
            };
      const session = new NativeImportSession(record);
      const source = payload();
      expect(await session.load(await encodeNativeExport(source))).toEqual({
        phase: 'ready',
        payload: source,
      });
      await Promise.resolve();
      if (mode === 'disabled') expect(diagnostic).not.toHaveBeenCalled();
      else
        expect(diagnostic).toHaveBeenCalledWith(
          'import.validation.log-write-failed',
          { code: 'import.validation.ready' },
        );
      expect(JSON.stringify(diagnostic.mock.calls)).not.toContain(
        'sensitive logger details',
      );
    },
  );
});
