---
description: "Task list for Trust & Verifiability feature implementation"
---

# Tasks: Trust & Verifiability in Autonomous Documentation

**Input**: Design documents from `specs/004-trust-verifiability/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Not requested — no automated test tasks. Validation is via the manual dogfood test (T024) against SC-001–SC-006.

**Organization**: Tasks are grouped by user story. US1 (citations) and US3 (confidence) both edit `handoff-start/SKILL.md` and `output-schema.md`; their tasks are sequenced to avoid overlapping edits. US2 (quality pass) adds a new rules file and a new Part 5d. The Foundational phase creates `quality-rubric.md` and the schema rules that the SKILL.md edits reference — it must complete before any user-story phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in the same phase)
- **[Story]**: US1 = Two-pass quality refinement; US2 = Claim provenance citations; US3 = Confidence tagging

**Note on priorities**: In spec.md, US1 = quality refinement (P1), US2 = citations (P1), US3 = confidence tagging (P2). Implementation sequences the foundational rules first, then citations (US2), then quality pass (US1), then confidence (US3), because the quality rubric's `no_unsupported_claims` dimension depends on citations already being in place.

---

## Phase 1: Setup

**Purpose**: Verify current file state before modifications — no changes made here.

- [X] T001 Verify `.handoff/toolkit/rules/output-schema.md` exists and confirm the current highest OP rule number (OP-13) so new rules append cleanly
- [X] T002 Verify `.handoff/toolkit/skills/handoff-start/SKILL.md` exists and confirm current content of Steps 3.3, 3.5, 3.6, 5.2, 5.3, Part 2a.3, and Part 5b
- [X] T003 Verify `.handoff/toolkit/skills/handoff-review/SKILL.md` exists and confirm current content of Step 2.1 (resumption cursor) and Part 2 walkthrough loop

---

## Phase 2: Foundational — New Rules File & Schema Updates

**Purpose**: Create `quality-rubric.md` and add the `quality_score`/`confidence_tags` validation rules. SKILL.md edits in later phases reference these. MUST complete before Phase 3.

**⚠️ CRITICAL**: All user-story phases reference these rule files. Rule changes must land first.

- [X] T004 Create `.handoff/toolkit/rules/quality-rubric.md` defining the five dimensions (`business_value_clarity`, `why_coverage`, `snippet_relevance`, `actionability`, `no_unsupported_claims`), each with a 0/1/2 scoring guide (0 = must rewrite, 1 = acceptable, 2 = exemplary), per-`doc_type` applicability table (mark `snippet_relevance` N/A for adr/runbook/onboarding_guide/api_summary), and the rule "rewrite only the section(s) tied to a dimension scoring 0, not the whole node" (per research.md Decisions 3, 4, 7)
- [X] T005 [P] In `.handoff/toolkit/rules/output-schema.md` — add Rule OP-14 (optional `quality_score`): must be a YAML mapping; permitted keys are the five rubric dimension names; each value must be integer `1` or `2` (0 invalid in a saved node); additional keys not permitted; absence is valid (per data-model.md)
- [X] T006 [P] In `.handoff/toolkit/rules/output-schema.md` — add Rule OP-15 (optional `confidence_tags`): must be a YAML mapping; each value exactly `high`/`medium`/`low`; each key must be a field name present in `inferred_fields`; absence is valid (per data-model.md)

**Checkpoint**: Rubric file and schema rules exist. Phase 3 can begin.

---

## Phase 3: User Story 2 — Claim Provenance Citations (P1)

**Goal**: Every inferred sentence in Business Context, Decisions, and Warnings ends with a `(src: …)` citation that a receiver can follow to the source.

**Independent Test**: Generate documentation on a project; open any domain node; confirm every sentence in `## Business Context`, `## Decisions`, `## Warnings` ends with `(src: …)`; confirm the cited file/section exists.

