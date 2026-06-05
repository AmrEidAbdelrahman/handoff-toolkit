import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { resolveCodeRef } from '../../src/workspace/codeResolver';

// US2 — Live code: resolution of ok / range / missing refs against real workspace files.
describe('US2: live code resolution', () => {
  const root = () => vscode.workspace.workspaceFolders![0].uri;

  it('resolves an existing ref with a highlight range', async () => {
    const res = await resolveCodeRef(root(), { file: 'src/auth/jwt.ts', line: 3, endLine: 6, note: 'sign' });
    assert.equal(res.status, 'ok');
    assert.equal(res.languageId, 'typescript');
    assert.equal(res.highlightStart, 3);
    assert.equal(res.highlightEnd, 6);
    assert.ok((res.text ?? '').includes('createHmac'));
  });

  it('returns file-not-found for a missing file (non-fatal)', async () => {
    const res = await resolveCodeRef(root(), { file: 'src/auth/missing.ts', line: 1, note: 'missing' });
    assert.equal(res.status, 'file-not-found');
  });

  it('returns range-out-of-bounds when line exceeds file length', async () => {
    const res = await resolveCodeRef(root(), { file: 'src/errors.ts', line: 9999, note: 'oob' });
    assert.equal(res.status, 'range-out-of-bounds');
  });

  it('resolves a whole-file ref (no line) as ok', async () => {
    const res = await resolveCodeRef(root(), { file: 'src/errors.ts', note: 'whole file' });
    assert.equal(res.status, 'ok');
    assert.equal(res.highlightStart, undefined);
  });
});
