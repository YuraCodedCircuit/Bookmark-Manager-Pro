import { describe, expect, it, vi } from 'vitest';
import { reportExportEvent, type ExportEvent } from './report-export-event';

describe('export feedback', () => {
  it.each<[ExportEvent, string, string, string | null]>([
    ['started', 'INFO', 'Succeeded', null],
    ['completed', 'INFO', 'Succeeded', 'success'],
    ['cancelled', 'INFO', 'Cancelled', null],
    ['failed', 'ERROR', 'Failed', 'error'],
    ['loadFailed', 'ERROR', 'Failed', 'error'],
  ])(
    'maps %s to privacy-safe levels and outcomes',
    (event, level, outcome, notification) => {
      const record = vi.fn(async () => undefined);
      const notify = vi.fn();
      reportExportEvent(event, 'Generic operational message.', {
        record,
        notify,
      });
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          level,
          outcome,
          message: 'Generic operational message.',
          eventCode: expect.stringMatching(/^PROFILE-EXPORT-[A-Z-]+$/),
        }),
      );
      if (notification)
        expect(notify).toHaveBeenCalledWith({
          level: notification,
          message: 'Generic operational message.',
        });
      else expect(notify).not.toHaveBeenCalled();
    },
  );
  it('isolates log and notification failures and supports disabled services', async () => {
    const diagnostic = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      const notify = vi.fn();
      reportExportEvent('completed', 'Generic.', {
        record: async () => {
          throw new Error('synthetic');
        },
        notify,
      });
      await Promise.resolve();
      expect(notify).toHaveBeenCalledOnce();
      const record = vi.fn(async () => undefined);
      expect(() =>
        reportExportEvent('completed', 'Generic.', {
          record,
          notify: () => {
            throw new Error('synthetic');
          },
        }),
      ).not.toThrow();
      expect(record).toHaveBeenCalledOnce();
      expect(() =>
        reportExportEvent('completed', 'Generic.', {
          record: async () => undefined,
          notify: () => undefined,
        }),
      ).not.toThrow();
    } finally {
      diagnostic.mockRestore();
    }
  });
});
