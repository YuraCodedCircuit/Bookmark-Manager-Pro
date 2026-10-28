import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import type { BackupSnapshot } from '../../domain/backup';
import { BackupDialog } from './BackupDialog';

const profileId = '11111111-1111-4111-8111-111111111111';
const snapshot: BackupSnapshot = {
  id: '33333333-3333-4333-8333-333333333333',
  profileId,
  profileName: 'Research',
  name: 'Before bookmark import',
  type: 'manual',
  trigger: 'manual',
  createdAt: 1,
  verifiedAt: 1,
  sizeBytes: 1024,
  digest: 'a'.repeat(64),
  payload: {
    formatVersion: 1,
    databaseSchemaVersion: 28,
    applicationVersion: '0.3.0',
    profile: {
      id: profileId,
      username: 'Research',
      createdAt: 1,
      updatedAt: 1,
    },
    settings: {
      profileId,
      theme: 'dark',
      bookmarkView: 'card',
      cardSize: 'medium',
    },
    activityLogSettings: null,
    bookmarks: [],
    folders: [],
    favorites: [],
    activity: [],
    synchronization: null,
  },
};

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => document.body.replaceChildren());

describe('BackupDialog', () => {
  it('reports a committed restore degradation instead of a failed restore when refresh fails', async () => {
    const user = userEvent.setup();
    const report = vi.fn();
    const restore = vi.fn(async () => profileId);
    render(
      <BackupDialog
        activeProfile={snapshot.payload.profile}
        dateTimeFormat="iso"
        onClose={vi.fn()}
        onReport={report}
        onRestored={async () => {
          throw new Error('private refresh detail');
        }}
        profiles={[{ isActive: true, profile: snapshot.payload.profile }]}
        storageUsage={[]}
        service={{
          create: vi.fn(),
          delete: vi.fn(),
          list: async () => [snapshot],
          restore,
        }}
      />,
    );
    await user.click(
      within(await screen.findByRole('listitem')).getByRole('button', {
        name: 'Restore',
      }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Restore snapshot' });
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: 'Restore' }));
    expect(
      await screen.findByText(/Changes were saved, but the view/),
    ).toBeVisible();
    expect(restore).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledExactlyOnceWith(
      'restoreDegraded',
      profileId,
    );
    expect(JSON.stringify(report.mock.calls)).not.toContain('private');
  });
  it('preserves a load error when its feedback callback fails', async () => {
    const diagnostic = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    render(
      <BackupDialog
        activeProfile={snapshot.payload.profile}
        dateTimeFormat="iso"
        onClose={vi.fn()}
        onRestored={vi.fn(async () => undefined)}
        profiles={[]}
        storageUsage={[]}
        service={{
          create: vi.fn(),
          delete: vi.fn(),
          restore: vi.fn(),
          list: vi.fn(async () => {
            throw new Error('synthetic');
          }),
        }}
        onReport={() => {
          throw new Error('synthetic');
        }}
      />,
    );
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(diagnostic).toHaveBeenCalledWith('backup-feedback-failed');
    diagnostic.mockRestore();
  });

  it('reports an outstanding load failure to the latest callback without reopening the dialog', async () => {
    let reject!: (reason: Error) => void;
    const service = {
      create: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(
        () =>
          new Promise<BackupSnapshot[]>((_, fail) => {
            reject = fail;
          }),
      ),
      restore: vi.fn(),
    };
    const props = {
      activeProfile: snapshot.payload.profile,
      dateTimeFormat: 'iso' as const,
      onClose: vi.fn(),
      onRestored: vi.fn(async () => undefined),
      profiles: [],
      storageUsage: [],
      service,
    };
    const first = vi.fn();
    const latest = vi.fn();
    const { rerender } = render(<BackupDialog {...props} onReport={first} />);
    await act(async () => {
      rerender(<BackupDialog {...props} onReport={latest} />);
    });
    await act(async () => {
      reject(new Error('synthetic load failure'));
    });
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledExactlyOnceWith('loadFailed');
    expect(service.list).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('dialog', { name: 'Backup snapshots' }),
    ).toBeVisible();
  });
  it('keeps the picker above its parent when app feedback callbacks change', async () => {
    const user = userEvent.setup();
    const service = {
      create: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(async () => [snapshot]),
      restore: vi.fn(),
    };
    const props = {
      activeProfile: snapshot.payload.profile,
      dateTimeFormat: 'iso' as const,
      onClose: vi.fn(),
      onRestored: vi.fn(async () => undefined),
      profiles: [{ isActive: true, profile: snapshot.payload.profile }],
      storageUsage: [],
      service,
    };
    const { rerender } = render(<BackupDialog {...props} onReport={vi.fn()} />);
    await screen.findByRole('listitem');
    await user.click(screen.getByRole('button', { name: 'Profile' }));
    const picker = screen.getByRole('dialog', { name: 'Choose profile' });
    const input = within(picker).getByRole('searchbox');
    await user.type(input, 'Res');
    const close = vi.spyOn(HTMLDialogElement.prototype, 'close');
    try {
      await act(async () => {
        rerender(<BackupDialog {...props} onReport={vi.fn()} />);
      });
      expect(close).not.toHaveBeenCalled();
      expect(service.list).toHaveBeenCalledOnce();
      expect(picker).toBeVisible();
      expect(input).toHaveValue('Res');
      expect(input).toHaveFocus();
    } finally {
      close.mockRestore();
    }
  });
  it('filters and selects current or deleted profiles without activating or mutating them', async () => {
    const user = userEvent.setup();
    const other = {
      ...snapshot.payload.profile,
      id: '22222222-2222-4222-8222-222222222222',
      username: 'Other profile',
    };
    const deletedId = '44444444-4444-4444-8444-444444444444';
    const deleted = {
      ...snapshot,
      id: '55555555-5555-4555-8555-555555555555',
      profileId: deletedId,
      profileName: 'Archived profile',
      name: 'Archived snapshot',
      type: 'deleted-profile' as const,
    };
    const onRestored = vi.fn();
    const onClose = vi.fn();
    const service = {
      create: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(async () => [snapshot, deleted]),
      restore: vi.fn(),
    };
    render(
      <BackupDialog
        activeProfile={snapshot.payload.profile}
        dateTimeFormat="iso"
        onClose={onClose}
        onRestored={onRestored}
        profiles={[
          { isActive: true, profile: snapshot.payload.profile },
          { isActive: false, profile: other },
        ]}
        storageUsage={[]}
        service={service}
      />,
    );
    await screen.findByRole('listitem');
    const open = screen.getByRole('button', { name: 'Profile' });
    await user.click(open);
    let picker = screen.getByRole('dialog', { name: 'Choose profile' });
    expect(
      within(picker).getByRole('heading', { name: 'Current profiles' }),
    ).toBeVisible();
    expect(
      within(picker).getByRole('heading', { name: 'Deleted profiles' }),
    ).toBeVisible();
    const filter = within(picker).getByRole('searchbox', {
      name: 'Filter profiles',
    });
    expect(filter).toHaveFocus();
    await user.type(filter, 'no match');
    expect(within(picker).getByRole('status')).toHaveTextContent(
      'No matching profiles.',
    );
    await user.clear(filter);
    await user.type(filter, 'OTHER');
    await user.click(
      within(picker).getByRole('button', { name: 'Other profile' }),
    );
    expect(open).toHaveAccessibleDescription('Other profile');
    expect(open).toHaveFocus();
    expect(
      screen.queryByRole('dialog', { name: 'Choose profile' }),
    ).not.toBeInTheDocument();
    await user.click(open);
    picker = screen.getByRole('dialog', { name: 'Choose profile' });
    expect(within(picker).getByRole('searchbox')).toHaveValue('');
    await user.click(
      within(picker).getByRole('button', { name: 'Archived profile' }),
    );
    expect(open).toHaveAccessibleDescription('Archived profile (Deleted)');
    expect(
      screen.getByRole('heading', { name: 'Archived snapshot' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Create snapshot' }),
    ).toBeDisabled();
    await user.click(open);
    picker = screen.getByRole('dialog', { name: 'Choose profile' });
    fireEvent(picker, new Event('cancel', { bubbles: true, cancelable: true }));
    expect(open).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
    expect(onRestored).not.toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
    expect(service.restore).not.toHaveBeenCalled();
  });
  it('filters Manual and Automatic by exact type while All preserves safety and recovery snapshots', async () => {
    const user = userEvent.setup();
    const snapshots = (
      [
        'manual',
        'automatic',
        'safety',
        'pre-upgrade',
        'deleted-profile',
      ] as const
    ).map((type, index) => ({
      ...snapshot,
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      type,
      name: `Snapshot ${type}`,
    }));
    render(
      <BackupDialog
        activeProfile={snapshot.payload.profile}
        dateTimeFormat="iso"
        onClose={vi.fn()}
        onRestored={vi.fn(async () => undefined)}
        profiles={[{ isActive: true, profile: snapshot.payload.profile }]}
        storageUsage={[]}
        service={{
          create: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(async () => snapshots),
          restore: vi.fn(),
        }}
      />,
    );
    expect(await screen.findAllByRole('listitem')).toHaveLength(5);
    const type = screen.getByLabelText('Type');
    await user.selectOptions(type, 'automatic');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Snapshot automatic' }),
    ).toBeVisible();
    await user.selectOptions(type, 'manual');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Snapshot manual' }),
    ).toBeVisible();
    await user.selectOptions(type, 'all');
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    for (const type of ['safety', 'pre-upgrade', 'deleted-profile'])
      expect(
        screen.getByRole('heading', { name: `Snapshot ${type}` }),
      ).toBeVisible();
  });
  it('shows the selected profile snapshots and three visible row actions', async () => {
    const user = userEvent.setup();
    render(
      <BackupDialog
        activeProfile={snapshot.payload.profile}
        dateTimeFormat="iso"
        onClose={vi.fn()}
        onRestored={vi.fn(async () => undefined)}
        profiles={[
          {
            isActive: true,
            profile: snapshot.payload.profile,
          },
        ]}
        storageUsage={[]}
        service={{
          create: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(async () => [snapshot]),
          restore: vi.fn(),
        }}
      />,
    );

    const row = await screen.findByRole('listitem');
    expect(within(row).getByRole('button', { name: 'Restore' })).toHaveClass(
      'is-primary',
    );
    expect(
      within(row).getByRole('button', { name: 'View details' }),
    ).toBeVisible();
    const deleteButton = within(row).getByRole('button', { name: 'Delete' });
    expect(deleteButton).toHaveClass('is-destructive-outline');
    await user.click(deleteButton);
    expect(
      within(screen.getByRole('dialog', { name: 'Delete snapshot' })).getByRole(
        'button',
        { name: 'Delete' },
      ),
    ).toHaveClass('is-destructive');
  });

  it('presents snapshot details as a row-labeled table', async () => {
    const user = userEvent.setup();
    render(
      <BackupDialog
        activeProfile={snapshot.payload.profile}
        dateTimeFormat="iso"
        onClose={vi.fn()}
        onRestored={vi.fn(async () => undefined)}
        profiles={[{ isActive: true, profile: snapshot.payload.profile }]}
        storageUsage={[]}
        service={{
          create: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(async () => [snapshot]),
          restore: vi.fn(),
        }}
      />,
    );

    await user.click(
      within(await screen.findByRole('listitem')).getByRole('button', {
        name: 'View details',
      }),
    );
    const table = screen.getByRole('table', { name: 'Snapshot details' });
    expect(
      within(table).getByRole('rowheader', { name: 'Name' }),
    ).toBeVisible();
    expect(
      within(table).getByRole('cell', { name: 'Before bookmark import' }),
    ).toBeVisible();
  });

  it('requires acknowledgment before replacing a profile', async () => {
    const user = userEvent.setup();
    render(
      <BackupDialog
        activeProfile={snapshot.payload.profile}
        dateTimeFormat="iso"
        onClose={vi.fn()}
        onRestored={vi.fn(async () => undefined)}
        profiles={[{ isActive: true, profile: snapshot.payload.profile }]}
        storageUsage={[]}
        service={{
          create: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(async () => [snapshot]),
          restore: vi.fn(),
        }}
      />,
    );
    await user.click(
      within(await screen.findByRole('listitem')).getByRole('button', {
        name: 'Restore',
      }),
    );
    const restoreDialog = screen.getByRole('dialog', {
      name: 'Restore snapshot',
    });
    expect(
      within(restoreDialog).getByText(
        'Synchronization connections will be paused. Review them before resuming.',
      ),
    ).toBeVisible();
    const restore = within(restoreDialog).getByRole('button', {
      name: 'Restore',
    });
    expect(restore).toBeDisabled();
    await user.click(
      within(restoreDialog).getByRole('checkbox', {
        name: 'I understand that this will replace the current profile',
      }),
    );
    expect(restore).toBeEnabled();
  });

  it('keeps the active profile current when the asynchronously loaded list is empty', async () => {
    render(
      <BackupDialog
        activeProfile={snapshot.payload.profile}
        dateTimeFormat="iso"
        onClose={vi.fn()}
        onRestored={vi.fn(async () => undefined)}
        profiles={[]}
        storageUsage={[]}
        service={{
          create: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(async () => [snapshot]),
          restore: vi.fn(),
        }}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Profile' }),
    ).toHaveAccessibleDescription('Research');
    expect(
      screen.getByRole('button', { name: 'Create snapshot' }),
    ).toBeEnabled();
  });

  it('shows creation guidance and the estimated size', async () => {
    const user = userEvent.setup();
    render(
      <BackupDialog
        activeProfile={snapshot.payload.profile}
        dateTimeFormat="iso"
        onClose={vi.fn()}
        onRestored={vi.fn(async () => undefined)}
        profiles={[{ isActive: true, profile: snapshot.payload.profile }]}
        storageUsage={[{ profileId, sizeBytes: 2048 }]}
        service={{
          create: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(async () => []),
          restore: vi.fn(),
        }}
      />,
    );

    await screen.findByRole('heading', { name: 'No snapshots' });
    const create = screen.getByRole('button', {
      name: 'Create snapshot',
    });
    await user.click(create);
    expect(screen.getByText('Included content')).toBeVisible();
    expect(
      screen.getByPlaceholderText('e.g. Before making changes'),
    ).toBeVisible();
    expect(screen.getByText('Estimated size: 2.0 KB')).toBeVisible();
  });

  it('explains an empty automatic filter without prompting for a manual snapshot', async () => {
    const user = userEvent.setup();
    render(
      <BackupDialog
        activeProfile={snapshot.payload.profile}
        dateTimeFormat="iso"
        onClose={vi.fn()}
        onRestored={vi.fn(async () => undefined)}
        profiles={[{ isActive: true, profile: snapshot.payload.profile }]}
        storageUsage={[]}
        service={{
          create: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(async () => [snapshot]),
          restore: vi.fn(),
        }}
      />,
    );

    await user.selectOptions(await screen.findByLabelText('Type'), 'automatic');
    expect(
      screen.getByRole('heading', { name: 'No automatic snapshots' }),
    ).toBeVisible();
    expect(
      screen.getAllByRole('button', { name: 'Create snapshot' }),
    ).toHaveLength(1);
  });
});
