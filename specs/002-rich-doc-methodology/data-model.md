# Data Model: Rich Documentation Methodology — Diagrams & Business Documents

**Phase**: 1 | **Date**: 2026-05-29 | **Plan**: [plan.md](plan.md)

This document defines the schema additions introduced by feature 002. All changes are additive and backward-compatible with the schemas defined in `specs/001-handoff-platform/data-model.md`. Entities not listed here are unchanged.

---

## Modified Entities

### 1. HandoverNode (extended)

Adds four optional frontmatter fields to the schema defined in 001.

**New frontmatter fields**:

```yaml
# Added by feature 002 — all optional, all backward-compatible

doc_type: handover_node | adr | runbook | onboarding_guide | api_summary
  # Absent or "handover_node" = standard handover node (default)

diagram_format: mermaid
  # Present only when node body contains a ## Diagrams section
  # Absent = no diagrams in this node

doc_refs:
  - string    # relative path to a related business document file
              # e.g., "nodes/auth-decisions-adr.md"
  # Present only when the node links to one or more business documents
  # Absent = no linked documents

code_refs:
  - id: string          # NEW optional field on existing code_refs entries
                        # lowercase, hyphenated, max 40 chars (e.g., "auth-service")
                        # unique within the node's code_refs list
                        # when present: diagram elements with matching labels become navigable
    file: string        # unchanged
    note: string        # unchanged
    line: integer       # unchanged (optional)
    end_line: integer   # unchanged (optional)
```

**Extended body schema** (adds one optional section after existing sections):

```markdown
## Business Context
[unchanged]

## Technical Context
[unchanged]

## Decisions
[unchanged, optional]

## Warnings
[unchanged, optional]

## Diagrams
[NEW — optional; present only when diagram_format declared in frontmatter]
[One or more diagram blocks, each with the structure:]

### <Diagram Title>
<one-sentence description of what this diagram shows>

```mermaid
<mermaid source>
```
```

**Additional validation rules** (appended to 001 rules):

- `doc_type` is optional; when present must be one of: `handover_node`, `adr`, `runbook`, `onboarding_guide`, `api_summary`
- `diagram_format` MUST be present if and only if the node body contains a `## Diagrams` section with at least one diagram
- `diagram_format` when present must equal `mermaid` (only supported value in this version)
- `doc_refs` entries must be relative paths; each referenced file must exist in the output directory
- `code_refs[].id` is optional; when present must match `^[a-z0-9]+(-[a-z0-9]+)*$` and be unique within the node's `code_refs` list
- `## Diagrams` section must appear after all other sections if present
- Each diagram block under `## Diagrams` must have a title (H3), a description line, and a fenced mermaid code block
- `schema_version` remains `1` — these are additive fields; no bump required

---

### 2. HandoverIndex entry (extended)

Adds one optional field to each entry in the `nodes[]` array of `index.json`.

**Extended node entry shape**:

```json
{
  "id": "string",
  "title": "string",
  "depth": "core | supporting | peripheral",
  "dependencies": ["string"],
  "file": "nodes/<id>.md",
  "doc_type": "handover_node | adr | runbook | onboarding_guide | api_summary"
}
```

- `doc_type` is optional in index entries; absence is equivalent to `handover_node`
- When present, must match the `doc_type` value in the corresponding node file's frontmatter
- Ordering rule unchanged: core → supporting → peripheral; business documents without a meaningful depth default to `supporting`

---

## New Embedded Entities

### 3. Diagram

A Diagram is not a file — it is a structured block embedded within a HandoverNode's `## Diagrams` section. It has no independent existence outside a node.

**Structure** (within node body):

```
### <Title>
<Description — one sentence, plain language>

```mermaid
<Mermaid source — one of: flowchart, sequenceDiagram, erDiagram, flowchart LR>
```
```

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| title | string | Yes | H3 heading within `## Diagrams` section |
| description | string | Yes | One sentence below the heading, before the code block |
| source | string | Yes | Mermaid diagram source, fenced with ` ```mermaid ` |
| type | enum | Implied | Derived from first keyword in source: `flowchart`, `sequenceDiagram`, `erDiagram` |

**Element navigation**:

A diagram element is navigable if its label exactly matches a `code_refs[].id` value in the same node. The extension resolves the navigation target by looking up that `id` in `code_refs` and using the associated `file` and `line` fields. Non-matching labels render as non-interactive.

---

### 4. Document Types (typed node subtypes)

Business documents share the HandoverNode schema but specialise it via `doc_type` and follow a defined body template. They are stored as standard `.md` files in `nodes/` alongside handover nodes.

#### 4a. ADR (Architecture Decision Record)

`doc_type: adr`

**Required body structure**:

```markdown
## Context
<What situation prompted this decision — one or more paragraphs>

