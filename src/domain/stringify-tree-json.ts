import { BoundedText } from './bounded-text';

/** Serializes plain JSON trees iteratively within the file budget, without quadratic indentation. */
export function stringifyTreeJson(value: unknown, limit?: number): string {
  type Frame = { value: unknown } | { token: string; exit?: object };
  const stack: Frame[] = [{ value }];
  const chunks = new BoundedText('', limit);
  const active = new Set<object>();
  while (stack.length) {
    const frame = stack.pop()!;
    if ('token' in frame) {
      chunks.push(frame.token);
      if (frame.exit) active.delete(frame.exit);
      continue;
    }
    const item = frame.value;
    if (item === null || typeof item !== 'object') {
      chunks.push(JSON.stringify(item) ?? 'null');
      continue;
    }
    if (active.has(item)) throw new Error('export-invalid-tree');
    // Flat bookmark records and primitive arrays can use the native fast path;
    // only containers with nested objects need explicit traversal frames.
    const primitive = (child: unknown) =>
      child === null || typeof child !== 'object';
    if (
      !Array.isArray(item) &&
      Object.values(item).every(
        (child) =>
          primitive(child) ||
          (Array.isArray(child) &&
            child.length <= 256 &&
            child.every(primitive)),
      )
    ) {
      chunks.push(JSON.stringify(item));
      continue;
    }
    active.add(item);
    const array = Array.isArray(item);
    const entries = array
      ? Array.from(item, (child) => [undefined, child] as const)
      : Object.entries(item).filter(([, child]) => child !== undefined);
    chunks.push(array ? '[' : '{');
    stack.push({ token: array ? ']' : '}', exit: item });
    for (let index = entries.length - 1; index >= 0; index--) {
      const [key, child] = entries[index]!;
      stack.push({ value: child });
      if (!array) stack.push({ token: JSON.stringify(key) + ':' });
      if (index > 0) stack.push({ token: ',' });
    }
  }
  return chunks.join();
}
