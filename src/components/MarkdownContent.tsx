import { Fragment, type ReactNode } from 'react';

interface MarkdownBlock {
  content: string;
  level?: number;
  type: 'heading' | 'list' | 'paragraph';
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ content: paragraph.join(' '), type: 'paragraph' });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ content: JSON.stringify(list), type: 'list' });
      list = [];
    }
  };

  const normalizedMarkdown = markdown
    .replace(/^(.+)\r?\n=+\s*$/gm, '# $1')
    .replace(/^(.+)\r?\n-+\s*$/gm, '## $1');

  for (const rawLine of normalizedMarkdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    const listItem = /^-\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        content: heading[2] ?? '',
        level: heading[1]?.length ?? 2,
        type: 'heading',
      });
    } else if (listItem) {
      flushParagraph();
      list.push(listItem[1] ?? '');
    } else if (!line) {
      flushParagraph();
      flushList();
    } else if (list.length) {
      const lastIndex = list.length - 1;
      list[lastIndex] = `${list[lastIndex] ?? ''} ${line}`;
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(
  value: string,
  onOpenLink?: (url: string) => void,
): ReactNode[] {
  return value
    .split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/[^)]+\))/g)
    .map((part, index) => {
      const link = /^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/.exec(part);
      if (link) {
        const label = link[1] ?? link[2] ?? '';
        const url = link[2] ?? '';
        return (
          <a
            href={url}
            key={index}
            onClick={
              onOpenLink
                ? (event) => {
                    event.preventDefault();
                    onOpenLink(url);
                  }
                : undefined
            }
            rel="noreferrer"
            target="_blank"
          >
            {label}
          </a>
        );
      }
      if (part.startsWith('`') && part.endsWith('`'))
        return <code key={index}>{part.slice(1, -1)}</code>;
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      return <Fragment key={index}>{part}</Fragment>;
    });
}

/** Safely renders the trusted Markdown subset used by bundled documents. */
export function MarkdownContent({
  markdown,
  onOpenLink,
}: {
  markdown: string;
  onOpenLink?: (url: string) => void;
}) {
  return parseMarkdown(markdown).map((block, index) => {
    if (block.type === 'heading') {
      const Heading = block.level === 1 ? 'h2' : 'h3';
      return <Heading key={index}>{block.content}</Heading>;
    }
    if (block.type === 'list') {
      const items = JSON.parse(block.content) as string[];
      return (
        <ul key={index}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, onOpenLink)}</li>
          ))}
        </ul>
      );
    }
    return <p key={index}>{renderInline(block.content, onOpenLink)}</p>;
  });
}
