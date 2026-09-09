const VERSION_HEADING = /^## (\d+\.\d+\.\d+) - (\d{4}-\d{2}-\d{2})\s*$/gm;

/** Returns one exact published-version section, including its dated heading. */
export function getPublishedVersionSection(
  markdown: string,
  version: string,
): string | null {
  const matches = [...markdown.matchAll(VERSION_HEADING)].filter(
    (match) => match[1] === version,
  );
  if (matches.length !== 1 || matches[0]?.index === undefined) return null;
  const start = matches[0].index;
  const nextSection = markdown.indexOf('\n## ', start + matches[0][0].length);
  return markdown
    .slice(start, nextSection < 0 ? undefined : nextSection)
    .trim();
}
