import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../localization/i18n';
import { ExportDialog } from './ExportDialog';

const id = '11111111-1111-4111-8111-111111111111';
const profile = {
  id,
  username: 'Synthetic profile',
  createdAt: 1,
  updatedAt: 1,
};
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function setup(overrides: Partial<Parameters<typeof ExportDialog>[0]> = {}) {
  const create = vi.fn<
    NonNullable<Parameters<typeof ExportDialog>[0]['service']>['create']
  >(async () => ({
    content: '{}',
    filename: 'synthetic.bmpro',
    mimeType: 'application/json',
  }));
  const download = vi.fn();
  const onReport = vi.fn();
  const onClose = vi.fn();
  render(
    <ExportDialog
      activeProfileId={id}
      loadProfiles={async () => [
        { profile, isActive: true, bookmarkCount: 1, folderCount: 10 },
      ]}
      onClose={onClose}
      onReport={onReport}
      service={{ create }}
      download={download}
      {...overrides}
    />,
  );
  return { create, download, onReport, onClose };
}
describe('ExportDialog', () => {
  it('discards export credentials on pagehide', async () => {
    setup();
    await screen.findByText('Synthetic profile');
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Encrypt with a password' }),
    );
    fireEvent.change(screen.getByLabelText('Password', { exact: true }), {
      target: { value: 'Aa1!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'Aa1!' },
    });
    fireEvent(window, new Event('pagehide'));
    expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('');
    expect(screen.getByLabelText('Confirm password')).toHaveValue('');
  });
  it('describes the actual contents of each format', async () => {
    setup();
    await screen.findByText('Synthetic profile');
    const formats = [
      [
        'json',
        'Bookmarks and folders',
        'Preserves the folder tree, tags, and notes attached to bookmarks and folders, grouped by profile. Favorites and appearance are not included.',
      ],
      [
        'html',
        'Bookmarks and folders',
        'Exports bookmarks and folders for browser import, inside a Bookmark Manager Pro folder. Favorites, tags, and notes are not included.',
      ],
      [
        'csv',
        'Bookmarks',
        'Exports bookmark rows using the columns selected in Settings. Folder paths can be included as text; folders and favorites are not exported.',
      ],
      [
        'bmpro',
        'Bookmarks, folders, and favorites',
        'Includes the selected profile data. Bookmarks, folders, and favorites are exported together; other data categories and backup history are included only when selected.',
      ],
    ] as const;
    for (const [format, label, summary] of formats) {
      fireEvent.change(
        screen.getByRole('combobox', { name: 'Choose format' }),
        { target: { value: format } },
      );
      const checkbox = screen.getByRole('checkbox', { name: label });
      expect(checkbox).toBeChecked();
      if (format === 'bmpro') expect(checkbox).toBeEnabled();
      else expect(checkbox).toBeDisabled();
      expect(screen.getByText(summary)).toBeVisible();
      expect(
        screen.queryByText(
          'This format includes bookmarks, folders, and profile identities only.',
        ),
      ).not.toBeInTheDocument();
    }
  });
  it('uses saved CSV columns for estimates and download only when CSV is selected', async () => {
    const create = vi.fn(async () => ({
      content: 'CSV',
      filename: 'bookmarks.csv',
      mimeType: 'text/csv',
    }));
    const estimate = vi.fn<
      NonNullable<
        NonNullable<Parameters<typeof ExportDialog>[0]['service']>['estimate']
      >
    >(async () => 3);
    setup({
      preferences: {
        csvColumnOrder: [
          'url',
          'title',
          'profileId',
          'profile',
          'folderPath',
          'tags',
          'note',
        ],
        csvEnabledColumns: ['url', 'title'],
      },
      service: { create, estimate },
    });
    await screen.findByText('Synthetic profile');
    await waitFor(() => expect(estimate).toHaveBeenCalled());
    expect(estimate.mock.calls[0]?.[0]).not.toHaveProperty('csvColumns');
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose format' }), {
      target: { value: 'csv' },
    });
    await waitFor(() =>
      expect(estimate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          format: 'csv',
          csvColumns: ['url', 'title'],
        }),
        expect.any(AbortSignal),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'csv',
          csvColumns: ['url', 'title'],
        }),
        expect.any(AbortSignal),
        expect.any(Function),
      ),
    );
  });
  it('keeps the full long profile name in the selector description and out of the footer', async () => {
    const username = 'LongProfileName'.repeat(30);
    setup({
      loadProfiles: async () => [
        {
          profile: { ...profile, username },
          isActive: true,
          bookmarkCount: 0,
          folderCount: 0,
        },
      ],
    });
    await screen.findByText(username);
    const selector = screen.getByRole('button', { name: 'Select profiles' });
    expect(selector).toHaveAccessibleDescription(username);
    expect(selector).toHaveAttribute('title', username);
    expect(selector.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.getByText(username).closest('footer')).toBeNull();
    expect(
      screen.getByText(/Estimated size:/).closest('footer'),
    ).toBeInTheDocument();
  });
  it('keeps Export visible and supports repeated exports without editing choices', async () => {
    const { download } = setup();
    const summary = await screen.findByText('Synthetic profile');
    expect(summary.closest('button')).toHaveAccessibleName('Select profiles');
    expect(summary.closest('footer')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(download).toHaveBeenCalledOnce());
    const exportButton = screen.getByRole('button', { name: 'Export' });
    expect(exportButton).toBeEnabled();
    expect(exportButton).toHaveFocus();
    expect(
      screen.queryByText('The browser will handle downloading this file.'),
    ).not.toBeInTheDocument();
    fireEvent.click(exportButton);
    await waitFor(() => expect(download).toHaveBeenCalledTimes(2));
    expect(exportButton).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose format' }), {
      target: { value: 'csv' },
    });
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
  });

  it('reveals each password independently and clears only its own field', async () => {
    setup();
    await screen.findByText('Synthetic profile');
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Encrypt with a password' }),
    );
    const password = screen.getByLabelText('Password', { exact: true });
    const confirmation = screen.getByLabelText('Confirm password');
    fireEvent.change(password, { target: { value: 'LongTestPassword1!' } });
    fireEvent.change(confirmation, {
      target: { value: 'LongTestPassword1!' },
    });
    expect(password).toHaveAttribute('type', 'password');
    expect(confirmation).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(confirmation).toHaveAttribute('type', 'password');
    expect(
      screen.getByRole('button', { name: 'Hide password' }),
    ).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(
      screen.getByRole('button', { name: 'Show confirmation password' }),
    );
    expect(confirmation).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Clear password' }));
    expect(password).toHaveValue('');
    expect(password).toHaveFocus();
    expect(confirmation).toHaveValue('LongTestPassword1!');
    fireEvent.click(
      screen.getByRole('button', { name: 'Clear confirmation password' }),
    );
    expect(confirmation).toHaveValue('');
    expect(confirmation).toHaveFocus();
    expect(
      screen.queryByRole('checkbox', { name: 'Show passwords' }),
    ).not.toBeInTheDocument();
  });

  it('estimates without password values and allows export when estimates are unavailable', async () => {
    const diagnostic = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const create = vi.fn(async () => ({
      content: '{}',
      filename: 'synthetic.bmpro',
      mimeType: 'application/json',
    }));
    const estimate = vi
      .fn()
      .mockResolvedValueOnce(2048)
      .mockRejectedValue(new Error('synthetic estimate failure'));
    const { download, onReport } = setup({ service: { create, estimate } });
    expect(await screen.findByText(/Estimated size: 2/)).toBeVisible();
    expect(estimate.mock.calls[0]?.[0]).not.toHaveProperty('password');
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Encrypt with a password' }),
    );
    expect(
      await screen.findByText('Estimated size: Unavailable'),
    ).toBeVisible();
    expect(onReport).not.toHaveBeenCalled();
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith(
      'profile-export-estimate-unavailable',
    );
    fireEvent.change(screen.getByLabelText('Password', { exact: true }), {
      target: { value: 'LongTestPassword1!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'LongTestPassword1!' },
    });
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(download).toHaveBeenCalledOnce());
    expect(screen.getByText(/File size:/)).toBeVisible();
  });
  it('discards stale estimates when the chosen format changes', async () => {
    let resolveOld!: (bytes: number) => void;
    const estimate = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<number>((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValue(4096);
    setup({ service: { create: vi.fn(), estimate } });
    await waitFor(() => expect(estimate).toHaveBeenCalledOnce());
    const firstSignal: AbortSignal = estimate.mock.calls[0]![1];
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose format' }), {
      target: { value: 'csv' },
    });
    expect(firstSignal.aborted).toBe(true);
    expect(await screen.findByText(/Estimated size: 4/)).toBeVisible();
    await act(async () => {
      resolveOld(1024);
    });
    expect(screen.getByText(/Estimated size: 4/)).toBeVisible();
  });

  it('selects profiles in a child dialog and returns focus without closing Export', async () => {
    const secondId = '22222222-2222-4222-8222-222222222222';
    const { create, onClose, onReport } = setup({
      loadProfiles: async () => [
        { profile, isActive: true, bookmarkCount: 1, folderCount: 10 },
        {
          profile: { ...profile, id: secondId, username: 'Second profile' },
          isActive: false,
          bookmarkCount: 3,
          folderCount: 2,
        },
      ],
    });
    await screen.findByText('Synthetic profile');
    const open = screen.getByRole('button', { name: 'Select profiles' });
    fireEvent.click(open);
    const picker = screen.getByRole('dialog', { name: 'Select profiles' });
    expect(within(picker).getByRole('status')).toHaveTextContent(
      '1 of 2 profiles selected',
    );
    expect(within(picker).getByText('Active')).toHaveClass('profile-status');
    expect(
      within(picker).getByText('Bookmarks: 1 | Folders: 10'),
    ).toBeVisible();
    expect(within(picker).getByText('Bookmarks: 3 | Folders: 2')).toBeVisible();
    const inactiveRow = within(picker)
      .getByRole('checkbox', { name: 'Second profile' })
      .closest('label');
    expect(inactiveRow?.querySelector('.profile-status')).toBeNull();
    expect(
      within(picker).getByRole('checkbox', { name: 'Synthetic profile' }),
    ).toBeChecked();
    fireEvent.click(
      within(picker).getByRole('checkbox', { name: 'Second profile' }),
    );
    expect(within(picker).getAllByText('Active')).toHaveLength(1);
    expect(within(picker).getByRole('status')).toHaveTextContent(
      '2 of 2 profiles selected',
    );
    fireEvent(picker, new Event('cancel', { bubbles: true, cancelable: true }));
    expect(
      screen.queryByRole('dialog', { name: 'Select profiles' }),
    ).not.toBeInTheDocument();
    expect(open).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
    expect(onReport).not.toHaveBeenCalled();
    expect(screen.getByText('2 profiles selected')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0]?.[0].profileIds).toEqual([id, secondId]);
  });

  it('shows direct data choices and disables unsupported controls for portable formats', async () => {
    const { create } = setup();
    await screen.findByText('Synthetic profile');
    const notes = screen.getByRole('checkbox', {
      name: 'Notes and note folders',
    });
    expect(notes).toBeChecked();
    fireEvent.click(notes);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(create.mock.calls[0]?.[0].categories).not.toContain('notes');
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose format' }), {
      target: { value: 'csv' },
    });
    expect(notes).toBeDisabled();
    expect(notes).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', {
        name: 'Bookmarks',
      }),
    ).toBeChecked();
    expect(
      screen.getByText(
        'Exports bookmark rows using the columns selected in Settings. Folder paths can be included as text; folders and favorites are not exported.',
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole('checkbox', {
        name: 'Bookmarks, folders, and favorites',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Encrypt with a password' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('Password', { exact: true })).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose format' }), {
      target: { value: 'bmpro' },
    });
    expect(
      screen.getByRole('checkbox', {
        name: 'Bookmarks, folders, and favorites',
      }),
    ).toBeEnabled();
    expect(
      screen.queryByText(
        'Exports bookmark rows using the columns selected in Settings. Folder paths can be included as text; folders and favorites are not exported.',
      ),
    ).not.toBeInTheDocument();
  });
  it('keeps feedback failure isolated from successful export', async () => {
    const diagnostic = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      const { download } = setup({
        onReport: () => {
          throw new Error('synthetic feedback failure');
        },
      });
      await screen.findByText('Synthetic profile');
      fireEvent.click(screen.getByRole('button', { name: 'Export' }));
      await waitFor(() => expect(download).toHaveBeenCalledOnce());
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(diagnostic).toHaveBeenCalledWith('profile-export-feedback-failed');
    } finally {
      diagnostic.mockRestore();
    }
  });
  it('defaults to the active profile and complete native export without history or encryption', async () => {
    const { create, download, onReport } = setup();
    expect(await screen.findByText('Synthetic profile')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Select profiles' }));
    expect(
      screen.getByRole('checkbox', { name: 'Synthetic profile' }),
    ).toBeChecked();
    const closePicker = screen.getByRole('button', { name: 'Close' });
    expect(closePicker).not.toHaveClass('is-primary');
    fireEvent.click(closePicker);
    expect(
      screen.getByRole('checkbox', { name: 'Include backup history' }),
    ).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(download).toHaveBeenCalledOnce());
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      profileIds: [id],
      format: 'bmpro',
      includeBackups: false,
      password: undefined,
    });
    expect(onReport.mock.calls.map((call) => call[0])).toEqual([
      'started',
      'completed',
    ]);
  });
  it.each([
    'Aa1',
    'aaaa',
    'AAAA',
    '1234',
    'abc1',
    'ABC1',
    'Abcd',
    'Aa1 ',
    'Aa1é',
    'Aa1<',
  ])(
    'disables encrypted export for invalid password case %#',
    async (value) => {
      const { create } = setup();
      await screen.findByText('Synthetic profile');
      fireEvent.click(
        screen.getByRole('checkbox', { name: 'Encrypt with a password' }),
      );
      const password = screen.getByLabelText('Password', { exact: true });
      fireEvent.change(password, { target: { value } });
      fireEvent.change(screen.getByLabelText('Confirm password'), {
        target: { value },
      });
      expect(password).toHaveAttribute('aria-invalid', 'true');
      const notice = document.getElementById('export-password-mismatch');
      expect(notice).not.toHaveClass('is-success');
      expect(notice).toHaveTextContent('At least 4 ASCII characters');
      expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
      expect(create).not.toHaveBeenCalled();
    },
  );
  it('requires matching valid passwords and clears them after download', async () => {
    const { download } = setup();
    await screen.findByText('Synthetic profile');
    expect(
      screen
        .getByText(
          'This export file is not encrypted. Anyone with access to it can read its contents.',
        )
        .closest('p'),
    ).toHaveClass('is-warning');
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Encrypt with a password' }),
    );
    const password = screen.getByLabelText('Password', { exact: true });
    const confirmation = screen.getByLabelText('Confirm password');
    expect(
      screen
        .getByText(
          'This extension does not save your password. If you lose it, you cannot decrypt this export file.',
        )
        .closest('p'),
    ).toHaveClass('is-neutral');
    expect(
      document.getElementById('export-password-help')?.querySelector('svg'),
    ).toBeNull();
    const mismatch = document.getElementById('export-password-mismatch');
    expect(mismatch).toBeVisible();
    expect(within(mismatch!).getAllByRole('listitem')).toHaveLength(2);
    expect(mismatch?.lastElementChild).not.toHaveClass('is-success');
    const button = screen.getByRole('button', { name: 'Export' });
    expect(button).toBeDisabled();
    fireEvent.change(password, { target: { value: 'Aa1!' } });
    expect(mismatch?.firstElementChild).toHaveClass('is-success');
    expect(mismatch?.lastElementChild).not.toHaveClass('is-success');
    fireEvent.change(confirmation, {
      target: { value: 'different test password' },
    });
    expect(confirmation).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('export-password-mismatch')).toBe(mismatch);
    expect(mismatch?.lastElementChild).toHaveTextContent(
      'Not met: Passwords match.',
    );
    expect(button).toBeDisabled();
    fireEvent.change(confirmation, {
      target: { value: 'Aa1!' },
    });
    expect(confirmation).toHaveAttribute('aria-invalid', 'false');
    expect(mismatch).toHaveClass('is-success');
    expect(mismatch?.lastElementChild).toHaveClass('is-success');
    expect(mismatch?.lastElementChild).toHaveTextContent(
      'Met: Passwords match.',
    );
    fireEvent.click(button);
    await waitFor(() => expect(download).toHaveBeenCalledOnce());
    expect(password).toHaveValue('');
    expect(confirmation).toHaveValue('');
  });
  it('reports failures and permits retry without announcing completion', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('synthetic failure'))
      .mockResolvedValue({
        content: '{}',
        filename: 'synthetic.bmpro',
        mimeType: 'application/json',
      });
    const { onReport, download } = setup({ service: { create } });
    await screen.findByText('Synthetic profile');
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Export failed');
    expect(download).not.toHaveBeenCalled();
    expect(onReport).toHaveBeenCalledWith('failed');
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(download).toHaveBeenCalledOnce());
  });
  it('cancels at a safe boundary without downloading and locks closing during work', async () => {
    let resolve!: (file: {
      content: string;
      filename: string;
      mimeType: string;
    }) => void;
    const create = vi.fn(
      () =>
        new Promise<{ content: string; filename: string; mimeType: string }>(
          (done) => {
            resolve = done;
          },
        ),
    );
    const { download, onReport } = setup({ service: { create } });
    await screen.findByText('Synthetic profile');
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    const exportButton = screen.getByRole('button', { name: 'Export' });
    expect(exportButton).toBeDisabled();
    expect(exportButton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Close Export' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    resolve({
      content: '{}',
      filename: 'synthetic.bmpro',
      mimeType: 'application/json',
    });
    await waitFor(() => expect(onReport).toHaveBeenCalledWith('cancelled'));
    expect(exportButton).toBeEnabled();
    expect(exportButton).toHaveAttribute('aria-busy', 'false');
    expect(download).not.toHaveBeenCalled();
  });
  it('keeps export disabled when profiles fail to load and supports retry', async () => {
    const loadProfiles = vi
      .fn()
      .mockRejectedValueOnce(new Error('synthetic failure'))
      .mockResolvedValue([
        { profile, isActive: true, bookmarkCount: 1, folderCount: 10 },
      ]);
    const { onReport } = setup({ loadProfiles });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Profiles could not be loaded',
    );
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
    expect(onReport).toHaveBeenCalledWith('loadFailed');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Synthetic profile')).toBeVisible();
  });
});
