import assert from 'node:assert/strict';
import { loadIndex } from '../../src/handoff/indexLoader';
import { validateFrontmatter, validateBody, crossCheckParents } from '../../src/handoff/validation';

describe('loadIndex', () => {
  it('loads a valid index', () => {
    const text = JSON.stringify({
      schema_version: 1,
      project_name: 'Demo',
      nodes: [{ id: 'a', title: 'A', depth: 'core', dependencies: [], file: 'nodes/a.md' }],
    });
    const { manifest, issues } = loadIndex(text);
    assert.ok(manifest);
    assert.equal(manifest!.nodes.length, 1);
    assert.equal(issues.filter((i) => i.severity === 'error').length, 0);
  });

  it('returns a hard error for invalid JSON without throwing', () => {
    const { manifest, issues } = loadIndex('{ not json');
    assert.equal(manifest, null);
    assert.ok(issues.some((i) => i.code === 'INDEX_INVALID_JSON'));
  });

  it('warns on schema_version mismatch but still loads', () => {
    const text = JSON.stringify({ schema_version: 2, project_name: 'Demo', nodes: [] });
    const { manifest, issues } = loadIndex(text);
    assert.ok(manifest);
    assert.ok(issues.some((i) => i.code === 'SCHEMA_VERSION_MISMATCH'));
  });

  it('flags duplicate ids and bad depth', () => {
    const text = JSON.stringify({
      schema_version: 1,
      project_name: 'Demo',
      nodes: [
        { id: 'a', title: 'A', depth: 'core', file: 'nodes/a.md' },
        { id: 'a', title: 'A2', depth: 'nope', file: 'nodes/a2.md' },
      ],
    });
    const { issues } = loadIndex(text);
    assert.ok(issues.some((i) => i.code === 'INDEX_DUP_ID'));
    assert.ok(issues.some((i) => i.code === 'INDEX_BAD_DEPTH'));
  });
});

describe('loadIndex — parent field extraction', () => {
  it('extracts parent when present and non-empty', () => {
    const text = JSON.stringify({
      schema_version: 1,
      project_name: 'Demo',
      nodes: [
        { id: 'modules', title: 'Modules', depth: 'supporting', dependencies: [], file: 'nodes/modules.md' },
        { id: 'auth', title: 'Auth', depth: 'supporting', dependencies: [], parent: 'modules', file: 'nodes/auth.md' },
      ],
    });
    const { manifest } = loadIndex(text);
    assert.ok(manifest);
    assert.equal(manifest!.nodes[0].parent, undefined);
    assert.equal(manifest!.nodes[1].parent, 'modules');
  });

  it('returns undefined parent when field is absent', () => {
    const text = JSON.stringify({
      schema_version: 1,
      project_name: 'Demo',
      nodes: [{ id: 'a', title: 'A', depth: 'core', dependencies: [], file: 'nodes/a.md' }],
    });
    const { manifest } = loadIndex(text);
    assert.equal(manifest!.nodes[0].parent, undefined);
  });

  it('discards non-string parent values silently', () => {
    const text = JSON.stringify({
      schema_version: 1,
      project_name: 'Demo',
      nodes: [{ id: 'a', title: 'A', depth: 'core', dependencies: [], parent: 42, file: 'nodes/a.md' }],
    });
    const { manifest } = loadIndex(text);
    assert.equal(manifest!.nodes[0].parent, undefined);
  });
});

