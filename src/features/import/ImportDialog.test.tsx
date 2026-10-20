import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../localization/i18n';
import { ImportDialog } from './ImportDialog';
import type { NativePreviewMessage } from './native-preview-client';
import type {
  ImportWriter,
  ImportSavePlan,
} from '../../application/import/import-writer';
import type { ExportPayload } from '../../domain/profile-export';

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
  vi.restoreAllMocks();
  for (const [key, original] of [
    ['showModal', originalShowModal],
    ['close', originalClose],
  ] as const) {
    if (original)
      Object.defineProperty(HTMLDialogElement.prototype, key, original);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
});

function setup() {
  const receivers: ((message: NativePreviewMessage) => void)[] = [];
  const clients: {
    load: ReturnType<typeof vi.fn>;
    unlock: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
  }[] = [];
  const onReport = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <ImportDialog
      onClose={onClose}
      onReport={onReport}
      createClient={(receive) => {
        receivers.push(receive);
        const client = { load: vi.fn(), unlock: vi.fn(), terminate: vi.fn() };
        clients.push(client);
        return client;
      }}
    />,
  );
  const load = () =>
    fireEvent.change(screen.getByLabelText('Choose file'), {
      target: { files: [new File(['source'], 'synthetic.bmpro')] },
    });
  return { ...view, receivers, clients, load, onReport, onClose };
}
const profiles = [
  { id: '0', name: 'Personal', bookmarks: 4, folders: 2 },
  { id: '1', name: '<script>Work</script>', bookmarks: 8, folders: 3 },
];

