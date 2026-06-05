import assert from 'node:assert/strict';
import { loadIndex } from '../../src/handoff/indexLoader';
import { validateFrontmatter, validateBody } from '../../src/handoff/validation';

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
