# Tasks: Rich Documentation Methodology — Diagrams & Business Documents

**Branch**: `002-rich-doc-methodology`
**Input**: Design documents from `specs/002-rich-doc-methodology/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅
**Depends on**: Feature 001 toolkit and extension must be present before Phase 5+

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in the same phase)
- **[Story]**: User story this task belongs to (US1–US4)
- All toolkit paths are under `.handoff/toolkit/`; all extension paths are under `extension/`

---

## Phase 1: Setup (Extension Infrastructure)

**Purpose**: Add Mermaid dependency and build plumbing to the extension before any rendering work begins. No toolkit changes needed here — toolkit is plain Markdown.

- [ ] T001 Add `mermaid` to `extension/package.json` devDependencies (latest stable browser-compatible version) ⚠️ BLOCKED — extension/ not yet created (feature 001 extension phase pending)
- [ ] T002 Add post-build copy step to `extension/package.json` scripts: `"copy-mermaid": "cp node_modules/mermaid/dist/mermaid.min.js dist/assets/mermaid.min.js"` and call it from `vscode:prepublish` ⚠️ BLOCKED
- [ ] T003 Create `extension/dist/assets/` directory; add `extension/dist/assets/.gitkeep`; ensure `extension/dist/assets/mermaid.min.js` is listed in `.vscodeignore` exclusions (keep source, not binary) ⚠️ BLOCKED

**Checkpoint**: Extension build produces `dist/assets/mermaid.min.js` from local node_modules — no CDN required

---

## Phase 2: Foundational (Schema Rules)

**Purpose**: Output-schema rules OP-06–OP-12 gate both toolkit user stories. These rules must exist before any toolkit skill is updated, so the skill files can reference them by number.

- [x] T004 Update `.handoff/toolkit/rules/output-schema.md`: append seven new rules OP-06 through OP-12 — OP-06 (`doc_type` valid values + absence default), OP-07 (`diagram_format` presence iff `## Diagrams` exists), OP-08 (each diagram block must have H3 title + description + fenced mermaid block), OP-09 (`doc_refs` entries must resolve to existing `nodes/` files), OP-10 (`code_refs[].id` format: `^[a-z0-9]+(-[a-z0-9]+)*$`, max 40 chars, unique per node), OP-11 (diagram element labels for navigation must exactly match a `code_refs[].id` in the same node), OP-12 (doc-type-specific body section requirements: ADR needs Context/Decision/Consequences; Runbook needs Purpose/Prerequisites/Steps/Expected Outcome; Onboarding Guide needs Project Summary/Reading Order/Related Documents; API Summary needs Overview/Endpoints-Operations/Authentication)

**Checkpoint**: Schema rules file is complete and self-consistent — both toolkit stories can begin

---

## Phase 3: User Story 1 — Agent Generates Diagrams (Priority: P1) 🎯 MVP Toolkit

**Goal**: Agent follows the diagram decision matrix during `/handoff-start` to embed validated Mermaid diagrams into nodes, with `diagram_format` declared in frontmatter and `code_refs[].id` assigned to navigable refs.

**Independent Test**: Run `/handoff-start` on a project with at least one multi-component section; verify the produced node has a `## Diagrams` section with a valid Mermaid flowchart, `diagram_format: mermaid` in frontmatter, and at least one `code_refs` entry with an `id` field.

### Implementation for User Story 1

