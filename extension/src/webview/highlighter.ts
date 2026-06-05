// Shiki-based syntax highlighting, run in the extension host. Singleton highlighter,
// per-file HTML cache, and windowing for large files so tab switches stay snappy.

import * as vscode from 'vscode';

// Minimal structural type for the bits of the Shiki highlighter we use. Shiki is
// ESM-only and loaded dynamically; we avoid importing its types under Node16.
interface Highlighter {
  codeToHtml(code: string, options: unknown): string;
  loadLanguage(lang: string): Promise<void>;
}

interface HastNode {
  properties?: Record<string, string>;
}

const LIGHT_THEME = 'github-light';
const DARK_THEME = 'github-dark';
const WINDOW_RADIUS = 250; // lines around the range to highlight when a file is huge
const WINDOW_THRESHOLD = 1500; // files longer than this get windowed

let highlighterPromise: Promise<Highlighter> | undefined;
const loadedLangs = new Set<string>();

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(
      (shiki) =>
        shiki.createHighlighter({
          themes: [LIGHT_THEME, DARK_THEME],
          langs: ['text'],
        }) as unknown as Promise<Highlighter>,
    );
  }
  return highlighterPromise;
}

/** Kick off highlighter init early (called on activate) so the first code load is fast. */
export function warmUp(): void {
  void getHighlighter();
}

function themeForKind(): string {
  const kind = vscode.window.activeColorTheme.kind;
  const dark = kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast;
  return dark ? DARK_THEME : LIGHT_THEME;
}

async function ensureLang(hl: Highlighter, lang: string): Promise<string> {
  if (lang === 'text' || loadedLangs.has(lang)) return lang;
  try {
    await hl.loadLanguage(lang as never);
    loadedLangs.add(lang);
    return lang;
  } catch {
    return 'text';
  }
}

export interface HighlightOptions {
  text: string;
  lang: string;
  highlightStart?: number;
  highlightEnd?: number;
}

export interface HighlightResult {
  html: string;
  /** 1-indexed line number of the first rendered line (for the gutter). */
  startLine: number;
}

interface CacheEntry {
  theme: string;
  byKey: Map<string, HighlightResult>;
}
const cache = new Map<string, CacheEntry>();

function cacheKey(start?: number, end?: number): string {
  return `${start ?? '-'}:${end ?? '-'}`;
}

export async function highlight(file: string, opts: HighlightOptions): Promise<HighlightResult> {
  const theme = themeForKind();
  let entry = cache.get(file);
  if (!entry || entry.theme !== theme) {
    entry = { theme, byKey: new Map() };
    cache.set(file, entry);
  }
  const key = cacheKey(opts.highlightStart, opts.highlightEnd);
  const cached = entry.byKey.get(key);
  if (cached) return cached;

  const hl = await getHighlighter();
  const lang = await ensureLang(hl, opts.lang);

  const allLines = opts.text.split(/\r?\n/);
  let startLine = 1;
  let lines = allLines;

  // Window large files around the referenced range.
  if (allLines.length > WINDOW_THRESHOLD && opts.highlightStart) {
    const from = Math.max(1, opts.highlightStart - WINDOW_RADIUS);
    const to = Math.min(allLines.length, (opts.highlightEnd ?? opts.highlightStart) + WINDOW_RADIUS);
    startLine = from;
    lines = allLines.slice(from - 1, to);
  }

  const code = lines.join('\n');
  const hlStart = opts.highlightStart;
  const hlEnd = opts.highlightEnd ?? opts.highlightStart;

  const options = {
    lang,
    theme,
    transformers: [
      {
        line(this: { addClassToHast(n: HastNode, cls: string): void }, node: HastNode, lineNumber: number) {
          const actual = startLine + lineNumber - 1;
          node.properties = node.properties || {};
          node.properties['data-line'] = String(actual);
          if (hlStart && actual >= hlStart && actual <= (hlEnd as number)) {
            this.addClassToHast(node, 'hl-line');
          }
        },
      },
    ],
  };
  const html = hl.codeToHtml(code, options);

  const result: HighlightResult = { html, startLine };
  entry.byKey.set(key, result);
  return result;
}

export function clearHighlightCache(file?: string): void {
  if (file) cache.delete(file);
  else cache.clear();
}
