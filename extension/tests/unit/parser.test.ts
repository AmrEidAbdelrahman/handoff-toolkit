import assert from 'node:assert/strict';
import { parseNode } from '../../src/handoff/nodeParser';

const CORE = `---
id: authentication
title: Authentication
depth: core
schema_version: 1
code_refs:
  - file: src/auth/index.ts
    line: 1
    note: Entry point
  - file: src/auth/jwt.ts
    line: 23
    end_line: 45
    note: Token logic
parent: project-overview
dependencies: [database]
tags: [security]
---

## Business Context

Auth exists because of paid tiers.

## Technical Context

Standard JWT in \`src/auth/jwt.ts\`. See \`unknown.ts\` too.

## Decisions

- JWT over sessions because stateless.

## Warnings

- Secret has no rotation.
`;

describe('nodeParser', () => {
  it('parses frontmatter fields', () => {
    const node = parseNode(CORE, 'authentication');
    assert.equal(node.id, 'authentication');
    assert.equal(node.depth, 'core');
    assert.equal(node.schemaVersion, 1);
    assert.equal(node.parent, 'project-overview');
    assert.deepEqual(node.dependencies, ['database']);
    assert.equal(node.codeRefs.length, 2);
    assert.equal(node.codeRefs[1].endLine, 45);
  });

  it('splits the four sections in order and renders HTML', () => {
    const node = parseNode(CORE, 'authentication');
    assert.deepEqual(node.sections.map((s) => s.kind), ['business', 'technical', 'decisions', 'warnings']);
    assert.match(node.sections[0].html, /paid tiers/);
    assert.match(node.sections[2].html, /<li>/); // decisions list rendered
  });

  it('omits optional sections when absent and has no body errors', () => {
    const minimal = `---
id: small
title: Small
depth: supporting
schema_version: 1
code_refs:
  - file: a.ts
    note: a
---

## Business Context

Why.

## Technical Context

How.
`;
    const node = parseNode(minimal, 'small');
    assert.deepEqual(node.sections.map((s) => s.kind), ['business', 'technical']);
    assert.equal(node.issues.filter((i) => i.severity === 'error').length, 0);
  });

  it('flags schema_version mismatch as a warning but still parses', () => {
    const node = parseNode(CORE.replace('schema_version: 1', 'schema_version: 2'), 'authentication');
    assert.ok(node.issues.some((i) => i.code === 'SCHEMA_VERSION_MISMATCH' && i.severity === 'warning'));
    assert.equal(node.sections.length, 4);
  });

  it('keeps unknown H2 sections as "other" (ADR/runbook/onboarding templates)', () => {
    const adr = `---
id: jwt-adr
title: "ADR: JWT"
depth: supporting
schema_version: 1
doc_type: adr
---

## Context

Background on the decision.

## Decision

We keep the custom token.

## Consequences

- Some debt remains.
`;
    const node = parseNode(adr, 'jwt-adr');
    assert.deepEqual(node.sections.map((s) => s.headingText), ['Context', 'Decision', 'Consequences']);
    assert.equal(node.sections[0].kind, 'other');
    assert.equal(node.sections[1].kind, 'decisions'); // "Decision" maps to decisions
    // No required-section or code_refs errors for a real ADR node.
    assert.equal(node.issues.filter((i) => i.severity === 'error').length, 0);
  });

  it('treats missing code_refs as valid (no error)', () => {
    const noRefs = `---
id: overview
title: Overview
depth: core
schema_version: 1
diagram_format: mermaid
---

## Business Context

Why.

## Diagrams

\`\`\`mermaid
flowchart TD
  a --> b
\`\`\`
`;
    const node = parseNode(noRefs, 'overview');
    assert.equal(node.codeRefs.length, 0);
    assert.equal(node.issues.filter((i) => i.severity === 'error').length, 0);
    const diagrams = node.sections.find((s) => s.headingText === 'Diagrams');
    assert.ok(diagrams);
    assert.match(diagrams!.html, /language-mermaid/);
  });
});
