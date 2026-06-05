# Implementation Plan: Trust & Verifiability in Autonomous Documentation

**Branch**: `004-trust-verifiability` | **Date**: 2026-05-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-trust-verifiability/spec.md`

## Summary

Add three trust mechanisms to the Handoff toolkit that transform AI-generated documentation from unverifiable assertions into evidence-backed outputs:
1. A two-pass quality refinement step (draft → score rubric → rewrite → save)
2. Inline claim provenance citations in Business Context, Decisions, and Warnings
3. Per-field confidence tagging with a confidence-sorted review queue in `/handoff-review`

All deliverables are Markdown AI instruction files. No compiled code. No runtime.

## Technical Context

**Language/Version**: Markdown (AI instruction files)

**Primary Dependencies**: Existing toolkit files — `handoff-start/SKILL.md`, `handoff-review/SKILL.md`, `rules/output-schema.md`

**Storage**: Files only — `.handoff/toolkit/` Markdown skill and rule files

**Testing**: Manual dogfood test — run `/handoff-start` on Kershless project and inspect output

**Target Platform**: Claude Code CLI reading `.handoff/toolkit/` files as agent instructions

**Project Type**: AI instruction library — no runtime, no build step

**Performance Goals**: N/A — pure instruction files

**Constraints**: All changes must be backward-compatible with schema_version 1. Existing nodes with no `quality_score` or `confidence_tags` remain valid.

**Scale/Scope**: 5 source files to create/modify

## Constitution Check

Constitution is a template stub — no project-specific principles defined. No gates to check. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/004-trust-verifiability/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output (toolkit output contract update)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Files (this feature changes these files)

```text
.handoff/toolkit/
├── rules/
│   ├── quality-rubric.md          # NEW — quality rubric definition
│   └── output-schema.md           # MODIFY — add quality_score + confidence_tags rules
└── skills/
    ├── handoff-start/SKILL.md     # MODIFY — citations, confidence tagging, quality pass
    └── handoff-review/SKILL.md    # MODIFY — confidence-sorted review queue
```

**Structure Decision**: No compiled source — all deliverables are Markdown instruction files in the existing toolkit directory. The quality rubric is a new standalone rules file (analogous to `output-schema.md` and `diagram-methodology.md`) so it can be edited independently without touching skill logic (FR-011).

## Phase 0: Research

All design decisions resolved below. No external research needed — decisions are made from first principles given the AI-instruction nature of the deliverables.

See `research.md` for the full decision log.

## Phase 1: Design

See `data-model.md` for the new frontmatter fields and `contracts/toolkit-output-contract.md` (v4.0) for updated schema rules.

## Implementation Phases

### Phase 1 — Create quality-rubric.md (new file)

**Why first**: SKILL.md (Phase 3+) references this file. It must exist before SKILL.md changes instruct the agent to read it.

- Create `.handoff/toolkit/rules/quality-rubric.md` with the five-dimension rubric

### Phase 2 — Update output-schema.md

**Why second**: Validation rules must be updated before SKILL.md instructs agents to write new frontmatter fields.

- Add optional `quality_score` field rule (OP-14)
- Add optional `confidence_tags` field rule (OP-15)

### Phase 3 — Update handoff-start/SKILL.md: Citation tracking

**Steps to modify (in file order)**:
- Step 3.3 (infer business_context): add source-signal recording instruction
- Step 3.5 (infer decisions): add source-signal recording instruction
- Step 3.6 (infer warnings): add source-signal recording instruction
- Step 5.3 (assemble node): add citation rendering instruction — each inferred sentence ends with `(src: <identifier>)`

### Phase 4 — Update handoff-start/SKILL.md: Confidence tagging

**Steps to modify (in file order, within same SKILL.md edit pass)**:
- Step 5.2 (populate inferred_fields): extend to also populate `confidence_tags`
- Step 5.3 (assemble node): add `confidence_tags` to frontmatter template

### Phase 5 — Update handoff-start/SKILL.md: Quality pass (new Part 5d)

**Insert new Part 5d** between Step 5b and Step 5.4. Also add quality-pass reference to Part 2a.3 (architecture overview save).

Part 5d steps:
1. Read `rules/quality-rubric.md`
2. Score each applicable dimension 0–2
3. For each dimension scoring 0: rewrite the failing section
4. Write final `quality_score` to frontmatter

### Phase 6 — Update handoff-review/SKILL.md: Confidence-sorted queue

- Replace the Step 2.1 resumption cursor with a confidence-sorted queue algorithm
- Present `low`-confidence fields first, `medium` second, `high` third; within each tier preserve index order

### Phase 7 — Update CLAUDE.md and validate

- Update CLAUDE.md plan reference to point to `specs/004-trust-verifiability/plan.md`
- Dogfood test: run `/handoff-start` on Kershless project and inspect SC-001 through SC-006

## Quality Gates

- SC-001: Every generated node has `quality_score` in frontmatter; no dimension score is 0
- SC-002: Every inferred sentence in Business Context, Decisions, Warnings has `(src: …)` citation
- SC-003: A receiver can verify 3 specific claims within 5 minutes by following citations
- SC-004: `/handoff-review` presents `low`-confidence fields before `medium`/`high`
- SC-005: After giver confirmation, `confidence_tags` and `inferred_fields` are empty
- SC-006: `rules/quality-rubric.md` is editable independently without changing SKILL.md logic
