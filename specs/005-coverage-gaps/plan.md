# Implementation Plan: Coverage Gaps — The Sections Receivers Most Want

**Branch**: `005-coverage-gaps` | **Date**: 2026-05-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-coverage-gaps/spec.md`

## Summary

Add five coverage sections to the Handoff toolkit that close the week-one questions a new owner asks:
1. A consolidated **Config & Environment Reference** node (new `doc_type: config_reference`)
2. A per-domain **Dependencies & Integrations** subsection
3. A per-domain **Testing** subsection
4. A consolidated **Glossary** node (new `doc_type: glossary`)
5. **Field-level data-model** detail in the data-layer node's ER diagram and prose

All deliverables are Markdown AI-instruction files. No compiled code, no runtime. All new content inherits the feature 004 trust mechanisms (citations, `quality_score`, `confidence_tags`).

## Technical Context

**Language/Version**: Markdown (AI instruction files)

**Primary Dependencies**: Existing toolkit files — `handoff-start/SKILL.md`, `rules/diagram-methodology.md`, `rules/output-schema.md`

**Storage**: Files only — `.handoff/toolkit/` Markdown skill and rule files

**Testing**: Manual dogfood test — run `/handoff-start` on Kershless and inspect output

**Target Platform**: Claude Code CLI reading `.handoff/toolkit/` as agent instructions

**Project Type**: AI instruction library — no runtime, no build step

**Constraints**: All changes backward-compatible with `schema_version: 1`. New `doc_type` values and new H3 subsections must not invalidate existing nodes. The per-domain subsections must NOT break BD-09 (which permits only four H2 sections in a handover node).

**Scale/Scope**: 3 files modified (`handoff-start/SKILL.md`, `diagram-methodology.md`, `output-schema.md`). No new skill files.

## Constitution Check

Constitution is a template stub — no project-specific principles defined. No gates to evaluate. Proceeding.

## Key Design Decisions

### D1 — Per-domain subsections are H3 under `## Technical Context` (not new H2 sections)

BD-09 permits only four H2 sections in a `handover_node` (Business Context, Technical Context, Decisions, Warnings). To add **Dependencies & Integrations** and **Testing** without changing BD-09 (which would be a breaking schema change), both are rendered as **H3 subsections inside `## Technical Context`**:

```
## Technical Context

<narrative + inline snippets>

### Dependencies & Integrations
- ...

### Testing
- ...
```

This keeps every existing node valid and requires no change to BD-07/BD-08/BD-09. The schema gains an advisory rule (not a hard requirement) describing the conventional H3 subsection names.

### D2 — Config Reference and Glossary are typed documents like API Summary

Both are new `doc_type` values (`config_reference`, `glossary`), defined as catalogue entries in `diagram-methodology.md` Part 3, detected during Part 2c scanning, drafted, and saved in Part 5c. They are consolidated (one each per project), conditional (omitted when no signal), and sort among the business documents in the index.

### D3 — Richer data-model is an enhancement to the existing erDiagram path

No new node. The data-layer reading (Step 3.2) and the erDiagram authoring guidance (`diagram-methodology.md` § 2.1 / Part 1) are deepened to extract field-level detail. The `## Technical Context` prose for data-layer domains gains FK/constraint/index/migration content.

## Project Structure

### Documentation (this feature)

```text
specs/005-coverage-gaps/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output (output contract v5.0)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Files (this feature changes these)

```text
.handoff/toolkit/
├── rules/
│   ├── diagram-methodology.md     # MODIFY — add config_reference + glossary catalogue entries (Part 3); deepen erDiagram guidance
│   └── output-schema.md           # MODIFY — extend OP-06 doc_type set; add OP-12 body rules for config_reference + glossary; add advisory rule for H3 subsections
└── skills/
    └── handoff-start/SKILL.md     # MODIFY — env var mining + glossary scan (Part 2c); Dependencies/Testing inference (Part 3); data-model depth (Step 3.2); render subsections (Step 5.3); save new nodes (Part 5c); index ordering (Part 5c.5)
```

**Structure Decision**: No new files. All five gaps are additions to three existing toolkit files. The two new node types follow the existing typed-document pattern (API Summary) so they reuse the Part 2c-detect / Part 5c-save machinery and the OP-06/OP-12 validation pattern.

## Implementation Phases

### Phase 1 — Schema & catalogue foundations (output-schema.md, diagram-methodology.md)

Must land before SKILL.md edits reference them.
- Extend OP-06 allowed `doc_type` set with `config_reference` and `glossary`
- Add OP-12 body-section rules for `config_reference` and `glossary`
- Add advisory rule for the conventional H3 subsection names under Technical Context (Dependencies & Integrations, Testing)
- Add `config_reference` and `glossary` catalogue entries to `diagram-methodology.md` Part 3 (templates + detection signals)
- Deepen the `erDiagram` guidance for field-level data models

### Phase 2 — US1: Config & Environment Reference node (P1)

- Part 2c: add env-var scan (in-code reads, settings, `.env.example`, docker-compose)
- Part 5c: draft + save the `config_reference` node (secret-safe)
- Part 5c.5: order it among business documents

### Phase 3 — US2: Dependencies & Integrations per domain (P2)

- Part 3: new inference step (external service detection from SDK imports/connection strings/topics)
- Step 5.3: render `### Dependencies & Integrations` H3 under Technical Context

### Phase 4 — US3: Testing per domain (P2)

- Part 3: new inference step (test file discovery + run command + fixtures)
- Step 5.3: render `### Testing` H3 under Technical Context

### Phase 5 — US4: Glossary node (P3)

- Part 2c: add glossary term scan (model names + recurring route/comment nouns)
- Part 5c: draft + save the `glossary` node (omit if < 3 terms)

### Phase 6 — US5: Richer data-model docs (P3)

- Step 3.2: read schema/migration sources for field-level detail
- diagram-methodology erDiagram guidance: field-level entities; >15-field truncation
- Step 5.3: data-layer prose includes FKs, unique constraints, notable indexes/migrations

### Phase 7 — Polish & validation

- Update CLAUDE.md plan pointer
- Dogfood test on Kershless against SC-001 through SC-007

## Quality Gates

- SC-001: exactly one config reference node listing every startup env var
- SC-002: zero literal secret values in output
- SC-003: every externally-integrated domain names the service + failure mode
- SC-004: every tested domain's tests are findable/runnable from the Testing subsection
- SC-005: ≥ 5 project terms resolvable from the glossary in 5 minutes
- SC-006: data-layer ER diagram is field-level; prose lists FKs + unique constraints
- SC-007: all new nodes carry `quality_score`, citations, `confidence_tags` (feature 004 compliance)
