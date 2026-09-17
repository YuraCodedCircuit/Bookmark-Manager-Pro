import { z } from 'zod';

import type {
  DeleteFolderInput,
  DeleteFolderResult,
  NoteRepository,
  NoteWorkspaceData,
  SaveNoteInput,
} from '../application/note/note-repository';
import {
  NOTE_BODY_MAX_BYTES,
  NOTE_FOLDER_DEPTH_LIMIT,
  NOTE_FOLDER_LIMIT,
  NOTE_LIMIT,
  noteBodyByteLength,
  noteFolderSchema,
  noteSchema,
  type Note,
  type NoteFolder,
} from '../domain/note';
import type { BookmarkManagerDatabase } from './database';

const idSchema = z.uuid();
const folderTitleSchema = noteFolderSchema.shape.title;

/** Stores Notes records with profile ownership and hierarchy checks in each transaction. */
export class DexieNoteRepository implements NoteRepository {
  constructor(
    private readonly database: BookmarkManagerDatabase,
    private readonly now = () => Date.now(),
    private readonly createId = () => crypto.randomUUID(),
  ) {}

  async load(profileIdInput: string): Promise<NoteWorkspaceData> {
    const profileId = idSchema.parse(profileIdInput);
    await this.database.open();
    return this.database.transaction(
      'rw',
      [this.database.profiles, this.database.notes, this.database.noteFolders],
      async () => {
        await this.requireProfile(profileId);
        let folders = await this.profileFolders(profileId);
        let home = folders.find((folder) => folder.isHome);
        let repaired = false;
        if (!home) {
          home = noteFolderSchema.parse({
            id: this.createId(),
            profileId,
            parentId: null,
            title: 'Home',
            createdAt: this.now(),
            isHome: true,
          });
          await this.database.noteFolders.add(home);
          folders = [...folders, home];
          repaired = true;
        }
        const folderIds = new Set(folders.map((folder) => folder.id));
        const notes = await this.profileNotes(profileId);
        const orphanFolders = folders.filter(
          (folder) =>
            !folder.isHome &&
            (!folder.parentId || !folderIds.has(folder.parentId)),
        );
        const orphanNotes = notes.filter(
          (note) => !folderIds.has(note.folderId),
        );
        if (orphanFolders.length || orphanNotes.length) {
          await Promise.all([
            ...orphanFolders.map((folder) =>
              this.database.noteFolders.update(folder.id, {
                parentId: home.id,
              }),
            ),
            ...orphanNotes.map((note) =>
              this.database.notes.update(note.id, {
                folderId: home.id,
                modifiedAt: this.now(),
                revision: note.revision + 1,
              }),
            ),
          ]);
          repaired = true;
        }
        return {
          folders: (await this.profileFolders(profileId)).sort(compareFolders),
          notes: (await this.profileNotes(profileId)).sort(compareNotes),
          repaired,
        };
      },
    );
  }

  async save(input: SaveNoteInput): Promise<Note> {
    const profileId = idSchema.parse(input.profileId);
    const folderId = idSchema.parse(input.folderId);
    const title = noteSchema.shape.title.parse(input.title);
    if (noteBodyByteLength(input.body) > NOTE_BODY_MAX_BYTES)
      throw new Error('note-body-too-large');
    return this.database.transaction(
      'rw',
      [this.database.profiles, this.database.notes, this.database.noteFolders],
      async () => {
        await this.requireProfile(profileId);
        await this.requireFolder(profileId, folderId);
        if (!input.id) {
          if (
            (await this.database.notes
              .where('profileId')
              .equals(profileId)
              .count()) >= NOTE_LIMIT
          )
            throw new Error('note-limit-reached');
          const timestamp = this.now();
          const note = noteSchema.parse({
            id: this.createId(),
            profileId,
            folderId,
            title,
            body: input.body,
            important: input.important,
            createdAt: timestamp,
            modifiedAt: timestamp,
            revision: 1,
          });
          await this.database.notes.add(note);
          return note;
        }
        const note = await this.requireNote(
          profileId,
          idSchema.parse(input.id),
        );
        if (note.revision !== input.revision)
          throw new Error('note-save-conflict');
        if (
          note.title === title &&
          note.body === input.body &&
          note.folderId === folderId &&
          note.important === input.important
        )
          return note;
        const saved = noteSchema.parse({
          ...note,
          folderId,
          title,
          body: input.body,
          important: input.important,
          modifiedAt: this.now(),
          revision: note.revision + 1,
        });
        await this.database.notes.put(saved);
        return saved;
      },
    );
  }

