import assert from 'node:assert/strict';
import { buildTree, flattenReadingOrder, TreeInput } from '../../src/handoff/tree';

const base: TreeInput[] = [
  { id: 'project-overview', title: 'Project Overview', depth: 'core' },
  { id: 'technical-overview', title: 'Technical Overview', depth: 'core' },
  { id: 'auth', title: 'Auth', depth: 'core' },
  { id: 'errors', title: 'Errors', depth: 'supporting' },
  { id: 'dev-env', title: 'Dev Env', depth: 'peripheral' },
];

describe('buildTree', () => {
  it('pins only project-overview and groups the rest by depth', () => {
    const roots = buildTree(base);
    assert.equal(roots[0].id, 'project-overview');
    assert.equal(roots[0].kind, 'pinned');
    // technical-overview is no longer pinned — it appears in the core depth group
    const groups = roots.filter((r) => r.kind === 'group').map((g) => g.depth);
    assert.deepEqual(groups, ['core', 'supporting', 'peripheral']);
    const core = roots.find((r) => r.id === 'group:core')!;
    assert.deepEqual(core.children.map((c) => c.id), ['technical-overview', 'auth']);
  });

  it('omits empty depth groups and absent overviews', () => {
    const roots = buildTree([{ id: 'only', title: 'Only', depth: 'core' }]);
    assert.equal(roots.length, 1);
    assert.equal(roots[0].kind, 'group');
    assert.equal(roots[0].depth, 'core');
  });

  it('nests a node under a resolvable parent and removes it from its depth group', () => {
    const inputs: TreeInput[] = [
      { id: 'auth', title: 'Auth', depth: 'core' },
      { id: 'jwt', title: 'JWT', depth: 'supporting', parent: 'auth' },
    ];
    const roots = buildTree(inputs);
    const core = roots.find((r) => r.id === 'group:core')!;
    const auth = core.children.find((c) => c.id === 'auth')!;
    assert.equal(auth.collapsible, true);
    assert.deepEqual(auth.children.map((c) => c.id), ['jwt']);
    // jwt is NOT a top-level child of the supporting group
    const supporting = roots.find((r) => r.id === 'group:supporting');
    assert.equal(supporting, undefined);
  });

  it('ignores an unresolvable parent (flat fallback)', () => {
    const inputs: TreeInput[] = [{ id: 'a', title: 'A', depth: 'core', parent: 'nope' }];
    const roots = buildTree(inputs);
    const core = roots.find((r) => r.id === 'group:core')!;
    assert.deepEqual(core.children.map((c) => c.id), ['a']);
  });

  it('breaks parent cycles defensively', () => {
    const inputs: TreeInput[] = [
      { id: 'a', title: 'A', depth: 'core', parent: 'b' },
      { id: 'b', title: 'B', depth: 'core', parent: 'a' },
    ];
    const roots = buildTree(inputs);
    // No infinite loop; both end up placed somewhere.
    const flat = flattenReadingOrder(roots).map((n) => n.id).sort();
    assert.deepEqual(flat, ['a', 'b']);
  });

  it('flattens reading order: overviews first, then depth order, parents before children', () => {
    const inputs: TreeInput[] = [
      { id: 'project-overview', title: 'PO', depth: 'core' },
      { id: 'auth', title: 'Auth', depth: 'core' },
      { id: 'jwt', title: 'JWT', depth: 'core', parent: 'auth' },
      { id: 'errors', title: 'Errors', depth: 'supporting' },
    ];
    const order = flattenReadingOrder(buildTree(inputs)).map((n) => n.id);
    assert.deepEqual(order, ['project-overview', 'auth', 'jwt', 'errors']);
  });
});
