import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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

  it('keeps notification controls interactive inside an open modal', async () => {
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

    const alert = await screen.findByRole('alert', { hidden: true });
    const editor = screen.getByTestId('editor');
    expect(editor).toContainElement(alert);
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

  it('moves notifications out of a dialog as soon as it closes', async () => {
    const service = new NotificationService();
    service.show({
      durationMs: null,
      level: 'information',
      message: 'Remains visible.',
      title: 'Saved',
    });

    const { rerender } = render(
      <>
        <dialog data-testid="editor" open />
        <NotificationViewport
          preferences={defaultNotificationPreferences}
          service={service}
        />
      </>,
    );
    const editor = screen.getByTestId('editor');
    expect(editor).toContainElement(
      await screen.findByRole('status', { hidden: true }),
    );

    rerender(
      <>
        <dialog data-testid="editor" />
        <NotificationViewport
          preferences={defaultNotificationPreferences}
          service={service}
        />
      </>,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('status', { hidden: true }).closest('dialog'),
      ).toBe(null),
    );
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

  it('shows a countdown line only for auto-closing notices', () => {
    const service = new NotificationService();
    service.show({
      durationMs: 4_000,
      level: 'success',
      message: 'Closes automatically',
      title: 'Timed',
    });
    service.show({
      durationMs: null,
      level: 'error',
      message: 'Requires dismissal',
      title: 'Persistent',
    });

    render(
      <NotificationViewport
        preferences={{ ...defaultNotificationPreferences, stackLimit: 6 }}
        service={service}
      />,
    );

    const timedNotice = screen
      .getByText('Closes automatically')
      .closest('article');
    const persistentNotice = screen
      .getByText('Requires dismissal')
      .closest('article');
    const timeLine = timedNotice?.querySelector(
      '.notification-card__time-line',
    );

    expect(timeLine).toHaveAttribute('aria-hidden', 'true');
    expect(timeLine).toHaveStyle('--notification-duration: 4000ms');
    expect(timeLine).toHaveStyle('--notification-line-color: var(--text)');
    expect(
      persistentNotice?.querySelector('.notification-card__time-line'),
    ).toBeNull();
  });

  it('applies the saved countdown line color', () => {
    const service = new NotificationService();
    service.show({
      durationMs: 4_000,
      level: 'success',
      message: 'Uses a custom line',
      title: 'Timed',
    });

    render(
      <NotificationViewport
        preferences={{
          ...defaultNotificationPreferences,
          countdownLineColor: '#4a90e2',
        }}
        service={service}
      />,
    );

    expect(
      screen
        .getByText('Uses a custom line')
        .closest('article')
        ?.querySelector('.notification-card__time-line'),
    ).toHaveStyle('--notification-line-color: #4a90e2');
  });

  it('pauses the countdown line with the automatic-close timer', () => {
    const service = new NotificationService();
    service.show({
      durationMs: 4_000,
      level: 'success',
      message: 'Pause together',
      title: 'Timed',
    });

    render(
      <NotificationViewport
        preferences={defaultNotificationPreferences}
        service={service}
      />,
    );

    const notice = screen.getByText('Pause together').closest('article');
    const timeLine = notice?.querySelector('.notification-card__time-line');
    expect(timeLine).toHaveAttribute('data-paused', 'false');

    if (notice) fireEvent.mouseEnter(notice);
    expect(timeLine).toHaveAttribute('data-paused', 'true');

    if (notice) fireEvent.mouseLeave(notice);
    expect(timeLine).toHaveAttribute('data-paused', 'false');
  });
});
