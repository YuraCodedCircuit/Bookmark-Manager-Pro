import { z } from 'zod';
import { safeBookmarkUrlSchema } from './bookmark-url';
import { MAX_NATIVE_EXPORT_FILE_BYTES } from './profile-export';
import type { PortableImportItem } from './portable-import';
import { csvColumnHeaders, type CsvColumn } from './csv-export';

const text = z.string().trim().min(1).max(200);
const maxRecords = 1_000_000;
function bound(source: string) {
  if (
    source.length > MAX_NATIVE_EXPORT_FILE_BYTES ||
    new TextEncoder().encode(source).length > MAX_NATIVE_EXPORT_FILE_BYTES
  )
    throw new Error('import-file-size');
}

/** Reads supported CSV headers in file order; values remain inert and never choose destinations. */
export function readPortableCsvPreview(
  source: string,
  retainContent = false,
): {
  items: PortableImportItem[];
  columns: CsvColumn[];
} {
  bound(source);
  source = source.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let endedQuote = false;
  const pushCell = () => {
    row.push(cell);
    cell = '';
    endedQuote = false;
    if (row.length > 128) throw new Error('import-csv-columns');
  };
  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
    if (rows.length > maxRecords + 1) throw new Error('import-record-limit');
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          endedQuote = true;
        }
      } else cell += char;
    } else if (char === '"') {
      if (cell || endedQuote) throw new Error('import-csv-quote');
      quoted = true;
    } else if (char === ',') pushCell();
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      pushRow();
    } else {
      if (endedQuote) throw new Error('import-csv-quote');
      cell += char;
    }
    if (cell.length > 100_000) throw new Error('import-csv-cell-size');
  }
  if (quoted) throw new Error('import-csv-quote');
  if (cell || row.length || endedQuote) pushRow();
  const header = rows.shift();
  if (!header?.length) throw new Error('import-csv-header');
  const supported = new Map(
    Object.entries(csvColumnHeaders).map(([key, label]) => [
      label.toLowerCase(),
      key as CsvColumn,
    ]),
  );
  const positions = new Map<CsvColumn, number>();
  header.forEach((label, position) => {
    const column = supported.get(label.trim().toLowerCase());
    if (!column) return;
    if (positions.has(column)) throw new Error('import-csv-duplicate-header');
    positions.set(column, position);
  });
  if (!positions.has('url')) throw new Error('import-csv-header');
  const columns = [...positions.keys()];
  const items = rows.map((fields, index): PortableImportItem => {
    if (fields.length !== header.length) throw new Error('import-csv-columns');
    const value = (column: CsvColumn) => {
      const position = positions.get(column);
      return position === undefined ? '' : fields[position]!;
    };
    const url = safeBookmarkUrlSchema.parse(value('url'));
    const title = value('title') || Array.from(url).slice(0, 200).join('');
    z.string()
      .min(1)
      .max(title.startsWith("'") ? 201 : 200)
      .parse(title);
    if (value('profileId')) z.string().max(200).parse(value('profileId'));
    if (value('profile')) z.string().max(81).parse(value('profile'));
    if (value('folderPath')) z.string().max(100_000).parse(value('folderPath'));
    if (value('tags'))
      z.array(z.string().min(1).max(80))
        .max(50)
        .parse(JSON.parse(value('tags')));
    z.string()
      .max(value('note').startsWith("'") ? 10_001 : 10_000)
      .parse(value('note'));
    const csvValues: Partial<Record<CsvColumn, string>> = {};
    for (const column of columns) csvValues[column] = value(column);
    return {
      id: `csv:${index}`,
      parentId: null,
      title,
      kind: 'bookmark',
      index,
      csvValues,
      ...(retainContent
        ? {
            data: {
              url,
              tags: value('tags')
                ? (JSON.parse(value('tags')) as string[])
                : [],
              note: value('note'),
            },
          }
        : {}),
    };
  });
  return { items, columns };
}

/** Returns fully validated flat bookmark previews; all rows fail together on invalid input. */
export function readPortableCsv(source: string): PortableImportItem[] {
  return readPortableCsvPreview(source).items;
}

const entities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  copy: '\u00a9',
  reg: '\u00ae',
};
function decodeEntities(value: string): string {
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (original, entity: string) => {
      if (entity[0] !== '#') return entities[entity.toLowerCase()] ?? original;
      const code =
        entity[1]?.toLowerCase() === 'x'
          ? parseInt(entity.slice(2), 16)
          : Number(entity.slice(1));
      if (
        !Number.isInteger(code) ||
        code <= 0 ||
        code > 0x10ffff ||
        (code >= 0xd800 && code <= 0xdfff)
      )
        throw new Error('import-html-entity');
      return String.fromCodePoint(code);
    },
  );
}

function readAttributes(source: string): Map<string, string> {
  const values = new Map<string, string>();
  const pattern =
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let position = 0;
  for (const match of source.matchAll(pattern)) {
    if (source.slice(position, match.index).trim())
      throw new Error('import-html-attribute');
    const name = match[1]!.toLowerCase();
    if (name.startsWith('on') || values.has(name))
      throw new Error('import-html-attribute');
    values.set(name, decodeEntities(match[2] ?? match[3] ?? match[4] ?? ''));
    position = match.index + match[0].length;
  }
  if (source.slice(position).trim().replace(/\/$/, ''))
    throw new Error('import-html-attribute');
  return values;
}

