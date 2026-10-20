import { expect, it } from 'vitest';
import { validateParentForest } from './parent-forest';
import { stringifyTreeJson } from './stringify-tree-json';
import { BoundedText, utf8TextBytes } from './bounded-text';

it('validates deep reverse-ordered forests and rejects missing parents, cycles and duplicate IDs', () => {
  const rows = Array.from({ length: 20_000 }, (_, index) => ({
    id: String(index),
    parentId: index ? String(index - 1) : null,
  }));
  validateParentForest([...rows].reverse(), 'invalid');
  for (const broken of [
    [{ id: 'a', parentId: 'missing' }],
    [{ id: 'a', parentId: 'a' }],
    [
      { id: 'a', parentId: 'b' },
      { id: 'b', parentId: 'a' },
    ],
    [
      { id: 'a', parentId: null },
      { id: 'a', parentId: null },
    ],
  ])
    expect(() => validateParentForest(broken, 'invalid')).toThrow('invalid');
});
it('serializes a deep JSON tree without recursion and preserves escaping and primitives', () => {
  const root: { content: unknown[] } = { content: [] };
  let cursor = root;
  for (let i = 0; i < 20_000; i++) {
    const next = { content: [] };
    cursor.content.push(next);
    cursor = next;
  }
  cursor.content.push('"<script>\n', null, true, 12);
  let parsed = JSON.parse(stringifyTreeJson(root));
  for (let i = 0; i < 20_000; i++) parsed = parsed.content[0];
  expect(parsed.content).toEqual(['"<script>\n', null, true, 12]);
  expect(stringifyTreeJson({ a: undefined, b: [undefined], c: false })).toBe(
    '{"b":[null],"c":false}',
  );
  root.content.push(root);
  expect(() => stringifyTreeJson(root)).toThrow('export-invalid-tree');
});

it('enforces UTF-8 output budgets before retaining expanded text', () => {
  for (const value of ['ASCII', 'é', '🔒', '\ud800', 'é🔒\ud800'])
    expect(utf8TextBytes(value)).toBe(
      new TextEncoder().encode(value).byteLength,
    );
  const text = new BoundedText('\n', 5);
  text.push('é', 'a');
  expect(() => text.push('b')).toThrow('export-too-large');
  expect(text.join()).toBe('é\na');
  expect(stringifyTreeJson([], 2)).toBe('[]');
  expect(() => stringifyTreeJson({ a: 'long' }, 8)).toThrow('export-too-large');
  expect(() => stringifyTreeJson(['"\n'], 3)).toThrow('export-too-large');
});
