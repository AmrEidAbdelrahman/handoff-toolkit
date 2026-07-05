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

    // Only project-overview is pinned (technical-overview is no longer a reserved root).
    assert.equal(tree[0].kind, 'pinned');
    assert.equal(tree[0].id, 'project-overview');
    const pinnedNodes = tree.filter((t) => t.kind === 'pinned');
    assert.equal(pinnedNodes.length, 1, 'only one pinned root');

    // Core depth group present — business and technical are both root-level core nodes.
    // Supporting and peripheral groups are absent: all supporting/peripheral nodes in the
    // dual-tree fixture have parent fields (nested under business or technical), so no
    // unparented nodes remain to form those groups.
    const groups = tree.filter((t) => t.kind === 'group').map((g) => g.depth);
    assert.ok(groups.includes('core'), 'core group present');

    // Reading order: overview first.
    assert.equal(order[0].id, 'project-overview');

    // Required sections render; error-handling omits optional ones.
    const auth = nodeById.get('authentication')!;
    assert.deepEqual(auth.sections.map((s) => s.kind), ['business', 'technical', 'decisions', 'warnings']);
    const errors = nodeById.get('error-handling')!;
    assert.deepEqual(errors.sections.map((s) => s.kind), ['business', 'technical']);
    assert.match(auth.sections[0].html, /paid tier/);
  });

  it('only project-overview is pinned (not technical)', async () => {
    const loc = locateHandoff();
    const result = await loadHandover(loc!);
    assert.ok(result.ok);
    if (!result.ok) return;
    const { tree } = result.handover;

    const pinned = tree.filter((t) => t.kind === 'pinned');
    assert.equal(pinned.length, 1);
    assert.equal(pinned[0].id, 'project-overview');
  });

  it('business and technical appear as collapsible nodes in core depth group', async () => {
    const loc = locateHandoff();
    const result = await loadHandover(loc!);
    assert.ok(result.ok);
    if (!result.ok) return;
    const { tree } = result.handover;

    const coreGroup = tree.find((t) => t.kind === 'group' && t.depth === 'core');
    assert.ok(coreGroup, 'core depth group exists');
    const coreIds = coreGroup!.children.map((c) => c.id);
    assert.ok(coreIds.includes('business'), 'business in core group');
    assert.ok(coreIds.includes('technical'), 'technical in core group');

    const business = coreGroup!.children.find((c) => c.id === 'business')!;
    assert.ok(business.collapsible, 'business is collapsible');
    const technical = coreGroup!.children.find((c) => c.id === 'technical')!;
    assert.ok(technical.collapsible, 'technical is collapsible');
  });

  it('billing is nested under business with cross-references to authentication and api-summary', async () => {
    const loc = locateHandoff();
    const result = await loadHandover(loc!);
    assert.ok(result.ok);
    if (!result.ok) return;
    const { tree, nodeById } = result.handover;

    const coreGroup = tree.find((t) => t.kind === 'group' && t.depth === 'core');
    assert.ok(coreGroup);
    const business = coreGroup!.children.find((c) => c.id === 'business')!;
    assert.ok(business, 'business node found');
    const billingChild = business.children.find((c) => c.id === 'billing');
    assert.ok(billingChild, 'billing nested under business');

    const billing = nodeById.get('billing')!;
    assert.ok(billing.dependencies.includes('authentication'), 'billing cross-refs authentication');
    assert.ok(billing.dependencies.includes('api-summary'), 'billing cross-refs api-summary');
  });

  it('authentication is nested under services which is nested under technical', async () => {
    const loc = locateHandoff();
    const result = await loadHandover(loc!);
    assert.ok(result.ok);
    if (!result.ok) return;
    const { tree } = result.handover;

    const coreGroup = tree.find((t) => t.kind === 'group' && t.depth === 'core');
    assert.ok(coreGroup);
    const technical = coreGroup!.children.find((c) => c.id === 'technical')!;
    assert.ok(technical, 'technical node found');

    const services = technical.children.find((c) => c.id === 'services');
    assert.ok(services, 'services nested under technical');
    assert.ok(services!.collapsible, 'services is collapsible');

    const auth = services!.children.find((c) => c.id === 'authentication');
    assert.ok(auth, 'authentication nested under services');
  });

  it('nests jwt-internals under authentication via parent field', async () => {
    const loc = locateHandoff();
    const result = await loadHandover(loc!);
    assert.ok(result.ok);
    if (!result.ok) return;
    const { tree, order } = result.handover;

    // Find authentication by walking the tree (it is now nested under services → technical).
    const coreGroup = tree.find((t) => t.kind === 'group' && t.depth === 'core');
    assert.ok(coreGroup, 'core depth group exists');
    const technical = coreGroup!.children.find((c) => c.id === 'technical')!;
    const services = technical.children.find((c) => c.id === 'services')!;
    const auth = services.children.find((c) => c.id === 'authentication')!;
    assert.ok(auth, 'authentication found under services');
    assert.ok(auth.collapsible, 'authentication is collapsible');
    assert.deepEqual(auth.children.map((c) => c.id), ['jwt-internals']);

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

  it('reading order visits business subtree before technical subtree', async () => {
    const loc = locateHandoff();
    const result = await loadHandover(loc!);
    assert.ok(result.ok);
    if (!result.ok) return;
    const { order } = result.handover;

    const businessIdx = order.findIndex((n) => n.id === 'business');
    const technicalIdx = order.findIndex((n) => n.id === 'technical');
    const billingIdx = order.findIndex((n) => n.id === 'billing');
    const servicesIdx = order.findIndex((n) => n.id === 'services');

    assert.ok(businessIdx !== -1, 'business in reading order');
    assert.ok(technicalIdx !== -1, 'technical in reading order');
    assert.ok(businessIdx < technicalIdx, 'business appears before technical');
    assert.ok(billingIdx > businessIdx && billingIdx < technicalIdx, 'billing between business and technical');
    assert.ok(servicesIdx > technicalIdx, 'services appears after technical');
  });
});
