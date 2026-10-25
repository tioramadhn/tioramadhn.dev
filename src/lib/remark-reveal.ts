/**
 * Minimal shape of the mdast nodes this plugin touches. Declared locally
 * because the unist types are not a dependency of this project.
 */
interface Node {
  type: string;
  data?: ElementData;
  children?: Node[];
  value?: string;
}

interface ElementData {
  hName?: string;
  hProperties?: Record<string, unknown>;
}

/**
 * Labels for the reveal markers, keyed by the word used in the markdown.
 * The summary doubles as the button, so it has to read like one.
 */
const LABELS: Record<string, string> = {
  jawaban: 'Lihat jawaban',
  pembahasan: 'Lihat pembahasan',
  petunjuk: 'Lihat petunjuk',
  hasil: 'Lihat hasil yang diharapkan',
};

const MARKER = /^\[!(jawaban|pembahasan|petunjuk|hasil)\][ \t]*([^\n]*)\n?/;

/**
 * Turns a marked blockquote into a collapsed `<details>`:
 *
 * ```markdown
 * > [!jawaban]
 * > Wikipedia dan Tokopedia adalah Web 2 terpusat…
 * ```
 *
 * An exercise whose answer sits in plain sight below it is not an exercise, so
 * the answer has to be something the reader opens on purpose. `<details>` does
 * that with no client JavaScript, which keeps the post a server component.
 *
 * A custom summary can follow the marker: `> [!petunjuk] Masih buntu?`
 */
export function remarkReveal() {
  return (tree: Node) => {
    walk(tree);
  };
}

function walk(node: Node) {
  for (const child of node.children ?? []) {
    if (child.type === 'blockquote') transform(child);
    walk(child);
  }
}

function transform(quote: Node) {
  const [first] = quote.children ?? [];
  if (first?.type !== 'paragraph') return;

  const lead = first.children?.[0];
  if (lead?.type !== 'text' || typeof lead.value !== 'string') return;

  const match = MARKER.exec(lead.value);
  if (!match) return;

  const [, kind = '', custom = ''] = match;
  const summary = custom.trim() || LABELS[kind] || 'Lihat selengkapnya';

  // Drop the marker from the body, and the paragraph with it if that is all
  // it held (the common `> [!jawaban]` on a line of its own).
  lead.value = lead.value.slice(match[0].length);
  if (!lead.value.trim() && first.children?.length === 1) {
    quote.children?.shift();
  }

  quote.children?.unshift({
    type: 'paragraph',
    data: { hName: 'summary' },
    children: [{ type: 'text', value: summary }],
  });

  quote.data = {
    hName: 'details',
    hProperties: { className: 'reveal', 'data-reveal': kind },
  };
}
