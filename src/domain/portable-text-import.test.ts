import { describe, expect, it } from 'vitest';
import {
  flattenConfirmedWrappers,
  readBookmarkHtml,
  readPortableCsv,
  readPortableCsvPreview,
} from './portable-text-import';

const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8"><TITLE>Bookmarks</TITLE><H1>Bookmarks</H1>
<DL><p><DT><H3>Profile wrapper</H3><DL><p><DT><H3>Home</H3><DL><p><DT><H3>Home</H3><DL><p>
<DT><A HREF="https://example.com/?online=1&amp;x=2" ICON="data:image/png;base64,YQ==">A &amp; B</A></DL><p>
<DT><H3>Empty</H3><DL><p></DL><p></DL><p></DL><p></DL><p>`;
const csvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;
const csv = (title = "'=SUM(1,2)", note = 'Line 1\r\nLine "2"') =>
  '\uFEFF' +
  [
    ['Profile ID', 'Profile', 'Folder path', 'Title', 'URL', 'Tags', 'Note'],
    [
      '11111111-1111-4111-8111-111111111111',
      'Synthetic',
      '["Home","Child"]',
      title,
      'https://example.com/',
      '["tag"]',
      note,
    ],
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');

describe('portable text imports', () => {
  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///private',
    'chrome://settings/',
    'about:config',
    'https://user:password@example.com/',
    'java\tscript:alert(1)',
  ])('rejects unsafe URLs in both CSV and HTML: %#', (url) => {
    expect(() => readPortableCsv('URL\r\n' + csvCell(url))).toThrow();
    const escaped = url
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
    expect(() =>
      readBookmarkHtml(
        `<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><DT><A HREF="${escaped}">Plain title</A></DL>`,
      ),
    ).toThrow();
  });
  it('reads supported headers in file order with optional columns, ignored columns, and title fallbacks', () => {
    const result = readPortableCsvPreview(
      ' Note ,URL,Ignored\r\n"<script>inert</script>",https://example.com/,secret',
    );
    expect(result.columns).toEqual(['note', 'url']);
    expect(result.items[0]).toEqual({
      id: 'csv:0',
      parentId: null,
      index: 0,
      kind: 'bookmark',
      title: 'https://example.com/',
      csvValues: {
        note: '<script>inert</script>',
        url: 'https://example.com/',
      },
    });
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(
      readPortableCsvPreview('url\r\nhttps://example.com/').columns,
    ).toEqual(['url']);
    expect(
      readPortableCsvPreview(
        'URL,Title,Tags,Profile ID,Profile,Folder path\r\nhttps://example.com/,,,external-id,Personal,Home/Work',
      ).items[0]!.csvValues,
    ).toEqual({
      url: 'https://example.com/',
      title: '',
      tags: '',
      profileId: 'external-id',
      profile: 'Personal',
      folderPath: 'Home/Work',
    });
    for (const invalid of [
      'Title\r\nmissing URL',
      'URL, url\r\nhttps://example.com/,https://example.org/',
      'url\r\njavascript:alert(1)',
      'url,note\r\nhttps://example.com/',
      'url,tags\r\nhttps://example.com/,not-json',
    ])
      expect(() => readPortableCsvPreview(invalid)).toThrow();
  });
  it('accepts browser export dates, toolbar markers, icons, comments, and empty folders as inert metadata', () => {
    const items = readBookmarkHtml(`<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE><H1>Bookmarks</H1><DL><p>
    <DT><H3 ADD_DATE="1789029930" LAST_MODIFIED="1790526005" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
        <DT><H3 ADD_DATE="1789129192" LAST_MODIFIED="1789129192">Empty</H3>
        <DL><p></DL><p>
        <DT><A HREF="https://example.com/?a=1&amp;b=2" ADD_DATE="1790526005" ICON="data:image/png;base64,YQ==">Example &amp; bookmark</A>
    </DL><p>
</DL><p>`);
    expect(items.map((item) => item.title)).toEqual([
      'Bookmarks bar',
      'Empty',
      'Example & bookmark',
    ]);
    expect(items[0]!.parentId).toBeNull();
    expect(items[1]!.parentId).toBe(items[0]!.id);
    expect(items[2]!.parentId).toBe(items[0]!.id);
    expect(JSON.stringify(items)).not.toContain('data:image');
  });
  it('preserves every HTML wrapper, including multiple Home folders, until explicitly confirmed', () => {
    const items = readBookmarkHtml(html);
    expect(items.map((item) => item.title)).toEqual([
      'Profile wrapper',
      'Home',
      'Home',
      'A & B',
      'Empty',
    ]);
    const before = JSON.stringify(items);
    const mapped = flattenConfirmedWrappers(
      items,
      new Set([items[0]!.id, items[1]!.id]),
    );
    expect(mapped.map((item) => item.title)).toEqual([
      'Home',
      'A & B',
      'Empty',
    ]);
    expect(mapped[0]!.parentId).toBeNull();
    expect(mapped[1]!.parentId).toBe(mapped[0]!.id);
    expect(JSON.stringify(items)).toBe(before);
    expect(JSON.stringify(items)).not.toContain('https://');
  });
  it.each([
    html.replace('</DL><p>', '<script>alert(1)</script></DL><p>'),
    html.replace(
      'https://example.com/?online=1&amp;x=2',
      '&#x6a;avascript:alert(1)',
    ),
    html.replace('<A HREF=', '<A onclick="alert(1)" HREF='),
    html.replace('<A HREF=', '<A HREF="https://example.org" HREF='),
    html.replace('<META ', '<IMG SRC="https://example.org/tracker"><META '),
    html.slice(0, html.lastIndexOf('</DL>')),
    '<html><a href="https://example.com">Wrong format</a></html>',
  ])(
    'rejects active, unsafe, truncated, or unsupported markup in full',
    (source) => {
      expect(() => readBookmarkHtml(source)).toThrow();
    },
  );
  it('accepts comments, case differences, empty folders and numeric entities without fetching resources', () => {
    const items = readBookmarkHtml(
      '<!-- local export -->' +
        html.replace('A &amp; B', '&#65; &#x26; B').replaceAll('<DL>', '<dl>'),
    );
    expect(items.find((item) => item.kind === 'bookmark')?.title).toBe('A & B');
    expect(items.some((item) => item.title === 'Empty')).toBe(true);
  });
  it('imports CSV as flat bookmarks and preserves spreadsheet protection, commas, quotes and newlines', () => {
    const items = readPortableCsv(csv());
    expect(items).toEqual([
      expect.objectContaining({
        id: 'csv:0',
        parentId: null,
        title: "'=SUM(1,2)",
        kind: 'bookmark',
        index: 0,
      }),
    ]);
    expect(readPortableCsv(csv('ordinary')).map((item) => item.kind)).toEqual([
      'bookmark',
    ]);
  });
  it.each([
    csv().replace('"URL"', '"Other column"'),
    csv().replace('https://example.com/', 'javascript:alert(1)'),
    csv().slice(0, -1),
    csv().replace('"[""tag""]"', '"not JSON"'),
    csv() + ',"extra"',
    csv('x'.repeat(202)),
  ])('rejects malformed or unsupported CSV before preview', (source) => {
    expect(() => readPortableCsv(source)).toThrow();
  });
  it('does not allow confirmation to remove bookmark records as wrappers', () => {
    const items = readBookmarkHtml(html);
    const bookmark = items.find((item) => item.kind === 'bookmark')!;
    expect(() =>
      flattenConfirmedWrappers(items, new Set([bookmark.id])),
    ).toThrow('import-invalid-wrapper');
  });
});
