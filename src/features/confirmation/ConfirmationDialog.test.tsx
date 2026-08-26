import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { ConfirmationService } from '../../application/confirmation/confirmation-service';
import { ConfirmationDialog } from './ConfirmationDialog';

afterEach(cleanup);

describe('ConfirmationDialog', () => {
  it('labels the modal, focuses Cancel, and resolves confirmation', async () => {
    const user = userEvent.setup();
    const service = new ConfirmationService();
    const result = service.request({
      cancelLabel: 'Cancel',
      confirmLabel: 'OK',
      message: 'Save another copy?',
      title: 'Confirm action',
    });

    render(<ConfirmationDialog service={service} />);

    expect(
      screen.getByRole('dialog', { name: 'Confirm action' }),
    ).toHaveAttribute('aria-describedby');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await expect(result).resolves.toBe(true);
  });

  it('treats Escape as cancellation', async () => {
    const user = userEvent.setup();
    const service = new ConfirmationService();
    const result = service.request({
      cancelLabel: 'Cancel',
      confirmLabel: 'OK',
      message: 'Continue?',
      title: 'Confirm action',
    });

    render(<ConfirmationDialog service={service} />);
    await user.keyboard('{Escape}');

    await expect(result).resolves.toBe(false);
  });

  it('renders destructive confirmations with their explicit action label', () => {
    const service = new ConfirmationService();
    void service.request({
      cancelLabel: 'Cancel',
      confirmLabel: 'Delete',
      message: 'Delete this bookmark?',
      title: 'Confirm action',
      variant: 'danger',
    });

    render(<ConfirmationDialog service={service} />);

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass(
      'confirmation-dialog__confirm--danger',
    );
  });
});
