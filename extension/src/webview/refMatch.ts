// Pure helpers shared by the webview UI (bundled into main.js by esbuild) and the
// unit tests. Kept DOM-free so mocha/tsx can exercise the tricky parsing/matching
// logic directly — the webview DOM glue around it is not unit-testable.

export interface SnippetLabel {
  file: string;
  startLine: number;
  endLine: number;
}

export interface RefLike {
  index: number;
  file: string;
  line?: number;
  endLine?: number;
}

const BASENAME = (p: string): string => p.split('/').pop() || p;

// A snippet's bold label renders to the same textContent in both supported forms:
//   plain     **`path` lines N–M**            -> "path lines N–M"
//   permalink **[`path` lines N–M](url)**     -> "path lines N–M"
// so we parse the flattened text. Dash may be hyphen, en-dash, or em-dash. A
// single-line snippet ("lines N" / "line N") collapses to endLine === startLine.
const LABEL_RE = /^(\S.*?)\s+lines?\s+(\d+)(?:\s*[-–—]\s*(\d+))?\s*$/i;

/** Parse a flattened snippet-label string; null when it is not a snippet label. */
export function parseSnippetLabel(text: string): SnippetLabel | null {
  const m = LABEL_RE.exec((text || '').trim());
  if (!m) return null;
  const file = m[1].trim();
  if (!file || file.includes(' ')) return null; // paths don't contain spaces
  const startLine = Number(m[2]);
  if (!Number.isInteger(startLine) || startLine < 1) return null;
  const endLine = m[3] ? Number(m[3]) : startLine;
  if (!Number.isInteger(endLine) || endLine < startLine) return null;
  return { file, startLine, endLine };
}

/**
 * Match a parsed label to a code ref by file AND start line. Matching on file
 * alone is the long-standing bug: multiple snippets from one file all collapse
 * onto the first ref. The line is what disambiguates them.
 */
export function matchRefByFileAndLine<T extends RefLike>(
  refs: T[],
  file: string,
  startLine: number,
): T | undefined {
  const base = BASENAME(file);
  return refs.find(
    (r) =>
      r.line === startLine &&
      (r.file === file || BASENAME(r.file) === file || BASENAME(r.file) === base),
  );
}

// Conservative: dotted identifier shapes only (Foo, Foo.bar, snake_case, $x).
// Anything with a slash, space, or that starts with a digit is rejected so we
// never treat a file path or prose fragment as a symbol to look up.
const IDENT_RE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;

/** True when `text` is shaped like a code identifier worth a symbol lookup. */
export function isIdentifier(text: string): boolean {
  const t = (text || '').trim();
  if (t.length < 2 || t.length > 80) return false;
  if (t.includes('/')) return false;
  return IDENT_RE.test(t);
}