  async createFolder(
    profileIdInput: string,
    parentIdInput: string,
    titleInput: string,
  ): Promise<NoteFolder> {
    const profileId = idSchema.parse(profileIdInput);
    const parentId = idSchema.parse(parentIdInput);
    const title = folderTitleSchema.parse(titleInput);
    return this.database.transaction(
      'rw',
      [this.database.profiles, this.database.noteFolders],
      async () => {
        await this.requireProfile(profileId);
        await this.requireFolder(profileId, parentId);
        const folders = await this.profileFolders(profileId);
        if (folders.length >= NOTE_FOLDER_LIMIT)
          throw new Error('note-folder-limit-reached');
        if (this.folderDepth(folders, parentId) >= NOTE_FOLDER_DEPTH_LIMIT)
          throw new Error('note-folder-depth-reached');
        this.requireUniqueSibling(folders, parentId, title);
        const folder = noteFolderSchema.parse({
          id: this.createId(),
          profileId,
          parentId,
          title,
          createdAt: this.now(),
          isHome: false,
        });
        await this.database.noteFolders.add(folder);
        return folder;
      },
    );
  }

  async renameFolder(
    profileIdInput: string,
    folderIdInput: string,
    titleInput: string,
  ): Promise<NoteFolder> {
    const profileId = idSchema.parse(profileIdInput);
    const folderId = idSchema.parse(folderIdInput);
    const title = folderTitleSchema.parse(titleInput);
    return this.database.transaction(
      'rw',
      [this.database.noteFolders],
      async () => {
        const folder = await this.requireFolder(profileId, folderId);
        if (folder.isHome) throw new Error('note-home-immutable');
        const folders = await this.profileFolders(profileId);
        this.requireUniqueSibling(folders, folder.parentId, title, folder.id);
        const renamed = noteFolderSchema.parse({ ...folder, title });
        await this.database.noteFolders.put(renamed);
        return renamed;
      },
    );
  }

  async inspectFolderDeletion(profileIdInput: string, folderIdInput: string) {
    const profileId = idSchema.parse(profileIdInput);
    const folderId = idSchema.parse(folderIdInput);
    return this.database.transaction(
      'r',
      [this.database.noteFolders, this.database.notes],
      async () => {
        const folder = await this.requireFolder(profileId, folderId);
        if (folder.isHome) throw new Error('note-home-immutable');
        const descendants = this.descendants(
          await this.profileFolders(profileId),
          folderId,
        );
        return {
          folderCount: descendants.size,
          noteCount: (await this.profileNotes(profileId)).filter((note) =>
            descendants.has(note.folderId),
          ).length,
        };
      },
    );
  }

  async deleteFolder(input: DeleteFolderInput): Promise<DeleteFolderResult> {
    const profileId = idSchema.parse(input.profileId);
    const folderId = idSchema.parse(input.folderId);
    return this.database.transaction(
      'rw',
      [this.database.noteFolders, this.database.notes],
      async () => {
        const folder = await this.requireFolder(profileId, folderId);
        if (folder.isHome) throw new Error('note-home-immutable');
        const folders = await this.profileFolders(profileId);
        const descendants = this.descendants(folders, folderId);
        const notes = (await this.profileNotes(profileId)).filter((note) =>
          descendants.has(note.folderId),
        );
        if (
          descendants.size !== input.expectedFolderCount ||
          notes.length !== input.expectedNoteCount
        )
          throw new Error('note-folder-delete-changed');
        const home = folders.find((candidate) => candidate.isHome);
        if (!home) throw new Error('note-home-missing');
        if (input.deleteNotes)
          await this.database.notes.bulkDelete(notes.map((note) => note.id));
        else
          for (const note of notes)
            await this.database.notes.update(note.id, {
              folderId: home.id,
              modifiedAt: this.now(),
              revision: note.revision + 1,
            });
        await this.database.noteFolders.bulkDelete([...descendants]);
        return {
          deletedFolderCount: descendants.size,
          deletedNoteCount: input.deleteNotes ? notes.length : 0,
          movedNoteCount: input.deleteNotes ? 0 : notes.length,
        };
      },
    );
  }

