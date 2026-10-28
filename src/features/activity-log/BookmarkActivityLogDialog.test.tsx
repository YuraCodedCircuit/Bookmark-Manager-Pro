import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../localization/i18n';
import { defaultActivityLogSettings } from '../../application/activity-log/manage-activity-log';
import { BookmarkActivityLogDialog } from './BookmarkActivityLogDialog';
import {
  activityLogTestEntries,
  testProfileId,
} from './activity-log-test-data';
import type {
  ActivityLogEntry,
  ActivitySession,
} from '../../domain/activity-log';

function service() {
  let listener: (() => void) | undefined;
  let rows: readonly ActivityLogEntry[] = activityLogTestEntries;
  const current: ActivitySession = {
    id: 'test-session',
    startedAt: Date.now(),
    origin: 'detected',
    startup: 'succeeded',
    trimmedCount: 0,
    omittedCount: 0,
    cleared: false,
  };
  return {
    clear: vi.fn(async () => undefined),
    record: vi.fn(async () => undefined),
    list: vi.fn(async () => rows),
    getSettings: vi.fn(async () => defaultActivityLogSettings(testProfileId)),
    updateSettings: vi.fn(
      async (
        _id: string,
        next: ReturnType<typeof defaultActivityLogSettings>,
      ) => next,
    ),
    sessions: vi.fn(async () => [current]),
    profiles: vi.fn(async () => [
      { id: testProfileId, username: 'Synthetic profile' },
    ]),
    full: vi.fn(async () => false),
    currentSession: vi.fn(async () => current),
    subscribe: vi.fn((callback: () => void) => {
      listener = callback;
      return () => {
        listener = undefined;
      };
    }),
    publish(next: readonly ActivityLogEntry[]) {
      rows = next;
      listener?.();
    },
  };
}
function setup(
  value = service(),
  confirm = vi.fn(async (_sessionId?: string) => {
    void _sessionId;
    return true;
  }),
  notify = vi.fn(),
) {
  const close = vi.fn();
  const result = render(
    <BookmarkActivityLogDialog
      activityLog={value}
      isOpen
      onClose={close}
      requestClearConfirmation={confirm}
      onNotify={notify}
      profileId={testProfileId}
    />,
  );
  return { value, confirm, notify, close, ...result };
}
const originalShowModal = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});
afterEach(() => {
  cleanup();
  for (const [key, original] of [
    ['showModal', originalShowModal],
    ['close', originalClose],
  ] as const) {
    if (original)
      Object.defineProperty(HTMLDialogElement.prototype, key, original);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
});
describe('shared activity log', () => {
  it('opens with Search focused and no automatically revealed badge explanation', async () => {
    setup();
    await waitFor(() =>
      expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveFocus(),
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.queryByText('Badge preview')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'About Experimental' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'About Deprecated' }),
    ).not.toBeInTheDocument();
  });
  it('keeps recording and retention controls out of view options', async () => {
    const user = userEvent.setup();
    const { value } = setup();
    await user.click(screen.getByRole('button', { name: 'View options' }));
    expect(
      screen.queryByLabelText('Retention (records)'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reset settings' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Session order')).toBeVisible();
    expect(screen.getByLabelText('Event order')).toBeVisible();
    expect(value.updateSettings).not.toHaveBeenCalled();
  });
  it('defaults to the active profile and supports searchable all-profile selection without writes', async () => {
    const user = userEvent.setup();
    const value = service();
    const other = '22222222-2222-4222-8222-222222222222';
    const otherName = '<img src=x onerror=alert(1)> Other profile';
    value.profiles.mockResolvedValue([
      { id: testProfileId, username: 'Synthetic profile' },
      { id: other, username: otherName },
    ]);
    value.publish([
      ...activityLogTestEntries,
      ...[
        { profileId: other, message: 'Other profile event' },
        { profileId: null, message: 'Application-wide event' },
        {
          profileId: '33333333-3333-4333-8333-333333333333',
          message: 'Deleted profile event',
        },
      ].map((row, index) => ({
        ...activityLogTestEntries[0]!,
        ...row,
        id: `synthetic-${index}`,
      })),
    ]);
    const { rerender, close } = setup(value);
    await screen.findByText('Application-wide event');
    expect(screen.queryByText('Other profile event')).not.toBeInTheDocument();
    expect(screen.queryByText('Deleted profile event')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View options' }));
    const trigger = screen.getByRole('button', {
      name: 'Profile Synthetic profile',
    });
    await user.click(trigger);
    let picker = screen.getByRole('dialog', {
      name: 'Choose activity log profile',
    });
    expect(
      within(picker).getByRole('radio', { name: 'Synthetic profile' }),
    ).toBeChecked();
    expect(
      within(picker).getByRole('radio', { name: 'Synthetic profile' }),
    ).toHaveAccessibleDescription('Active');
    expect(
      within(picker).getByText('Profile: Synthetic profile'),
    ).toBeVisible();
    expect(
      within(picker).queryByText('Current profile'),
    ).not.toBeInTheDocument();
    await user.type(within(picker).getByRole('searchbox'), 'No such profile');
    expect(within(picker).getByRole('status')).toHaveTextContent(
      'No matching profiles',
    );
    await user.clear(within(picker).getByRole('searchbox'));
    await user.click(
      within(picker).getByRole('radio', { name: 'All profiles' }),
    );
    await user.click(within(picker).getByRole('button', { name: /^Close$/ }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.getByText('Other profile event')).toBeInTheDocument();
    expect(screen.getByText('Deleted profile event')).toBeInTheDocument();
    await user.click(trigger);
    picker = screen.getByRole('dialog', {
      name: 'Choose activity log profile',
    });
    expect(within(picker).getByText('Active')).toBeVisible();
    expect(
      within(picker).getByRole('radio', { name: 'All profiles' }),
    ).not.toHaveAccessibleDescription('Active');
    await user.type(within(picker).getByRole('searchbox'), 'Other profile');
    await user.click(within(picker).getByRole('radio', { name: otherName }));
    expect(picker.querySelector('img')).toBeNull();
    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('dialog', { name: 'Choose activity log profile' }),
    ).toBeNull();
    expect(
      screen.getByRole('dialog', { name: 'Activity log view options' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Other profile event')).toBeInTheDocument();
    expect(screen.getByText('Application-wide event')).toBeInTheDocument();
    expect(screen.queryByText('Deleted profile event')).not.toBeInTheDocument();
    expect(value.updateSettings).not.toHaveBeenCalled();
    expect(value.record).not.toHaveBeenCalled();
    rerender(
      <BookmarkActivityLogDialog
        activityLog={value}
        isOpen={false}
        onClose={close}
        requestClearConfirmation={async () => false}
        profileId={testProfileId}
      />,
    );
    rerender(
      <BookmarkActivityLogDialog
        activityLog={value}
        isOpen
        onClose={close}
        requestClearConfirmation={async () => false}
        profileId={other}
      />,
    );
    await screen.findByText('Other profile event');
    expect(
      screen.queryByText('Application preflight completed.'),
    ).not.toBeInTheDocument();
  });
  it('keeps essential older startup headers visible when recording filters retained no rows', async () => {
    const value = service();
    const current = await value.currentSession();
    value.publish([]);
    value.sessions.mockResolvedValue([
      current,
      { ...current, id: 'prior-session', startedAt: 1, startup: 'failed' },
    ]);
    setup(value);
    await waitFor(() =>
      expect(
        screen.getAllByRole('button', { name: 'Clear this session' }),
      ).toHaveLength(2),
    );
    expect(
      screen.getByText('Startup checks failed · 0 matching / 0 retained'),
    ).toBeVisible();
  });

  it('pages 50 matching groups at a time and can return to previous groups', async () => {
    const user = userEvent.setup();
    const value = service();
    value.publish(
      Array.from({ length: 61 }, (_, index) => ({
        ...activityLogTestEntries[0]!,
        id: crypto.randomUUID(),
        sessionId: `session-${index}`,
        timestamp: index + 1,
      })),
    );
    setup(value);
    await screen.findAllByRole('button', { name: 'Clear this session' });
    expect(
      screen.getAllByRole('button', { name: 'Clear this session' }),
    ).toHaveLength(50);
    await user.click(
      screen.getByRole('button', { name: 'Show more sessions' }),
    );
    expect(
      screen.getAllByRole('button', { name: 'Clear this session' }),
    ).toHaveLength(12);
    await user.click(screen.getByRole('button', { name: 'Previous sessions' }));
    expect(
      screen.getAllByRole('button', { name: 'Clear this session' }),
    ).toHaveLength(50);
  });
  it.each(['oldest', 'newest'] as const)(
    'preserves the reader position and offers New events in %s order',
    async (order) => {
      const user = userEvent.setup();
      const value = service();
      value.getSettings.mockResolvedValue({
        ...defaultActivityLogSettings(testProfileId),
        eventOrder: order,
      });
      setup(value);
      await screen.findAllByRole('listitem');
      const container = screen.getByRole('region', { name: 'Activity events' });
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 200, 200),
      );
      const edge = container.querySelector<HTMLElement>(
        '[data-latest="true"]',
      )!;
      vi.spyOn(edge, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, order === 'oldest' ? 400 : -40, 200, 20),
      );
      container.scrollTop = 37;
      fireEvent.scroll(container);
      value.publish([
        ...activityLogTestEntries,
        {
          ...activityLogTestEntries[0]!,
          id: crypto.randomUUID(),
          timestamp: Date.now() + 1000,
          message: 'Incoming synthetic event',
        },
      ]);
      const jump = await screen.findByRole('button', { name: 'New events' });
      expect(container.scrollTop).toBe(37);
      await user.click(jump);
      expect(
        screen.queryByRole('button', { name: 'New events' }),
      ).not.toBeInTheDocument();
    },
  );
  it('changes display order without saving recording settings', async () => {
    const user = userEvent.setup();
    const { value } = setup();
    await screen.findAllByRole('listitem');
    await user.click(screen.getByRole('button', { name: 'View options' }));
    await user.selectOptions(screen.getByLabelText('Event order'), 'newest');
    await user.selectOptions(screen.getByLabelText('Session order'), 'oldest');
    expect(screen.getByLabelText('Event order')).toHaveValue('newest');
    expect(screen.getByLabelText('Session order')).toHaveValue('oldest');
    expect(value.updateSettings).not.toHaveBeenCalled();
  });
  it('groups current history, retains outcome under filters, and has no export control', async () => {
    const user = userEvent.setup();
    const { value } = setup();
    expect(await screen.findAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText(/Startup checks succeeded/)).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Export' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View options' }));
    await user.click(screen.getByRole('button', { name: 'Error' }));
    const options = screen.getByRole('dialog', {
      name: 'Activity log view options',
    });
    await user.click(within(options).getByRole('button', { name: 'Close' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(/Startup checks succeeded/)).toBeVisible();
    await user.click(
      screen.getByText('Application settings could not be loaded.'),
    );
    expect(screen.getByText('APP-SETTINGS-LOAD-FAILED')).toBeVisible();
    expect(value.record).not.toHaveBeenCalled();
  });
  it('closes only the child on Escape and restores focus', async () => {
    const user = userEvent.setup();
    const { close } = setup();
    await screen.findAllByRole('listitem');
    const trigger = screen.getByRole('button', { name: 'View options' });
    await user.click(trigger);
    fireEvent(
      screen.getByRole('dialog', { name: 'Activity log view options' }),
      new Event('cancel', { cancelable: true, bubbles: true }),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(close).not.toHaveBeenCalled();
  });
  it('confirms both clear scopes independently of filters and preserves cancellation', async () => {
    const user = userEvent.setup();
    const confirm = vi.fn(async (_id?: string) => {
      void _id;
      return false;
    });
    const { value } = setup(undefined, confirm);
    await screen.findAllByRole('listitem');
    await user.click(
      screen.getByRole('button', { name: 'Clear this session' }),
    );
    expect(confirm).toHaveBeenCalledWith('test-session');
    expect(value.clear).not.toHaveBeenCalled();
    confirm.mockResolvedValue(true);
    await user.click(
      screen.getByRole('button', { name: 'Clear all sessions' }),
    );
    expect(confirm).toHaveBeenLastCalledWith(undefined);
    expect(value.clear).toHaveBeenCalledWith(testProfileId, undefined);
    expect(value.record).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ eventCode: 'ACTIVITY-LOG-CLEAR-COMPLETE' }),
    );
  });
  it('keeps successful clearing independent of notification failure', async () => {
    const user = userEvent.setup();
    const { value } = setup(
      undefined,
      undefined,
      vi.fn(() => {
        throw new Error('synthetic');
      }),
    );
    await screen.findAllByRole('listitem');
    await user.click(
      screen.getByRole('button', { name: 'Clear all sessions' }),
    );
    expect(value.record).not.toHaveBeenCalledWith(
      null,
      expect.objectContaining({ eventCode: 'ACTIVITY-LOG-CLEAR-FAILED' }),
    );
  });
  it('reports a failed confirmation without deleting history', async () => {
    const user = userEvent.setup();
    const { value, notify } = setup(
      undefined,
      vi.fn(async () => {
        throw new Error('synthetic');
      }),
    );
    await screen.findAllByRole('listitem');
    await user.click(
      screen.getByRole('button', { name: 'Clear all sessions' }),
    );
    expect(value.clear).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error' }),
    );
  });
  it('loads live updates and unsubscribes on unmount', async () => {
    const { value, unmount } = setup();
    await screen.findAllByRole('listitem');
    value.publish([
      ...activityLogTestEntries,
      {
        ...activityLogTestEntries[0]!,
        id: crypto.randomUUID(),
        message: 'New synthetic event',
      },
    ]);
    expect(await screen.findByText('New synthetic event')).toBeVisible();
    unmount();
    expect(value.subscribe).toHaveBeenCalledTimes(1);
  });
  it('paginates matching events after evaluating the complete retained history', async () => {
    const user = userEvent.setup();
    const value = service();
    value.publish(
      Array.from({ length: 75 }, (_, index) => ({
        ...activityLogTestEntries[0]!,
        id: crypto.randomUUID(),
        message: `Synthetic ${index}`,
      })),
    );
    setup(value);
    expect(await screen.findAllByRole('listitem')).toHaveLength(50);
    await user.click(screen.getByRole('button', { name: 'Show more events' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(75);
  });
  it('keeps older sessions collapsed and exposes deleted-profile and app-wide filtering', async () => {
    const user = userEvent.setup();
    const value = service();
    value.publish([
      ...activityLogTestEntries,
      {
        ...activityLogTestEntries[0]!,
        id: crypto.randomUUID(),
        profileId: null,
        sessionId: 'earlier',
      },
    ]);
    setup(value);
    await screen.findAllByRole('listitem');
    expect(
      screen.getByRole('button', { name: 'Earlier activity' }),
    ).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('button', { name: 'View options' }));
    await user.click(
      screen.getByRole('button', { name: 'Profile Synthetic profile' }),
    );
    await user.click(screen.getByRole('radio', { name: 'Application-wide' }));
    await user.click(
      within(
        screen.getByRole('dialog', { name: 'Choose activity log profile' }),
      ).getByRole('button', { name: /^Close$/ }),
    );
    expect(
      screen.getByRole('button', { name: 'Earlier activity' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });
  it('shows a persistent full warning with clear and options actions', async () => {
    const value = service();
    value.full.mockResolvedValue(true);
    setup(value);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Activity log is full',
    );
  });
  it('keeps date edits as a draft until Apply and contains Escape', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findAllByRole('listitem');
    await user.click(screen.getByRole('button', { name: 'View options' }));
    const trigger = screen.getByRole('button', { name: 'Date: All time' });
    await user.click(trigger);
    const picker = screen.getByRole('dialog', {
      name: 'Select activity dates',
    });
    await user.selectOptions(
      within(picker).getByLabelText('Date preset'),
      'yesterday',
    );
    fireEvent(picker, new Event('cancel', { bubbles: true, cancelable: true }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveTextContent('All time');
    await user.click(trigger);
    await user.selectOptions(screen.getByLabelText('Date preset'), 'today');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(trigger).toHaveTextContent('Custom dates');
  });
});
