import { describe, expect, it } from 'vitest';

import { ConfirmationService } from './confirmation-service';

const request = {
  cancelLabel: 'Cancel',
  confirmLabel: 'OK',
  message: 'Continue?',
  title: 'Confirm action',
};

describe('ConfirmationService', () => {
  it('resolves a decision and removes it from transient state', async () => {
    const service = new ConfirmationService();
    const result = service.request(request);
    const active = service.store.getState().active;

    expect(active?.message).toBe('Continue?');
    service.resolve(active?.id ?? '', true);

    await expect(result).resolves.toBe(true);
    expect(service.store.getState().active).toBeUndefined();
  });

  it('shows queued decisions one at a time', async () => {
    const service = new ConfirmationService();
    const first = service.request({ ...request, message: 'First?' });
    const second = service.request({ ...request, message: 'Second?' });
    const firstId = service.store.getState().active?.id ?? '';

    service.resolve(firstId, false);
    await expect(first).resolves.toBe(false);
    expect(service.store.getState().active?.message).toBe('Second?');

    service.resolve(service.store.getState().active?.id ?? '', true);
    await expect(second).resolves.toBe(true);
  });
});
