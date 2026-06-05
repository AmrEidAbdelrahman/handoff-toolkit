// Schema validation rules (Node Schema Specification §7).
// Pure: returns ValidationIssue[] and never throws on bad content.

import {
  CodeRef,
  Depth,
  IndexEntry,
  ParsedNode,
  Section,
  SUPPORTED_SCHEMA_VERSION,
  ValidationIssue,
} from './types';

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DEPTHS: Depth[] = ['core', 'supporting', 'peripheral'];

function issue(
  severity: ValidationIssue['severity'],
  code: string,
  message: string,
  nodeId?: string,
): ValidationIssue {
  return { severity, code, message, nodeId };
}

// ── Index validation (§7 Index Rules) ────────────────────────────────────────

export function validateIndex(
  raw: unknown,
): { issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  if (typeof raw !== 'object' || raw === null) {
    issues.push(issue('error', 'INDEX_MALFORMED', 'index.json is not a JSON object.'));
    return { issues };
  }
  const obj = raw as Record<string, unknown>;

  if (obj.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    issues.push(
      issue(
        'warning',
        'SCHEMA_VERSION_MISMATCH',
        `index schema_version is ${String(obj.schema_version)}; expected ${SUPPORTED_SCHEMA_VERSION}. Rendering anyway.`,
      ),
    );
  }
  if (typeof obj.project_name !== 'string' || obj.project_name.trim() === '') {
    issues.push(issue('error', 'INDEX_NO_PROJECT_NAME', 'index.json is missing a non-empty project_name.'));
  }
  if (!Array.isArray(obj.nodes)) {
    issues.push(issue('error', 'INDEX_NO_NODES', 'index.json has no nodes array.'));
    return { issues };
  }

  const seen = new Set<string>();
  obj.nodes.forEach((n, i) => {
    const entry = n as Record<string, unknown>;
    const where = `nodes[${i}]`;
    if (typeof entry.id !== 'string' || !ID_PATTERN.test(entry.id)) {
      issues.push(issue('error', 'INDEX_BAD_ID', `${where} has an invalid or missing id.`));
    } else {
      if (seen.has(entry.id)) {
        issues.push(issue('error', 'INDEX_DUP_ID', `Duplicate node id "${entry.id}" in index.`));
      }
      seen.add(entry.id);
    }
    if (typeof entry.title !== 'string' || entry.title.trim() === '') {
      issues.push(issue('error', 'INDEX_NO_TITLE', `${where} has no title.`));
    }
    if (typeof entry.depth !== 'string' || !DEPTHS.includes(entry.depth as Depth)) {
      issues.push(issue('error', 'INDEX_BAD_DEPTH', `${where} has an invalid depth.`));
    }
    if (typeof entry.file !== 'string' || entry.file.trim() === '') {
      issues.push(issue('error', 'INDEX_NO_FILE', `${where} has no file path.`));
    }
  });

  return { issues };
}

// ── Node validation (§7 Frontmatter + Body Rules) ────────────────────────────

export function validateFrontmatter(
  fm: Record<string, unknown>,
  filenameStem: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const id = typeof fm.id === 'string' ? fm.id : '';

  if (!id || !ID_PATTERN.test(id)) {
    issues.push(issue('error', 'NODE_BAD_ID', `Node id "${id}" is missing or malformed.`, id || filenameStem));
  } else if (id !== filenameStem) {
    issues.push(
      issue('error', 'NODE_ID_FILENAME_MISMATCH', `Node id "${id}" does not match filename "${filenameStem}".`, id),
    );
  }
  if (typeof fm.title !== 'string' || fm.title.trim() === '') {
    issues.push(issue('error', 'NODE_NO_TITLE', 'Node is missing a non-empty title.', id));
  }
  if (typeof fm.depth !== 'string' || !DEPTHS.includes(fm.depth as Depth)) {
    issues.push(issue('error', 'NODE_BAD_DEPTH', `Node depth "${String(fm.depth)}" is invalid.`, id));
  }
  if (fm.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    issues.push(
      issue(
        'warning',
        'SCHEMA_VERSION_MISMATCH',
        `Node schema_version is ${String(fm.schema_version)}; expected ${SUPPORTED_SCHEMA_VERSION}. Rendering anyway.`,
        id,
      ),
    );
  }

  // code_refs is OPTIONAL (the toolkit no longer always emits it). Validate shape
  // only when present; absence is not an error.
  const refs = fm.code_refs;
  if (Array.isArray(refs)) {
    refs.forEach((r, i) => {
      const ref = r as Record<string, unknown>;
      if (typeof ref.file !== 'string' || ref.file.trim() === '') {
        issues.push(issue('error', 'CODEREF_NO_FILE', `code_refs[${i}] has no file.`, id));
      }
      if (typeof ref.note !== 'string' || ref.note.trim() === '') {
        issues.push(issue('error', 'CODEREF_NO_NOTE', `code_refs[${i}] has no note.`, id));
      }
      if (ref.line !== undefined && (!Number.isInteger(ref.line) || (ref.line as number) < 1)) {
        issues.push(issue('error', 'CODEREF_BAD_LINE', `code_refs[${i}].line must be a positive integer.`, id));
      }
      if (ref.end_line !== undefined) {
        if (ref.line === undefined) {
          issues.push(issue('error', 'CODEREF_END_WITHOUT_LINE', `code_refs[${i}].end_line requires line.`, id));
        } else if (Number.isInteger(ref.end_line) && (ref.end_line as number) < (ref.line as number)) {
          issues.push(issue('error', 'CODEREF_END_BEFORE_LINE', `code_refs[${i}].end_line is before line.`, id));
        }
      }
    });
  }

  return issues;
}

export function validateBody(sections: Section[], nodeId: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // The toolkit emits several node templates (regular, ADR, runbook, onboarding),
  // each with its own headings, so no specific section is required. We only flag a
  // node that has no renderable section content at all.
  if (sections.length === 0) {
    issues.push(issue('warning', 'EMPTY_BODY', 'Node has no readable section content.', nodeId));
  }

  return issues;
}

export function validateDependencies(
  node: ParsedNode,
  knownIds: ReadonlySet<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const dep of node.dependencies) {
    if (!knownIds.has(dep)) {
      issues.push(issue('warning', 'DEP_NOT_FOUND', `Dependency "${dep}" is not in the index.`, node.id));
    }
  }
  if (node.parent && !knownIds.has(node.parent)) {
    issues.push(
      issue('warning', 'PARENT_NOT_FOUND', `parent "${node.parent}" is not in the index; treating as un-parented.`, node.id),
    );
  }
  return issues;
}

export function crossCheckIndex(
  entries: IndexEntry[],
  nodeFilesPresent: ReadonlySet<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const entry of entries) {
    if (!nodeFilesPresent.has(entry.id)) {
      issues.push(issue('error', 'INDEX_FILE_MISSING', `Index entry "${entry.id}" has no node file.`, entry.id));
    }
  }
  const indexed = new Set(entries.map((e) => e.id));
  for (const present of nodeFilesPresent) {
    if (!indexed.has(present)) {
      issues.push(issue('warning', 'NODE_NOT_INDEXED', `Node file "${present}" has no index entry.`, present));
    }
  }
  return issues;
}

export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}

export { CodeRef };