describe('ImportDialog', () => {
  it('confirms a native save once and preserves success when view refresh fails', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const payload: ExportPayload = {
      format: 'bookmark-manager-pro',
      version: 1,
      createdAt: 1,
      categories: ['bookmarks'],
      restoreSynchronization: 'paused',
      profiles: [],
      backups: [],
    };
    const commit = vi.fn(async () => ({ profileIds: [id] }));
    const writer: ImportWriter = {
      prepare: vi.fn(async (): Promise<ImportSavePlan> => ({
        profiles: 1,
        bookmarks: 0,
        folders: 0,
        duplicates: 0,
        excluded: 0,
        duplicatePolicy: 'allow',
        snapshotMode: 'not-needed',
        commit,
      })),
      close: vi.fn(),
    };
    const onReport = vi.fn();
    let receive: (message: NativePreviewMessage) => void = () => {};
    render(
      <ImportDialog
        onClose={vi.fn()}
        onReport={onReport}
        writer={writer}
        onImported={async () => {
          throw new Error('private');
        }}
        destinations={{
          activeProfileId: id,
          loadProfiles: async () => [],
          loadFolders: async () => [],
        }}
        createClient={(callback) => {
          receive = callback;
          return { load: vi.fn(), unlock: vi.fn(), terminate: vi.fn() };
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText('Choose file'), {
      target: { files: [new File(['source'], 'source.bmpro')] },
    });
    act(() => receive({ type: 'ready', profiles: [profiles[0]!], payload }));
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(
      'Preparing import',
    );
    expect(
      screen.getByRole('button', { name: 'Preparing import...' }),
    ).toBeDisabled();
    const confirm = await screen.findByRole('dialog', {
      name: 'Confirm import',
    });
    expect(commit).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Import' }));
    await waitFor(() =>
      expect(onReport).toHaveBeenCalledWith({
        level: 'WARN',
        code: 'import.save.refresh-failed',
      }),
    );
    expect(commit).toHaveBeenCalledOnce();
    expect(onReport).toHaveBeenCalledWith({
      level: 'INFO',
      code: 'import.save.succeeded',
    });
    expect(onReport).not.toHaveBeenCalledWith({
      level: 'ERROR',
      code: 'import.save.failed',
    });
    expect(JSON.stringify(onReport.mock.calls)).not.toContain('private');
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
  });
  it.each(['json', 'csv', 'html'] as const)(
    'resets a %s preview before switching back to native profiles',
    (format) => {
      const test = setup();
      test.load();
      act(() => test.receivers[0]!({ type: 'portable', format, items: [] }));
      expect(
        screen.queryByRole('button', { name: 'Select profiles to import' }),
      ).not.toBeInTheDocument();
      test.load();
      expect(
        screen.getByRole('button', { name: 'Select profiles to import' }),
      ).toBeDisabled();
      act(() => test.receivers[1]!({ type: 'ready', profiles }));
      expect(
        screen.getByRole('button', { name: 'Select profiles to import' }),
      ).toBeEnabled();
      expect(screen.getByText('Native profile file')).toBeVisible();
      expect(
        screen.queryByText(
          'Selected profiles keep their saved themes and settings.',
        ),
      ).not.toBeInTheDocument();
    },
  );
  it('keeps the Import dialog and current preview when the native file picker is canceled', () => {
    const test = setup();
    test.load();
    act(() => test.receivers[0]!({ type: 'ready', profiles }));
    fireEvent(
      screen.getByLabelText('Choose file'),
      new Event('cancel', { bubbles: true, cancelable: true }),
    );
    expect(test.onClose).not.toHaveBeenCalled();
    expect(test.clients[0]!.terminate).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog', { name: 'Import' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Select profiles to import' }),
    ).toBeEnabled();
  });
  it('opens a read-only preview with numbered sections, one Import action, and saving disabled', () => {
    setup();
    for (const name of ['Bookmarks', 'Backup', 'Appearance'])
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Import' })).toHaveLength(1);
    expect(
      screen.getByRole('dialog', { name: 'Import' }),
    ).not.toHaveTextContent('Preview only');
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Select profiles to import' }),
    ).toBeDisabled();
    expect(
      screen
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(['1. Choose file', '2. Profiles to import', '3. Review import']);
    expect(screen.getByRole('button', { name: 'Close Import' })).toHaveFocus();
  });
  it('exposes only verified summaries, preserves selection while filtering, and keeps saving disabled', () => {
    const test = setup();
    test.load();
    expect(screen.getByText('synthetic.bmpro', { exact: true })).toBeVisible();
    expect(screen.queryByText('Personal')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Checking file');
    act(() => test.receivers[0]!({ type: 'ready', profiles }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Select profiles to import' }),
    );
    const child = screen.getByRole('dialog', {
      name: 'Select profiles to import',
    });
    expect(within(child).getAllByRole('checkbox')).toHaveLength(2);
    fireEvent.click(within(child).getAllByRole('checkbox')[0]!);
    fireEvent.change(within(child).getByRole('searchbox'), {
      target: { value: 'Work' },
    });
    expect(within(child).getAllByRole('checkbox')).toHaveLength(1);
    expect(within(child).getByRole('checkbox')).toBeChecked();
    expect(within(child).getByRole('status')).toHaveTextContent(
      '1 of 2 profiles selected',
    );
    expect(child.querySelector('script')).toBeNull();
    fireEvent.keyDown(within(child).getByRole('searchbox'), { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: 'Select profiles to import' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Select profiles to import' }),
    ).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    expect(test.clients[0]!.terminate).toHaveBeenCalledOnce();
  });
  it('bulk-selects matching profiles without changing hidden selections and hides actions for one match', () => {
    const test = setup();
    test.load();
    act(() => test.receivers[0]!({ type: 'ready', profiles }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Select profiles to import' }),
    );
    const child = screen.getByRole('dialog', {
      name: 'Select profiles to import',
    });
    const checkAll = within(child).getByRole('button', { name: 'Check all' });
    expect(checkAll).toBeDisabled();
    fireEvent.click(within(child).getByRole('button', { name: 'Uncheck all' }));
    expect(within(child).getByRole('status')).toHaveTextContent(
      '0 of 2 profiles selected',
    );
    expect(
      within(child).getByRole('button', { name: 'Uncheck all' }),
    ).toBeDisabled();
    fireEvent.click(checkAll);
    expect(within(child).getByRole('status')).toHaveTextContent(
      '2 of 2 profiles selected',
    );
    fireEvent.click(within(child).getAllByRole('checkbox')[0]!);
    fireEvent.change(within(child).getByRole('searchbox'), {
      target: { value: 'Work' },
    });
    expect(
      within(child).queryByRole('button', { name: 'Check all' }),
    ).not.toBeInTheDocument();
    expect(
      within(child).queryByRole('button', { name: 'Uncheck all' }),
    ).not.toBeInTheDocument();
    expect(within(child).getByRole('checkbox')).toBeChecked();
    fireEvent.change(within(child).getByRole('searchbox'), {
      target: { value: '' },
    });
    expect(within(child).getAllByRole('checkbox')[0]).not.toBeChecked();
    expect(within(child).getAllByRole('checkbox')[1]).toBeChecked();
  });
  it('clears the password immediately, allows generic failure retry, and closes only the child on Escape', () => {
    const test = setup();
    test.load();
    act(() => test.receivers[0]!({ type: 'locked', failed: false }));
    fireEvent.click(screen.getByRole('button', { name: 'Unlock file' }));
    const child = screen.getByRole('dialog', { name: 'Unlock file' });
    const password = within(child).getByLabelText('Password');
    fireEvent.change(password, { target: { value: 'Secret1!' } });
    fireEvent.click(
      within(child).getByRole('button', { name: 'Show password' }),
    );
    expect(password).toHaveAttribute('type', 'text');
    fireEvent.submit(child.querySelector('form')!);
    expect(test.clients[0]!.unlock).toHaveBeenCalledWith('Secret1!');
    expect(password).toHaveValue('');
    expect(password).toHaveAttribute('type', 'password');
    act(() => test.receivers[0]!({ type: 'locked', failed: true }));
    expect(within(child).queryByRole('alert')).not.toBeInTheDocument();
    expect(password).toHaveFocus();
    fireEvent(child, new Event('cancel', { bubbles: true, cancelable: true }));
    expect(test.onClose).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('dialog', { name: 'Unlock file' }),
    ).not.toBeInTheDocument();
    expect(test.onReport.mock.calls.flat().join(' ')).not.toContain('Secret1!');
  });
  it('terminates in-flight unlock on child cancel and suppresses stale results', () => {
    const test = setup();
    test.load();
    act(() => test.receivers[0]!({ type: 'locked', failed: false }));
    fireEvent.click(screen.getByRole('button', { name: 'Unlock file' }));
    const child = screen.getByRole('dialog', { name: 'Unlock file' });
    fireEvent.change(within(child).getByLabelText('Password'), {
      target: { value: 'Aa1!' },
    });
    fireEvent.submit(child.querySelector('form')!);
    fireEvent.click(within(child).getByRole('button', { name: 'Cancel' }));
    expect(test.clients[0]!.terminate).toHaveBeenCalledOnce();
    act(() => test.receivers[0]!({ type: 'ready', profiles }));
    expect(
      screen.getByRole('button', { name: 'Select profiles to import' }),
    ).toBeDisabled();
  });
  it('replaces and discards workers, restores external focus, and ignores late completion', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const test = setup();
    test.load();
    test.load();
    expect(test.clients[0]!.terminate).toHaveBeenCalledOnce();
    act(() => test.receivers[0]!({ type: 'ready', profiles }));
    expect(
      screen.getByRole('button', { name: 'Select profiles to import' }),
    ).toBeDisabled();
    test.unmount();
    expect(test.clients[1]!.terminate).toHaveBeenCalledOnce();
    expect(opener).toHaveFocus();
    opener.remove();
  });
  it('discards the preview and running work on pagehide', () => {
    const test = setup();
    test.load();
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(test.clients[0]!.terminate).toHaveBeenCalledOnce();
    act(() => test.receivers[0]!({ type: 'ready', profiles }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'No verified file selected',
    );
  });
  it('shows generic validation failures and isolates a failed feedback sink', () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    const test = setup();
    test.onReport.mockImplementation(() => {
      throw new Error('sensitive');
    });
    test.load();
    act(() => {
      test.receivers[0]!({
        type: 'event',
        event: { level: 'ERROR', code: 'import.validation.failed' },
      });
      test.receivers[0]!({ type: 'failed' });
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'could not be verified',
    );
    expect(diagnostic).toHaveBeenCalledWith('import-feedback-failed');
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain('sensitive');
    expect(test.clients[0]!.terminate).toHaveBeenCalledOnce();
  });
});
