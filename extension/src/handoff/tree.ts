// buildTree() + flattenReadingOrder() — the single authoritative tree algorithm
// (data-model.md §4). Pure: operates on the parsed node set, no vscode.

import { Depth, IndexEntry, TreeNode } from './types';

const DEPTH_ORDER: Depth[] = ['core', 'supporting', 'peripheral'];
const DEPTH_LABEL: Record<Depth, string> = {
  core: 'Core',
  supporting: 'Supporting',
  peripheral: 'Peripheral',
};
const PINNED_IDS = ['project-overview', 'technical-overview'];

/** Minimal shape buildTree needs from each node (index order is the input order). */
export interface TreeInput {
  id: string;
  title: string;
  depth: Depth;
  parent?: string;
}

export function fromIndexEntries(
  entries: IndexEntry[],
  parentById: ReadonlyMap<string, string | undefined>,
): TreeInput[] {
  return entries.map((e) => ({ id: e.id, title: e.title, depth: e.depth, parent: parentById.get(e.id) }));
}

function makeNode(input: TreeInput): TreeNode {
  return { kind: 'node', id: input.id, label: input.title, depth: input.depth, children: [], collapsible: false };
}

export function buildTree(inputs: TreeInput[]): TreeNode[] {
  const byId = new Map(inputs.map((n) => [n.id, n]));
  const known = new Set(inputs.map((n) => n.id));

  // 1. Resolve parents (a parent must reference another present node and not be a pinned root).
  const resolvedParent = new Map<string, string | undefined>();
  for (const n of inputs) {
    let p = n.parent && known.has(n.parent) && n.parent !== n.id ? n.parent : undefined;
    if (p && PINNED_IDS.includes(n.id)) p = undefined; // pinned nodes never nest
    if (p && PINNED_IDS.includes(p)) p = undefined;    // children of pinned roots fall back to depth groups
    resolvedParent.set(n.id, p);
  }
  // Cycle safety: if following parents loops back, drop the parent link.
  for (const n of inputs) {
    const seen = new Set<string>([n.id]);
    let cur = resolvedParent.get(n.id);
    while (cur) {
      if (seen.has(cur)) {
        resolvedParent.set(n.id, undefined);
        break;
      }
      seen.add(cur);
      cur = resolvedParent.get(cur);
    }
  }

  const treeNodeById = new Map<string, TreeNode>();
  for (const n of inputs) treeNodeById.set(n.id, makeNode(n));

  // 2. Nest parented nodes under their parent (preserving index order).
  for (const n of inputs) {
    const p = resolvedParent.get(n.id);
    if (p && PINNED_IDS.indexOf(p) === -1) {
      const parentNode = treeNodeById.get(p)!;
      parentNode.children.push(treeNodeById.get(n.id)!);
      parentNode.collapsible = true;
    }
  }

  const roots: TreeNode[] = [];

  // 3. Pinned overviews at the very top, in PINNED_IDS order.
  for (const pid of PINNED_IDS) {
    if (byId.has(pid)) {
      const tn = treeNodeById.get(pid)!;
      tn.kind = 'pinned';
      roots.push(tn);
    }
  }

  // 4. Depth groups, each containing un-parented, non-pinned nodes of that depth.
  for (const depth of DEPTH_ORDER) {
    const members = inputs.filter(
      (n) => n.depth === depth && !PINNED_IDS.includes(n.id) && !resolvedParent.get(n.id),
    );
    if (members.length === 0) continue;
    const group: TreeNode = {
      kind: 'group',
      id: `group:${depth}`,
      label: DEPTH_LABEL[depth],
      depth,
      children: members.map((m) => treeNodeById.get(m.id)!),
      collapsible: true,
    };
    roots.push(group);
  }

  return roots;
}

/** Pre-order, depth-first flatten of selectable nodes (pinned + nodes; groups skipped). */
export function flattenReadingOrder(roots: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (n: TreeNode) => {
    if (n.kind === 'node' || n.kind === 'pinned') out.push(n);
    for (const c of n.children) walk(c);
  };
  for (const r of roots) walk(r);
  return out;
}
