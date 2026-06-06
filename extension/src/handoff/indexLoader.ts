// Parse + validate .handoff/output/index.json from raw text. Pure (no vscode, no fs).

import { IndexEntry, IndexManifest, ValidationIssue } from './types';
import { validateIndex } from './validation';

export interface LoadedIndex {
  manifest: IndexManifest | null;
  issues: ValidationIssue[];
}

export function loadIndex(rawText: string): LoadedIndex {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    return {
      manifest: null,
      issues: [
        {
          severity: 'error',
          code: 'INDEX_INVALID_JSON',
          message: `index.json is not valid JSON: ${(e as Error).message}`,
        },
      ],
    };
  }

  const { issues } = validateIndex(parsed);
  const errored = issues.some((i) => i.severity === 'error');

  // Build a best-effort manifest even when warnings exist; null only on hard errors
  // that make the node list unusable.
  const obj = parsed as Record<string, unknown>;
  if (errored && !Array.isArray(obj.nodes)) {
    return { manifest: null, issues };
  }

  const nodes: IndexEntry[] = Array.isArray(obj.nodes)
    ? (obj.nodes as Record<string, unknown>[])
        .filter((n) => typeof n.id === 'string' && typeof n.file === 'string')
        .map((n) => ({
          id: n.id as string,
          title: typeof n.title === 'string' ? n.title : (n.id as string),
          depth: (n.depth as IndexEntry['depth']) ?? 'supporting',
          dependencies: Array.isArray(n.dependencies) ? (n.dependencies as string[]) : [],
          parent: typeof n.parent === 'string' && n.parent.trim() !== '' ? n.parent.trim() : undefined,
          file: n.file as string,
        }))
    : [];

  const manifest: IndexManifest = {
    schemaVersion: typeof obj.schema_version === 'number' ? obj.schema_version : 0,
    projectName: typeof obj.project_name === 'string' ? obj.project_name : 'Handover',
    generatedAt: typeof obj.generated_at === 'string' ? obj.generated_at : undefined,
    nodes,
  };

  return { manifest, issues };
}