describe('crossCheckParents', () => {
  it('produces no issues when parent references a present id', () => {
    const entries = [
      { id: 'modules', title: 'Modules', depth: 'supporting' as const, dependencies: [], file: 'nodes/modules.md' },
      { id: 'auth', title: 'Auth', depth: 'supporting' as const, dependencies: [], parent: 'modules', file: 'nodes/auth.md' },
    ];
    const issues = crossCheckParents(entries);
    assert.equal(issues.length, 0);
  });

  it('warns when parent references a non-existent id (IX-04)', () => {
    const entries = [
      { id: 'auth', title: 'Auth', depth: 'supporting' as const, dependencies: [], parent: 'nope', file: 'nodes/auth.md' },
    ];
    const issues = crossCheckParents(entries);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].code, 'INDEX_DANGLING_PARENT');
    assert.equal(issues[0].severity, 'warning');
    assert.equal(issues[0].nodeId, 'auth');
  });

  it('warns when project-overview has a parent set (IX-05)', () => {
    const entries = [
      { id: 'modules', title: 'Modules', depth: 'supporting' as const, dependencies: [], file: 'nodes/modules.md' },
      { id: 'project-overview', title: 'Overview', depth: 'core' as const, dependencies: [], parent: 'modules', file: 'nodes/project-overview.md' },
    ];
    const issues = crossCheckParents(entries);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].code, 'INDEX_ROOT_HAS_PARENT');
    assert.equal(issues[0].severity, 'warning');
    assert.equal(issues[0].nodeId, 'project-overview');
  });

  it('does not warn when technical-overview has a parent (no longer a reserved root)', () => {
    const entries = [
      { id: 'technical', title: 'Technical', depth: 'core' as const, dependencies: [], file: 'nodes/technical.md' },
      { id: 'technical-overview', title: 'Tech', depth: 'core' as const, dependencies: [], parent: 'technical', file: 'nodes/technical-overview.md' },
    ];
    const issues = crossCheckParents(entries);
    assert.equal(issues.length, 0);
  });

  it('produces no issues when entries have no parent fields', () => {
    const entries = [
      { id: 'a', title: 'A', depth: 'core' as const, dependencies: [], file: 'nodes/a.md' },
      { id: 'b', title: 'B', depth: 'supporting' as const, dependencies: [], file: 'nodes/b.md' },
    ];
    assert.equal(crossCheckParents(entries).length, 0);
  });
});

describe('dangling parent fixture', () => {
  it('loads dangling-parent-workspace and surfaces a warning without crashing', () => {
    const indexJson = JSON.stringify({
      schema_version: 1,
      project_name: 'DanglingTest',
      nodes: [
        { id: 'project-overview', title: 'Project Overview', depth: 'core', dependencies: [], file: 'nodes/project-overview.md' },
        { id: 'auth', title: 'Auth', depth: 'supporting', dependencies: [], parent: 'nonexistent-parent', file: 'nodes/auth.md' },
      ],
    });
    const { manifest } = loadIndex(indexJson);
    assert.ok(manifest, 'index loads despite dangling parent');
    assert.equal(manifest!.nodes.length, 2);

    const parentIssues = crossCheckParents(manifest!.nodes);
    assert.ok(parentIssues.some((i) => i.code === 'INDEX_DANGLING_PARENT'), 'dangling parent warning emitted');
    assert.ok(parentIssues.every((i) => i.severity === 'warning'), 'no hard errors from dangling parent');
  });
});

describe('frontmatter/body validation', () => {
  it('flags id/filename mismatch', () => {
    const issues = validateFrontmatter(
      { id: 'auth', title: 'A', depth: 'core', schema_version: 1, code_refs: [{ file: 'a.ts', note: 'x' }] },
      'authentication',
    );
    assert.ok(issues.some((i) => i.code === 'NODE_ID_FILENAME_MISMATCH'));
  });

  it('does not error when code_refs is absent or empty (now optional)', () => {
    const absent = validateFrontmatter({ id: 'a', title: 'A', depth: 'core', schema_version: 1 }, 'a');
    assert.equal(absent.filter((i) => i.severity === 'error').length, 0);
    const empty = validateFrontmatter(
      { id: 'a', title: 'A', depth: 'core', schema_version: 1, code_refs: [] },
      'a',
    );
    assert.equal(empty.filter((i) => i.severity === 'error').length, 0);
  });

  it('flags end_line before line', () => {
    const issues = validateFrontmatter(
      { id: 'a', title: 'A', depth: 'core', schema_version: 1, code_refs: [{ file: 'a.ts', note: 'x', line: 10, end_line: 5 }] },
      'a',
    );
    assert.ok(issues.some((i) => i.code === 'CODEREF_END_BEFORE_LINE'));
  });

  it('does not require specific sections, but warns on a fully empty body', () => {
    const ok = validateBody([{ kind: 'other', headingText: 'Context', html: '<p>x</p>' }], 'a');
    assert.equal(ok.filter((i) => i.severity === 'error').length, 0);
    const empty = validateBody([], 'a');
    assert.ok(empty.some((i) => i.code === 'EMPTY_BODY'));
  });
});