## Decision
<What was decided — one or more paragraphs>

## Consequences
<Trade-offs and outcomes — one or more paragraphs>
```

**Required frontmatter fields** (in addition to standard fields):

```yaml
doc_type: adr
title: "ADR: <title>"     # must begin with "ADR: "
```

**Optional frontmatter fields**:

```yaml
adr_status: proposed | accepted | deprecated   # defaults to "proposed" if absent
adr_date: string   # ISO 8601 date (e.g., "2026-05-29")
```

---

#### 4b. Runbook

`doc_type: runbook`

**Required body structure**:

```markdown
## Purpose
<One sentence describing what this runbook achieves>

## Prerequisites
<What must be true before following the steps — list or paragraphs>

## Steps
1. <First step>
2. <Second step>
...

## Expected Outcome
<What success looks like — one or more sentences>
```

**Required frontmatter fields**:

```yaml
doc_type: runbook
title: "Runbook: <title>"   # must begin with "Runbook: "
```

---

#### 4c. Onboarding Guide

`doc_type: onboarding_guide`

**Required body structure**:

```markdown
## Project Summary
<One paragraph: what this project does and why>

## Reading Order
1. [<Core Node Title>](<relative path>)
2. [<Supporting Node Title>](<relative path>)
...

## Related Documents
- [<ADR title>](<relative path>)
- [<Runbook title>](<relative path>)
```

**Required frontmatter fields**:

```yaml
doc_type: onboarding_guide
title: "Onboarding Guide: <Project Name>"   # must begin with "Onboarding Guide: "
depth: supporting   # always supporting; no meaningful core/peripheral classification
```

**Cardinality**: Exactly one per session. The agent produces it after all other nodes are complete.

---

#### 4d. API Summary

`doc_type: api_summary`

**Required body structure**:

```markdown
## Overview
<What APIs are exposed and to whom>

## Endpoints / Operations
<Derived from openapi.yaml, schema.graphql, or equivalent — table or list>

## Authentication
<How callers authenticate>
```

**Required frontmatter fields**:

```yaml
doc_type: api_summary
title: "API Summary: <Project Name>"   # must begin with "API Summary: "
```

**Generation trigger**: Produced only when a clear API contract file is detected (e.g., `openapi.yaml`, `schema.graphql`, `swagger.json`).

---

## Extension In-Memory Types (additions)

TypeScript additions to the `ParsedNode` type defined in 001:

```typescript
// Additions to existing ParsedNode interface
interface ParsedNode {
  // ... existing fields from 001 (id, title, depth, businessContext, ...) ...

  // New fields added by feature 002
  docType: 'handover_node' | 'adr' | 'runbook' | 'onboarding_guide' | 'api_summary';  // default: 'handover_node'
  diagramFormat?: 'mermaid';        // present only when diagrams section exists
  docRefs?: string[];               // relative paths to linked business documents
  diagrams?: ParsedDiagram[];       // extracted from ## Diagrams section
}

interface ParsedDiagram {
  title: string;       // H3 text within ## Diagrams
  description: string; // sentence immediately after H3, before code block
  source: string;      // raw Mermaid source (without fences)
}

// Addition to existing CodeReference interface
interface CodeReference {
  // ... existing fields ...
  id?: string;   // optional navigation ID for diagram element linking
}

// Addition to existing ParsedIndexEntry interface
interface ParsedIndexEntry {
  // ... existing fields ...
  docType?: string;  // mirrors node frontmatter doc_type; absent = 'handover_node'
}
```

---

## Entity Relationships (additions)

```
HandoverIndex
  └── nodes[] ──► HandoverNode
                   ├── doc_type ──────────────────► DocumentType (classification)
                   ├── doc_refs[] ────────────────► HandoverNode (business documents)
                   ├── code_refs[]
                   │    └── id (optional) ◄────────── Diagram element label
                   └── diagrams[] (embedded)
                        └── element labels ──────────► code_refs[].id (navigation target)
```
