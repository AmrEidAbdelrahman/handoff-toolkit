# Contract: Toolkit Output (Amendment for Feature 002)

**Version**: 2.0 | **Date**: 2026-05-29
**Amends**: `specs/001-handoff-platform/contracts/toolkit-output-contract.md` (v1.1)
**Producer**: Handoff Toolkit (`.handoff/toolkit/`)
**Consumer**: Handoff VS Code Extension

This document defines the additive changes to the toolkit output contract introduced by feature 002 (Rich Documentation Methodology). All v1.1 rules remain in force. Only the additions and amendments are listed here.

---

## Output Location (unchanged)

No change. Business documents are stored alongside handover nodes:

```
.handoff/output/
├── index.json          ← amended (see below)
└── nodes/
    ├── <id>.md         ← handover nodes (unchanged format)
    ├── <id>-adr.md     ← ADR documents (new)
    ├── <id>-runbook.md ← Runbook documents (new)
    ├── onboarding-guide.md   ← Onboarding Guide (one per session, new)
    └── api-summary.md        ← API Summary (conditional, new)
```

---

## index.json Contract (amended)

Adds one optional field to each node entry:

```json
{
  "schema_version": 1,
  "project_name": "...",
  "generated_at": "...",
  "generated_at_sha": "...",
  "nodes": [
    {
      "id": "string",
      "title": "string",
      "depth": "core | supporting | peripheral",
      "dependencies": [],
      "file": "nodes/<id>.md",
      "doc_type": "handover_node | adr | runbook | onboarding_guide | api_summary"
    }
  ]
}
```

**New rule 5**: `doc_type` in each index entry is optional; when present, it MUST match the `doc_type` field in the corresponding node file's frontmatter. Absence is equivalent to `handover_node`.

**Ordering rule**: Unchanged — core → supporting → peripheral. Business documents without a meaningful depth classification MUST have `depth: supporting` in their frontmatter and be ordered within that group.

---

## Node File Contract (amended)

**New rules appended to v1.1**:

5a. MAY include `doc_type` frontmatter field. When present, must be one of: `handover_node`, `adr`, `runbook`, `onboarding_guide`, `api_summary`. Absence is equivalent to `handover_node`.

5b. MUST include `diagram_format: mermaid` if and only if the node body contains a `## Diagrams` section. Nodes without a `## Diagrams` section MUST NOT include `diagram_format`.

5c. `## Diagrams` section, when present, MUST appear as the last H2 section in the body. Each diagram block within it MUST have: an H3 title, a one-sentence description line, and a fenced mermaid code block (` ```mermaid `). The agent MUST validate mermaid syntax before saving; if invalid after one correction attempt, the diagram MUST be replaced with a prose description.

5d. MAY include `doc_refs: [string]` listing relative paths to linked business document node files. Each path must resolve to an existing file in `nodes/`.

5e. `code_refs` entries MAY include an optional `id` field. When present: must match `^[a-z0-9]+(-[a-z0-9]+)*$`, max 40 chars, unique within the node's `code_refs` list. Diagram elements intended to be navigable MUST use labels that exactly match a `code_refs[].id` value in the same node.

**Document-type-specific rules**:

- **ADR** (`doc_type: adr`): body MUST contain `## Context`, `## Decision`, `## Consequences` (in that order, non-empty). Title MUST begin with `"ADR: "`. Optional frontmatter: `adr_status` (proposed/accepted/deprecated), `adr_date` (ISO 8601).
- **Runbook** (`doc_type: runbook`): body MUST contain `## Purpose`, `## Prerequisites`, `## Steps`, `## Expected Outcome` (in that order, non-empty). Steps MUST be a numbered list with at least one step. Title MUST begin with `"Runbook: "`.
- **Onboarding Guide** (`doc_type: onboarding_guide`): body MUST contain `## Project Summary`, `## Reading Order`, `## Related Documents` (in that order). Reading order MUST be a numbered list of Markdown links to other node files. MUST be produced exactly once per `/handoff-start` session. Title MUST begin with `"Onboarding Guide: "`.
- **API Summary** (`doc_type: api_summary`): body MUST contain `## Overview`, `## Endpoints / Operations`, `## Authentication` (in that order, non-empty). Produced only when a contract file (`openapi.yaml`, `schema.graphql`, `swagger.json`, or equivalent) is detected. Title MUST begin with `"API Summary: "`.

---

## Diagram Decision Matrix (normative)

The toolkit MUST follow this matrix when determining which diagrams to generate per section:

| Section Category | Required Diagrams | Optional Diagrams |
|---|---|---|
| Multi-component module (2+ interacting classes/services) | Architecture overview (flowchart) | Sequence (if async/event-driven) |
| Data layer (models, schemas, ORM) | Entity-relationship (erDiagram) | Data flow (flowchart LR) |
| Pipeline / event flow (queues, streams, webhooks) | Data flow (flowchart LR) | Sequence (sequenceDiagram) |
| Single utility / pure function module | None | None |
| Entry point / orchestrator | Architecture overview (flowchart) | Sequence (sequenceDiagram) |

"Required" = generate unconditionally for that section category.
"Optional" = generate only when sufficient code evidence exists (e.g., async calls or event emissions justify a sequence diagram).

---

## Guarantee to Extension (amended)

If toolkit output passes all v1.1 rules plus the amendments above, the extension MUST additionally be able to:

- Parse `doc_type` from index entries and node frontmatter to apply type-aware rendering
- Detect `diagram_format: mermaid` and render the `## Diagrams` section visually (not as raw text)
- Resolve `doc_refs` paths and surface them as clickable links from the hosting node
- Match diagram element labels to `code_refs[].id` values for click-to-navigate behaviour

---

## Breaking Changes

`schema_version` remains `1`. All additions are optional and backward-compatible. Existing 001 output is valid 002 input.
