import assert from 'node:assert/strict';
import { parseSnippetLabel, matchRefByFileAndLine, isIdentifier } from '../../src/webview/refMatch';

describe('parseSnippetLabel', () => {
  it('parses the plain label form (en-dash)', () => {
    assert.deepEqual(parseSnippetLabel('src/competition/views.py lines 10–24'), {
      file: 'src/competition/views.py',
      startLine: 10,
      endLine: 24,
    });
  });

  it('parses the permalink form (same flattened text) and a hyphen dash', () => {
    assert.deepEqual(parseSnippetLabel('competition/views.py lines 30-48'), {
      file: 'competition/views.py',
      startLine: 30,
      endLine: 48,
    });
  });

  it('treats a single line as start === end', () => {
    assert.deepEqual(parseSnippetLabel('a/b.ts line 7'), {
      file: 'a/b.ts',
      startLine: 7,
      endLine: 7,
    });
  });

  it('rejects prose that is not a snippet label', () => {
    assert.equal(parseSnippetLabel('the signing logic lives here'), null);
    assert.equal(parseSnippetLabel('OrderViewSet.create'), null);
    assert.equal(parseSnippetLabel(''), null);
  });

  it('rejects an inverted range', () => {
    assert.equal(parseSnippetLabel('a/b.ts lines 24–10'), null);
  });
});

describe('matchRefByFileAndLine', () => {
  // The bug this guards: two snippets from ONE file at different lines.
  const refs = [
    { index: 0, file: 'competition/views.py', line: 10, endLine: 24 },
    { index: 1, file: 'competition/views.py', line: 30, endLine: 48 },
    { index: 2, file: 'users/models.py', line: 5, endLine: 9 },
  ];

  it('disambiguates two same-file snippets by start line', () => {
    assert.equal(matchRefByFileAndLine(refs, 'competition/views.py', 10)?.index, 0);
    assert.equal(matchRefByFileAndLine(refs, 'competition/views.py', 30)?.index, 1);
  });

  it('falls back to basename matching', () => {
    assert.equal(matchRefByFileAndLine(refs, 'views.py', 30)?.index, 1);
  });

  it('returns undefined when no ref shares that start line', () => {
    assert.equal(matchRefByFileAndLine(refs, 'competition/views.py', 99), undefined);
  });
});

describe('isIdentifier', () => {
  it('accepts class / function / dotted field shapes', () => {
    assert.ok(isIdentifier('OrderViewSet'));
    assert.ok(isIdentifier('OrderViewSet.create'));
    assert.ok(isIdentifier('sign'));
    assert.ok(isIdentifier('snake_case_name'));
  });

  it('rejects file paths, prose, and single chars', () => {
    assert.equal(isIdentifier('src/auth/jwt.ts'), false);
    assert.equal(isIdentifier('the API'), false);
    assert.equal(isIdentifier('x'), false);
    assert.equal(isIdentifier('123abc'), false);
  });
});
