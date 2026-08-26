import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import { UndoHistoryService } from '../../application/undo-history/undo-history-service';
import { UndoHistoryDialog } from './UndoHistoryDialog';

afterEach(cleanup);

describe('UndoHistoryDialog', () => {
  it('keeps search visible and reveals the remaining controls on request', async () => {
    const user = userEvent.setup();
    const service = await historyService();
    render(
      <UndoHistoryDialog
        isOpen
        onClose={vi.fn()}
        onHistoryChanged={vi.fn()}
        onHistoryClearCompleted={vi.fn()}
        onHistoryClearFailed={vi.fn()}
        onOperationCompleted={vi.fn()}
        onOperationFailed={vi.fn()}
        profileId={profileId}
        requestClearConfirmation={async () => true}
        service={service}
      />,
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Undo and redo history',
    });

    expect(within(dialog).getByRole('searchbox')).toBeVisible();
    expect(within(dialog).queryByLabelText('View')).not.toBeInTheDocument();

    const filters = within(dialog).getByRole('button', { name: 'Filters' });
    await user.click(filters);

    expect(filters).toHaveAttribute('aria-expanded', 'true');
    expect(within(dialog).getByLabelText('View')).toBeVisible();
    expect(within(dialog).queryByLabelText('Profile')).not.toBeInTheDocument();
  });

  it('filters session history and presents a fixed close action', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const service = await historyService();
    render(
      <UndoHistoryDialog
        isOpen
        onClose={onClose}
        onHistoryChanged={vi.fn()}
        onHistoryClearCompleted={vi.fn()}
        onHistoryClearFailed={vi.fn()}
        onOperationCompleted={vi.fn()}
        onOperationFailed={vi.fn()}
        profileId={profileId}
        requestClearConfirmation={async () => true}
        service={service}
      />,
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Undo and redo history',
    });

    await user.type(within(dialog).getByRole('searchbox'), 'Example folder');

    expect(within(dialog).getAllByRole('listitem')).toHaveLength(1);
    expect(within(dialog).getByText('1 change in this session')).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('runs the current undo operation and enables redo', async () => {
    const user = userEvent.setup();
    const service = await historyService();
    const changed = vi.fn();
    render(
      <UndoHistoryDialog
        isOpen
        onClose={vi.fn()}
        onHistoryChanged={changed}
        onHistoryClearCompleted={vi.fn()}
        onHistoryClearFailed={vi.fn()}
        onOperationCompleted={vi.fn()}
        onOperationFailed={vi.fn()}
        profileId={profileId}
        requestClearConfirmation={async () => true}
        service={service}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(changed).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled();
  });

  it('shows bounded item context and connects only records for the same item', async () => {
    const service = await contextualHistoryService();
    render(
      <UndoHistoryDialog
        isOpen
        onClose={vi.fn()}
        onHistoryChanged={vi.fn()}
        onHistoryClearCompleted={vi.fn()}
        onHistoryClearFailed={vi.fn()}
        onOperationCompleted={vi.fn()}
        onOperationFailed={vi.fn()}
        profileId={profileId}
        requestClearConfirmation={async () => true}
        service={service}
      />,
    );

    const bookmarkEntries = document.querySelectorAll(
      `[data-item-id="${bookmarkId}"]`,
    );
    const folderEntry = document.querySelector(`[data-item-id="${itemId}"]`);

    expect(bookmarkEntries).toHaveLength(2);
    expect(bookmarkEntries[0]).toHaveClass(
      'undo-history__entry--connector-start',
    );
    expect(bookmarkEntries[1]).toHaveClass(
      'undo-history__entry--connector-end',
    );
    expect(folderEntry).toHaveClass('undo-history__entry--connector-single');
    expect(screen.getAllByTitle('Home · github.com')).toHaveLength(2);
    expect(screen.getByTitle('Home')).toBeVisible();
  });

  it('clears the active profile history after confirmation', async () => {
    const user = userEvent.setup();
    const service = await historyService();
    const completed = vi.fn();
    render(
      <UndoHistoryDialog
        isOpen
        onClose={vi.fn()}
        onHistoryChanged={vi.fn()}
        onHistoryClearCompleted={completed}
        onHistoryClearFailed={vi.fn()}
        onOperationCompleted={vi.fn()}
        onOperationFailed={vi.fn()}
        profileId={profileId}
        requestClearConfirmation={async () => true}
        service={service}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(completed).toHaveBeenCalledOnce();
    expect(screen.getByText('No changes in this session')).toBeVisible();
  });

  it('keeps history when clearing is cancelled', async () => {
    const user = userEvent.setup();
    const service = await historyService();
    render(
      <UndoHistoryDialog
        isOpen
        onClose={vi.fn()}
        onHistoryChanged={vi.fn()}
        onHistoryClearCompleted={vi.fn()}
        onHistoryClearFailed={vi.fn()}
        onOperationCompleted={vi.fn()}
        onOperationFailed={vi.fn()}
        profileId={profileId}
        requestClearConfirmation={async () => false}
        service={service}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(screen.getByText('1 change in this session')).toBeVisible();
  });
});

const profileId = 'df6f88b6-10c7-43d7-b516-a063b77db6c6';
const rootId = '11111111-1111-4111-8111-111111111111';
const itemId = '22222222-2222-4222-8222-222222222222';
const bookmarkId = '44444444-4444-4444-8444-444444444444';
const root = {
  backgroundAppearance: { kind: 'color' as const, value: '#0b121a' },
  bookmarkView: 'card' as const,
  detailsTableTransparency: 0,
  includeNavigationBackground: false,
  navigationTransparency: 45,
  cardAppearance: { kind: 'color' as const, value: '#2f7de1' },
  createdAt: 1,
  id: rootId,
  index: 0,
  isRoot: true,
  note: '',
  parentId: null,
  profileId,
  tags: [],
  title: 'Home',
  updatedAt: 1,
};

async function historyService(): Promise<UndoHistoryService> {
  const service = new UndoHistoryService(
    { load: async () => [], save: async () => undefined },
    vi.fn(async () => undefined),
    () => '33333333-3333-4333-8333-333333333333',
    () => 2,
  );
  await service.record({
    action: 'created',
    after: {
      bookmarks: [],
      favorites: [],
      folders: [
        root,
        {
          ...root,
          id: itemId,
          isRoot: false,
          parentId: rootId,
          title: 'Example folder',
        },
      ],
    },
    before: { bookmarks: [], favorites: [], folders: [root] },
    itemId,
    itemType: 'folder',
    profileId,
  });
  return service;
}

async function contextualHistoryService(): Promise<UndoHistoryService> {
  let timestamp = 1;
  const service = new UndoHistoryService(
    { load: async () => [], save: async () => undefined },
    vi.fn(async () => undefined),
    () => crypto.randomUUID(),
    () => timestamp++,
  );
  const bookmark = {
    cardAppearance: { kind: 'color' as const, value: '#2f7de1' },
    createdAt: 1,
    id: bookmarkId,
    index: 0,
    note: '',
    parentId: rootId,
    profileId,
    tags: [],
    title: '123',
    updatedAt: 1,
    url: 'https://github.com/openai',
  };
  const bookmarkCreated = {
    bookmarks: [bookmark],
    favorites: [],
    folders: [root],
  };
  await service.record({
    action: 'created',
    after: bookmarkCreated,
    before: { bookmarks: [], favorites: [], folders: [root] },
    itemId: bookmarkId,
    itemType: 'bookmark',
    profileId,
  });
  await service.record({
    action: 'edited',
    after: {
      ...bookmarkCreated,
      bookmarks: [{ ...bookmark, updatedAt: 2 }],
    },
    before: bookmarkCreated,
    itemId: bookmarkId,
    itemType: 'bookmark',
    profileId,
  });
  await service.record({
    action: 'created',
    after: {
      ...bookmarkCreated,
      folders: [
        root,
        {
          ...root,
          id: itemId,
          isRoot: false,
          parentId: rootId,
          title: '123',
        },
      ],
    },
    before: bookmarkCreated,
    itemId,
    itemType: 'folder',
    profileId,
  });
  return service;
}