- [x] T005 [US1] Create `.handoff/toolkit/rules/diagram-methodology.md`: write the normative diagram decision matrix table with five section categories (multi-component module, data layer, pipeline/event flow, single utility, entry point/orchestrator) and their required vs optional diagram types; include Mermaid syntax type for each (flowchart, flowchart LR, sequenceDiagram, erDiagram)
- [x] T006 [US1] Add to `.handoff/toolkit/rules/diagram-methodology.md`: `code_refs[].id` naming convention — lowercase, hyphenated, derived from module/class name (e.g., `auth-service`, `user-model`); each navigable diagram element label must match exactly one `id` in the node's `code_refs`; `id` is unique within the node
- [x] T007 [US1] Add to `.handoff/toolkit/rules/diagram-methodology.md`: diagram validation instructions — agent performs a self-check on generated Mermaid source for syntax errors (unclosed brackets, invalid keywords, missing arrow operators); if error detected, attempt one correction; if still invalid, replace the diagram block with a prose description of the same content and log "DIAGRAM VALIDATION FAILED — replaced with prose: <title>" in the node's `## Warnings` section
- [x] T008 [US1] Update `.handoff/toolkit/skills/handoff-start/SKILL.md`: add Phase 2b immediately after per-section scan — for each section, (a) determine section category using the diagram decision matrix in `diagram-methodology.md`, (b) for each required diagram type draft the Mermaid source, (c) for optional diagram types check code evidence (async calls → sequence; event emissions → sequence; relational models → ER) before drafting, (d) assign `id` values to `code_refs` entries whose modules appear in diagram element labels
- [x] T009 [US1] Update `.handoff/toolkit/skills/handoff-start/SKILL.md`: add Phase 5b during node save — run diagram validation per `diagram-methodology.md` rules on all drafted diagram blocks; replace invalid diagrams with prose fallback; if at least one diagram passed validation, add `diagram_format: mermaid` to node frontmatter; if no diagrams remain after validation, omit `diagram_format`

**Checkpoint**: US1 complete — agent autonomously produces diagram-containing nodes following the matrix

---

## Phase 4: User Story 2 — Agent Produces Typed Business Documents (Priority: P1)

**Goal**: Agent detects ADR/runbook/onboarding guide opportunities during `/handoff-start` and produces typed documents with correct templates, stored as nodes in `nodes/` with `doc_type`, linked from relevant handover nodes via `doc_refs`.

**Independent Test**: Run `/handoff-start` on a project with an architectural decision and a startup script; verify an `adr-*.md` and a `runbook-*.md` node are produced with correct body sections, and an `onboarding-guide.md` node is always produced; verify all three appear in `index.json` with `doc_type` fields.

### Implementation for User Story 2

- [x] T010 [US2] Add ADR catalogue entry to `.handoff/toolkit/rules/diagram-methodology.md`: full template (title `"ADR: <title>"`, frontmatter `doc_type: adr`, optional `adr_status: proposed|accepted|deprecated` and `adr_date: ISO 8601`, body sections `## Context` / `## Decision` / `## Consequences`); detection signals: comments starting with `# Architecture Decision:` or `# ADR:`, commit messages containing "decided", "chose", "rejected", "trade-off"; unusual patterns with inline rationale comments
- [x] T011 [US2] Add Runbook catalogue entry to `.handoff/toolkit/rules/diagram-methodology.md`: full template (title `"Runbook: <title>"`, frontmatter `doc_type: runbook`, body sections `## Purpose` (one sentence) / `## Prerequisites` / `## Steps` (numbered list, min 1 step) / `## Expected Outcome`); detection signals: files named `*deploy*`, `*start*`, `*bootstrap*`, `Makefile`, `Dockerfile`, `docker-compose.*`, startup scripts, CLI entrypoints, `scripts/` directories
- [x] T012 [US2] Add Onboarding Guide catalogue entry to `.handoff/toolkit/rules/diagram-methodology.md`: full template (title `"Onboarding Guide: <Project Name>"`, frontmatter `doc_type: onboarding_guide`, `depth: supporting`, body sections `## Project Summary` (one paragraph) / `## Reading Order` (numbered Markdown links ordered core→supporting→peripheral) / `## Related Documents` (links to all ADRs and runbooks produced in this session)); cardinality rule: produce exactly one per `/handoff-start` session, always, after all other nodes are complete
- [x] T013 [US2] Add API Summary catalogue entry to `.handoff/toolkit/rules/diagram-methodology.md`: full template (title `"API Summary: <Project Name>"`, frontmatter `doc_type: api_summary`, body sections `## Overview` / `## Endpoints / Operations` / `## Authentication`); detection trigger: presence of `openapi.yaml`, `openapi.json`, `swagger.yaml`, `swagger.json`, `schema.graphql`, or `api.yaml` at repo root or in a standard location
- [x] T014 [US2] Update `.handoff/toolkit/skills/handoff-start/SKILL.md`: add Phase 2c after Phase 2b — for each section being documented, evaluate against business document detection signals in `diagram-methodology.md`: (a) ADR signals → draft ADR document alongside the section node; (b) Runbook signals → draft Runbook document for that operational area; (c) API contract file detected → draft API Summary once; after all sections complete, draft the Onboarding Guide using all completed nodes in index order
- [x] T015 [US2] Update `.handoff/toolkit/skills/handoff-start/SKILL.md`: add Phase 5c during node save — for each business document node: set `doc_type` in frontmatter per catalogue; set `depth: supporting` (or classification appropriate to document); add `doc_type` field to the node's entry in `index.json`; for each handover node that motivated a business document, add the business document path to `doc_refs` in that handover node's frontmatter

