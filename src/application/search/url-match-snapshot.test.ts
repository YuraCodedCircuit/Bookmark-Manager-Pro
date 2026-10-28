import { describe, expect, it, vi } from 'vitest';
import { loadUrlMatchSnapshot, reportUrlMatchScan } from './url-match-snapshot';

describe('URL match scan boundaries', () => {
  it('reads all profiles and rejects the entire result if any profile fails', async () => {
    const listBookmarks = vi.fn(async (id: string) => {
      if (id === 'q') throw new Error('private content');
      return [];
    });
    await expect(
      loadUrlMatchSnapshot({
        listProfiles: async () => [
          { id: 'p', name: 'Private name' },
          { id: 'q', name: 'Other' },
        ],
        listBookmarks,
        listFolders: async () => [],
      }),
    ).rejects.toThrow();
    expect(listBookmarks).toHaveBeenCalledTimes(2);
  });
  it.each(['complete', 'failed', 'outdated'] as const)(
    'reports %s without personal content',
    async (outcome) => {
      const record = vi.fn().mockResolvedValue(undefined);
      const notify = vi.fn();
      await reportUrlMatchScan({
        outcome,
        explicit: true,
        record,
        notify,
        messages: {
          complete: 'Complete',
          failed: 'Failed',
          outdated: 'Outdated',
          title: 'URL matches',
        },
      });
      expect(record.mock.calls[0]?.[0]).toMatchObject({
        eventCode:
          outcome === 'complete'
            ? 'URL-MATCHES-SCAN-COMPLETE'
            : outcome === 'outdated'
              ? 'URL-MATCHES-SNAPSHOT-OUTDATED'
              : 'URL-MATCHES-SCAN-FAILED',
        level:
          outcome === 'complete'
            ? 'INFO'
            : outcome === 'outdated'
              ? 'WARN'
              : 'ERROR',
        itemsAffected: 0,
      });
      expect(notify).toHaveBeenCalledWith(
        expect.objectContaining({
          level: outcome === 'complete' ? 'success' : 'error',
        }),
      );
      expect(record).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(record.mock.calls)).not.toMatch(/https|private/i);
    },
  );
  it('does not notify on mode entry and isolates disabled or failing feedback services', async () => {
    const notify = vi.fn();
    const record = vi.fn().mockResolvedValue(undefined);
    const messages = {
      complete: 'Complete',
      failed: 'Failed',
      outdated: 'Outdated',
      title: 'URL matches',
    };
    await reportUrlMatchScan({
      outcome: 'complete',
      explicit: false,
      record,
      notify,
      messages,
    });
    expect(notify).not.toHaveBeenCalled();
    const diagnostic = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      await expect(
        reportUrlMatchScan({
          outcome: 'outdated',
          explicit: true,
          record: async () => {
            throw Error('sensitive');
          },
          notify: () => {
            throw Error('sensitive');
          },
          messages,
        }),
      ).resolves.toBeUndefined();
      expect(diagnostic.mock.calls.flat()).not.toContain('sensitive');
    } finally {
      diagnostic.mockRestore();
    }
  });
});