  async deleteNote(profileIdInput: string, noteIdInput: string): Promise<void> {
    const profileId = idSchema.parse(profileIdInput);
    const noteId = idSchema.parse(noteIdInput);
    await this.database.transaction('rw', [this.database.notes], async () => {
      await this.requireNote(profileId, noteId);
      await this.database.notes.delete(noteId);
    });
  }

  async moveNote(
    profileIdInput: string,
    noteIdInput: string,
    folderIdInput: string,
  ): Promise<Note> {
    return this.mutateNote(profileIdInput, noteIdInput, async (note) => {
      const folderId = idSchema.parse(folderIdInput);
      await this.requireFolder(note.profileId, folderId);
      return note.folderId === folderId ? note : { ...note, folderId };
    });
  }

  async setImportant(
    profileIdInput: string,
    noteIdInput: string,
    important: boolean,
  ): Promise<Note> {
    return this.mutateNote(profileIdInput, noteIdInput, (note) => ({
      ...note,
      important,
    }));
  }

  private async mutateNote(
    profileIdInput: string,
    noteIdInput: string,
    change: (note: Note) => Note | Promise<Note>,
  ): Promise<Note> {
    const profileId = idSchema.parse(profileIdInput);
    const noteId = idSchema.parse(noteIdInput);
    return this.database.transaction(
      'rw',
      [this.database.notes, this.database.noteFolders],
      async () => {
        const note = await this.requireNote(profileId, noteId);
        const changed = await change(note);
        if (
          changed === note ||
          (changed.folderId === note.folderId &&
            changed.important === note.important)
        )
          return note;
        const saved = noteSchema.parse({
          ...changed,
          modifiedAt: this.now(),
          revision: note.revision + 1,
        });
        await this.database.notes.put(saved);
        return saved;
      },
    );
  }

  private async requireProfile(profileId: string) {
    if (!(await this.database.profiles.get(profileId)))
      throw new Error('note-profile-not-found');
  }

  private async requireFolder(
    profileId: string,
    folderId: string,
  ): Promise<NoteFolder> {
    const stored = await this.database.noteFolders.get(folderId);
    const folder = stored ? noteFolderSchema.parse(stored) : undefined;
    if (!folder || folder.profileId !== profileId)
      throw new Error('note-folder-not-found');
    return folder;
  }

  private async requireNote(profileId: string, noteId: string): Promise<Note> {
    const stored = await this.database.notes.get(noteId);
    const note = stored ? noteSchema.parse(stored) : undefined;
    if (!note || note.profileId !== profileId)
      throw new Error('note-not-found');
    return note;
  }

  private async profileFolders(profileId: string) {
    return (
      await this.database.noteFolders
        .where('profileId')
        .equals(profileId)
        .toArray()
    ).map((folder) => noteFolderSchema.parse(folder));
  }

  private async profileNotes(profileId: string) {
    return (
      await this.database.notes.where('profileId').equals(profileId).toArray()
    ).map((note) => noteSchema.parse(note));
  }

  private requireUniqueSibling(
    folders: readonly NoteFolder[],
    parentId: string | null,
    title: string,
    exceptId?: string,
  ) {
    const key = title.trim().toLocaleLowerCase();
    if (
      folders.some(
        (folder) =>
          folder.id !== exceptId &&
          folder.parentId === parentId &&
          folder.title.trim().toLocaleLowerCase() === key,
      )
    )
      throw new Error('note-folder-name-duplicate');
  }

  private folderDepth(
    folders: readonly NoteFolder[],
    folderId: string,
  ): number {
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    let depth = 1;
    let current = byId.get(folderId);
    const seen = new Set<string>();
    while (current?.parentId) {
      if (seen.has(current.id)) throw new Error('note-folder-cycle');
      seen.add(current.id);
      depth += 1;
      current = byId.get(current.parentId);
    }
    return depth;
  }

  private descendants(
    folders: readonly NoteFolder[],
    folderId: string,
  ): Set<string> {
    const result = new Set([folderId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const folder of folders)
        if (
          folder.parentId &&
          result.has(folder.parentId) &&
          !result.has(folder.id)
        ) {
          result.add(folder.id);
          changed = true;
        }
    }
    return result;
  }
}

const compareNotes = (left: Note, right: Note) =>
  right.modifiedAt - left.modifiedAt ||
  right.createdAt - left.createdAt ||
  left.id.localeCompare(right.id);
const compareFolders = (left: NoteFolder, right: NoteFolder) =>
  right.createdAt - left.createdAt || left.id.localeCompare(right.id);