**Checkpoint**: US2 complete — agent produces full set of typed business documents, all linked and indexed correctly

---

## Phase 5: User Story 3 — Extension Type-Aware Rendering (Priority: P2)

**Goal**: Extension detects `doc_type` from index and node files; applies distinct sidebar icon per type; renders each document type with a dedicated visual layout (ADR card, runbook checklist, onboarding guide reading sequence, API two-column, handover node with diagrams).

**Independent Test**: Open a workspace containing one of each document type in the extension; verify sidebar icons differ per type; verify ADR opens with card layout (Context/Decision/Consequences sections with border), runbook opens with numbered checkbox steps, onboarding guide opens with clickable numbered list, API summary opens with two-column endpoints layout.

### Implementation for User Story 3

- [ ] T016 [P] [US3] Update `extension/src/nodeReader.ts`: parse four new optional frontmatter fields: `doc_type` (default `'handover_node'`), `diagram_format`, `doc_refs`; parse `## Diagrams` section body into `ParsedDiagram[]` (extract each H3 title, description sentence, and fenced mermaid code block source); parse `code_refs[].id` optional field on each code reference
- [ ] T017 [P] [US3] Update `extension/src/treeProvider.ts`: map `doc_type` value to icon in `HandoffTreeItem` constructor — `handover_node` uses existing icon; `adr` uses `ThemeIcon('law')` or equivalent scales icon; `runbook` uses `ThemeIcon('checklist')`; `onboarding_guide` uses `ThemeIcon('compass')`; `api_summary` uses `ThemeIcon('plug')`; unrecognised `doc_type` falls back to default icon without throwing
- [ ] T018 [US3] Create `extension/src/mermaidRenderer.ts`: export function `getMermaidWebviewHtml(diagrams: ParsedDiagram[], codeRefs: CodeReference[], mermaidUri: vscode.Uri): string` that returns a complete HTML page loading `mermaid.min.js` from `mermaidUri` (via `webview.asWebviewUri()`); place each diagram's source in `<pre class="mermaid">` with a `data-diagram-title` attribute; include inline `<script>` that calls `mermaid.initialize({ startOnLoad: true })` then `mermaid.run()`; add a fallback `<noscript>` that shows raw source in a `<pre>` block; set Content Security Policy to `script-src 'nonce-{nonce}' 'unsafe-inline'` (standard VS Code Mermaid pattern)
- [ ] T019 [US3] Update `extension/src/webviewPanel.ts`: add ADR rendering branch — when `node.docType === 'adr'`, render a structured card HTML block with labelled sections (Context / Decision / Consequences); apply distinct CSS: `border-left: 4px solid var(--vscode-activityBarBadge-background); background: var(--vscode-editor-inactiveSelectionBackground); padding: 12px`; render `adr_status` as a `<span class="badge">` above Context; do not render Business Context / Technical Context / Warnings sections
- [ ] T020 [US3] Update `extension/src/webviewPanel.ts`: add Runbook rendering branch — when `node.docType === 'runbook'`, render Purpose as a paragraph, Prerequisites as a list, then parse `## Steps` numbered list into individual step items rendered as `<li>` with a `<input type="checkbox">` and large step number; on checkbox click send postMessage `{type: 'runbookStep', nodeId, stepIndex, checked}`; on panel init, restore checkbox state from `workspaceState.get('handoff.runbookProgress.<nodeId>', {})` and pre-check completed steps
- [ ] T021 [US3] Update `extension/src/webviewPanel.ts`: add Onboarding Guide rendering branch — when `node.docType === 'onboarding_guide'`, render `## Project Summary` as a paragraph; parse `## Reading Order` numbered list of Markdown links, render each as `<li><button data-node-path="...">Title</button></li>`; on button click send postMessage `{type: 'openNode', path}`; extension host handles `openNode` by loading the referenced node file and replacing webview content; render `## Related Documents` as a `<ul>` of `<a>` elements
- [ ] T022 [US3] Update `extension/src/webviewPanel.ts`: add API Summary rendering branch — when `node.docType === 'api_summary'`, render Overview as a paragraph, then render `## Endpoints / Operations` content in a two-column `<table>` (first column: operation/path name extracted from each list item or table row; second column: description); render Authentication as a paragraph; for `handover_node` type, append diagram section at end: iterate `node.diagrams[]`, call `getMermaidWebviewHtml()` for each, inject result into panel HTML

