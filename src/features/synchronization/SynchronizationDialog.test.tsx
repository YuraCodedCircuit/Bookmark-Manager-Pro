import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../localization/i18n';
import { SynchronizationDialog } from './SynchronizationDialog';
import { shouldNotifyForSyncSetupEvent } from './sync-setup-feedback';
import type { SyncNode } from '../../domain/sync-preview';
import { syncConnectionSchema } from '../../domain/synchronization';
import type { SyncRequest, SyncResponse } from '../../messaging/sync-protocol';

afterEach(cleanup);
const root = { id: 'home', parentId: null, title: 'Home', index: 0 };
const native: SyncNode[] = [
  { id: '0', parentId: null, title: '', index: 0 },
  { id: 'bar', parentId: '0', title: 'Bookmarks bar', index: 0 },
  {
    id: 'link',
    parentId: 'bar',
    title: 'Example',
    url: 'https://example.com/',
    index: 0,
  },
];
function props() {
  return {
    adapter: {
      ready: vi.fn(async () => undefined),
      requestAccess: vi.fn(async () => true),
      readTree: vi.fn(async () => native),
    },
    extensionFolders: [root],
    readExtension: vi.fn(async () => [root]),
    onClose: vi.fn(),
    onReport: vi.fn(),
  };
}
async function selectExtension(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Extension folder' }));
  const picker = screen.getAllByRole('dialog').at(-1)!;
  await user.click(within(picker).getByRole('button', { name: 'Home' }));
  await user.click(
    within(picker).getByRole('button', { name: 'Choose a folder' }),
  );
}
async function selectBrowser(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole('button', { name: 'Choose browser folder' }),
  );
  const picker = screen.getAllByRole('dialog').at(-1)!;
  await user.click(
    within(picker).getByRole('button', { name: 'Bookmarks bar' }),
  );
  await user.click(
    within(picker).getByRole('button', { name: 'Choose a folder' }),
  );
}
describe('SynchronizationDialog', () => {
  it('keeps intermediate permission success out of the notification stack', () => {
    expect(shouldNotifyForSyncSetupEvent('accessGranted')).toBe(false);
    expect(shouldNotifyForSyncSetupEvent('foldersLoaded')).toBe(false);
    expect(shouldNotifyForSyncSetupEvent('accessDenied')).toBe(true);
  });
  it('presents the setup as four labeled steps with matching folder pickers', async () => {
    const input = props(),
      user = userEvent.setup();
    render(<SynchronizationDialog {...input} />);

    expect(screen.getByText('1.')).toBeVisible();
    expect(screen.getByText('2.')).toBeVisible();
    expect(screen.getByText('3.')).toBeVisible();
    expect(screen.getByText('4.')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Extension folder' }));
    let picker = screen.getAllByRole('dialog').at(-1)!;
    expect(
      within(picker).getByRole('heading', {
        name: 'Choose an extension folder',
      }),
    ).toBeVisible();
    expect(picker).toHaveAccessibleDescription(
      'Select the Bookmark Manager Pro folder to synchronize.',
    );
    expect(
      within(picker).getByRole('navigation', { name: 'Folder tree' }),
    ).toBeVisible();
    await user.click(
      within(picker).getByRole('button', { name: 'Close synchronization' }),
    );

    await user.click(
      screen.getByRole('button', { name: 'Allow bookmark access' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Choose browser folder' }),
    );
    picker = screen.getAllByRole('dialog').at(-1)!;
    expect(
      within(picker).getByRole('heading', { name: 'Choose a browser folder' }),
    ).toBeVisible();
    expect(picker).toHaveAccessibleDescription(
      'Select the browser bookmarks folder to synchronize.',
    );
    expect(
      within(picker).getByRole('navigation', { name: 'Folder tree' }),
    ).toBeVisible();
  });
  it('dismisses only the stacked picker on Escape and restores its trigger', async () => {
    const input = props(),
      user = userEvent.setup();
    render(<SynchronizationDialog {...input} />);
    const trigger = screen.getByRole('button', { name: 'Extension folder' });
    await user.click(trigger);
    fireEvent(
      screen.getAllByRole('dialog').at(-1)!,
      new Event('cancel', { bubbles: true }),
    );
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(input.onClose).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });
  it('tabs through each direction information button before its radio', async () => {
    const user = userEvent.setup();
    render(<SynchronizationDialog {...props()} />);
    const informationButtons = [
      screen.getByRole('button', {
        name: 'Information about Browser to extension',
      }),
      screen.getByRole('button', {
        name: 'Information about Extension to browser',
      }),
      screen.getByRole('button', { name: 'Information about Both directions' }),
    ];
    const radios = screen.getAllByRole('radio');

    informationButtons[0]!.focus();
    for (let index = 0; index < informationButtons.length; index++) {
      expect(informationButtons[index]).toHaveFocus();
      await user.tab();
      expect(radios[index]).toHaveFocus();
      if (index < informationButtons.length - 1) {
        await user.tab();
        expect(informationButtons[index + 1]).toHaveFocus();
      }
    }
    for (let index = informationButtons.length - 1; index >= 0; index--) {
      await user.tab({ shift: true });
      expect(informationButtons[index]).toHaveFocus();
      if (index > 0) {
        await user.tab({ shift: true });
        expect(radios[index - 1]).toHaveFocus();
      }
    }
    radios[0]!.focus();
    await user.keyboard(' ');
    expect(radios[0]).toBeChecked();
  });
  it('restores bookmark access and resumes a permission-paused connection', async () => {
    const input = props(),
      user = userEvent.setup(),
      profileId = crypto.randomUUID();
    const permissionConnection = syncConnectionSchema.parse({
      version: 1,
      profileId,
      extensionRoot: 'home',
      browserRoot: 'bar',
      direction: 'both',
      status: 'permission',
      links: [],
      operations: [],
      lastSuccess: 1,
    });
    const connected = { ...permissionConnection, status: 'connected' as const };
    const command = vi.fn(
      async (request: SyncRequest): Promise<SyncResponse> => ({
        protocolVersion: 1,
        type: 'sync.result',
        connection:
          request.command === 'retry' ? connected : permissionConnection,
      }),
    );

    render(
      <SynchronizationDialog
        {...input}
        profileId={profileId}
        adapter={{
          ...input.adapter,
          hasPermission: async () => false,
          command,
        }}
      />,
    );

    const permissionStatus = await screen.findByRole('heading', {
      name: 'Bookmark access required',
    });
    expect(permissionStatus).toBeVisible();
    expect(permissionStatus.closest('section')).toHaveClass(
      'sync-dialog__connection-status',
      'is-permission',
    );
    await user.click(
      screen.getByRole('button', { name: 'Allow bookmark access' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Synchronization is active' }),
    ).toBeVisible();
    expect(command).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'retry' }),
    );
    expect(input.onReport).not.toHaveBeenCalledWith('accessGranted');
    expect(input.onReport).toHaveBeenCalledWith('foldersLoaded');
  });
  it.each([
    ['error', 'Synchronization needs attention', 'Retry synchronization'],
    ['missing-root', 'Connected folder unavailable', null],
  ] as const)(
    'shows recovery controls for a %s connection',
    async (status, heading, primaryAction) => {
      const input = props(),
        profileId = crypto.randomUUID();
      const connection = syncConnectionSchema.parse({
        version: 1,
        profileId,
        extensionRoot: 'home',
        browserRoot: 'bar',
        direction: 'both',
        status,
        links: [],
        operations: [],
        lastSuccess: 1,
      });
      render(
        <SynchronizationDialog
          {...input}
          profileId={profileId}
          adapter={{
            ...input.adapter,
            hasPermission: async () => true,
            command: async () => ({
              protocolVersion: 1,
              type: 'sync.result',
              connection,
            }),
          }}
        />,
      );

      expect(
        await screen.findByRole('heading', { name: heading }),
      ).toBeVisible();
      expect(screen.getByRole('button', { name: 'Disconnect' })).toBeEnabled();
      if (primaryAction)
        expect(
          screen.getByRole('button', { name: primaryAction }),
        ).toBeEnabled();
      else
        expect(
          screen.queryByRole('button', { name: 'Retry synchronization' }),
        ).not.toBeInTheDocument();
    },
  );
  it('uses an existing grant and enables only the reviewed background plan', async () => {
    const input = props(),
      user = userEvent.setup(),
      profileId = crypto.randomUUID();
    const connection = syncConnectionSchema.parse({
      version: 1,
      profileId,
      extensionRoot: 'home',
      browserRoot: 'bar',
      direction: 'both',
      status: 'connected',
      links: [],
      operations: [],
      lastSuccess: 1,
    });
    const pausedConnection = { ...connection, status: 'paused' as const };
    const command = vi.fn(
      async (request: SyncRequest): Promise<SyncResponse> => ({
        protocolVersion: 1,
        type: 'sync.result',
        connection:
          request.command === 'enable'
            ? connection
            : request.command === 'pause'
              ? pausedConnection
              : null,
        ...(request.command === 'preview'
          ? {
              token: 'review-token',
              preview: {
                extension: { add: 1, update: 0, delete: 0 },
                browser: { add: 0, update: 0, delete: 0 },
                conflicts: 0,
                skipped: 0,
              },
              conflicts: [],
            }
          : {}),
      }),
    );
    render(
      <SynchronizationDialog
        {...input}
        profileId={profileId}
        adapter={{ ...input.adapter, hasPermission: async () => true, command }}
      />,
    );
    await screen.findByRole('button', { name: 'Choose browser folder' });
    expect(
      screen.queryByRole('button', { name: 'Allow bookmark access' }),
    ).not.toBeInTheDocument();
    await selectExtension(user);
    await selectBrowser(user);
    await user.click(screen.getByRole('button', { name: 'Refresh preview' }));
    await user.click(
      await screen.findByRole('button', { name: 'Enable synchronization' }),
    );
    const activeStatus = await screen.findByRole('heading', {
      name: 'Synchronization is active',
    });
    expect(activeStatus).toBeVisible();
    expect(activeStatus.closest('section')).toHaveClass(
      'sync-dialog__connection-status',
      'is-connected',
    );
    expect(
      screen.getByRole('heading', { name: 'Connected folders' }),
    ).toBeVisible();
    expect(screen.getByText('Home')).toBeVisible();
    expect(screen.getByText('Bookmarks bar')).toBeVisible();
    expect(screen.getByText('Both directions')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Manage synchronization' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Pause synchronization' }),
    ).toHaveAccessibleDescription(
      'Temporarily stop copying changes. You can resume synchronization later.',
    );
    expect(
      screen.getByRole('button', { name: 'Disconnect' }),
    ).toHaveAccessibleDescription(
      'Stop synchronization permanently. Existing bookmarks remain in both folders.',
    );
    expect(screen.queryByText('3.')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Apply reviewed changes' }),
    ).not.toBeInTheDocument();
    expect(command).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'enable', token: 'review-token' }),
    );
    expect(input.adapter.requestAccess).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('checkbox', {
        name: 'Create a recovery snapshot (Unavailable)',
      }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /Pause synchronization/ }),
    );
    const pausedStatus = await screen.findByRole('heading', {
      name: 'Synchronization is paused',
    });
    expect(pausedStatus).toBeVisible();
    expect(pausedStatus.closest('section')).toHaveClass(
      'sync-dialog__connection-status',
      'is-paused',
    );
    expect(
      screen.getByRole('button', { name: /Resume \/ Retry/ }),
    ).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /Disconnect/ }));
    expect(
      await screen.findByRole('button', { name: 'Extension folder' }),
    ).toBeEnabled();
  });
  it('loads real folders, previews without mutation, and clears results after direction changes', async () => {
    const input = props();
    const user = userEvent.setup();
    render(<SynchronizationDialog {...input} />);
    expect(
      screen.getByRole('button', { name: 'Close synchronization' }),
    ).toHaveFocus();
    expect(
      screen.getByRole('checkbox', {
        name: 'Create a recovery snapshot (Unavailable)',
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Enable synchronization' }),
    ).toBeDisabled();
    await selectExtension(user);
    await user.click(
      screen.getByRole('button', { name: 'Allow bookmark access' }),
    );
    await selectBrowser(user);
    await user.click(screen.getByRole('button', { name: 'Refresh preview' }));
    expect(await screen.findByRole('table')).toHaveTextContent(
      'Extension folder100',
    );
    expect(input.onReport).toHaveBeenCalledWith('accessGranted');
    expect(input.onReport).toHaveBeenCalledWith('foldersLoaded');
    expect(input.onReport).toHaveBeenCalledWith('previewComplete');
    await user.click(
      screen.getByRole('radio', { name: 'Browser to extension' }),
    );
    expect(
      screen.queryByText(
        'Changes made in the browser folder are copied to the extension folder. Changes made only in the extension folder are not copied back to the browser.',
      ),
    ).not.toBeInTheDocument();
    const browserInformation = screen.getByRole('button', {
      name: 'Information about Browser to extension',
    });
    await user.click(browserInformation);
    expect(browserInformation).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText(
        'Changes made in the browser folder are copied to the extension folder. Changes made only in the extension folder are not copied back to the browser.',
      ),
    ).toBeVisible();
    await user.click(
      screen.getByRole('radio', { name: 'Extension to browser' }),
    );
    expect(browserInformation).toHaveAttribute('aria-expanded', 'false');
    await user.click(
      screen.getByRole('button', {
        name: 'Information about Extension to browser',
      }),
    );
    expect(
      screen.getByText(
        'Changes made in the extension folder are copied to the browser folder. Changes made only in the browser folder are not copied back to the extension.',
      ),
    ).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'Both directions' }));
    await user.click(
      screen.getByRole('button', {
        name: 'Information about Both directions',
      }),
    );
    expect(
      screen.getByText(
        'Changes made in either folder are copied to the other folder. If the same item is changed in both places, synchronization pauses and asks which version to keep.',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { bubbles: true }),
    );
    expect(input.onClose).toHaveBeenCalledOnce();
  });
  it('reports denial and isolates feedback failure from folder loading', async () => {
    const input = props();
    input.adapter.requestAccess.mockResolvedValue(false);
    input.onReport.mockImplementation(() => {
      throw new Error('feedback failure');
    });
    const diagnostic = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      const user = userEvent.setup();
      render(<SynchronizationDialog {...input} />);
      await user.click(
        screen.getByRole('button', { name: 'Allow bookmark access' }),
      );
      expect(await screen.findByRole('status')).toHaveTextContent(
        'Bookmark access was denied',
      );
      expect(input.adapter.readTree).not.toHaveBeenCalled();
      input.adapter.requestAccess.mockResolvedValue(true);
      await user.click(
        screen.getByRole('button', { name: 'Allow bookmark access' }),
      );
      await screen.findByRole('button', { name: 'Choose browser folder' });
      expect(diagnostic).toHaveBeenCalledWith('sync-setup-feedback-failed');
    } finally {
      diagnostic.mockRestore();
    }
  });
  it('does not show results or emit success after closing during a pending read', async () => {
    const input = props();
    let finish: ((value: SyncNode[]) => void) | undefined;
    input.adapter.readTree.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const user = userEvent.setup();
    const view = render(<SynchronizationDialog {...input} />);
    await user.click(
      screen.getByRole('button', { name: 'Allow bookmark access' }),
    );
    await waitFor(() => expect(input.adapter.readTree).toHaveBeenCalled());
    view.unmount();
    finish?.(native);
    await Promise.resolve();
    expect(input.onReport).not.toHaveBeenCalledWith('foldersLoaded');
  });
  it('reports unavailable APIs without leaking raw errors', async () => {
    const input = props();
    input.adapter.requestAccess.mockRejectedValue(
      new Error('sync-api-unavailable'),
    );
    const user = userEvent.setup();
    render(<SynchronizationDialog {...input} />);
    await user.click(
      screen.getByRole('button', { name: 'Allow bookmark access' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'installed extension',
    );
    expect(input.onReport).toHaveBeenCalledWith('unavailable');
  });

  it('shows a persistent inline failure when loading browser folders fails', async () => {
    const input = props();
    input.adapter.readTree.mockRejectedValue(new Error('private native data'));
    const user = userEvent.setup();
    render(<SynchronizationDialog {...input} />);
    await user.click(
      screen.getByRole('button', { name: 'Allow bookmark access' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Browser folders could not be loaded',
    );
    expect(screen.queryByText('private native data')).not.toBeInTheDocument();
    expect(input.onReport).toHaveBeenCalledWith('loadFailed');
    expect(
      screen.getByRole('button', { name: 'Choose browser folder' }),
    ).toBeEnabled();
  });

  it('discards a previous preview when permission is revoked before refreshing', async () => {
    const input = props();
    const user = userEvent.setup();
    render(<SynchronizationDialog {...input} />);
    await selectExtension(user);
    await user.click(
      screen.getByRole('button', { name: 'Allow bookmark access' }),
    );
    await selectBrowser(user);
    await user.click(screen.getByRole('button', { name: 'Refresh preview' }));
    await screen.findByRole('table');
    input.adapter.readTree.mockRejectedValue(
      new Error('sync-permission-required'),
    );
    await user.click(screen.getByRole('button', { name: 'Refresh preview' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The preview could not be loaded',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(input.onReport).toHaveBeenCalledWith('previewFailed');
  });
});
