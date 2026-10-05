import {
  Fragment,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { ClearableInput } from '../../components/ClearableInput';

import { NoteIcon } from '../../components/icons/NoteIcon';
import { ChevronIcon } from '../../components/icons/ChevronIcon';
import { FolderIcon } from '../../components/icons/FolderIcon';
import type { NoteFolder } from '../../domain/note';
import type { NoteRepository } from '../../application/note/note-repository';
import { DexieNoteRepository } from '../../storage/dexie-note-repository';
import { BookmarkManagerDatabase } from '../../storage/database';
import {
  defaultShortcutPreferences,
  matchesShortcut,
  type ShortcutAction,
  type ShortcutPreferences,
} from '../../domain/keyboard-shortcuts';

interface WorkspaceNote {
  body: string;
  createdAt?: number;
  folderId: string;
  id: string;
  important: boolean;
  modifiedAt: number;
  profileId: string;
  revision?: number;
  title: string;
}

type NotesView = 'all' | 'important' | { folderId: string };
type WorkspacePane = 'navigation' | 'list' | 'editor';
type FolderDialog =
  { kind: 'create'; parentId: string } | { folderId: string; kind: 'rename' };
interface ContextMenuState {
  id: string;
  left: number;
  top: number;
}

function isSafeLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function renderInline(
  value: string,
  onOpenLink: (url: string) => void,
): ReactNode[] {
  const pattern =
    /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*)/g;
  return value
    .split(pattern)
    .filter(Boolean)
    .map((part, index) => {
      const key = `${index}-${part}`;
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
      if (link) {
        const label = link[1] ?? '';
        const url = link[2] ?? '';
        return isSafeLink(url) ? (
          <button
            className="notes-preview__link"
            key={key}
            onClick={() => onOpenLink(url)}
            type="button"
          >
            {label}
          </button>
        ) : (
          <span key={key}>{label}</span>
        );
      }
      if (part.startsWith('`'))
        return <code key={key}>{part.slice(1, -1)}</code>;
      if (part.startsWith('**'))
        return <strong key={key}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('~~')) return <s key={key}>{part.slice(2, -2)}</s>;
      if (part.startsWith('*')) return <em key={key}>{part.slice(1, -1)}</em>;
      return <Fragment key={key}>{part}</Fragment>;
    });
}

function MarkdownPreview({
  onOpenLink,
  source,
}: {
  onOpenLink: (url: string) => void;
  source: string;
}) {
  const { t } = useTranslation();
  if (source.trim().length === 0)
    return <p className="notes-empty">{t('notes.emptyPreview')}</p>;

  const lines = source.split('\n');
  const output: ReactNode[] = [];
  let code: string[] | null = null;
  lines.forEach((line, index) => {
    if (line.startsWith('```')) {
      if (code) {
        output.push(
          <pre key={`code-${index}`}>
            <code>{code.join('\n')}</code>
          </pre>,
        );
        code = null;
      } else code = [];
      return;
    }
    if (code) {
      code.push(line);
      return;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1] ?? '';
      const children = renderInline(heading[2] ?? '', onOpenLink);
      output.push(
        level.length === 1 ? (
          <h2 key={index}>{children}</h2>
        ) : level.length === 2 ? (
          <h3 key={index}>{children}</h3>
        ) : (
          <h4 key={index}>{children}</h4>
        ),
      );
      return;
    }
    const task = /^- \[([ xX])\]\s+(.+)$/.exec(line);
    if (task) {
      output.push(
        <p className="notes-preview__list-line" key={index}>
          <input
            aria-label={t('notes.previewTask')}
            checked={(task[1] ?? '').toLowerCase() === 'x'}
            disabled
            type="checkbox"
          />
          {renderInline(task[2] ?? '', onOpenLink)}
        </p>,
      );
      return;
    }
    const list = /^(?:[-*]|\d+\.)\s+(.+)$/.exec(line);
    if (list) {
      output.push(
        <p className="notes-preview__list-line" key={index}>
          <span aria-hidden="true">•</span>
          {renderInline(list[1] ?? '', onOpenLink)}
        </p>,
      );
      return;
    }
    if (line.startsWith('> ')) {
      output.push(
        <blockquote key={index}>
          {renderInline(line.slice(2), onOpenLink)}
        </blockquote>,
      );
      return;
    }
    output.push(
      line.length > 0 ? (
        <p key={index}>{renderInline(line, onOpenLink)}</p>
      ) : (
        <br key={index} />
      ),
    );
  });
  const openCode = code as string[] | null;
  if (openCode)
    output.push(
      <pre key="code-open">
        <code>{openCode.join('\n')}</code>
      </pre>,
    );
  return <>{output}</>;
}

