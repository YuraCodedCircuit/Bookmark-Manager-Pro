import type { Note, NoteFolder } from '../../domain/note';

export interface NoteWorkspaceData {
  folders: readonly NoteFolder[];
  notes: readonly Note[];
  repaired: boolean;
}

export interface SaveNoteInput {
  body: string;
  folderId: string;
  id?: string;
  important: boolean;
  profileId: string;
  revision?: number;
  title: string;
}

export interface DeleteFolderInput {
  deleteNotes: boolean;
  expectedFolderCount: number;
  expectedNoteCount: number;
  folderId: string;
  profileId: string;
}

export interface DeleteFolderResult {
  deletedFolderCount: number;
  deletedNoteCount: number;
  movedNoteCount: number;
}

/** Authoritative profile-scoped persistence boundary for Notes. */
export interface NoteRepository {
  load(profileId: string): Promise<NoteWorkspaceData>;
  save(input: SaveNoteInput): Promise<Note>;
  createFolder(
    profileId: string,
    parentId: string,
    title: string,
  ): Promise<NoteFolder>;
  renameFolder(
    profileId: string,
    folderId: string,
    title: string,
  ): Promise<NoteFolder>;
  inspectFolderDeletion(
    profileId: string,
    folderId: string,
  ): Promise<{ folderCount: number; noteCount: number }>;
  deleteFolder(input: DeleteFolderInput): Promise<DeleteFolderResult>;
  deleteNote(profileId: string, noteId: string): Promise<void>;
  moveNote(profileId: string, noteId: string, folderId: string): Promise<Note>;
  setImportant(
    profileId: string,
    noteId: string,
    important: boolean,
  ): Promise<Note>;
}
