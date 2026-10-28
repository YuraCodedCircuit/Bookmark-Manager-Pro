import type { BackupRepository } from '../backup/backup-repository';
import { stringifyTreeJson } from '../../domain/stringify-tree-json';
import { BoundedText, utf8TextBytes } from '../../domain/bounded-text';
import {
  digestBackupPayload,
  encodeBackupPayload,
  type BackupSnapshot,
} from '../../domain/backup';
import {
  encodeNativeExport,
  estimateNativeExportBytes,
  exportCategories,
  validateExport,
  MAX_EXPORT_BYTES,
  MAX_NATIVE_EXPORT_FILE_BYTES,
  type ExportCategory,
  type ExportFormat,
  type ExportPayload,
} from '../../domain/profile-export';
import { safeBookmarkUrlSchema } from '../../domain/bookmark-url';
import { readPortableJson } from '../../domain/portable-import';
import {
  csvColumns,
  csvColumnHeaders,
  csvExportColumnsSchema,
  type CsvColumn,
} from '../../domain/csv-export';

type JsonBookmark = {
  id: string;
  parentId: string;
  title: string;
  url: string;
  tags: string[];
  note: string;
  index: number;
};
type JsonFolder = Omit<JsonBookmark, 'url' | 'parentId'> & {
  parentId: string | null;
  content: Array<JsonFolder | JsonBookmark>;
};

export interface ExportOptions {
  profileIds: string[];
  format: ExportFormat;
  categories: ExportCategory[];
  includeBackups: boolean;
  password?: string | undefined;
  csvColumns?: readonly CsvColumn[];
}
export type ExportEstimateOptions = Omit<ExportOptions, 'password'> & {
  encrypted: boolean;
};

export interface ExportFile {
  content: string;
  filename: string;
  mimeType: string;
}
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
const csvCell = (value: string) => {
  const prefix = /^[\s]*[=+@\-\t\r]/.test(value) ? "'" : '';
  let quotes = 0;
  for (const character of value) if (character === '"') quotes++;
  if (
    utf8TextBytes(value) + quotes + prefix.length + 2 >
    MAX_NATIVE_EXPORT_FILE_BYTES
  )
    throw new Error('export-too-large');
  return `"${prefix + value.replaceAll('"', '""')}"`;
};

/** Captures selected profiles without creating snapshots or changing primary data. */
export class ExportProfiles {
  constructor(
    private readonly repository: Pick<
      BackupRepository,
      'captureProfile' | 'list'
    > & {
      iterateForExport?: (
        profileIds: readonly string[],
      ) => AsyncIterable<BackupSnapshot>;
    },
    private readonly now = () => Date.now(),
  ) {}