function plainExcerpt(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~`\-[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface NotesWorkspaceProps {
  dateTimeFormat: 'browser' | 'american' | 'international' | 'iso';
  profileId: string;
  repository?: NoteRepository;
  shortcutPreferences?: ShortcutPreferences | undefined;
  onBack: (changed: boolean) => Promise<boolean>;
  onConfirm: (kind: 'delete' | 'deleteFolder' | 'discard') => Promise<boolean>;
  onOpenLink: (url: string, changed: boolean) => Promise<void>;
  onMutation?: (action: NotesMutationAction) => void | Promise<void>;
  onMutationError?: (action: NotesMutationAction) => void | Promise<void>;
}

export type NotesMutationAction =
  | 'folder-created'
  | 'folder-deleted'
  | 'folder-renamed'
  | 'important-changed'
  | 'note-deleted'
  | 'note-moved'
  | 'note-saved'
  | 'storage-repaired';

export function NotesWorkspace({
  dateTimeFormat,
  profileId,
  repository: injectedRepository,
  shortcutPreferences = defaultShortcutPreferences,
  onBack,
  onConfirm,
  onOpenLink,
  onMutation,
  onMutationError,
}: NotesWorkspaceProps) {
  const { t } = useTranslation();
  const repository = useMemo(
    () =>
      injectedRepository ??
      new DexieNoteRepository(new BookmarkManagerDatabase()),
    [injectedRepository],
  );
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [view, setView] = useState<NotesView>('all');
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [pane, setPane] = useState<WorkspacePane>('navigation');
  const [expanded, setExpanded] = useState(() => new Set<string>());
  const [folderDialog, setFolderDialog] = useState<FolderDialog | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderError, setFolderError] = useState('');
  const [folderMenu, setFolderMenu] = useState<ContextMenuState | null>(null);
  const [noteMenu, setNoteMenu] = useState<ContextMenuState | null>(null);
  const [moveDialog, setMoveDialog] = useState<{
    folderId: string;
    noteId: string;
  } | null>(null);
  const [deleteFolderDialog, setDeleteFolderDialog] = useState<{
    deleteNotes: boolean;
    folderCount: number;
    folderId: string;
    noteCount: number;
  } | null>(null);
  const [changed, setChanged] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [undoStack, setUndoStack] = useState<readonly string[]>([]);
  const [redoStack, setRedoStack] = useState<readonly string[]>([]);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const folderNameRef = useRef<HTMLInputElement>(null);
  const folderDialogReturnRef = useRef<HTMLElement | null>(null);
  const folderMenuReturnRef = useRef<HTMLElement | null>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const noteMenuReturnRef = useRef<HTMLElement | null>(null);
  const noteMenuRef = useRef<HTMLDivElement>(null);
  const moveDialogRef = useRef<HTMLFormElement>(null);
  const moveFolderCurrentRef = useRef<HTMLButtonElement>(null);
  const editorViewRef = useRef({ end: 0, scrollTop: 0, start: 0 });
  const onMutationRef = useRef(onMutation);

  useEffect(() => {
    onMutationRef.current = onMutation;
  }, [onMutation]);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    let active = true;
    void repository
      .load(profileId)
      .then((data) => {
        if (!active) return;
        setFolders([...data.folders]);
        setNotes([...data.notes]);
        const home = data.folders.find((folder) => folder.isHome);
        setExpanded(home ? new Set([home.id]) : new Set());
        setSelectedId('');
        setChanged(false);
        if (data.repaired) void onMutationRef.current?.('storage-repaired');
      })
      .catch(() => {
        if (active) setSaveError(t('notes.loadFailed'));
      });
    return () => {
      active = false;
    };
  }, [profileId, repository, t]);

  useEffect(() => {
    if (mode !== 'edit') return;
    const editor = editorRef.current;
    if (!editor) return;
    const { end, scrollTop, start } = editorViewRef.current;
    editor.setSelectionRange(start, end);
    editor.scrollTop = scrollTop;
  }, [mode]);

  useEffect(() => {
    if (folderDialog)
      requestAnimationFrame(() => folderNameRef.current?.focus());
  }, [folderDialog]);

  useEffect(() => {
    if (folderMenu)
      requestAnimationFrame(() =>
        folderMenuRef.current
          ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
          ?.focus(),
      );
  }, [folderMenu]);

  useEffect(() => {
    if (noteMenu)
      requestAnimationFrame(() =>
        noteMenuRef.current
          ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
          ?.focus(),
      );
  }, [noteMenu]);

  useEffect(() => {
    if (moveDialog)
      requestAnimationFrame(() => moveFolderCurrentRef.current?.focus());
  }, [moveDialog]);

  useEffect(() => {
    if (!folderMenu && !noteMenu) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        folderMenuRef.current?.contains(target) ||
        noteMenuRef.current?.contains(target) ||
        folderMenuReturnRef.current?.contains(target) ||
        noteMenuReturnRef.current?.contains(target)
      )
        return;
      setFolderMenu(null);
      setNoteMenu(null);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [folderMenu, noteMenu]);
  const selected = notes.find((note) => note.id === selectedId);
  const homeId = folders.find((folder) => folder.isHome)?.id ?? '';

  const folderById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );
  const filteredNotes = useMemo(() => {
    const base = notes.filter((note) =>
      view === 'all'
        ? true
        : view === 'important'
          ? note.important
          : note.folderId === view.folderId,
    );
    const normalized = query.trim().toLocaleLowerCase();
    return base
      .filter(
        (note) =>
          normalized.length === 0 ||
          note.title.toLocaleLowerCase().includes(normalized),
      )
      .sort((left, right) => right.modifiedAt - left.modifiedAt);
  }, [notes, query, view]);
  const updateSelected = (change: Partial<WorkspaceNote>) => {
    if (!selected) return;
    setNotes((current) =>
      current.map((note) =>
        note.id === selected.id
          ? { ...note, ...change, modifiedAt: Date.now() }
          : note,
      ),
    );
    setChanged(true);
  };

  const selectNoteDirect = (id: string) => {
    setSelectedId(id);
    setUndoStack([]);
    setRedoStack([]);
  };

  const confirmDiscardIfNeeded = async () =>
    !changed || (await onConfirm('discard'));

  const selectNote = async (id: string) => {
    if (id === selectedId) return true;
    if (!(await confirmDiscardIfNeeded())) return false;
    setChanged(false);
    setSaveError('');
    selectNoteDirect(id);
    return true;
  };

  const updateBody = (body: string) => {
    if (!selected || body === selected.body) return;
    setUndoStack((current) => [...current, selected.body]);
    setRedoStack([]);
    updateSelected({ body });
  };

  const undoBody = () => {
    if (!selected) return;
    const body = undoStack.at(-1);
    if (body === undefined) return;
    setUndoStack((current) => current.slice(0, -1));
    setRedoStack((current) => [...current, selected.body]);
    updateSelected({ body });
  };

  const redoBody = () => {
    if (!selected) return;
    const body = redoStack.at(-1);
    if (body === undefined) return;
    setRedoStack((current) => current.slice(0, -1));
    setUndoStack((current) => [...current, selected.body]);
    updateSelected({ body });
  };

  const chooseView = async (next: NotesView) => {
    if (!(await confirmDiscardIfNeeded())) return false;
    setView(next);
    setQuery('');
    const candidates = notes
      .filter((note) =>
        next === 'all'
          ? true
          : next === 'important'
            ? note.important
            : note.folderId === next.folderId,
      )
      .sort((a, b) => b.modifiedAt - a.modifiedAt);
    if (!candidates.some((note) => note.id === selectedId))
      selectNoteDirect(candidates[0]?.id ?? '');
    setChanged(false);
    setSaveError('');
    setPane('list');
    return true;
  };

  const handleSearchChange = (value: string) => {
    if (query.length > 0 && value.length === 0 && selected) {
      setView({ folderId: selected.folderId });
      setExpanded((current) => {
        const next = new Set(current);
        let folder = folderById.get(selected.folderId);
        while (folder) {
          next.add(folder.id);
          folder = folder.parentId
            ? folderById.get(folder.parentId)
            : undefined;
        }
        return next;
      });
    }
    setQuery(value);
  };

  const contextMenuPosition = (left: number, top: number) => ({
    left: Math.max(8, Math.min(left, window.innerWidth - 208)),
    top: Math.max(8, Math.min(top, window.innerHeight - 176)),
  });

  const openFolderMenu = (
    folderId: string,
    left: number,
    top: number,
    returnTarget: HTMLElement,
  ) => {
    folderMenuReturnRef.current = returnTarget;
    setNoteMenu(null);
    setFolderMenu({ id: folderId, ...contextMenuPosition(left, top) });
  };

  const closeFolderMenu = () => {
    const returnTarget = folderMenuReturnRef.current;
    setFolderMenu(null);
    requestAnimationFrame(() => returnTarget?.focus());
  };

  const closeNoteMenu = () => {
    const returnTarget = noteMenuReturnRef.current;
    setNoteMenu(null);
    requestAnimationFrame(() => returnTarget?.focus());
  };

  const openCreateFolder = (parentId?: string) => {
    folderDialogReturnRef.current =
      parentId && folderMenuReturnRef.current
        ? folderMenuReturnRef.current
        : (document.activeElement as HTMLElement | null);
    const resolvedParentId =
      parentId ?? (typeof view === 'object' ? view.folderId : homeId);
    setFolderDialog({ kind: 'create', parentId: resolvedParentId });
    setFolderName('');
    setFolderError('');
    setFolderMenu(null);
  };

  const openRenameFolder = (folder: NoteFolder) => {
    if (folder.isHome) return;
    folderDialogReturnRef.current =
      folderMenuReturnRef.current ??
      (document.activeElement as HTMLElement | null);
    setFolderDialog({ folderId: folder.id, kind: 'rename' });
    setFolderName(folder.title);
    setFolderError('');
    setFolderMenu(null);
  };

  const closeFolderDialog = () => {
    const returnTarget = folderDialogReturnRef.current;
    setFolderDialog(null);
    folderMenuReturnRef.current = null;
    requestAnimationFrame(() => returnTarget?.focus());
  };

  const submitFolder = async () => {
    if (!folderDialog) return;
    const title = folderName.trim();
    if (!title) {
      setFolderError(t('notes.folderNameRequired'));
      return;
    }
    const parentId =
      folderDialog.kind === 'create'
        ? folderDialog.parentId
        : folderById.get(folderDialog.folderId)?.parentId;
    const duplicate = folders.some(
      (folder) =>
        folder.parentId === parentId &&
        folder.id !==
          (folderDialog.kind === 'rename' ? folderDialog.folderId : '') &&
        folder.title.localeCompare(title, undefined, {
          sensitivity: 'accent',
        }) === 0,
    );
    if (duplicate) {
      setFolderError(t('notes.folderNameDuplicate'));
      return;
    }
    try {
      if (folderDialog.kind === 'create') {
        const folder = await repository.createFolder(
          profileId,
          folderDialog.parentId,
          title,
        );
        setFolders((current) => [...current, folder]);
        setExpanded((current) => new Set(current).add(folderDialog.parentId));
        await chooseView({ folderId: folder.id });
        void onMutation?.('folder-created');
      } else {
        const renamed = await repository.renameFolder(
          profileId,
          folderDialog.folderId,
          title,
        );
        setFolders((current) =>
          current.map((folder) =>
            folder.id === folderDialog.folderId ? renamed : folder,
          ),
        );
        void onMutation?.('folder-renamed');
      }
      closeFolderDialog();
    } catch {
      setFolderError(t('notes.folderSaveFailed'));
      void onMutationError?.(
        folderDialog.kind === 'create' ? 'folder-created' : 'folder-renamed',
      );
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (folderId === homeId) return;
    const impact = await repository.inspectFolderDeletion(profileId, folderId);
    setFolderMenu(null);
    setDeleteFolderDialog({
      deleteNotes: false,
      folderCount: impact.folderCount,
      folderId,
      noteCount: impact.noteCount,
    });
  };

  const confirmDeleteFolder = async () => {
    if (!deleteFolderDialog) return;
    const { folderId } = deleteFolderDialog;
    await repository.deleteFolder({
      deleteNotes: deleteFolderDialog.deleteNotes,
      expectedFolderCount: deleteFolderDialog.folderCount,
      expectedNoteCount: deleteFolderDialog.noteCount,
      folderId,
      profileId,
    });
    const removed = new Set([folderId]);
    let added = true;
    while (added) {
      added = false;
      folders.forEach((folder) => {
        if (
          folder.parentId &&
          removed.has(folder.parentId) &&
          !removed.has(folder.id)
        ) {
          removed.add(folder.id);
          added = true;
        }
      });
    }
    setFolders((current) =>
      current.filter((folder) => !removed.has(folder.id)),
    );
    setNotes((current) =>
      deleteFolderDialog.deleteNotes
        ? current.filter((note) => !removed.has(note.folderId))
        : current.map((note) =>
            removed.has(note.folderId) ? { ...note, folderId: homeId } : note,
          ),
    );
    setView({ folderId: homeId });
    setFolderMenu(null);
    setDeleteFolderDialog(null);
    void onMutation?.('folder-deleted');
    folderMenuReturnRef.current = null;
  };

  const createNote = async () => {
    if (!(await confirmDiscardIfNeeded())) return;
    const note: WorkspaceNote = {
      body: '',
      folderId: typeof view === 'object' ? view.folderId : homeId,
      id: crypto.randomUUID(),
      important: false,
      modifiedAt: Date.now(),
      profileId,
      title: '',
    };
    setNotes((current) => [note, ...current]);
    selectNoteDirect(note.id);
    setMode('edit');
    setPane('editor');
    setChanged(true);
    requestAnimationFrame(() =>
      document.querySelector<HTMLInputElement>('#notes-title')?.focus(),
    );
  };

  const openNoteMenu = async (
    noteId: string,
    left: number,
    top: number,
    returnTarget: HTMLElement,
  ) => {
    if (!(await selectNote(noteId))) return;
    noteMenuReturnRef.current = returnTarget;
    setFolderMenu(null);
    setNoteMenu({ id: noteId, ...contextMenuPosition(left, top) });
  };

  const openMoveDialog = (noteId: string) => {
    const note = notes.find((item) => item.id === noteId);
    if (!note) return;
    setMoveDialog({ folderId: note.folderId, noteId });
    setNoteMenu(null);
  };

  const closeMoveDialog = () => {
    const returnTarget = noteMenuReturnRef.current;
    setMoveDialog(null);
    noteMenuReturnRef.current = null;
    requestAnimationFrame(() => returnTarget?.focus());
  };

  const moveNote = async () => {
    if (!moveDialog) return;
    const current = notes.find((note) => note.id === moveDialog.noteId);
    if (!current || current.folderId === moveDialog.folderId) return;
    const moved = current.revision
      ? await repository.moveNote(profileId, current.id, moveDialog.folderId)
      : { ...current, folderId: moveDialog.folderId, modifiedAt: Date.now() };
    setNotes((items) =>
      items.map((note) =>
        note.id === moveDialog.noteId ? { ...note, ...moved } : note,
      ),
    );
    setView({ folderId: moveDialog.folderId });
    setExpanded((current) => {
      const next = new Set(current);
      let folder = folderById.get(moveDialog.folderId);
      while (folder) {
        next.add(folder.id);
        folder = folder.parentId ? folderById.get(folder.parentId) : undefined;
      }
      return next;
    });
    closeMoveDialog();
    void onMutation?.('note-moved');
  };

  const saveSelected = async () => {
    if (!selected || !changed || isSaving) return;
    const title = selected.title.trim();
    if (!title) {
      setSaveError(t('notes.titleRequired'));
      document.querySelector<HTMLInputElement>('#notes-title')?.focus();
      return;
    }
    setIsSaving(true);
    setSaveError('');
    try {
      const saved = await repository.save({
        body: selected.body,
        folderId: selected.folderId,
        important: selected.important,
        profileId,
        title,
        ...(selected.revision
          ? { id: selected.id, revision: selected.revision }
          : {}),
      });
      setNotes((current) =>
        current.map((note) => (note.id === selected.id ? saved : note)),
      );
      setSelectedId(saved.id);
      setChanged(false);
      void onMutation?.('note-saved');
    } catch (error) {
      setSaveError(
        error instanceof Error && error.message === 'note-save-conflict'
          ? t('notes.saveConflict')
          : t('notes.saveFailed'),
      );
      void onMutationError?.('note-saved');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleImportant = async () => {
    if (!selected) return;
    const important = !selected.important;
    try {
      const updated = selected.revision
        ? await repository.setImportant(profileId, selected.id, important)
        : { ...selected, important };
      setNotes((current) =>
        current.map((note) =>
          note.id === selected.id
            ? { ...note, ...updated, title: note.title, body: note.body }
            : note,
        ),
      );
      void onMutation?.('important-changed');
    } catch {
      setSaveError(t('notes.saveFailed'));
      void onMutationError?.('important-changed');
    }
  };

  const applyInline = (
    prefix: string,
    suffix = prefix,
    placeholder = t('notes.placeholderText'),
  ) => {
    const editor = editorRef.current;
    if (!editor || !selected) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = selected.body;
    if (
      start >= prefix.length &&
      value.slice(start - prefix.length, start) === prefix &&
      value.slice(end, end + suffix.length) === suffix
    ) {
      updateBody(
        `${value.slice(0, start - prefix.length)}${value.slice(start, end)}${value.slice(end + suffix.length)}`,
      );
      requestAnimationFrame(() => {
        editor.focus();
        editor.setSelectionRange(start - prefix.length, end - prefix.length);
      });
      return;
    }
    const chosen = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${prefix}${chosen}${suffix}${value.slice(end)}`;
    updateBody(next);
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(
        start + prefix.length,
        start + prefix.length + chosen.length,
      );
    });
  };

  const applyLinePrefix = (prefix: string) => {
    const editor = editorRef.current;
    if (!editor || !selected) return;
    const start =
      selected.body.lastIndexOf('\n', Math.max(0, editor.selectionStart - 1)) +
      1;
    updateBody(
      `${selected.body.slice(0, start)}${prefix}${selected.body.slice(start)}`,
    );
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(
        editor.selectionStart + prefix.length,
        editor.selectionEnd + prefix.length,
      );
    });
  };

  const handleEditorShortcut = (
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (!shortcutPreferences.enabled) return;
    const matches = (action: ShortcutAction) =>
      matchesShortcut(event.nativeEvent, shortcutPreferences.bindings[action]);
    if (matches('noteSave')) {
      event.preventDefault();
      void saveSelected();
    } else if (matches('undo')) {
      event.preventDefault();
      undoBody();
    } else if (matches('redo')) {
      event.preventDefault();
      redoBody();
    } else if (matches('noteBold')) {
      event.preventDefault();
      applyInline('**');
    } else if (matches('noteItalic')) {
      event.preventDefault();
      applyInline('*');
    } else if (matches('noteLink')) {
      event.preventDefault();
      applyInline('[', '](https://)', t('notes.linkText'));
    }
  };

  const folderPath = selected?.folderId
    ? (() => {
        const path: NoteFolder[] = [];
        let folder = folderById.get(selected.folderId);
        while (folder) {
          path.unshift(folder);
          folder = folder.parentId
            ? folderById.get(folder.parentId)
            : undefined;
        }
        return path;
      })()
    : [];

  const formatModifiedDate = (timestamp: number) => {
    const date = new Date(timestamp);
    if (dateTimeFormat === 'iso') return date.toISOString().slice(0, 10);
    const locale =
      dateTimeFormat === 'american'
        ? 'en-US'
        : dateTimeFormat === 'international'
          ? 'en-GB'
          : undefined;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
      date,
    );
  };

  const handleMenuKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    close: () => void,
  ) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        'button:not(:disabled)',
      ),
    );
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const offset =
      event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!offset) return;
    event.preventDefault();
    items[(current + offset + items.length) % items.length]?.focus();
  };

  const renderFolderBranch = (
    parentId: string | null,
    level: number,
  ): ReactNode =>
    folders
      .filter((folder) => folder.parentId === parentId)
      .sort(
        (left, right) =>
          right.createdAt - left.createdAt || left.id.localeCompare(right.id),
      )
      .map((folder) => {
        const children = folders.filter((item) => item.parentId === folder.id);
        const hasChildren = children.length > 0;
        const isOpen = expanded.has(folder.id);
        return (
          <Fragment key={folder.id}>
            <li
              aria-expanded={hasChildren ? isOpen : undefined}
              aria-level={level}
              role="treeitem"
              style={{ '--note-folder-depth': level - 1 } as CSSProperties}
            >
              <div className="notes-folder-tree__row">
                {hasChildren ? (
                  <button
                    aria-label={t('notes.toggleFolder', {
                      title: folder.title,
                    })}
                    className="notes-folder-tree__toggle"
                    onClick={() =>
                      setExpanded((current) => {
                        const next = new Set(current);
                        if (next.has(folder.id)) next.delete(folder.id);
                        else next.add(folder.id);
                        return next;
                      })
                    }
                    type="button"
                  >
                    <ChevronIcon data-expanded={isOpen} />
                  </button>
                ) : (
                  <span
                    aria-hidden="true"
                    className="notes-folder-tree__spacer"
                  />
                )}
                <button
                  aria-current={
                    typeof view === 'object' && view.folderId === folder.id
                      ? 'page'
                      : undefined
                  }
                  className="notes-folder-tree__folder"
                  onClick={() => void chooseView({ folderId: folder.id })}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    openFolderMenu(
                      folder.id,
                      event.clientX,
                      event.clientY,
                      event.currentTarget,
                    );
                  }}
                  onKeyDown={(event) => {
                    if (event.shiftKey && event.key === 'F10') {
                      event.preventDefault();
                      const rect = event.currentTarget.getBoundingClientRect();
                      openFolderMenu(
                        folder.id,
                        rect.right,
                        rect.bottom,
                        event.currentTarget,
                      );
                    }
                  }}
                  type="button"
                >
                  <FolderIcon />
                  <span>{folder.title}</span>
                </button>
                <button
                  aria-expanded={folderMenu?.id === folder.id}
                  aria-haspopup="menu"
                  aria-label={t('notes.folderActions', { title: folder.title })}
                  className="notes-folder-tree__menu-trigger"
                  onClick={(event) => {
                    if (folderMenu?.id === folder.id) {
                      setFolderMenu(null);
                      return;
                    }
                    const rect = event.currentTarget.getBoundingClientRect();
                    openFolderMenu(
                      folder.id,
                      rect.right,
                      rect.bottom,
                      event.currentTarget,
                    );
                  }}
                  type="button"
                >
                  <span aria-hidden="true">...</span>
                </button>
              </div>
            </li>
            {hasChildren && isOpen
              ? renderFolderBranch(folder.id, level + 1)
              : null}
          </Fragment>
        );
      });

  const renderMoveFolderBranch = (
    parentId: string | null,
    level: number,
  ): ReactNode =>
    folders
      .filter((folder) => folder.parentId === parentId)
      .sort(
        (left, right) =>
          right.createdAt - left.createdAt || left.id.localeCompare(right.id),
      )
      .map((folder) => (
        <Fragment key={folder.id}>
          <li
            aria-level={level}
            aria-selected={moveDialog?.folderId === folder.id}
            role="treeitem"
            style={{ '--note-folder-depth': level - 1 } as CSSProperties}
          >
            <button
              className="notes-move-tree__folder"
              onClick={() =>
                setMoveDialog((current) =>
                  current ? { ...current, folderId: folder.id } : current,
                )
              }
              ref={
                moveDialog?.folderId === folder.id
                  ? moveFolderCurrentRef
                  : undefined
              }
              type="button"
            >
              <FolderIcon />
              <span>{folder.title}</span>
            </button>
          </li>
          {renderMoveFolderBranch(folder.id, level + 1)}
        </Fragment>
      ));

  const activeFolderMenu = folderMenu
    ? folderById.get(folderMenu.id)
    : undefined;

  return (
    <section
      aria-labelledby="notes-title-heading"
      className="notes-workspace"
      onKeyDown={(event) => {
        if (!shortcutPreferences.enabled || event.defaultPrevented) return;
        const matches = (action: ShortcutAction) =>
          matchesShortcut(
            event.nativeEvent,
            shortcutPreferences.bindings[action],
          );
        if (matches('noteNew')) {
          event.preventDefault();
          void createNote();
        } else if (matches('search')) {
          event.preventDefault();
          searchRef.current?.focus();
        } else if (matches('noteSave')) {
          event.preventDefault();
          void saveSelected();
        } else if (matches('notePreview')) {
          event.preventDefault();
          setMode((current) => (current === 'edit' ? 'preview' : 'edit'));
        } else if (matches('noteImportant')) {
          event.preventDefault();
          void toggleImportant();
        } else if (mode === 'edit' && matches('noteHeading')) {
          event.preventDefault();
          applyLinePrefix('# ');
        } else if (mode === 'edit' && matches('noteStrike')) {
          event.preventDefault();
          applyInline('~~');
        } else if (mode === 'edit' && matches('noteBullet')) {
          event.preventDefault();
          applyLinePrefix('- ');
        } else if (mode === 'edit' && matches('noteNumbered')) {
          event.preventDefault();
          applyLinePrefix('1. ');
        } else if (mode === 'edit' && matches('noteTask')) {
          event.preventDefault();
          applyLinePrefix('- [ ] ');
        } else if (mode === 'edit' && matches('noteQuote')) {
          event.preventDefault();
          applyLinePrefix('> ');
        } else if (mode === 'edit' && matches('noteInlineCode')) {
          event.preventDefault();
          applyInline('`');
        } else if (mode === 'edit' && matches('noteCodeBlock')) {
          event.preventDefault();
          applyInline('```\n', '\n```', t('notes.codePlaceholder'));
        }
      }}
    >
      <header className="notes-workspace__topbar">
        <button
          className="notes-workspace__back"
          onClick={() => void onBack(changed)}
          type="button"
        >
          {t('notes.back')}
        </button>
        <div>
          <h1 id="notes-title-heading" ref={headingRef} tabIndex={-1}>
            {t('notes.title')}
          </h1>
          <p>{t('notes.subtitle')}</p>
        </div>
      </header>

      <div className="notes-workspace__panes" data-pane={pane}>
        <nav aria-label={t('notes.navigation')} className="notes-navigation">
          <button
            className="notes-new"
            onClick={() => void createNote()}
            type="button"
          >
            <NoteIcon />
            {t('notes.newNote')}
          </button>
          <label className="notes-search">
            <ClearableInput
              aria-label={t('notes.search')}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={t('notes.searchPlaceholder')}
              ref={searchRef}
              type="search"
              value={query}
            />
          </label>
          <div className="notes-navigation__views">
            <button
              aria-current={view === 'all' ? 'page' : undefined}
              onClick={() => void chooseView('all')}
              type="button"
            >
              {t('notes.allNotes')}
            </button>
            <button
              aria-current={view === 'important' ? 'page' : undefined}
              onClick={() => void chooseView('important')}
              type="button"
            >
              {t('notes.important')}
            </button>
          </div>
          <div className="notes-folder-heading">
            <h2>{t('notes.folders')}</h2>
            <button onClick={() => openCreateFolder()} type="button">
              {t('notes.newFolder')}
            </button>
          </div>
          <div className="notes-folder-tree-scroll">
            <ul
              aria-label={t('notes.folders')}
              className="notes-folder-tree"
              role="tree"
            >
              {renderFolderBranch(null, 1)}
            </ul>
          </div>
        </nav>

        <section aria-labelledby="notes-list-title" className="notes-list">
          <header>
            <button
              className="notes-pane-back"
              onClick={() => setPane('navigation')}
              type="button"
            >
              {t('notes.backToNavigation')}
            </button>
            <h2 id="notes-list-title">
              {view === 'all'
                ? t('notes.allNotes')
                : view === 'important'
                  ? t('notes.important')
                  : folderById.get(view.folderId)?.title}
            </h2>
          </header>
          {filteredNotes.length ? (
            <ul>
              {filteredNotes.map((note) => (
                <li key={note.id}>
                  <div className="notes-list__item">
                    <button
                      aria-current={note.id === selectedId ? 'true' : undefined}
                      className="notes-list__note"
                      onClick={() => {
                        void selectNote(note.id).then((selectedNote) => {
                          if (selectedNote) setPane('editor');
                        });
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        void openNoteMenu(
                          note.id,
                          event.clientX,
                          event.clientY,
                          event.currentTarget,
                        );
                      }}
                      onKeyDown={(event) => {
                        if (event.shiftKey && event.key === 'F10') {
                          event.preventDefault();
                          const rect =
                            event.currentTarget.getBoundingClientRect();
                          void openNoteMenu(
                            note.id,
                            rect.right,
                            rect.bottom,
                            event.currentTarget,
                          );
                        }
                      }}
                      type="button"
                    >
                      <span>
                        <strong>{note.title || t('notes.untitled')}</strong>
                        {note.important ? (
                          <span aria-label={t('notes.important')}>★</span>
                        ) : null}
                      </span>
                      <small>
                        {plainExcerpt(note.body) || t('notes.emptyNote')}
                      </small>
                      <time dateTime={new Date(note.modifiedAt).toISOString()}>
                        {formatModifiedDate(note.modifiedAt)}
                      </time>
                    </button>
                    <button
                      aria-expanded={noteMenu?.id === note.id}
                      aria-haspopup="menu"
                      aria-label={t('notes.noteActions', {
                        title: note.title || t('notes.untitled'),
                      })}
                      className="notes-list__menu-trigger"
                      onClick={(event) => {
                        if (noteMenu?.id === note.id) {
                          setNoteMenu(null);
                          return;
                        }
                        const rect =
                          event.currentTarget.getBoundingClientRect();
                        void openNoteMenu(
                          note.id,
                          rect.right,
                          rect.bottom,
                          event.currentTarget,
                        );
                      }}
                      type="button"
                    >
                      <span aria-hidden="true">...</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="notes-empty notes-list__empty">
              <p>
                {query.trim()
                  ? t('notes.noSearchResults')
                  : view === 'important'
                    ? t('notes.noImportant')
                    : t('notes.emptyFolder')}
              </p>
              {!query.trim() ? <p>{t('notes.useNewNote')}</p> : null}
            </div>
          )}
        </section>

        <section aria-label={t('notes.editor')} className="notes-editor">
          <button
            className="notes-pane-back"
            onClick={() => setPane('list')}
            type="button"
          >
            {t('notes.backToList')}
          </button>
          {selected ? (
            <>
              <nav
                aria-label={t('notes.folderPath')}
                className="notes-breadcrumbs"
              >
                <button onClick={() => void chooseView('all')} type="button">
                  {t('notes.title')}
                </button>
                {folderPath.map((folder) => (
                  <Fragment key={folder.id}>
                    <span aria-hidden="true"> / </span>
                    <button
                      onClick={() => void chooseView({ folderId: folder.id })}
                      type="button"
                    >
                      {folder.title}
                    </button>
                  </Fragment>
                ))}
              </nav>
              <header className="notes-editor__header">
                <label>
                  <ClearableInput
                    aria-label={t('notes.noteTitle')}
                    id="notes-title"
                    maxLength={200}
                    onChange={(event) =>
                      updateSelected({ title: event.target.value })
                    }
                    placeholder={t('notes.untitled')}
                    value={selected.title}
                  />
                </label>
                <button
                  aria-pressed={selected.important}
                  onClick={() => void toggleImportant()}
                  type="button"
                >
                  {selected.important ? '★' : '☆'} {t('notes.important')}
                </button>
              </header>
              <div className="notes-editor__mode-row">
                <div className="notes-toolbar-slot">
                  {mode === 'edit' ? (
                    <div
                      aria-label={t('notes.formatting')}
                      className="notes-toolbar"
                      role="toolbar"
                    >
                      <button
                        aria-label={t('notes.undo')}
                        disabled={undoStack.length === 0}
                        onClick={undoBody}
                        title={t('notes.undo')}
                        type="button"
                      >
                        ↶
                      </button>
                      <button
                        aria-label={t('notes.redo')}
                        disabled={redoStack.length === 0}
                        onClick={redoBody}
                        title={t('notes.redo')}
                        type="button"
                      >
                        ↷
                      </button>
                      <button
                        aria-label={t('notes.heading')}
                        onClick={() => applyLinePrefix('# ')}
                        title={t('notes.heading')}
                        type="button"
                      >
                        H
                      </button>
                      <button
                        aria-label={t('notes.bold')}
                        onClick={() => applyInline('**')}
                        title={t('notes.bold')}
                        type="button"
                      >
                        <strong>B</strong>
                      </button>
                      <button
                        aria-label={t('notes.italic')}
                        onClick={() => applyInline('*')}
                        title={t('notes.italic')}
                        type="button"
                      >
                        <em>I</em>
                      </button>
                      <button
                        aria-label={t('notes.strikethrough')}
                        onClick={() => applyInline('~~')}
                        title={t('notes.strikethrough')}
                        type="button"
                      >
                        <s>S</s>
                      </button>
                      <button
                        aria-label={t('notes.bulletList')}
                        onClick={() => applyLinePrefix('- ')}
                        title={t('notes.bulletList')}
                        type="button"
                      >
                        •
                      </button>
                      <button
                        aria-label={t('notes.numberedList')}
                        onClick={() => applyLinePrefix('1. ')}
                        title={t('notes.numberedList')}
                        type="button"
                      >
                        1.
                      </button>
                      <button
                        aria-label={t('notes.taskList')}
                        onClick={() => applyLinePrefix('- [ ] ')}
                        title={t('notes.taskList')}
                        type="button"
                      >
                        ☐
                      </button>
                      <button
                        aria-label={t('notes.blockquote')}
                        onClick={() => applyLinePrefix('> ')}
                        title={t('notes.blockquote')}
                        type="button"
                      >
                        ❯
                      </button>
                      <button
                        aria-label={t('notes.inlineCode')}
                        onClick={() => applyInline('`')}
                        title={t('notes.inlineCode')}
                        type="button"
                      >
                        &lt;/&gt;
                      </button>
                      <button
                        aria-label={t('notes.codeBlock')}
                        onClick={() =>
                          applyInline(
                            '```\n',
                            '\n```',
                            t('notes.codePlaceholder'),
                          )
                        }
                        title={t('notes.codeBlock')}
                        type="button"
                      >
                        {'{ }'}
                      </button>
                      <button
                        aria-label={t('notes.link')}
                        onClick={() =>
                          applyInline('[', '](https://)', t('notes.linkText'))
                        }
                        title={t('notes.link')}
                        type="button"
                      >
                        🔗
                      </button>
                    </div>
                  ) : null}
                </div>
                <button
                  className="notes-mode-toggle"
                  onClick={() => {
                    if (mode === 'edit') {
                      const editor = editorRef.current;
                      if (editor)
                        editorViewRef.current = {
                          end: editor.selectionEnd,
                          scrollTop: editor.scrollTop,
                          start: editor.selectionStart,
                        };
                      setMode('preview');
                    } else setMode('edit');
                  }}
                  type="button"
                >
                  {mode === 'edit' ? t('notes.preview') : t('notes.edit')}
                </button>
              </div>
              {mode === 'edit' ? (
                <label className="notes-editor__body">
                  <span className="sr-only">{t('notes.markdownBody')}</span>
                  <textarea
                    aria-keyshortcuts="Control+B Control+I Control+K Control+S Control+Z Control+Y"
                    onChange={(event) => updateBody(event.target.value)}
                    onKeyDown={handleEditorShortcut}
                    ref={editorRef}
                    value={selected.body}
                  />
                </label>
              ) : (
                <article
                  aria-label={t('notes.preview')}
                  className="notes-preview"
                >
                  <MarkdownPreview
                    onOpenLink={(url) => void onOpenLink(url, changed)}
                    source={selected.body}
                  />
                </article>
              )}
              <div className="notes-editor__actions">
                <button
                  onClick={() => {
                    void (async () => {
                      if (!(await onConfirm('delete'))) return;
                      if (selected.revision)
                        await repository.deleteNote(profileId, selected.id);
                      const index = filteredNotes.findIndex(
                        (note) => note.id === selected.id,
                      );
                      const remaining = notes.filter(
                        (note) => note.id !== selected.id,
                      );
                      setNotes(remaining);
                      selectNoteDirect(
                        filteredNotes[index + 1]?.id ??
                          filteredNotes[index - 1]?.id ??
                          '',
                      );
                      setChanged(false);
                      void onMutation?.('note-deleted');
                    })();
                  }}
                  type="button"
                >
                  {t('notes.delete')}
                </button>
                <button
                  aria-describedby={saveError ? 'notes-save-error' : undefined}
                  disabled={!changed || isSaving}
                  onClick={() => void saveSelected()}
                  type="button"
                >
                  {isSaving ? t('notes.saving') : t('notes.save')}
                </button>
                {saveError ? (
                  <small id="notes-save-error" role="alert">
                    {saveError}
                  </small>
                ) : null}
              </div>
            </>
          ) : (
            <div className="notes-empty notes-editor__empty">
              <p>{t('notes.noSelection')}</p>
            </div>
          )}
        </section>
      </div>
      {folderMenu && activeFolderMenu
        ? createPortal(
            <div
              aria-label={t('notes.folderActions', {
                title: activeFolderMenu.title,
              })}
              className="notes-context-menu"
              onKeyDown={(event) => handleMenuKeyDown(event, closeFolderMenu)}
              ref={folderMenuRef}
              role="menu"
              style={{ left: folderMenu.left, top: folderMenu.top }}
            >
              <button
                onClick={() => openCreateFolder(activeFolderMenu.id)}
                role="menuitem"
                type="button"
              >
                {t('notes.newSubfolder')}
              </button>
              <button
                disabled={activeFolderMenu.isHome}
                onClick={() => openRenameFolder(activeFolderMenu)}
                role="menuitem"
                type="button"
              >
                {t('notes.renameFolder')}
              </button>
              <button
                disabled={activeFolderMenu.isHome}
                onClick={() => void deleteFolder(activeFolderMenu.id)}
                role="menuitem"
                type="button"
              >
                {t('notes.deleteFolder')}
              </button>
            </div>,
            document.body,
          )
        : null}
      {noteMenu
        ? createPortal(
            <div
              aria-label={t('notes.noteActions', {
                title:
                  notes.find((note) => note.id === noteMenu.id)?.title ||
                  t('notes.untitled'),
              })}
              className="notes-context-menu"
              onKeyDown={(event) => handleMenuKeyDown(event, closeNoteMenu)}
              ref={noteMenuRef}
              role="menu"
              style={{ left: noteMenu.left, top: noteMenu.top }}
            >
              <button
                onClick={() => openMoveDialog(noteMenu.id)}
                role="menuitem"
                type="button"
              >
                {t('notes.moveToFolder')}
              </button>
            </div>,
            document.body,
          )
        : null}
      {moveDialog
        ? createPortal(
            <div className="notes-folder-dialog__backdrop notes-move-dialog__backdrop">
              <form
                aria-labelledby="notes-move-dialog-title"
                aria-modal="true"
                className="notes-folder-dialog notes-move-dialog"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeMoveDialog();
                  if (event.key !== 'Tab') return;
                  const controls = Array.from(
                    event.currentTarget.querySelectorAll<HTMLElement>(
                      'button:not(:disabled)',
                    ),
                  );
                  const first = controls[0];
                  const last = controls.at(-1);
                  if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                  } else if (
                    !event.shiftKey &&
                    document.activeElement === last
                  ) {
                    event.preventDefault();
                    first?.focus();
                  }
                }}
                onSubmit={(event) => {
                  event.preventDefault();
                  void moveNote();
                }}
                ref={moveDialogRef}
                role="dialog"
              >
                <h2 id="notes-move-dialog-title">{t('notes.moveNote')}</h2>
                <p>{t('notes.chooseDestination')}</p>
                <ul
                  aria-label={t('notes.destinationFolders')}
                  className="notes-move-tree"
                  role="tree"
                >
                  {renderMoveFolderBranch(null, 1)}
                </ul>
                <div className="notes-folder-dialog__actions">
                  <button onClick={closeMoveDialog} type="button">
                    {t('notes.cancel')}
                  </button>
                  <button
                    disabled={
                      notes.find((note) => note.id === moveDialog.noteId)
                        ?.folderId === moveDialog.folderId
                    }
                    type="submit"
                  >
                    {t('notes.move')}
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
      {deleteFolderDialog ? (
        <div className="notes-folder-dialog__backdrop">
          <form
            aria-labelledby="notes-delete-folder-title"
            aria-modal="true"
            className="notes-folder-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              void confirmDeleteFolder().catch(() => {
                setSaveError(t('notes.folderDeleteFailed'));
              });
            }}
            role="dialog"
          >
            <h2 id="notes-delete-folder-title">
              {t('notes.deleteFolderTitle')}
            </h2>
            <p>
              {t('notes.deleteFolderImpact', {
                folderCount: deleteFolderDialog.folderCount,
                noteCount: deleteFolderDialog.noteCount,
              })}
            </p>
            <label className="settings-checkbox-row">
              <input
                checked={deleteFolderDialog.deleteNotes}
                onChange={(event) =>
                  setDeleteFolderDialog((current) =>
                    current
                      ? { ...current, deleteNotes: event.target.checked }
                      : current,
                  )
                }
                type="checkbox"
              />
              <span>{t('notes.deleteFolderNotesPermanently')}</span>
            </label>
            <p>
              {t(
                deleteFolderDialog.deleteNotes
                  ? 'notes.deleteFolderPermanentConsequence'
                  : 'notes.deleteFolderMoveConsequence',
              )}
            </p>
            <div className="notes-folder-dialog__actions">
              <button onClick={() => setDeleteFolderDialog(null)} type="button">
                {t('notes.cancel')}
              </button>
              <button type="submit">{t('notes.deleteFolder')}</button>
            </div>
          </form>
        </div>
      ) : null}
      {folderDialog ? (
        <div className="notes-folder-dialog__backdrop">
          <form
            aria-modal="true"
            aria-labelledby="notes-folder-dialog-title"
            className="notes-folder-dialog"
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeFolderDialog();
              if (event.key !== 'Tab') return;
              const controls = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  'input, button:not(:disabled)',
                ),
              );
              const first = controls[0];
              const last = controls.at(-1);
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
            onSubmit={(event) => {
              event.preventDefault();
              void submitFolder();
            }}
            role="dialog"
          >
            <h2 id="notes-folder-dialog-title">
              {folderDialog.kind === 'create'
                ? t('notes.newFolder')
                : t('notes.renameFolder')}
            </h2>
            <label htmlFor="notes-folder-name">{t('notes.folderName')}</label>
            <ClearableInput
              aria-describedby={folderError ? 'notes-folder-error' : undefined}
              aria-invalid={folderError ? 'true' : undefined}
              id="notes-folder-name"
              maxLength={100}
              onChange={(event) => {
                setFolderName(event.target.value);
                setFolderError('');
              }}
              ref={folderNameRef}
              value={folderName}
            />
            {folderError ? (
              <p id="notes-folder-error" role="alert">
                {folderError}
              </p>
            ) : null}
            <div className="notes-folder-dialog__actions">
              <button onClick={closeFolderDialog} type="button">
                {t('notes.cancel')}
              </button>
              <button type="submit">
                {folderDialog.kind === 'create'
                  ? t('notes.createFolder')
                  : t('notes.saveFolder')}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