**Checkpoint**: US3 complete — each document type is visually distinct and immediately recognisable

---

## Phase 6: User Story 4 — Receiver Navigates Diagrams to Code (Priority: P2)

**Goal**: After Mermaid renders an SVG, elements whose labels match `code_refs[].id` values become clickable and navigate to the referenced file and line. Non-matching elements are non-interactive.

**Independent Test**: Open a node with a diagram containing a labelled element matching a `code_refs[].id`; click the element; verify VS Code opens the referenced file at the correct line.

### Implementation for User Story 4

- [ ] T023 [US4] Update `extension/src/mermaidRenderer.ts`: after `mermaid.run()` resolves, query all SVG text nodes and `<tspan>` elements within rendered diagrams; for each whose `.textContent.trim()` matches an entry in a `codeRefs` array (passed in as argument), inject `data-id="<codeRefId>"` on the closest `<g>` ancestor; add `class="handoff-nav"` and `style="cursor:pointer"` to those elements; leave all other SVG elements unchanged
- [ ] T024 [US4] Update `extension/src/mermaidRenderer.ts`: add event delegation on the diagram container — on click, walk up from `event.target` to find a `[data-id]` ancestor; if found, call `acquireVsCodeApi().postMessage({type: 'diagramNav', id: element.dataset.id})`; if not found, do nothing (non-interactive elements produce no message)
- [ ] T025 [US4] Update `extension/src/webviewPanel.ts`: in the webview message handler, add case `'diagramNav'` — look up `message.id` in `node.codeRefs` by matching `codeRef.id === message.id`; if found, apply the standard code navigation contract: if file exists in workspace, open with `vscode.workspace.openTextDocument` and reveal `codeRef.line`; if not found locally and `generatedAtSha` is available, run `git show <sha>:<file>` and open read-only; if neither, show inline error "File not found — no git history to resolve this reference"

**Checkpoint**: US4 complete — diagram elements are navigable; non-matching elements are inert

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T026 [P] Update `extension/src/webviewPanel.ts`: handle postMessage `{type: 'runbookStep', nodeId, stepIndex, checked}` — update `workspaceState` key `handoff.runbookProgress.<nodeId>` (object keyed by stepIndex); register commands `handoff.markStepDone` and `handoff.resetRunbook` in `extension/src/extension.ts` wired to workspaceState mutations + webview message triggers
- [ ] T027 [P] Validate Content Security Policy in `extension/src/mermaidRenderer.ts`: ensure CSP header allows `script-src 'nonce-{nonce}'` with a fresh nonce per panel load (not `'unsafe-inline'` without nonce); verify Mermaid initialises correctly under this CSP in VS Code webview sandbox
- [ ] T028 Manual dogfood gate — Phase 1 toolkit: run `/handoff-start` on the Handoff repo itself; verify: (a) ≥1 node has `diagram_format: mermaid` and a valid `## Diagrams` section; (b) `onboarding-guide.md` node exists with `doc_type: onboarding_guide` and a non-empty `## Reading Order`; (c) all nodes pass `/handoff-validate`; (d) if any architectural decision visible in toolkit, an ADR node was produced
- [ ] T029 Manual end-to-end gate — Phase 2 extension: open Handoff dogfood output workspace in VS Code; verify: (a) sidebar shows distinct icons for each doc_type present; (b) opening onboarding guide shows clickable numbered reading order; (c) opening a diagram-containing node renders SVG (not raw Mermaid source); (d) clicking a navigable element opens the correct file at the correct line; (e) all features work offline (network disabled); (f) ADR opens with card layout
- [ ] T030 [P] Add Mermaid rendering fallback integration: in `extension/src/mermaidRenderer.ts` wrap `mermaid.run()` in a try-catch; on error, replace each failed `<pre class="mermaid">` with a `<details><summary>Diagram source (rendering failed)</summary><pre>...</pre></details>` — raw source always accessible, never silently hidden

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — begin immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion
- **US1 (Phase 3)**: Depends on Phase 2 (OP-06–OP-12 schema rules must exist before toolkit skills reference them)
- **US2 (Phase 4)**: Depends on Phase 3 (diagram-methodology.md must exist; handoff-start SKILL phases 2b/5b must be in place before adding 2c/5c)
- **US3 (Phase 5)**: Depends on Phase 4 (toolkit complete so dogfood fixtures can be produced); T018 must complete before T019–T022
- **US4 (Phase 6)**: Depends on T018 (mermaidRenderer base) and T022 (webviewPanel diagram section) from Phase 5
- **Polish (Phase 7)**: Depends on all implementation phases complete

