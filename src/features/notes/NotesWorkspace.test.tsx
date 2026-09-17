import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../localization/i18n';
import type { NoteRepository } from '../../application/note/note-repository';
import { NotesWorkspace } from './NotesWorkspace';

const profileId = '11111111-1111-4111-8111-111111111111';
const homeId = '22222222-2222-4222-8222-222222222222';
const noteId = '33333333-3333-4333-8333-333333333333';

function createRepository(): NoteRepository {
  return {
    load: vi.fn(async () => ({
      repaired: false,
      folders: [
        {
          id: homeId,
          profileId,
          parentId: null,
          title: 'Home',
          createdAt: 1,
          isHome: true,
        },
      ],
      notes: [
        {
          id: noteId,
          profileId,
          folderId: homeId,
          title: 'Saved note',
          body: '**Body**',
          important: false,
          createdAt: 1,
          modifiedAt: 1,
          revision: 1,
        },
      ],
    })),
    save: vi.fn(async (input) => ({
      id: input.id ?? crypto.randomUUID(),
      profileId,
      folderId: input.folderId,
      title: input.title.trim(),
      body: input.body,
      important: input.important,
      createdAt: 1,
      modifiedAt: 2,
      revision: (input.revision ?? 0) + 1,
    })),
    createFolder: vi.fn(async (owner, parentId, title) => ({
      id: crypto.randomUUID(),
      profileId: owner,
      parentId,
      title,
      createdAt: 2,
      isHome: false,
    })),
    renameFolder: vi.fn(),
    inspectFolderDeletion: vi.fn(async () => ({
      folderCount: 1,
      noteCount: 1,
    })),
    deleteFolder: vi.fn(async () => ({
      deletedFolderCount: 1,
      deletedNoteCount: 0,
      movedNoteCount: 1,
    })),
    deleteNote: vi.fn(async () => undefined),
    moveNote: vi.fn(),
    setImportant: vi.fn(async (_owner, id, important) => ({
      id,
      profileId,
      folderId: homeId,
      title: 'Saved note',
      body: '**Body**',
      important,
      createdAt: 1,
      modifiedAt: 2,
      revision: 2,
    })),
  };
}

function renderWorkspace(repository = createRepository()) {
  render(
    <NotesWorkspace
      dateTimeFormat="browser"
      onBack={vi.fn(async () => true)}
      onConfirm={vi.fn(async () => true)}
      onOpenLink={vi.fn(async () => undefined)}
      profileId={profileId}
      repository={repository}
    />,
  );
  return repository;
}

afterEach(cleanup);

describe('NotesWorkspace', () => {
  it('loads an empty-selection durable workspace without prototype controls', async () => {
    renderWorkspace();
    expect(await screen.findByText('Saved note')).toBeVisible();
    expect(screen.getByText(/use New note in the left panel/i)).toBeVisible();
    expect(
      screen.queryByText(/changes are temporary/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Reset prototype/i }),
    ).not.toBeInTheDocument();
  });

  it('creates a draft and persists it only when Save is selected', async () => {
    const user = userEvent.setup();
    const repository = renderWorkspace();
    await screen.findByRole('button', { name: 'Home' });
    await user.click(screen.getByRole('button', { name: 'New note' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Note title' }),
      'Draft',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Markdown note body' }),
      'Body',
    );
    expect(repository.save).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Draft', body: 'Body', profileId }),
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('keeps horizontal and vertical overflow on the folder tree region', async () => {
    renderWorkspace();
    const tree = await screen.findByRole('tree', { name: 'Folders' });
    expect(tree.parentElement).toHaveClass('notes-folder-tree-scroll');
    expect(
      screen.getByRole('navigation', { name: 'Notes navigation' }),
    ).toContainElement(tree);
  });

  it('renders safe Markdown preview without raw HTML or unsafe links', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    const title = await screen.findByText('Saved note');
    await user.click(title.closest('button')!);
    const editor = screen.getByRole('region', { name: 'Note editor' });
    await user.click(within(editor).getByRole('button', { name: 'Preview' }));
    expect(within(editor).getByText('Body')).toBeVisible();
    expect(editor.querySelector('script')).toBeNull();
  });
});
