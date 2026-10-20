/** Validates a flat forest in linear time without recursion or an arbitrary depth cap. */
export function validateParentForest(
  rows: readonly { id: string; parentId: string | null }[],
  error: string,
): void {
  const byId = new Map(rows.map((row) => [row.id, row]));
  if (byId.size !== rows.length) throw new Error(error);
  const done = new Set<string>();
  for (const row of rows) {
    const path = new Set<string>();
    let cursor: string | null = row.id;
    while (cursor !== null && !done.has(cursor)) {
      const current = byId.get(cursor);
      if (!current || path.has(cursor)) throw new Error(error);
      path.add(cursor);
      cursor = current.parentId;
    }
    for (const id of path) done.add(id);
  }
}
