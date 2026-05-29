# Research: Rich Documentation Methodology — Diagrams & Business Documents

**Phase**: 0 | **Date**: 2026-05-26 | **Plan**: [plan.md](plan.md)

---

## 1. Diagram Format: Mermaid

**Decision**: Mermaid is the diagram format for all diagrams embedded in Handoff nodes.

**Rationale**: Mermaid is the de facto standard for text-based diagrams in developer tooling. VS Code has first-class Mermaid support via extensions and the built-in markdown preview. The `mermaid.js` npm package provides a self-contained renderer that runs in a webview without network calls. Mermaid supports all required diagram types: flowchart (architecture/data-flow), sequence, and ER — covering the full diagram decision matrix. Mermaid source is plain text, diffs cleanly in git, and is readable without a renderer.

**Alternatives considered**:
- PlantUML: More powerful for UML, but requires Java runtime for server-side rendering or an external HTTP server — violates the offline constraint.
- Graphviz/DOT: Excellent for dependency graphs, but rendering in a webview requires a WASM port with a much larger bundle than Mermaid.
- ASCII diagrams: Zero rendering dependency, but no click-to-navigate capability and poor readability for complex structures.

---

## 2. Diagram Rendering in VS Code Webview

**Decision**: Use `mermaid` npm package (browser build) injected into the WebviewPanel HTML. The webview loads `mermaid.min.js` from the extension's bundled assets, calls `mermaid.initialize()` + `mermaid.run()` on page load. Diagram source blocks are placed in `<pre class="mermaid">` tags.

**Rationale**: The browser build of Mermaid runs entirely in the webview's JavaScript context with no external calls. Bundling it with the extension ensures offline operation. The `<pre class="mermaid">` pattern is Mermaid's standard auto-render approach — minimal glue code required. The webview's Content Security Policy must allow inline scripts for Mermaid initialisation; this is already standard practice for VS Code extensions using Mermaid.

**Click-to-navigate overlay**: After Mermaid renders an SVG, the extension injects click handlers by querying SVG nodes whose `data-id` attribute matches a `code_refs[].id`. This is achievable via a `postMessage` bridge between the webview and extension host (same pattern as the existing code-ref navigation in 001).

**Alternatives considered**:
- VS Code's built-in Markdown preview with Mermaid plugin: Not applicable — we need a programmatically controlled panel, not a file preview.
- Server-side SVG rendering: Rejected — requires network or local process; breaks offline requirement.

---

## 3. Diagram Decision Matrix

**Decision**: The agent uses a three-category decision matrix to determine which diagram types to generate:

| Section Category | Required Diagrams | Optional Diagrams |
|---|---|---|
| Multi-component module (2+ interacting classes/services) | Architecture overview (flowchart) | Sequence (if async/event-driven) |
| Data layer (models, schemas, ORM) | Entity-relationship | Data flow |
| Pipeline / event flow (queues, streams, webhooks) | Data flow (flowchart LR) | Sequence |
| Single utility / pure function module | None | None |
| Entry point / orchestrator | Architecture overview | Sequence |

**Rationale**: The matrix prevents both over-generation (diagrams on every node) and under-generation (no diagrams on complex sections). "Required" means the agent generates it without condition; "optional" means it generates it only if there is sufficient code evidence (e.g., async calls warrant a sequence diagram).

**Alternatives considered**:
- Generate diagrams for every node: Rejected — trivial utility modules (e.g., a string formatter) produce meaningless diagrams that add noise.
- Leave diagram generation fully to agent heuristics: Rejected — without a matrix, the agent will produce inconsistent results across runs.

---

## 4. Business Document Type Catalogue and Templates

**Decision**: Four document types are defined for MVP, each with a fixed template:

**ADR (Architecture Decision Record)**:
```
# ADR: <Title>
date: <ISO 8601>
status: proposed | accepted | deprecated
---
## Context
<What situation prompted this decision>

## Decision
<What was decided>

## Consequences
<Trade-offs and outcomes>
```

**Runbook**:
```
# Runbook: <Title>
purpose: <one sentence>
---
## Prerequisites
<What must be true before running>

## Steps
1. <Step one>
2. <Step two>
...

## Expected Outcome
<What success looks like>
```

