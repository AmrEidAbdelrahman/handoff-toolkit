import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { locateHandoff } from '../../src/workspace/detector';
import { loadHandover } from '../../src/workspace/outputRepository';

// US1 — Browse and read: tree grouping, pinned overviews, sections.
describe('US1: browse and read', () => {
  it('activates and registers the open command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('handoff.open'));
    assert.ok(commands.includes('handoff.next'));
  });

  it('loads the handover and builds a grouped tree with pinned overview', async () => {
    const loc = locateHandoff();
    assert.ok(loc, 'handoff location resolved');
    const result = await loadHandover(loc!);
    assert.ok(result.ok, 'handover loaded');
    if (!result.ok) return;
    const { tree, order, nodeById } = result.handover;

    // project-overview pinned at root.
    assert.equal(tree[0].kind, 'pinned');
    assert.equal(tree[0].id, 'project-overview');

    // Both reserved roots pinned; technical-overview is second.
    assert.equal(tree[1].kind, 'pinned');
    assert.equal(tree[1].id, 'technical-overview');

    // Depth groups present (jwt-internals is nested, so supporting group has error-handling + api-summary).
    const groups = tree.filter((t) => t.kind === 'group').map((g) => g.depth);
    assert.deepEqual(groups, ['core', 'supporting', 'peripheral']);

    // Reading order: overview first.
    assert.equal(order[0].id, 'project-overview');

    // Required sections render; error-handling omits optional ones.
    const auth = nodeById.get('authentication')!;
    assert.deepEqual(auth.sections.map((s) => s.kind), ['business', 'technical', 'decisions', 'warnings']);
    const errors = nodeById.get('error-handling')!;
    assert.deepEqual(errors.sections.map((s) => s.kind), ['business', 'technical']);
    assert.match(auth.sections[0].html, /paid tier/);
  });

  it('nests jwt-internals under authentication via parent field', async () => {
    const loc = locateHandoff();
    const result = await loadHandover(loc!);
    assert.ok(result.ok);
    if (!result.ok) return;
    const { tree, order } = result.handover;

    // authentication is in the core depth group and has jwt-internals as a child.
    const coreGroup = tree.find((t) => t.kind === 'group' && t.depth === 'core');
    assert.ok(coreGroup, 'core depth group exists');
    const auth = coreGroup!.children.find((c) => c.id === 'authentication');
    assert.ok(auth, 'authentication in core group');
    assert.ok(auth!.collapsible, 'authentication is collapsible');
    assert.deepEqual(auth!.children.map((c) => c.id), ['jwt-internals']);

    // jwt-internals is NOT a direct member of any depth group.
    const allGroupChildren = tree
      .filter((t) => t.kind === 'group')
      .flatMap((g) => g.children.map((c) => c.id));
    assert.ok(!allGroupChildren.includes('jwt-internals'), 'jwt-internals not at group level');

    // Reading order: jwt-internals immediately follows authentication.
    const authIdx = order.findIndex((n) => n.id === 'authentication');
    assert.ok(authIdx !== -1, 'authentication in reading order');
    assert.equal(order[authIdx + 1]?.id, 'jwt-internals');
  });
});
