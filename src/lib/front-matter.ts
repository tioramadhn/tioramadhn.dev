export interface ParsedMarkdown {
  meta: Record<string, string>;
  body: string;
}

/**
 * Minimal YAML-ish front matter reader for importing existing `.md`/`.mdx`
 * files into the editor. Handles `key: value` and `tags: [a, b]` / `- a` lists,
 * which covers everything this blog writes out.
 */
export function parseFrontMatter(raw: string): ParsedMarkdown {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  if (!match) {
    return { meta: {}, body: raw.trim() };
  }

  const [, frontMatter = '', body = ''] = match;
  const meta: Record<string, string> = {};
  const listItems: string[] = [];
  let listKey: string | null = null;

  for (const line of frontMatter.split(/\r?\n/)) {
    const listItem = line.match(/^\s*-\s+(.*)$/);

    if (listItem && listKey) {
      listItems.push(unquote(listItem[1] ?? ''));
      continue;
    }

    const pair = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!pair) continue;

    const [, key = '', value = ''] = pair;

    if (listKey && listItems.length > 0) {
      meta[listKey] = listItems.join(', ');
      listItems.length = 0;
    }

    if (value.trim() === '') {
      listKey = key;
      continue;
    }

    listKey = null;

    const inline = value.trim().match(/^\[(.*)\]$/);
    meta[key] = inline
      ? (inline[1] ?? '')
          .split(',')
          .map((item) => unquote(item.trim()))
          .filter(Boolean)
          .join(', ')
      : unquote(value.trim());
  }

  if (listKey && listItems.length > 0) {
    meta[listKey] = listItems.join(', ');
  }

  return { meta, body: body.trim() };
}

function unquote(value: string): string {
  return value.replace(/^["']|["']$/g, '');
}
