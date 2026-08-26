import { describe, expect, it, vi } from 'vitest';

import type { InitializationState } from '../initialization/initialization-state';
import { RunWebPreflight } from './run-web-preflight';

function createPreflight(initialization: InitializationState) {
  const setLanguage = vi.fn(async () => undefined);
  const record = vi.fn();
  const logRecord = vi.fn(async () => undefined);
  const preflight = new RunWebPreflight(
    { execute: vi.fn(async () => initialization) },
    { getLanguages: () => ['fr-FR', 'en-US'] },
    { getSupportedLanguages: () => ['en-US', 'fr-CA'], setLanguage },
    { record },
    { record: logRecord },
    () => 'operation-id',
  );

  return { logRecord, preflight, record, setLanguage };
}

describe('RunWebPreflight', () => {
  it('loads the browser language before returning first-run UI data', async () => {
    const { preflight, setLanguage } = createPreflight({
      status: 'first-run',
      theme: 'light',
    });

    const result = await preflight.execute();

    expect(setLanguage).toHaveBeenCalledWith('fr-CA');
    expect(result).toMatchObject({
      operationId: 'operation-id',
      language: 'fr-CA',
      initialization: { status: 'first-run' },
    });
    expect(result.capabilities).toHaveLength(4);
    expect(
      result.capabilities.every(({ status }) => status === 'unavailable'),
    ).toBe(true);
  });

  it('lets the active profile language override the browser language', async () => {
    const { logRecord, preflight, setLanguage } = createPreflight({
      status: 'ready',
      profile: {
        id: 'db99e46b-6087-4aa3-9606-27ac37dd38c8',
        username: 'Profile',
        createdAt: 1,
        updatedAt: 1,
      },
      settings: {
        bookmarkView: 'card',
        cardSize: 'medium',
        profileId: 'db99e46b-6087-4aa3-9606-27ac37dd38c8',
        theme: 'dark',
        language: 'en-US',
      },
      theme: 'dark',
    });

    await expect(preflight.execute()).resolves.toMatchObject({
      language: 'en-US',
    });
    expect(setLanguage).toHaveBeenCalledWith('en-US');
    expect(logRecord).toHaveBeenCalledWith(
      'db99e46b-6087-4aa3-9606-27ac37dd38c8',
      expect.objectContaining({ level: 'WARN' }),
    );
    expect(logRecord).toHaveBeenCalledWith(
      'db99e46b-6087-4aa3-9606-27ac37dd38c8',
      expect.objectContaining({ level: 'INFO' }),
    );
  });

  it('records a localization error without replacing the original failure', async () => {
    const state: InitializationState = {
      status: 'ready',
      profile: {
        id: 'db99e46b-6087-4aa3-9606-27ac37dd38c8',
        username: 'Profile',
        createdAt: 1,
        updatedAt: 1,
      },
      settings: {
        bookmarkView: 'card',
        cardSize: 'medium',
        profileId: 'db99e46b-6087-4aa3-9606-27ac37dd38c8',
        theme: 'dark',
        language: 'en-US',
      },
      theme: 'dark',
    };
    if (state.status !== 'ready') throw new Error('expected-ready-state');
    const { logRecord, preflight, setLanguage } = createPreflight(state);
    const failure = new Error('localization-failed');
    setLanguage.mockRejectedValueOnce(failure);

    await expect(preflight.execute()).rejects.toBe(failure);
    expect(logRecord).toHaveBeenCalledWith(
      state.profile.id,
      expect.objectContaining({
        eventCode: 'PREFLIGHT-LOCALIZATION-FAILED',
        level: 'ERROR',
      }),
    );
  });

  it('does not let a logging failure block successful preflight', async () => {
    const state: InitializationState = {
      status: 'ready',
      profile: {
        id: 'db99e46b-6087-4aa3-9606-27ac37dd38c8',
        username: 'Profile',
        createdAt: 1,
        updatedAt: 1,
      },
      settings: {
        bookmarkView: 'card',
        cardSize: 'medium',
        profileId: 'db99e46b-6087-4aa3-9606-27ac37dd38c8',
        theme: 'dark',
        language: 'en-US',
      },
      theme: 'dark',
    };
    const { logRecord, preflight } = createPreflight(state);
    logRecord.mockRejectedValue(new Error('log-unavailable'));
    const diagnostic = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await expect(preflight.execute()).resolves.toMatchObject({
      language: 'en-US',
    });
    expect(diagnostic).toHaveBeenCalledWith(
      'preflight-activity-log-write-failed',
    );
    diagnostic.mockRestore();
  });

  it('records UI completion separately from data loading', () => {
    const { preflight, record } = createPreflight({
      status: 'first-run',
      theme: 'light',
    });

    preflight.markUiReady('operation-id');

    expect(record).toHaveBeenCalledWith('operation-id');
  });
});