/**
 * Tokenizes the Netscape bookmark grammar without a DOM, script execution, or resource loading.
 * Active/unsupported markup fails closed. HTML folder names never establish root identity.
 */
export function readBookmarkHtml(
  source: string,
  retainContent = false,
): PortableImportItem[] {
  bound(source);
  if (!/<!DOCTYPE\s+NETSCAPE-Bookmark-file-1\s*>/i.test(source))
    throw new Error('import-html-format');
  const items: PortableImportItem[] = [];
  const parents: (string | null)[] = [];
  let parent: string | null = null;
  let pendingFolder: string | null = null;
  let capture: { tag: 'a' | 'h3'; title: string; href?: string } | null = null;
  let position = 0;
  let rootSeen = false;
  while (position < source.length) {
    const open = source.indexOf('<', position);
    const endText = open === -1 ? source.length : open;
    if (capture) {
      capture.title += decodeEntities(source.slice(position, endText));
      if (capture.title.length > 10_000) throw new Error('import-html-title');
    }
    if (open === -1) break;
    if (source.startsWith('<!--', open)) {
      const end = source.indexOf('-->', open + 4);
      if (end === -1) throw new Error('import-html-comment');
      position = end + 3;
      continue;
    }
    let end = open + 1;
    let quote = '';
    for (; end < source.length; end++) {
      const char = source[end]!;
      if (quote) {
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    if (end === source.length) throw new Error('import-html-tag');
    const token = source.slice(open + 1, end).trim();
    position = end + 1;
    if (/^!DOCTYPE\s+NETSCAPE-Bookmark-file-1$/i.test(token)) continue;
    const match = /^(\/)?([a-z][a-z\d]*)([\s\S]*)$/i.exec(token);
    if (!match) throw new Error('import-html-tag');
    const closing = Boolean(match[1]);
    const tag = match[2]!.toLowerCase();
    const attributes = match[3]!;
    if (
      ![
        'html',
        'head',
        'body',
        'meta',
        'title',
        'h1',
        'dl',
        'dt',
        'dd',
        'p',
        'h3',
        'a',
        'hr',
      ].includes(tag)
    )
      throw new Error('import-html-unsupported-markup');
    if (closing && attributes.trim()) throw new Error('import-html-tag');
    const parsedAttributes = closing
      ? new Map<string, string>()
      : readAttributes(attributes);
    if (capture && !(closing && tag === capture.tag))
      throw new Error('import-html-nested-title');
    if (tag === 'a' || tag === 'h3') {
      if (!closing) {
        if (!parents.length || pendingFolder)
          throw new Error('import-html-structure');
        if (tag === 'a') {
          const href = parsedAttributes.get('href');
          if (href === undefined) throw new Error('import-html-url');
          capture = { tag, title: '', href };
        } else capture = { tag, title: '' };
      } else {
        if (!capture) throw new Error('import-html-structure');
        if (items.length >= maxRecords) throw new Error('import-record-limit');
        if (capture.href !== undefined)
          safeBookmarkUrlSchema.parse(capture.href);
        const item: PortableImportItem = {
          id: `html:${items.length}`,
          parentId: parent,
          title: text.parse(capture.title),
          kind: tag === 'a' ? 'bookmark' : 'folder',
          index: items.length,
          ...(retainContent
            ? {
                data: {
                  ...(capture.href === undefined
                    ? {}
                    : { url: safeBookmarkUrlSchema.parse(capture.href) }),
                  tags: [],
                  note: '',
                },
              }
            : {}),
        };
        items.push(item);
        if (tag === 'h3') pendingFolder = item.id;
        capture = null;
      }
    } else if (tag === 'dl') {
      if (!closing) {
        if (!rootSeen) {
          rootSeen = true;
          parents.push(null);
        } else {
          if (!pendingFolder || !parents.length)
            throw new Error('import-html-structure');
          parents.push(parent);
          parent = pendingFolder;
          pendingFolder = null;
        }
      } else {
        if (!parents.length || pendingFolder)
          throw new Error('import-html-structure');
        parent = parents.pop()!;
      }
    }
  }
  if (!rootSeen || parents.length || capture || pendingFolder)
    throw new Error('import-html-structure');
  return items;
}

/** Removes only explicitly confirmed wrapper folders while reparenting their descendants. */
export function flattenConfirmedWrappers(
  items: readonly PortableImportItem[],
  contentsOnly: ReadonlySet<string>,
): PortableImportItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const id of contentsOnly)
    if (byId.get(id)?.kind !== 'folder')
      throw new Error('import-invalid-wrapper');
  return items
    .filter((item) => !contentsOnly.has(item.id))
    .map((item) => {
      let parentId = item.parentId;
      while (parentId !== null && contentsOnly.has(parentId))
        parentId = byId.get(parentId)!.parentId;
      return { ...item, parentId };
    });
}
