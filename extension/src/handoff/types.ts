// Pure domain types for the Handoff schema contract.
// This module MUST NOT import `vscode` — it is unit-testable in plain Node.

export type Depth = 'core' | 'supporting' | 'peripheral';

// Known semantic kinds get dedicated colors; any other heading renders as 'other'.
export type SectionKind = 'business' | 'technical' | 'decisions' | 'warnings' | 'other';

export const SUPPORTED_SCHEMA_VERSION = 1;

export interface CodeRef {
  file: string;
  line?: number;
  endLine?: number;
  note: string;
}

export interface Section {
  kind: SectionKind;
  headingText: string;
  /** markdown-it–rendered HTML for this section's body. */
  html: string;
}

export interface IndexEntry {
  id: string;
  title: string;
  depth: Depth;
  dependencies: string[];
  file: string;
}

export interface IndexManifest {
  schemaVersion: number;
  projectName: string;
  generatedAt?: string;
  nodes: IndexEntry[];
}

export interface ParsedNode {
  id: string;
  title: string;
  depth: Depth;
  schemaVersion: number;
  codeRefs: CodeRef[];
  dependencies: string[];
  tags: string[];
  /** Not part of the v1 schema contract; read forward-compatibly for hierarchy. */
  parent?: string;
  generatedAt?: string;
  sections: Section[];
  issues: ValidationIssue[];
}

export type Severity = 'error' | 'warning';

export interface ValidationIssue {
  severity: Severity;
  code: string;
  message: string;
  nodeId?: string;
}

// ── Tree model (extension-only, but kept here since it is pure) ──────────────

export type TreeNodeKind = 'pinned' | 'group' | 'node';

export interface TreeNode {
  kind: TreeNodeKind;
  /** Node id for `node`/`pinned`; synthetic id for `group`. */
  id: string;
  label: string;
  depth?: Depth;
  children: TreeNode[];
  collapsible: boolean;
}

// ── Code resolution result (runtime, populated by the vscode-aware resolver) ─

export type CodeRefStatus = 'ok' | 'file-not-found' | 'range-out-of-bounds';

export interface CodeRefResolution {
  status: CodeRefStatus;
  file: string;
  languageId?: string;
  /** Raw file text (when ok); used by the highlighter. */
  text?: string;
  highlightStart?: number;
  highlightEnd?: number;
}