**Onboarding Guide** (always produced once per session):
```
# Onboarding Guide: <Project Name>
---
## Project Summary
<One paragraph: what this project does and why>

## Reading Order
1. [<Core Node Title>](<path>)
2. [<Supporting Node Title>](<path>)
...

## Related Documents
- [<ADR title>](<path>)
- [<Runbook title>](<path>)
```

**API Summary** (produced only when API contract file detected):
```
# API Summary: <Project Name>
---
## Overview
<What APIs are exposed and to whom>

## Endpoints / Operations
<Derived from openapi.yaml, schema.graphql, or equivalent>

## Authentication
<How callers authenticate>
```

**Rationale**: Fixed templates ensure consistent structure that the extension can rely on for type-aware rendering. The agent fills templates from code signals, not from giver input.

---

## 5. Business Document Storage and Indexing

**Decision**: Business documents are stored as typed nodes in `.handoff/output/nodes/` using the existing Markdown + YAML frontmatter format. They differ from handover nodes only by the `doc_type` frontmatter field. They are listed in `index.json` with a new `doc_type` field in each index entry. The ordering rule remains: core → supporting → peripheral; documents without a meaningful depth default to `supporting`.

**New frontmatter fields**:
- `doc_type`: `handover_node` | `adr` | `runbook` | `onboarding_guide` | `api_summary` (optional, defaults to `handover_node`)
- `diagram_format`: `mermaid` (present only when node contains diagrams)
- `doc_refs`: list of relative paths to related business documents (present when node links to ADRs/runbooks)

**New index entry fields**:
- `doc_type`: mirrors frontmatter value; absent = `handover_node`

**Rationale**: Reusing the existing node format and index avoids a new file type, a new directory, and a new parser. The extension's existing parsing pipeline needs minimal changes — just a new field to read. Backward compatibility is guaranteed: all existing nodes without `doc_type` remain valid.

**Alternatives considered**:
- Separate `docs/` directory for business documents: Rejected — splits the index into two sources of truth; the extension would need two separate readers.
- JSON format for business documents: Rejected — breaks the established human-readable Markdown convention; makes the `## Diagrams` section impossible.

---

## 6. Extension Type-Aware Rendering

**Decision**: The extension's `webviewPanel.ts` applies a rendering template based on `node.docType`:

- `handover_node`: existing prose layout (Business Context → Technical Context → Decisions → Warnings → Diagrams)
- `adr`: structured card layout with labelled sections (Context / Decision / Consequences) in a distinct visual style (border, background tint)
- `runbook`: numbered step list with large step numbers and a completion checkbox per step (checkbox state stored in `workspaceState`)
- `onboarding_guide`: reading sequence as a numbered list of clickable `HandoffTreeItem` links; clicking opens that node in the same panel
- `api_summary`: two-column layout (endpoint/operation name + description)

**Sidebar icon mapping**:
- `handover_node`: existing node icon
- `adr`: decision/scales icon
- `runbook`: checklist/steps icon
- `onboarding_guide`: map/compass icon
- `api_summary`: API/network icon

**Rationale**: Type-aware rendering makes each document immediately recognisable without reading content. The sidebar icons give receivers a visual inventory of what's available before opening anything.

---

## 7. `code_refs[].id` for Diagram Navigation

**Decision**: The existing `code_refs` structure gains an optional `id` field:

```yaml
code_refs:
  - id: auth-service          # optional, used for diagram element navigation
    file: src/auth/service.ts
    note: Authentication service entry point
    line: 1
```

The agent assigns `id` values using the pattern: lowercase, hyphenated, derived from the section/module name (e.g., `auth-service`, `user-model`, `payment-gateway`). Diagram element labels that match a `code_refs[].id` get a `data-id` attribute injected into the rendered SVG, which the extension's click handler intercepts.

**Rationale**: Adding `id` to `code_refs` is a backward-compatible additive change — existing code_refs without `id` remain valid. The `id` field is unique within a node's `code_refs` list. This approach avoids a separate `diagram_refs` section and keeps the link between diagram and code co-located with the code reference itself.

**Alternatives considered**:
- Match on `note` field: Rejected — `note` is a human-readable description, not an identifier; matching would be fragile and require exact string equality.
- Separate `diagram_refs` frontmatter section: Rejected — duplicates file/line information already in `code_refs`; two sources of truth for the same location.
