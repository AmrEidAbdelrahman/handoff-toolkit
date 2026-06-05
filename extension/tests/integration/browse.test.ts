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

    // Depth groups present in order (core group holds authentication only).
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
});
