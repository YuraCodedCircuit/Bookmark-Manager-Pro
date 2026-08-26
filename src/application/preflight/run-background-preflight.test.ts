import { describe, expect, it, vi } from 'vitest';

import type {
  InitializationData,
  InitializationRepository,
} from '../initialization/initialization-repository';
import type { ManageActivityLog } from '../activity-log/manage-activity-log';
import type { BackgroundPreflightSnapshot } from '../../messaging/background-protocol';
import { RunBackgroundPreflight } from './run-background-preflight';

const profileId = 'db99e46b-6087-4aa3-9606-27ac37dd38c8';

function createDependencies() {
  let cached: BackgroundPreflightSnapshot | undefined;
  const repository: InitializationRepository = {
    open: vi.fn(async () => undefined),
    load: vi.fn(async () => ({ kind: 'first-run' as const })),
  };
  const record = vi.fn(async () => undefined);
  const sessionStore = {
    read: vi.fn(async () => cached),
    write: vi.fn(async (snapshot: BackgroundPreflightSnapshot) => {
      cached = snapshot;
    }),
  };
  const service = new RunBackgroundPreflight(
    repository,
    sessionStore,
    {
      getLanguages: () => ['fr-CA', 'en-US'],
      getSupportedLanguages: () => ['en-US'],
    },
    {
      getCapabilities: () => [{ id: 'extension-startup', status: 'available' }],
    },
    { record } as Pick<ManageActivityLog, 'record'>,
    () => true,
    () => 'a4ecf62e-f143-49ac-a209-1e12f977d5c8',
    () => new Date('2026-08-24T12:00:00.000Z'),
  );
  return { record, repository, service, sessionStore };
}

describe('RunBackgroundPreflight', () => {
  it('persists and reuses a validated first-run snapshot', async () => {
    const { repository, service } = createDependencies();

    const first = await service.execute();
    const second = await service.execute();

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      language: 'en-US',
      initialization: { status: 'first-run' },
    });
    expect(repository.open).toHaveBeenCalledTimes(1);
  });

  it('uses the active profile language and records successful readiness', async () => {
    const { record, repository, service } = createDependencies();
    repository.load = vi.fn(async (): Promise<InitializationData> => ({
      kind: 'active-profile',
      profile: {
        id: profileId,
        username: 'Local profile',
        createdAt: 1,
        updatedAt: 1,
      },
      settings: {
        bookmarkView: 'card',
        cardSize: 'medium',
        language: 'en-US',
        profileId,
        theme: 'dark',
      },
    }));

    await expect(service.execute()).resolves.toMatchObject({
      initialization: { status: 'ready', profileId },
    });
    expect(record).toHaveBeenCalledWith(
      profileId,
      expect.objectContaining({
        eventCode: 'BACKGROUND-PREFLIGHT-COMPLETE',
        level: 'INFO',
      }),
    );
  });

  it('returns a typed recovery state when opening IndexedDB fails', async () => {
    const { record, repository, service } = createDependencies();
    repository.open = vi.fn(async () => {
      throw new Error('private detail');
    });

    await expect(service.execute()).resolves.toMatchObject({
      initialization: {
        status: 'recovery',
        errorCode: 'database-open-failed',
      },
    });
    expect(record).not.toHaveBeenCalled();
  });

  it('continues and records a warning when session caching fails', async () => {
    const { record, repository, service, sessionStore } = createDependencies();
    repository.load = vi.fn(async (): Promise<InitializationData> => ({
      kind: 'active-profile',
      profile: {
        id: profileId,
        username: 'Local profile',
        createdAt: 1,
        updatedAt: 1,
      },
      settings: {
        bookmarkView: 'card',
        cardSize: 'medium',
        language: 'en-US',
        profileId,
        theme: 'dark',
      },
    }));
    sessionStore.write.mockRejectedValueOnce(new Error('quota'));

    await expect(service.execute()).resolves.toMatchObject({
      initialization: { status: 'ready' },
    });
    expect(record).toHaveBeenCalledWith(
      profileId,
      expect.objectContaining({
        eventCode: 'BACKGROUND-PREFLIGHT-SESSION-CACHE-UNAVAILABLE',
        level: 'WARN',
      }),
    );
  });

  it('does not let activity-log failure change readiness', async () => {
    const dependencies = createDependencies();
    dependencies.repository.load = vi.fn(
      async (): Promise<InitializationData> => ({
        kind: 'active-profile',
        profile: {
          id: profileId,
          username: 'Local profile',
          createdAt: 1,
          updatedAt: 1,
        },
        settings: {
          bookmarkView: 'card',
          cardSize: 'medium',
          language: 'en-US',
          profileId,
          theme: 'dark',
        },
      }),
    );
    dependencies.record.mockRejectedValueOnce(new Error('log unavailable'));

    await expect(dependencies.service.execute()).resolves.toMatchObject({
      initialization: { status: 'ready' },
    });
  });
});
