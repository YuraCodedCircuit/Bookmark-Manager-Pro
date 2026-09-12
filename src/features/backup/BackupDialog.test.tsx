import { render, screen, within } from '@testing-library/react';
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
    expect(deleteButton).toHaveClass('is-destructive');
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
      await screen.findByRole('option', { name: 'Research' }),
    ).toBeVisible();
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
    const create = screen.getAllByRole('button', {
      name: 'Create snapshot',
    })[0];
    if (!create) throw new Error('Create snapshot action was not rendered.');
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