- [X] T007 [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 3.3 (infer `business_context`) — add instruction: while inferring each sentence, record the strongest source signal (README §heading, file:line, commit sha7, or `inferred`); carry these signals forward to Step 5.3 for rendering
- [X] T008 [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 3.5 (infer `decisions`) — add the same source-signal recording instruction for each decision bullet
- [X] T009 [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 3.6 (infer `warnings`) — add the same source-signal recording instruction for each warning bullet
- [X] T010 [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 5.3 (assemble the node) — add a "Citation rendering" instruction: append `(src: <identifier>)` to the end of each sentence/bullet in `## Business Context`, `## Decisions`, `## Warnings`, using the four-format convention from data-model.md; never fabricate a source — use `(src: inferred)` when no specific source exists; any `(src: inferred)` sentence forces its field into `inferred_fields`. Explicitly state that `## Technical Context` and inline snippet labels do NOT get citations.
- [X] T011 [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 2a.2 (architecture overview body) and Part 2c.4 / Part 5c (business documents) — add a note that citations also apply to `## Business Context` of the architecture overview and to the prose sections of typed documents (ADR `## Context`/`## Decision`/`## Consequences`, runbook `## Purpose`, onboarding `## Project Summary`) per research.md Decision 9

**Checkpoint**: US2 complete. Citations render in all inferred prose sections.

---

## Phase 4: User Story 1 — Two-Pass Quality Refinement (P1)

**Goal**: After a node is assembled, it is scored against the rubric and any dimension scoring 0 is rewritten before saving. A `quality_score` frontmatter field records the final scores.

**Independent Test**: Generate documentation on a 3+ domain project; inspect each node's `quality_score`; confirm no dimension is 0; confirm a node that drafted with a weak Business Context was rewritten before save.

- [X] T012 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — insert new **Part 5d "Quality Refinement Pass"** between Step 5b and Step 5.4 with steps: (5d.1) read `rules/quality-rubric.md`; (5d.2) score each applicable dimension 0–2 for the assembled node, skipping N/A dimensions per doc_type; (5d.3) for each dimension scoring 0, rewrite only the relevant section(s) and re-score that dimension; (5d.4) record the final per-dimension scores in the `quality_score` frontmatter mapping (values 1 or 2 only)
- [X] T013 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 5.3 — add `quality_score` to the frontmatter template (with a note that the values are filled in by Part 5d after assembly, not at draft time)
- [X] T014 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 5.4 (validate the node) — add OP-14 to the "always check" list (quality_score present, values 1–2, valid keys)
- [X] T015 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 2a.3 (save architecture overview) — add a quality-pass call between body draft (2a.2) and save (2a.3), referencing Part 5d; ensure architecture overview gets a `quality_score` too
- [X] T016 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 5c (save business documents) — add a quality-pass call before each ADR/Runbook/API Summary/Onboarding Guide is written, referencing Part 5d (with `snippet_relevance` marked N/A for these types)

**Checkpoint**: US1 complete. Every saved node has a non-zero `quality_score`.

---

## Phase 5: User Story 3 — Confidence Tagging (P2)

**Goal**: Each inferred field is tagged high/medium/low confidence; `/handoff-review` surfaces low-confidence fields first.

**Independent Test**: Generate documentation where one field was inferred purely from directory/file names; confirm it is tagged `low`; run `/handoff-review` and confirm it appears before high-confidence fields.

- [X] T017 [US3] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 5.2 (populate `inferred_fields`) — add a parallel step that builds `confidence_tags`: for each field in `inferred_fields`, assign `high` (explicit README heading/docstring/comment), `medium` (routes/model names/import patterns), or `low` (directory/file names only), per the deterministic rules in research.md Decision 5
- [X] T018 [US3] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 5.3 — add `confidence_tags` to the frontmatter template (one entry per `inferred_fields` field)
- [X] T019 [US3] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 5.4 (validate the node) — add OP-15 to the "always check" list (confidence_tags values are high/medium/low; keys match inferred_fields)
- [X] T020 [US3] In `.handoff/toolkit/skills/handoff-review/SKILL.md` Step 2.1 — replace the index-order resumption cursor with the confidence-sorted queue algorithm from research.md Decision 6: assign each node a tier (any `low` → Tier 1; else any `medium` → Tier 2; else Tier 3), sort Tier 1 → 2 → 3, preserve index order within each tier, then apply the skip-confirmed cursor within that sorted order
- [X] T021 [US3] In `.handoff/toolkit/skills/handoff-review/SKILL.md` Part 4 (confirm handler) — when a field is confirmed (Enter or rewrite path), also remove that field's entry from `confidence_tags` frontmatter (in addition to removing it from `inferred_fields`); when all fields confirmed, `confidence_tags` is absent or empty
- [X] T022 [US3] In `.handoff/toolkit/skills/handoff-review/SKILL.md` Part 3 (field display) — add the confidence level next to each AI-guessed field label (e.g., `[AI-guessed · low]`) so the giver sees why a field was surfaced early

**Checkpoint**: US3 complete. Review queue is confidence-sorted; confirmation clears confidence tags.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Contract version bump, internal consistency check, and dogfood validation.

- [X] T023 Verify `.handoff/toolkit/rules/output-schema.md` is internally consistent: OP-14 and OP-15 do not contradict existing rules; re-read the full Optional Field Rules section to confirm
- [ ] T024 MANUAL: Run `/handoff-start` on `/home/amreid/Kershless-backend-app` — inspect output against all 6 success criteria: SC-001 (every node has `quality_score`, no 0 values), SC-002 (every inferred sentence in Business Context/Decisions/Warnings has `(src: …)`), SC-003 (3 claims verifiable via citations in 5 min), SC-004 (`/handoff-review` shows low-confidence first), SC-005 (after confirmation, `confidence_tags` + `inferred_fields` empty), SC-006 (`quality-rubric.md` editable independently)
- [ ] T025 [P] Push updated toolkit files to `https://github.com/AmrEidAbdelrahman/handoff-toolkit` master branch after the dogfood test passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — read-only verification
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user-story phases (creates rubric + schema rules they reference)
- **US2 Citations (Phase 3)**: Depends on Phase 2 — must land before US1 because the `no_unsupported_claims` rubric dimension assumes citations exist
- **US1 Quality Pass (Phase 4)**: Depends on Phase 2 and Phase 3
- **US3 Confidence (Phase 5)**: Depends on Phase 2 — independent of US1/US2 logically, but edits the same SKILL.md files so sequenced after Phase 4 to avoid edit conflicts
- **Polish (Phase 6)**: Depends on all prior phases

### File Edit Sequencing (avoid overlapping edits)

`handoff-start/SKILL.md` is edited across Phases 3, 4, and 5. Work top-to-bottom through the file within each phase. Edit order across phases: Steps 3.3/3.5/3.6 (Phase 3) → Step 5.3 citations (Phase 3) → Part 5d + Step 5.3 quality_score (Phase 4) → Step 5.2 + Step 5.3 confidence_tags (Phase 5). Read back each changed section after editing.

### Parallel Opportunities

- T005 + T006 (both new rules in output-schema.md) → sequential (same file section)
- T004 (quality-rubric.md) → [P] with T005/T006 (different file)
- Within Phase 5, T020/T021/T022 all edit handoff-review/SKILL.md → sequential
- T025 → after T024 passes

---

## Implementation Strategy

### MVP (US2 + US1 — the two P1 stories)

1. Phase 1 (Setup — verification)
2. Phase 2 (Foundational — rubric + schema rules)
3. Phase 3 (US2 — citations)
4. Phase 4 (US1 — quality pass)
5. **STOP and VALIDATE**: Run `/handoff-start` on Kershless; check SC-001, SC-002, SC-003, SC-006
6. If P1 criteria pass, proceed to Phase 5 (US3)

### Full Delivery (all stories)

1. Phases 1–4 as above
2. Phase 5 (US3 — confidence tagging)
3. Phase 6 (Polish — consistency check + dogfood + push)

---

## Notes

- All edits are to AI instruction Markdown files — no compiled code, no runtime
- `schema_version` stays at 1; `quality_score` and `confidence_tags` are additive optional fields
- After each SKILL.md edit, read back the changed section to confirm correctness
- `git add -f` required for all `.handoff/toolkit/` files (gitignored by `.handoff/.gitignore`)
- The Kershless project at `/home/amreid/Kershless-backend-app` is the primary dogfood target
