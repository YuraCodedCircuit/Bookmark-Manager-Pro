import { describe, expect, it } from 'vitest';

import { NotificationService } from './notification-service';

describe('NotificationService', () => {
  it('uses level defaults and prevents identical entries from stacking', () => {
    const service = new NotificationService();
    const firstId = service.show({
      level: 'warning',
      message: 'A fallback was used.',
      title: 'Limited support',
    });
    const duplicateId = service.show({
      level: 'warning',
      message: 'A fallback was used.',
      title: 'Limited support',
    });

    expect(duplicateId).toBe(firstId);
    expect(service.store.getState().notifications).toMatchObject([
      { durationMs: 10_000, id: firstId },
    ]);
  });

  it('replaces an earlier entry when its stable ID is reused', () => {
    const service = new NotificationService();
    service.show({
      id: 'export-progress',
      level: 'information',
      message: 'The export is being prepared.',
      title: 'Exporting',
    });
    service.show({
      id: 'export-progress',
      level: 'success',
      message: 'The export is ready.',
      title: 'Export complete',
    });

    expect(service.store.getState().notifications).toHaveLength(1);
    expect(service.store.getState().notifications[0]).toMatchObject({
      id: 'export-progress',
      level: 'success',
      revision: 2,
    });
  });
});