### User Story Dependencies

- **US1 (P1)**: First toolkit story — creates diagram-methodology.md foundation that US2 extends
- **US2 (P1)**: Extends diagram-methodology.md and handoff-start SKILL; depends on US1
- **US3 (P2)**: First extension story — independent of US1/US2 for implementation, but needs their output for testing
- **US4 (P2)**: Extends mermaidRenderer and webviewPanel from US3; depends on T018 and T022

### Within Each Phase

- T016 and T017 in Phase 5 are parallel (different files: nodeReader vs treeProvider)
- T026 and T027 in Phase 7 are parallel (different files/concerns)
- T028 and T029 are manual gates — T028 validates toolkit before starting T029

### Parallel Opportunities

- T016 [nodeReader] and T017 [treeProvider] can run simultaneously in Phase 5
- T026 [runbook commands] and T027 [CSP validation] can run simultaneously in Phase 7
- Phases 1–4 are strictly sequential (foundation builds up)
- US3 and US1/US2 could theoretically be implemented in parallel by two developers (different files), with manual test deferred until toolkit output is available for fixtures

---

## Parallel Example: Phase 5 (US3)

```
# After T018 (mermaidRenderer base) is done:
Parallel batch:
  T019 — ADR rendering branch in webviewPanel.ts
  T020 — Runbook rendering branch in webviewPanel.ts
  T021 — Onboarding Guide rendering branch in webviewPanel.ts

# T016 and T017 have no dependency on T018:
Parallel batch (Phase 5 start):
  T016 — nodeReader.ts additions
  T017 — treeProvider.ts icon mapping
```

---

## Implementation Strategy

### MVP First (Toolkit Only — US1 + US2)

1. Complete Phase 1: Setup (extension build infra)
2. Complete Phase 2: Foundational (output-schema rules)
3. Complete Phase 3: US1 (diagram generation in toolkit)
4. Complete Phase 4: US2 (business document generation in toolkit)
5. **STOP and VALIDATE**: Run manual dogfood gate (T028) — toolkit produces complete output
6. Toolkit is shippable independently (receivers read `.md` files directly)

### Incremental Delivery

1. Setup + Foundational → shared base ready
2. US1 → diagrams in toolkit output → dogfood validates
3. US2 → business documents in toolkit output → dogfood complete
4. US3 → extension renders all document types visually
5. US4 → diagram elements navigable → end-to-end gate passes

### Task Count Summary

| Phase | Tasks | User Story |
|-------|-------|------------|
| Phase 1: Setup | T001–T003 | — |
| Phase 2: Foundational | T004 | — |
| Phase 3: US1 Diagrams | T005–T009 | US1 |
| Phase 4: US2 Business Docs | T010–T015 | US2 |
| Phase 5: US3 Rendering | T016–T022 | US3 |
| Phase 6: US4 Diagram Nav | T023–T025 | US4 |
| Phase 7: Polish | T026–T030 | — |
| **Total** | **30** | |

---

## Notes

- [P] tasks = different files, no shared state, can run simultaneously
- All toolkit tasks are plain Markdown edits — no compilation, no npm, no tests
- All extension tasks require `npm install` in `extension/` before starting Phase 5
- T028 and T029 are manual verification steps — they cannot be automated by an LLM
- Mermaid browser build must never be loaded from a CDN — always from `dist/assets/mermaid.min.js`
- `schema_version` stays at `1` throughout — never increment it for this feature
