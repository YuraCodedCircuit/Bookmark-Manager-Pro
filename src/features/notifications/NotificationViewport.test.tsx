import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { NotificationService } from '../../application/notification/notification-service';
import { defaultNotificationPreferences } from '../../domain/profile-settings';
import { NotificationViewport } from './NotificationViewport';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('NotificationViewport', () => {
  it('clears queued notices when notifications are disabled', () => {
    const service = new NotificationService();
    service.show({
      level: 'error',
      message: 'The operation failed.',
      title: 'Operation failed',
    });

    render(
      <NotificationViewport
        preferences={{ ...defaultNotificationPreferences, enabled: false }}
        service={service}
      />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(service.store.getState().notifications).toHaveLength(0);
  });

  it('puts the first-priority notice nearest the selected bottom edge', () => {
    const service = new NotificationService();
    service.show({
      durationMs: null,
      level: 'success',
      message: 'First',
      title: 'First',
    });
    service.show({
      durationMs: null,
      level: 'success',
      message: 'Second',
      title: 'Second',
    });

    render(
      <NotificationViewport
        preferences={defaultNotificationPreferences}
        service={service}
      />,
    );

    expect(
      screen
        .getAllByRole('status', { hidden: true })
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining('First'),
      expect.stringContaining('Second'),
    ]);
  });

  it('applies the saved notification corner to the viewport', () => {
    const service = new NotificationService();
    service.show({
      durationMs: null,
      level: 'information',
      message: 'Saved position',
      title: 'Position',
    });

    const { rerender } = render(
      <NotificationViewport
        preferences={{
          ...defaultNotificationPreferences,
          position: 'bottom-right',
        }}
        service={service}
      />,
    );

    expect(document.body.querySelector('.notification-viewport')).toHaveClass(
      'notification-viewport--bottom-right',
    );

    rerender(
      <NotificationViewport
        preferences={{
          ...defaultNotificationPreferences,
          position: 'top-left',
        }}
        service={service}
      />,
    );

    expect(document.body.querySelector('.notification-viewport')).toHaveClass(
      'notification-viewport--top-left',
    );
  });

  it('keeps notification controls in the app-level top-layer viewport', async () => {
    const service = new NotificationService();
    service.show({
      durationMs: null,
      level: 'error',
      message: 'Check the address.',
      title: 'Check the bookmark URL',
    });

    render(
      <>
        <dialog data-testid="editor" open />
        <NotificationViewport
          preferences={defaultNotificationPreferences}
          service={service}
        />
      </>,
    );

    const alert = screen.getByRole('alert', { hidden: true });
    const editor = screen.getByTestId('editor');
    expect(alert.closest('dialog')).toBeNull();
    expect(editor).not.toContainElement(alert);
    fireEvent.click(
      screen.getByRole('button', {
        hidden: true,
        name: 'Dismiss notification',
      }),
    );
    expect(
      screen.queryByRole('alert', { hidden: true }),
    ).not.toBeInTheDocument();
  });

  it('does not restart a notice timer when an application window opens', () => {
    vi.useFakeTimers();
    const service = new NotificationService();
    service.show({
      durationMs: 1_000,
      level: 'information',
      message: 'Timer stays continuous',
      title: 'Timer',
    });

    const { rerender } = render(
      <>
        <NotificationViewport
          preferences={defaultNotificationPreferences}
          service={service}
        />
        <dialog />
      </>,
    );

    act(() => vi.advanceTimersByTime(600));
    rerender(
      <>
        <NotificationViewport
          preferences={defaultNotificationPreferences}
          service={service}
        />
        <dialog open />
      </>,
    );
    act(() => vi.advanceTimersByTime(450));

    expect(
      screen.queryByText('Timer stays continuous'),
    ).not.toBeInTheDocument();
  });
});
