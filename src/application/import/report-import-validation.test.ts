import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  importValidationOutcome,
  reportImportValidation,
} from './report-import-validation';

afterEach(() => vi.restoreAllMocks());
describe('import preview feedback', () => {
  it.each([
    ['import.save.succeeded', 'INFO', 'success'],
    ['import.save.failed', 'ERROR', 'failure'],
    ['import.save.changed', 'WARN', 'warning'],
    ['import.save.excluded', 'WARN', 'warning'],
    ['import.save.activity-excluded', 'WARN', 'warning'],
    ['import.save.paused', 'WARN', 'warning'],
    ['import.save.refresh-failed', 'WARN', 'warning'],
    ['import.save.cancelled', 'WARN', 'quiet'],
    ['import.save.prepared', 'INFO', 'quiet'],
  ] as const)(
    'records and notifies %s at its intended boundary',
    (code, level, channel) => {
      const record = vi.fn(async () => {});
      const success = vi.fn();
      const failure = vi.fn();
      const warning = vi.fn();
      reportImportValidation(
        { code, level },
        {
          record,
          notifySuccess: success,
          notifyFailure: failure,
          notifyWarning: warning,
        },
      );
      expect(record).toHaveBeenCalledWith({ code, level });
      expect(success).toHaveBeenCalledTimes(channel === 'success' ? 1 : 0);
      expect(failure).toHaveBeenCalledTimes(channel === 'failure' ? 1 : 0);
      expect(warning).toHaveBeenCalledTimes(channel === 'warning' ? 1 : 0);
    },
  );
  it.each([
    'import.save.succeeded',
    'import.save.excluded',
    'import.save.activity-excluded',
  ] as const)(
    'isolates failed and disabled secondary services for %s',
    async (code) => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const event = {
        code,
        level: code === 'import.save.succeeded' ? 'INFO' : 'WARN',
      } as const;
      expect(() =>
        reportImportValidation(event, {
          record: async () => {
            throw new Error('private');
          },
          notifyFailure: () => {},
          notifySuccess: () => {
            throw new Error('private');
          },
          notifyWarning: () => {
            throw new Error('private');
          },
        }),
      ).not.toThrow();
      expect(() =>
        reportImportValidation(event, {
          record: async () => {},
          notifyFailure: () => {},
        }),
      ).not.toThrow();
      await Promise.resolve();
      expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
        'private',
      );
    },
  );
  it.each([
    [{ level: 'INFO', code: 'import.validation.ready' }, 'Succeeded'],
    [{ level: 'WARN', code: 'import.validation.cancelled' }, 'Cancelled'],
    [{ level: 'WARN', code: 'import.destination.missing' }, 'Skipped'],
    [{ level: 'WARN', code: 'import.validation.csv-flat' }, 'Skipped'],
    [{ level: 'ERROR', code: 'import.validation.failed' }, 'Failed'],
  ] as const)(
    'classifies %j without confusing limitations with cancellation',
    (event, outcome) => {
      expect(importValidationOutcome(event)).toBe(outcome);
    },
  );
  it('notifies on destination load failure without imported or destination content', () => {
    const record = vi.fn(async () => {});
    const notifyFailure = vi.fn();
    const event = {
      level: 'ERROR',
      code: 'import.destination.failed',
    } as const;
    reportImportValidation(event, { record, notifyFailure });
    expect(record).toHaveBeenCalledWith(event);
    expect(notifyFailure).toHaveBeenCalledOnce();
  });
  it.each([
    { level: 'INFO', code: 'import.validation.ready' },
    { level: 'WARN', code: 'import.validation.cancelled' },
    { level: 'WARN', code: 'import.destination.missing' },
    { level: 'WARN', code: 'import.validation.csv-flat' },
  ] as const)('records $code without noisy notifications', async (event) => {
    const record = vi.fn(async () => {});
    const notifyFailure = vi.fn();
    reportImportValidation(event, { record, notifyFailure });
    await Promise.resolve();
    expect(record).toHaveBeenCalledWith(event);
    expect(notifyFailure).not.toHaveBeenCalled();
  });
  it('sends unlock errors through the notification service', () => {
    const record = vi.fn(async () => {});
    const notifyFailure = vi.fn();
    reportImportValidation(
      { level: 'ERROR', code: 'import.unlock.failed' },
      { record, notifyFailure },
    );
    expect(notifyFailure).toHaveBeenCalledOnce();
  });
  it('delivers a validation failure notification when logging fails, without exposing the cause', async () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    const notifyFailure = vi.fn();
    reportImportValidation(
      { level: 'ERROR', code: 'import.validation.failed' },
      {
        record: async () => {
          throw new Error('private');
        },
        notifyFailure,
      },
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(notifyFailure).toHaveBeenCalledOnce();
    expect(diagnostic).toHaveBeenCalledWith('import-log-write-failed');
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain('private');
  });
  it('isolates synchronous logging and notification failures and supports disabled services', () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    const event = { level: 'ERROR', code: 'import.validation.failed' } as const;
    expect(() =>
      reportImportValidation(event, {
        record: () => {
          throw new Error('private');
        },
        notifyFailure: () => {
          throw new Error('private');
        },
      }),
    ).not.toThrow();
    expect(diagnostic.mock.calls).toEqual([
      ['import-log-write-failed'],
      ['import-notification-failed'],
    ]);
    expect(() =>
      reportImportValidation(event, {
        record: async () => {},
        notifyFailure: () => {},
      }),
    ).not.toThrow();
  });
});