  async create(
    options: ExportOptions,
    signal: AbortSignal,
    progress: (done: number, total: number) => void,
  ): Promise<ExportFile> {
    const payload = await this.capture(options, signal, progress);
    let content: string;
    if (options.format === 'bmpro')
      content = await encodeNativeExport(payload, options.password);
    else content = portableExport(payload, options.format, options.csvColumns);
    signal.throwIfAborted();
    if (new TextEncoder().encode(content).byteLength > MAX_EXPORT_BYTES * 1.5)
      throw new Error('export-too-large');
    const timestamp = new Date(payload.createdAt)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '-')
      .slice(0, 15);
    return {
      content,
      filename: `bookmark-manager-pro-${timestamp}.${options.format}`,
      mimeType:
        options.format === 'html'
          ? 'text/html;charset=utf-8'
          : options.format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'application/json',
    };
  }

  /** Reads the selected snapshot and calculates file bytes without retaining secrets. */
  async estimate(
    options: ExportEstimateOptions,
    signal: AbortSignal,
  ): Promise<number> {
    const payload = await this.capture(options, signal, () => undefined);
    signal.throwIfAborted();
    return options.format === 'bmpro'
      ? estimateNativeExportBytes(payload, options.encrypted)
      : new TextEncoder().encode(
          portableExport(payload, options.format, options.csvColumns),
        ).byteLength;
  }

  private async capture(
    options: ExportOptions,
    signal: AbortSignal,
    progress: (done: number, total: number) => void,
  ): Promise<ExportPayload> {
    if (
      !options.profileIds.length ||
      new Set(options.profileIds).size !== options.profileIds.length ||
      options.profileIds.length > 1000
    )
      throw new Error('export-invalid-profiles');
    const categories =
      options.format === 'bmpro'
        ? options.categories
        : (['bookmarks'] as ExportCategory[]);
    if (
      !categories.length ||
      categories.some((category) => !exportCategories.includes(category))
    )
      throw new Error('export-invalid-categories');
    const profiles: ExportPayload['profiles'] = [];
    let size = 0;
    for (const id of options.profileIds) {
      signal.throwIfAborted();
      const source = await this.repository.captureProfile(id);
      if (source.profile.id !== id) throw new Error('export-profile-mismatch');
      const profile: ExportPayload['profiles'][number] = {
        profile: source.profile,
        formatVersion: source.formatVersion,
        databaseSchemaVersion: source.databaseSchemaVersion,
        applicationVersion: source.applicationVersion,
      };
      if (categories.includes('bookmarks'))
        Object.assign(profile, {
          bookmarks: source.bookmarks,
          folders: source.folders,
          favorites: source.favorites,
          folderWallpapers: source.folderWallpapers ?? [],
        });
      if (categories.includes('notes'))
        Object.assign(profile, {
          notes: source.notes ?? [],
          noteFolders: source.noteFolders ?? [],
        });
      if (categories.includes('settings'))
        Object.assign(profile, {
          settings: source.settings,
          activityLogSettings: source.activityLogSettings,
        });
      // Retain the legacy category shape without transferring local history.
      if (categories.includes('activity')) profile.activity = [];
      if (categories.includes('synchronization'))
        profile.synchronization = source.synchronization;
      size += new TextEncoder().encode(JSON.stringify(profile)).byteLength;
      if (size > MAX_EXPORT_BYTES) throw new Error('export-too-large');
      profiles.push(profile);
      progress(profiles.length, options.profileIds.length);
      // Yield between profiles so cancellation and progress can be observed.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    signal.throwIfAborted();
    const backups: BackupSnapshot[] = [];
    if (options.format === 'bmpro' && options.includeBackups) {
      const history =
        this.repository.iterateForExport?.(options.profileIds) ??
        (await this.repository.list());
      for await (const snapshot of history) {
        signal.throwIfAborted();
        if (!options.profileIds.includes(snapshot.profileId)) continue;
        if (
          new TextEncoder().encode(JSON.stringify(snapshot)).byteLength >
          MAX_EXPORT_BYTES - size
        )
          throw new Error('export-too-large');
        if ((await digestBackupPayload(snapshot.payload)) !== snapshot.digest)
          throw new Error('export-backup-integrity-failed');
        // Verify the source first, then authenticate the history-free copy.
        // Never mutate an existing recovery snapshot or invalidate its digest.
        const payload = { ...snapshot.payload, activity: [] };
        const sanitized = {
          ...snapshot,
          payload,
          digest: await digestBackupPayload(payload),
          sizeBytes: encodeBackupPayload(payload).byteLength,
        };
        size += new TextEncoder().encode(JSON.stringify(sanitized)).byteLength;
        if (size > MAX_EXPORT_BYTES) throw new Error('export-too-large');
        backups.push(sanitized);
      }
      backups.sort((a, b) => b.createdAt - a.createdAt);
    }
    const payload = validateExport({
      format: 'bookmark-manager-pro',
      version: 1,
      createdAt: this.now(),
      categories,
      restoreSynchronization: 'paused',
      profiles,
      backups,
    });
    return payload;
  }
}

