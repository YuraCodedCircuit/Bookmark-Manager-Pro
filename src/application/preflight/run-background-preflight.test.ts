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
  const record = vi.fn<ManageActivityLog['record']>(async () => undefined);
  const activityLog = {
    record,
    beginSession: vi.fn(async (): Promise<void> => undefined),
    finishSession: vi.fn(
      async (_succeeded: boolean, _update: boolean): Promise<void> => {
        void _succeeded;
        void _update;
      },
    ),
  };
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
    activityLog as Pick<ManageActivityLog, 'record'>,
    () => true,
    () => 'a4ecf62e-f143-49ac-a209-1e12f977d5c8',
    () => new Date('2026-08-24T12:00:00.000Z'),
  );
  return { record, repository, service, sessionStore, activityLog };
}

describe('RunBackgroundPreflight', () => {
  it.each([false, true])(
    'does not replay completed preflight rows from cache (update=%s)',
    async (update) => {
      const { service, record, activityLog } = createDependencies();
      await service.execute(update);
      await vi.waitFor(() =>
        expect(activityLog.finishSession).toHaveBeenCalled(),
      );
      await service.execute(update);
      await service.execute();
      const prefix = update
        ? 'BACKGROUND-UPDATE-PREFLIGHT'
        : 'BACKGROUND-PREFLIGHT';
      expect(record.mock.calls.map((call) => call[1].eventCode)).toEqual([
        `${prefix}-STARTED`,
        `${prefix}-COMPLETE`,
      ]);
    },
  );
  it('does not reinterpret cached post-update checks as an original startup outcome', async () => {
    const { service, activityLog } = createDependencies();
    await expect(service.execute(true)).resolves.toMatchObject({
      purpose: 'update',
    });
    await vi.waitFor(() =>
      expect(activityLog.finishSession).toHaveBeenCalledWith(true, true),
    );
    await service.execute();
    expect(activityLog.finishSession).toHaveBeenLastCalledWith(true, true);
  });

  it('does not wait for a stalled log record or queue drain', async () => {
    const { record, service, activityLog } = createDependencies();
    record.mockImplementation(() => new Promise<void>(() => undefined));
    await expect(service.execute()).resolves.toMatchObject({
      initialization: { status: 'first-run' },
    });
    expect(record).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ eventCode: 'BACKGROUND-PREFLIGHT-STARTED' }),
      expect.any(Number),
    );
    // Another surface can consume readiness while the original log task is
    // still pending; it must not prematurely drain that task's startup queue.
    await expect(service.execute()).resolves.toMatchObject({
      initialization: { status: 'first-run' },
    });
    expect(activityLog.finishSession).not.toHaveBeenCalled();
  });

  it('returns readiness while session logging is stalled and later preserves start/outcome order', async () => {
    const { activityLog, record, service } = createDependencies();
    let release: () => void = () => undefined;
    activityLog.beginSession.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    await expect(service.execute()).resolves.toMatchObject({
      initialization: { status: 'first-run' },
    });
    expect(record).not.toHaveBeenCalled();
    release();
    await vi.waitFor(() =>
      expect(activityLog.finishSession).toHaveBeenCalledWith(true, false),
    );
    expect(record.mock.calls.map((call) => call[1].eventCode)).toEqual([
      'BACKGROUND-PREFLIGHT-STARTED',
      'BACKGROUND-PREFLIGHT-COMPLETE',
    ]);
  });

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
      null,
      expect.objectContaining({
        eventCode: 'BACKGROUND-PREFLIGHT-COMPLETE',
        level: 'INFO',
      }),
      new Date('2026-08-24T12:00:00.000Z').getTime(),
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
    expect(record).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        eventCode: 'BACKGROUND-PREFLIGHT-FAILED',
        level: 'ERROR',
        outcome: 'Failed',
      }),
      new Date('2026-08-24T12:00:00.000Z').getTime(),
    );
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
      undefined,
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
