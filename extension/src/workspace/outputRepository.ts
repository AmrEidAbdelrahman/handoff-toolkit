// Read-only loader: reads index.json + node files via workspace.fs and assembles
// the parsed Handover model. Never writes to .handoff/output/.

import * as vscode from 'vscode';
import { loadIndex } from '../handoff/indexLoader';
import { parseNode } from '../handoff/nodeParser';
import { buildTree, flattenReadingOrder, fromIndexEntries } from '../handoff/tree';
import { IndexManifest, ParsedNode, TreeNode, ValidationIssue } from '../handoff/types';
import { crossCheckIndex, validateDependencies } from '../handoff/validation';
import { HandoffLocation } from './detector';

export interface Handover {
  manifest: IndexManifest;
  /** Parsed nodes in index order. */
  nodes: ParsedNode[];
  nodeById: Map<string, ParsedNode>;
  tree: TreeNode[];
  /** Selectable nodes in reading order (pre-order DFS of the tree). */
  order: ParsedNode[];
  /** Top-level (non node-scoped) issues — index errors, mismatches. */
  issues: ValidationIssue[];
}

export type LoadResult =
  | { ok: true; handover: Handover }
  | { ok: false; issues: ValidationIssue[] };

const decoder = new TextDecoder('utf-8');

async function readText(uri: vscode.Uri): Promise<string> {
  const bytes = await vscode.workspace.fs.readFile(uri);
  return decoder.decode(bytes);
}

export async function loadHandover(loc: HandoffLocation): Promise<LoadResult> {
  let indexText: string;
  try {
    indexText = await readText(loc.indexFile);
  } catch (e) {
    return {
      ok: false,
      issues: [
        {
          severity: 'error',
          code: 'INDEX_UNREADABLE',
          message: `Could not read .handoff/output/index.json: ${(e as Error).message}`,
        },
      ],
    };
  }

  const { manifest, issues: indexIssues } = loadIndex(indexText);
  if (!manifest) {
    return { ok: false, issues: indexIssues };
  }

  const nodes: ParsedNode[] = [];
  const nodeById = new Map<string, ParsedNode>();
  const topIssues: ValidationIssue[] = [...indexIssues];
  const presentIds = new Set<string>();

  for (const entry of manifest.nodes) {
    const fileUri = vscode.Uri.joinPath(loc.outputDir, entry.file);
    let text: string;
    try {
      text = await readText(fileUri);
    } catch {
      topIssues.push({
        severity: 'error',
        code: 'NODE_FILE_UNREADABLE',
        message: `Could not read node file "${entry.file}" for "${entry.id}".`,
        nodeId: entry.id,
      });
      continue;
    }
    const stem = entry.id;
    const node = parseNode(text, stem);
    nodes.push(node);
    nodeById.set(node.id, node);
    presentIds.add(node.id);
  }

  // Cross-file validation (index ↔ files, dependencies, parents).
  topIssues.push(...crossCheckIndex(manifest.nodes, presentIds));
  const knownIds = new Set(nodeById.keys());
  for (const node of nodes) {
    node.issues.push(...validateDependencies(node, knownIds));
  }

  // Build the tree from index order, attaching parent info from parsed nodes.
  const parentById = new Map(nodes.map((n) => [n.id, n.parent]));
  const treeInputs = fromIndexEntries(
    manifest.nodes.filter((e) => nodeById.has(e.id)),
    parentById,
  );
  const tree = buildTree(treeInputs);
  const order = flattenReadingOrder(tree)
    .map((t) => nodeById.get(t.id))
    .filter((n): n is ParsedNode => n !== undefined);

  return {
    ok: true,
    handover: { manifest, nodes, nodeById, tree, order, issues: topIssues },
  };
}