/** Produces portable bookmark formats, with nested JSON, escaped HTML, and formula-resistant CSV. */
export function portableExport(
  payload: ExportPayload,
  format: Exclude<ExportFormat, 'bmpro'>,
  selectedCsvColumns: readonly CsvColumn[] = csvColumns,
): string {
  if (format === 'json') {
    const json = stringifyTreeJson({
      format: 'bookmark-manager-pro-bookmarks',
      version: 2,
      profiles: payload.profiles.map((p) => {
        const folders = new Map<string, JsonFolder>(
          (p.folders ?? []).map((f) => [
            f.id,
            {
              id: f.id,
              parentId: f.parentId,
              title: f.title,
              index: f.index,
              tags: f.tags,
              note: f.note,
              content: [],
            },
          ]),
        );
        const content: JsonFolder[] = [];
        for (const folder of folders.values()) {
          if (folder.parentId === null) content.push(folder);
          else {
            const parent = folders.get(folder.parentId);
            if (!parent) throw new Error('export-missing-folder');
            parent.content.push(folder);
          }
        }
        for (const b of p.bookmarks ?? []) {
          const parent = folders.get(b.parentId);
          if (!parent) throw new Error('export-missing-folder');
          parent.content.push({
            id: b.id,
            parentId: b.parentId,
            title: b.title,
            url: b.url,
            tags: b.tags,
            note: b.note,
            index: b.index,
          });
        }
        // Check every folder before stack-safe serialization so disconnected
        // cycles cannot disappear from the output.
        const stack = content.map((folder) => ({ folder }));
        const visited = new Set<string>();
        while (stack.length) {
          const { folder } = stack.pop()!;
          if (visited.has(folder.id)) throw new Error('export-invalid-tree');
          visited.add(folder.id);
          folder.content.sort(
            (a, b) => a.index - b.index || a.id.localeCompare(b.id),
          );
          for (const item of folder.content)
            if ('content' in item) stack.push({ folder: item });
        }
        if (visited.size !== folders.size)
          throw new Error('export-invalid-tree');
        content.sort((a, b) => a.index - b.index || a.id.localeCompare(b.id));
        return { id: p.profile.id, name: p.profile.username, content };
      }),
    });
    readPortableJson(json);
    return json;
  }
  if (format === 'csv') {
    const columns = csvExportColumnsSchema.parse(selectedCsvColumns);
    const rows = new BoundedText('\r\n');
    rows.push(
      '\uFEFF' +
        columns.map((column) => csvCell(csvColumnHeaders[column])).join(','),
    );
    for (const p of payload.profiles) {
      const folders = new Map(p.folders?.map((f) => [f.id, f]));
      for (const b of p.bookmarks ?? []) {
        const path: string[] = [];
        let folder = columns.includes('folderPath')
          ? folders.get(b.parentId)
          : undefined;
        const seen = new Set<string>();
        while (folder && !seen.has(folder.id)) {
          seen.add(folder.id);
          path.push(folder.title);
          folder = folder.parentId ? folders.get(folder.parentId) : undefined;
        }
        const cells: Record<CsvColumn, string> = {
          profileId: p.profile.id,
          profile: p.profile.username,
          folderPath: stringifyTreeJson(path.reverse()),
          title: b.title,
          url: b.url,
          tags: JSON.stringify(b.tags),
          note: b.note,
        };
        rows.push(columns.map((column) => csvCell(cells[column])).join(','));
      }
    }
    return rows.join();
  }
  const output = new BoundedText('\n');
  output.push(
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file.',
    '     Changes may be lost when this file is regenerated.',
    '     DO NOT EDIT! -->',
    `<!-- Generated by Bookmark Manager Pro on ${new Date(payload.createdAt).toISOString()} -->`,
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    `    <DT><H3 ADD_DATE="${Math.floor(payload.createdAt / 1000)}">Bookmark Manager Pro</H3>`,
    '    <DL><p>',
  );
  for (const p of payload.profiles) {
    const multipleProfiles = payload.profiles.length > 1;
    const timestamp = (value: number) => Math.floor(value / 1000);
    if (multipleProfiles)
      output.push(
        `        <DT><H3 ADD_DATE="${timestamp(p.profile.createdAt)}" LAST_MODIFIED="${timestamp(p.profile.updatedAt)}">${escapeHtml(p.profile.username)}</H3>`,
        '        <DL><p>',
      );
    type HtmlEntry = {
      id: string;
      title: string;
      index: number;
      createdAt: number;
      updatedAt: number;
      url?: string;
    };
    const children = new Map<string | null, HtmlEntry[]>();
    for (const item of [...(p.folders ?? []), ...(p.bookmarks ?? [])]) {
      const siblings = children.get(item.parentId) ?? [];
      siblings.push(item);
      children.set(item.parentId, siblings);
    }
    for (const siblings of children.values())
      siblings.sort((a, b) => a.index - b.index || a.id.localeCompare(b.id));
    const roots = (p.folders ?? []).filter((folder) => folder.isRoot);
    if ((p.folders?.length || p.bookmarks?.length) && roots.length !== 1)
      throw new Error('export-invalid-folder-tree');
    // Only the structurally identified app root is omitted, never a folder
    // merely named Home. Browser folders such as Bookmarks bar remain intact.
    const topLevel = roots[0] ? (children.get(roots[0].id) ?? []) : [];
    const stack: Array<
      { entry: HtmlEntry; depth: number } | { closeDepth: number }
    > = topLevel
      .map((entry) => ({ entry, depth: multipleProfiles ? 3 : 2 }))
      .reverse();
    while (stack.length) {
      const frame = stack.pop()!;
      if ('closeDepth' in frame) {
        output.push(`${'    '.repeat(Math.min(frame.closeDepth, 8))}</DL><p>`);
        continue;
      }
      const { entry, depth } = frame;
      const indent = '    '.repeat(Math.min(depth, 8));
      if (entry.url !== undefined)
        output.push(
          `${indent}<DT><A HREF="${escapeHtml(safeBookmarkUrlSchema.parse(entry.url))}" ADD_DATE="${timestamp(entry.createdAt)}">${escapeHtml(entry.title)}</A>`,
        );
      else {
        output.push(
          `${indent}<DT><H3 ADD_DATE="${timestamp(entry.createdAt)}" LAST_MODIFIED="${timestamp(entry.updatedAt)}">${escapeHtml(entry.title)}</H3>`,
          `${indent}<DL><p>`,
        );
        stack.push({ closeDepth: depth });
        const nested = children.get(entry.id) ?? [];
        for (let index = nested.length - 1; index >= 0; index--)
          stack.push({ entry: nested[index]!, depth: depth + 1 });
      }
    }
    if (multipleProfiles) output.push('        </DL><p>');
  }
  output.push('    </DL><p>');
  output.push('</DL><p>');
  return output.join();
}
