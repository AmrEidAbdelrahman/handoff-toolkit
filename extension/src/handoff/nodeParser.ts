// Parse a node markdown file (frontmatter + body) into a ParsedNode. Pure (no vscode).

import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import { CodeRef, ParsedNode, Section, SectionKind, ValidationIssue } from './types';
import { validateBody, validateFrontmatter } from './validation';

const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

const HEADING_TO_KIND: Record<string, SectionKind> = {
  'business context': 'business',
  'technical context': 'technical',
  decisions: 'decisions',
  decision: 'decisions',
  warnings: 'warnings',
  warning: 'warnings',
};

interface RawSection {
  heading: string;
  body: string;
}

/** Split body markdown into H2-delimited sections; flag any H1. */
function splitSections(body: string): { sections: RawSection[]; sawH1: boolean } {
  const lines = body.split(/\r?\n/);
  const sections: RawSection[] = [];
  let current: RawSection | null = null;
  let sawH1 = false;
  let inFence = false;
  let fenceMarker = '';

  for (const line of lines) {
    const fenceMatch = line.match(/^(```|~~~)/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1];
      } else if (line.trimEnd().startsWith(fenceMarker)) {
        inFence = false;
      }
    }

    if (!inFence) {
      if (/^#\s+/.test(line)) {
        sawH1 = true;
      }
      const h2 = line.match(/^##\s+(.*\S)\s*$/);
      if (h2) {
        current = { heading: h2[1].trim(), body: '' };
        sections.push(current);
        continue;
      }
    }

    if (current) {
      current.body += line + '\n';
    }
  }

  return { sections, sawH1 };
}

function parseCodeRefs(raw: unknown): CodeRef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const ref = r as Record<string, unknown>;
      const codeRef: CodeRef = {
        file: typeof ref.file === 'string' ? ref.file : '',
        note: typeof ref.note === 'string' ? ref.note : '',
      };
      if (Number.isInteger(ref.line)) codeRef.line = ref.line as number;
      if (Number.isInteger(ref.end_line)) codeRef.endLine = ref.end_line as number;
      return codeRef;
    })
    .filter((r) => r.file !== '');
}

export function parseNode(rawText: string, filenameStem: string): ParsedNode {
  let fm: Record<string, unknown> = {};
  let body = '';
  const issues: ValidationIssue[] = [];

  try {
    const parsed = matter(rawText);
    fm = parsed.data as Record<string, unknown>;
    body = parsed.content;
  } catch (e) {
    issues.push({
      severity: 'error',
      code: 'NODE_FRONTMATTER_PARSE',
      message: `Failed to parse frontmatter: ${(e as Error).message}`,
      nodeId: filenameStem,
    });
  }

  issues.push(...validateFrontmatter(fm, filenameStem));

  const { sections: rawSections, sawH1 } = splitSections(body);
  if (sawH1) {
    issues.push({
      severity: 'warning',
      code: 'BODY_HAS_H1',
      message: 'Body contains an H1 heading; H1 is reserved for the title.',
      nodeId: filenameStem,
    });
  }

  const sections: Section[] = [];
  for (const raw of rawSections) {
    const trimmed = raw.body.trim();
    if (trimmed === '') continue;
    // Keep every H2 section in document order. Known headings get a semantic kind
    // (for coloring); anything else (Diagrams, Context, Decision, Purpose, Steps,
    // Reading Order, …) renders as 'other' with its literal heading.
    const kind: SectionKind = HEADING_TO_KIND[raw.heading.toLowerCase()] ?? 'other';
    sections.push({ kind, headingText: raw.heading, html: md.render(trimmed) });
  }

  const id = typeof fm.id === 'string' ? fm.id : filenameStem;
  const node: ParsedNode = {
    id,
    title: typeof fm.title === 'string' ? fm.title : id,
    depth: (fm.depth as ParsedNode['depth']) ?? 'supporting',
    schemaVersion: typeof fm.schema_version === 'number' ? fm.schema_version : 0,
    codeRefs: parseCodeRefs(fm.code_refs),
    dependencies: Array.isArray(fm.dependencies) ? (fm.dependencies as string[]) : [],
    tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
    parent: typeof fm.parent === 'string' && fm.parent.trim() !== '' ? fm.parent : undefined,
    generatedAt: typeof fm.generated_at === 'string' ? fm.generated_at : undefined,
    sections,
    issues,
  };

  node.issues.push(...validateBody(sections, id));
  return node;
}
