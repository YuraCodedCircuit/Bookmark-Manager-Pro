import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { NotificationService } from '../../application/notification/notification-service';
import { defaultNotificationPreferences } from '../../domain/profile-settings';
import { NotificationViewport } from './NotificationViewport';

const services: NotificationService[] = [];
function createNotificationService() {
  const instance = new NotificationService();
  services.push(instance);
  return instance;
}
const originalPopover = {
  animate: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate'),
  showPopover: Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'showPopover',
  ),
  hidePopover: Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'hidePopover',
  ),
};

afterEach(() => {
  cleanup();
  services.splice(0).forEach((service) => service.clear());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const name of ['showPopover', 'hidePopover', 'animate'] as const) {
    if (originalPopover[name])
      Object.defineProperty(
        HTMLElement.prototype,
        name,
        originalPopover[name]!,
      );
    else Reflect.deleteProperty(HTMLElement.prototype, name);
  }
});

describe('NotificationViewport', () => {
  it('keeps unfit cards inert and untimed until viewport growth admits them', () => {
    vi.useFakeTimers();
    vi.stubGlobal('innerHeight', 150);
    const service = createNotificationService();
    const ids = Array.from({ length: 3 }, (_, index) =>
      service.show({
        level: 'success',
        title: `Card ${index}`,
        message: 'Synthetic result',
        durationMs: 1000,
      }),
    );
    render(
      <NotificationViewport
        preferences={{ ...defaultNotificationPreferences, stackLimit: 9 }}
        service={service}
      />,
    );
    expect(document.querySelectorAll('[data-notification-id]')).toHaveLength(1);
    expect(document.querySelector('.notification-measurement')).toHaveAttribute(
      'inert',
    );
    expect(document.querySelector('.notification-measurement')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    act(() => vi.advanceTimersByTime(400));
    expect(service.getTiming(ids[1]!)?.remainingMs).toBe(1000);
    act(() => {
      vi.stubGlobal('innerHeight', 500);
      window.dispatchEvent(new Event('resize'));
    });
    expect(document.querySelectorAll('[data-notification-id]')).toHaveLength(3);
    expect(service.getTiming(ids[0]!)?.remainingMs).toBe(600);
    expect(service.getTiming(ids[1]!)?.remainingMs).toBe(1000);
    expect(service.getTiming(ids[2]!)?.remainingMs).toBe(1000);
  });

  it('plays the entrance once without translating cards or restarting it when dialogs close', async () => {
    const cancel = vi.fn();
    const animate = vi.fn(() => ({ cancel }));
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      value: animate,
    });
    const service = createNotificationService();
    service.show({
      level: 'error',
      title: 'Continuous card',
      message: 'Remains visible',
    });
    const { rerender, unmount } = render(
      <>
        <dialog data-testid="host" open />
        <NotificationViewport
          preferences={defaultNotificationPreferences}
          service={service}
        />
      </>,
    );
    const card = screen.getByText('Continuous card').closest('article')!;
    expect(screen.getByTestId('host')).toContainElement(card);
    expect(animate).toHaveBeenCalledExactlyOnceWith(
      { opacity: [0, 1] },
      { duration: 160, easing: 'ease-out' },
    );
    rerender(
      <>
        <dialog data-testid="host" />
        <NotificationViewport
          preferences={defaultNotificationPreferences}
          service={service}
        />
      </>,
    );
    await waitFor(() => expect(card.closest('dialog')).toBeNull());
    expect(screen.getByText('Continuous card').closest('article')).toBe(card);
    expect(animate).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    unmount();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it.each(
    (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).flatMap(
      (position) =>
        (['newest', 'oldest'] as const).map((order) => ({ position, order })),
    ),
  )(
    'orders $order notifications at $position without changing admitted slots',
    ({ position, order }) => {
      const service = createNotificationService();
      for (const title of ['First', 'Second', 'Third'])
        service.show({ level: 'error', title, message: 'Generic result' });
      render(
        <NotificationViewport
          preferences={{ ...defaultNotificationPreferences, position, order }}
          service={service}
        />,
      );
      const newestOnTop = position.startsWith('top')
        ? order === 'newest'
        : order === 'oldest';
      const expected = newestOnTop
        ? ['Third', 'Second', 'First']
        : ['First', 'Second', 'Third'];
      expect(
        [...document.querySelectorAll('.notification-card strong')].map(
          (node) => node.textContent,
        ),
      ).toEqual(expected);
      act(() => {
        service.show({ level: 'error', title: 'Waiting', message: 'Queued' });
      });
      expect(screen.queryByText('Waiting')).not.toBeInTheDocument();
      const first = screen.getByText('First').closest('article')!;
      fireEvent.click(
        within(first).getByRole('button', {
          name: 'Dismiss notification',
          hidden: true,
        }),
      );
      expect(screen.getByText('Waiting')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    },
  );

  it('keeps admitted deadlines when position, order, color, or unrelated UI changes', () => {
    vi.useFakeTimers();
    const service = createNotificationService();
    const id = service.show({
      level: 'success',
      title: 'Timed',
      message: 'Original deadline',
      durationMs: 1_000,
    });
    const { rerender } = render(
      <NotificationViewport
        preferences={defaultNotificationPreferences}
        service={service}
      />,
    );
    const originalCard = screen
      .getByText('Original deadline')
      .closest('article');
    act(() => vi.advanceTimersByTime(600));
    rerender(
      <NotificationViewport
        preferences={{
          ...defaultNotificationPreferences,
          position: 'top-left',
          order: 'oldest',
          countdownLineColor: '#abcdef',
        }}
        service={service}
      />,
    );
    expect(screen.getByText('Original deadline').closest('article')).toBe(
      originalCard,
    );
    expect(service.getTiming(id)?.remainingMs).toBe(400);
    act(() => vi.advanceTimersByTime(400));
    expect(screen.queryByText('Original deadline')).not.toBeInTheDocument();
  });

  it('keeps clocks running while the viewport unmounts and resumes rendering their actual progress', () => {
    vi.useFakeTimers();
    const service = createNotificationService();
    const id = service.show({
      level: 'success',
      title: 'Timed',
      message: 'Independent clock',
      durationMs: 1_000,
    });
    const { unmount } = render(
      <NotificationViewport
        preferences={defaultNotificationPreferences}
        service={service}
      />,
    );
    act(() => vi.advanceTimersByTime(400));
    fireEvent.mouseEnter(
      screen.getByText('Independent clock').closest('article')!,
    );
    expect(service.getTiming(id)?.paused).toBe(true);
    unmount();
    act(() => vi.advanceTimersByTime(300));
    expect(service.getTiming(id)?.remainingMs).toBe(300);
    render(
      <NotificationViewport
        preferences={defaultNotificationPreferences}
        service={service}
      />,
    );
    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByText('Independent clock')).not.toBeInTheDocument();
  });

  it('pauses only the hovered card while other cards expire and queued notices wait for capacity', () => {
    vi.useFakeTimers();
    const service = createNotificationService();
    for (const title of ['Hovered', 'Second', 'Third', 'Waiting'])
      service.show({
        level: 'success',
        title,
        message: title,
        durationMs: 1_000,
      });
    render(
      <NotificationViewport
        preferences={defaultNotificationPreferences}
        service={service}
      />,
    );
    const hovered = screen.getAllByText('Hovered')[0]!.closest('article')!;
    act(() => vi.advanceTimersByTime(400));
    fireEvent.mouseEnter(hovered);
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryAllByText('Second')).toHaveLength(0);
    expect(screen.queryAllByText('Third')).toHaveLength(0);
    expect(screen.getAllByText('Waiting')).toHaveLength(2);
    expect(screen.getAllByText('Hovered')).toHaveLength(2);
    fireEvent.mouseLeave(hovered);
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryAllByText('Hovered')).toHaveLength(0);
    expect(screen.getAllByText('Waiting')).toHaveLength(2);
  });

  it('uses actual modal opening order rather than DOM order for interactive notifications', async () => {
    const service = createNotificationService();
    service.show({
      level: 'error',
      title: 'Stays above',
      message: 'Modal order',
    });
    render(
      <>
        <dialog data-testid="first" open />
        <dialog data-testid="second" open />
        <NotificationViewport
          preferences={defaultNotificationPreferences}
          service={service}
        />
      </>,
    );
    const first = screen.getByTestId('first');
    const toggle = new Event('beforetoggle', { bubbles: false });
    Object.defineProperty(toggle, 'newState', { value: 'open' });
    fireEvent(first, toggle);
    await waitFor(() =>
      expect(first).toContainElement(screen.getByText('Modal order')),
    );
  });

  it('uses a visible fallback and reports a top-layer failure without dropping notifications', async () => {
    const service = createNotificationService();
    const onDiagnostic = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: () => {
        throw new Error('unavailable');
      },
    });
    service.show({
      level: 'error',
      title: 'Fallback',
      message: 'Still present',
    });
    render(
      <NotificationViewport
        preferences={defaultNotificationPreferences}
        service={service}
        onDiagnostic={onDiagnostic}
      />,
    );
    expect(screen.getByText('Still present')).toBeInTheDocument();
    expect(
      document.querySelector('.notification-viewport'),
    ).not.toHaveAttribute('popover');
    expect(onDiagnostic).toHaveBeenCalledOnce();
    expect(onDiagnostic).toHaveBeenCalledWith('top-layer-unavailable');
  });

  it.each(['sync', 'async'] as const)(
    'isolates %s notification action failures and failing diagnostics',
    async (kind) => {
      const service = createNotificationService();
      const onDiagnostic = vi.fn(() => {
        throw new Error('diagnostic unavailable');
      });
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      service.show({
        level: 'error',
        title: 'Action',
        message: 'Generic message',
        actions: [
          {
            id: 'retry',
            label: 'Retry',
            run: () => {
              if (kind === 'sync') throw new Error('private detail');
              return Promise.reject(new Error('private detail'));
            },
          },
        ],
      });
      render(
        <NotificationViewport
          preferences={defaultNotificationPreferences}
          service={service}
          onDiagnostic={onDiagnostic}
        />,
      );
      fireEvent.click(
        screen.getByRole('button', { name: 'Retry', hidden: true }),
      );
      await waitFor(() =>
        expect(onDiagnostic).toHaveBeenCalledWith('action-failed'),
      );
      expect(consoleError).toHaveBeenCalledWith(
        'notification-diagnostic-failed',
      );
      expect(screen.getByText('Generic message')).toBeInTheDocument();
    },
  );

  it('keeps a countdown running while its keyboard control has focus', () => {
    vi.useFakeTimers();
    const service = createNotificationService();
    service.show({
      durationMs: 1_000,
      level: 'success',
      message: 'Focus is not hover',
      title: 'Saved',
    });
    render(
      <>
        <button type="button">Previous control</button>
        <NotificationViewport
          preferences={defaultNotificationPreferences}
          service={service}
        />
      </>,
    );
    act(() => {
      screen.getByRole('button', { name: 'Previous control' }).focus();
      screen
        .getByRole('button', { name: 'Dismiss notification', hidden: true })
        .focus();
    });
    act(() => vi.advanceTimersByTime(1_100));
    expect(screen.queryByText('Focus is not hover')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Previous control' }),
    ).toHaveFocus();
  });
  it('clears queued notices when notifications are disabled', () => {
    const service = createNotificationService();
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
    const service = createNotificationService();
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
    const service = createNotificationService();
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
    const service = createNotificationService();
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
    const service = createNotificationService();
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

  it('does not restart a notice timer when an application window opens', async () => {
    vi.useFakeTimers();
    const service = createNotificationService();
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

    const originalNotice = screen
      .getByText('Timer stays continuous')
      .closest('article');
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
    await act(async () => Promise.resolve());
    expect(
      screen.getByText('Timer stays continuous').closest('dialog'),
    ).not.toBeNull();
    expect(screen.getByText('Timer stays continuous').closest('article')).toBe(
      originalNotice,
    );
    const id = originalNotice?.getAttribute('data-notification-id');
    expect(service.getTiming(id!)?.remainingMs).toBe(400);
    act(() => vi.advanceTimersByTime(450));

    expect(
      screen.queryByText('Timer stays continuous'),
    ).not.toBeInTheDocument();
  });

  it('does not show a popover after its viewport is disconnected', async () => {
    const showPopover = vi.fn(function (this: HTMLElement) {
      if (!this.isConnected)
        throw new DOMException('Disconnected', 'InvalidStateError');
    });
    const hidePopover = vi.fn();
    Object.defineProperties(HTMLElement.prototype, {
      hidePopover: { configurable: true, value: hidePopover },
      showPopover: { configurable: true, value: showPopover },
    });
    const service = createNotificationService();
    service.show({
      durationMs: null,
      level: 'information',
      message: 'Survives modal changes',
      title: 'Popover',
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
    rerender(
      <>
        <NotificationViewport
          preferences={defaultNotificationPreferences}
          service={service}
        />
        <dialog open />
      </>,
    );

    await waitFor(() =>
      expect(
        screen.getByText('Survives modal changes').closest('dialog'),
      ).not.toBeNull(),
    );
    expect(showPopover).toHaveBeenCalled();
  });

  it('shows a countdown line only for auto-closing notices', () => {
    const service = createNotificationService();
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
    const service = createNotificationService();
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
    const service = createNotificationService();
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
