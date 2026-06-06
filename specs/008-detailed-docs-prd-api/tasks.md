# Tasks: Detailed Docs — PRD & API Reference

**Input**: Design documents from `specs/008-detailed-docs-prd-api/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Organization**: Tasks are grouped by user story for independent implementation and testing.
All changes are to Markdown toolkit instruction files — no compiled code except for the fixture
update that validates the VS Code extension path.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: No new project infrastructure needed. This phase anchors consumer-tracing so later tasks don't drift.

- [x] T001 Read and record the full consumer list for `inferred_fields` (OP-04), `api_summary` body rules (OP-12), and `handover_node` H3 conventions (OP-16) by reading `.handoff/toolkit/rules/output-schema.md`, `.handoff/toolkit/skills/handoff-start/SKILL.md`, `.handoff/toolkit/skills/handoff-review/SKILL.md`, and `.handoff/toolkit/skills/handoff-validate/SKILL.md` in full — this prevents producer/consumer drift across all subsequent tasks

---

## Phase 2: Foundational (Schema Rule Changes)

**Purpose**: Schema rules are consumed by every other toolkit file. Update them first so later instruction changes reference valid rule numbers.

**⚠️ CRITICAL**: All story tasks depend on these schema changes being in place.

- [x] T002 Update **OP-04** in `.handoff/toolkit/rules/output-schema.md` to add `product_brief` as a fifth valid `inferred_fields` value alongside the existing four (`business_context`, `depth`, `decisions`, `warnings`)
- [x] T003 Add new advisory rule **OP-17** to `.handoff/toolkit/rules/output-schema.md` documenting the `### Product Brief` H3 convention within `## Business Context` — mirror the wording of OP-16 which documents H3 conventions for `## Technical Context`; specify the five sub-elements (Problem, Target users, Capabilities, Out of scope, Success indicators)
- [x] T004 Update **OP-12 api_summary** entry in `.handoff/toolkit/rules/output-schema.md` to add: "When the api_summary is generated from source-code route detection (not a contract file), `code_refs` is REQUIRED — one entry per endpoint, with `note` set to `METHOD /path — description`"

**Checkpoint**: Schema rules updated — story tasks can now reference OP-17, updated OP-04, and updated OP-12.

---

## Phase 3: User Story 1 — Business Stakeholder Reads PRD Node (Priority: P1) 🎯 MVP

**Goal**: The generator adds a `### Product Brief` H3 subsection within `## Business Context` of `handover_node` documents for domains with an identifiable user-facing product narrative.

**Independent Test**: Run `/handoff-start` on a single domain (e.g., Kershless `competition/`), verify the generated node contains a `### Product Brief` subsection under `## Business Context` with no code identifiers or module paths, and `product_brief` in `inferred_fields`.

### Implementation for User Story 1

- [x] T005 [US1] Add `### Product Brief` template and guidance to `.handoff/toolkit/rules/diagram-methodology.md` as a new section (§ 3.x, after § 3.3 or as § 3.4 before the existing API Summary § 3.4 — renumber as needed): include the five-element structure (Problem, Target users, Capabilities list, Out of scope, Success indicators), the plain-English-only rule, and the omission condition (low confidence → skip entirely)
- [x] T006 [US1] Add **Step 2c.4** to `.handoff/toolkit/skills/handoff-start/SKILL.md` immediately after the existing Step 2c.3 — this step defines the Product Brief inference trigger (HTTP endpoints present OR business-domain module name), the two confidence levels (HIGH/MEDIUM), drafting instructions for each sub-element, and the mandatory content rule (no class names, module paths, framework terminology)
- [x] T007 [US1] Update the node assembly section (Step 5.3 or Step 5 body construction) in `.handoff/toolkit/skills/handoff-start/SKILL.md` to insert `### Product Brief` after the `## Business Context` opening paragraph when Step 2c.4 produced content
- [x] T008 [US1] Update the validation rules in `.handoff/toolkit/skills/handoff-start/SKILL.md` (Step 5.4 or the final validation checklist) to add: check that `product_brief` is in `inferred_fields` when `### Product Brief` is present; check that no capability bullet contains a backtick or `/`; check that the section was omitted (not placeholder) when confidence was LOW
- [x] T009 [US1] Update `.handoff/toolkit/rules/quality-rubric.md` — in the `business_value_clarity` dimension description, add a note that this dimension covers `### Product Brief` content when present, and that the score-0 trigger applies to Product Brief bullets that state only WHAT without a user benefit (no "so that", "enabling", "allowing" phrasing)
- [x] T010 [US1] Update `.handoff/toolkit/skills/handoff-review/SKILL.md` — in the inferred fields walkthrough, add handling for `product_brief`: when a node has `product_brief` in `inferred_fields`, present the `### Product Brief` subsection content with three confirmation prompts ("Is the problem statement accurate?", "Is the target user description accurate?", "Are the capabilities listed correctly?") using the same confirm/edit/skip UX as the existing `business_context` review
- [x] T011 [US1] Update `.handoff/toolkit/skills/handoff-validate/SKILL.md` — add three advisory checks for `### Product Brief`: (a) warn if any capability bullet contains a code identifier or `/`; (b) warn if `product_brief` is in `inferred_fields` but no `### Product Brief` subsection is present (frontmatter drift); (c) warn if `### Product Brief` is present but `product_brief` is NOT in `inferred_fields` (unlabelled inference)

**Checkpoint**: User Story 1 complete — run `/handoff-start` on `competition/` domain of Kershless-backend-app in-session to verify Product Brief appears with correct content and no validation errors.

---

## Phase 4: User Story 2 — Developer Reads API Reference Node (Priority: P1)

**Goal**: The generator extends `api_summary` generation to trigger from HTTP route source files (not only contract files), with one `code_refs` entry per endpoint so the VS Code reader can navigate to handlers.

**Independent Test**: Run `/handoff-start` on a domain with Django `urls.py` but no OpenAPI file (e.g., Kershless `competition/`). Verify that an `api-summary.md` node is generated, contains `## Endpoints / Operations` with at least one row, and has a `code_refs` array with one entry per endpoint.

### Implementation for User Story 2

- [x] T012 [P] [US2] Update **Step 2c.3** in `.handoff/toolkit/skills/handoff-start/SKILL.md` — after the existing contract-file detection block, add a source-code route detection block: check for `urls.py` (Django), `routes.js`/`router.js` or files importing `express.Router` (Express/Fastify), files containing `Blueprint(` or `@app.route(` (Flask), files containing `APIRouter(` or `@app.get/post/put/delete/patch(` (FastAPI); if found AND no contract file was detected, set `source_route_file_found = true` and record the file path; note that route file reading counts toward the 8-file cap
- [x] T013 [US2] Update **Step 2c.3** continued in `.handoff/toolkit/skills/handoff-start/SKILL.md` — add the extraction sub-step: when `source_route_file_found = true`, read the route file and extract for each endpoint: (a) HTTP method, (b) path pattern, (c) handler/view reference; then for each handler reference, read the handler function (5–15 lines, per Step 3.7 rules) and extract: docstring or first comment, parameter names, return shape indicator; record the handler's `file`, `line`, `end_line` for `code_refs` assembly (depends on T012)
- [x] T014 [US2] Update the api_summary assembly instructions in `.handoff/toolkit/skills/handoff-start/SKILL.md` (Step 5 api_summary section) — when source-code route path was used: group endpoints by path prefix when >3 endpoints share a prefix; write each entry with method, path, description, params, response fields, auth requirement; build `code_refs` array (one entry per endpoint, `note` = `"METHOD /path — description"`); validate CR-01 through CR-05 on all code_refs entries (depends on T012, T013)
- [x] T015 [P] [US2] Update **§ 3.4** of `.handoff/toolkit/rules/diagram-methodology.md` — extend the api_summary template to include an optional `code_refs` frontmatter block (shown as "required when generated from source, optional when from contract file"); extend the `## Endpoints / Operations` template to show the per-endpoint format with grouping under H3 sub-headings; update the detection trigger list to include the four source-code patterns from T012
- [x] T016 [P] [US2] Update `.handoff/toolkit/skills/handoff-validate/SKILL.md` — add validation check for `api_summary` nodes: when source-code generation is indicated (heuristic: `code_refs` is present), verify that every endpoint row in `## Endpoints / Operations` has a corresponding `code_refs` entry; warn if a `code_refs` entry's `file` does not match any visible endpoint row's handler path

**Checkpoint**: User Story 2 complete — the api_summary for `competition/` (Kershless) should be generated from `urls.py` with `code_refs` entries that pass CR-01 through CR-05.

---

## Phase 5: User Story 3 — VS Code Reader Navigation for API Entries (Priority: P2)

**Goal**: Each API reference entry carries a `code_refs` entry so the VS Code reader can navigate to the handler. This is delivered automatically by Phase 4 (T014 emits `code_refs`). This phase validates the end-to-end path in the extension.

**Independent Test**: Open a generated `api-summary.md` node in the VS Code reader, verify the code pane shows handler tabs, and confirm clicking a tab navigates to the correct line.

### Implementation for User Story 3

- [x] T017 [US3] Add a second fixture node to `extension/tests/integration/fixtures/sample-workspace/.handoff/output/` representing an `api-summary.md` with `doc_type: api_summary`, two endpoint `code_refs` entries pointing to `src/auth/index.ts` and `src/auth/jwt.ts`, and an `## Endpoints / Operations` section — add a corresponding entry to `index.json`; this exercises the existing code_refs navigation path for a non-handover_node doc_type
- [x] T018 [US3] Verify that `extension/src/handoff/nodeParser.ts` correctly parses `doc_type: api_summary` nodes — confirm `parseNode` does not filter or drop sections for non-`handover_node` doc_types, and that `parseCodeRefs` works regardless of `doc_type`; if a gap is found, fix it in `nodeParser.ts`

**Checkpoint**: The VS Code integration test suite (`npm run test` in `extension/`) passes with the new fixture. Code pane loads for the api_summary node.

---

## Phase 6: User Story 4 — Reviewer PRD Coverage Check (Priority: P3)

**Goal**: `/handoff-review` flags capabilities listed in `### Product Brief` that have no corresponding evidence in `## Technical Context`.

**Independent Test**: Generate a node with a `### Product Brief` listing three capabilities, run `/handoff-review`, and verify the output includes a "Product Brief coverage" check section that flags at least one capability as needing verification.

### Implementation for User Story 4

- [x] T019 [US4] Update `.handoff/toolkit/skills/handoff-review/SKILL.md` — add a post-walkthrough coverage check step: for each capability bullet in `### Product Brief`, search the node's `## Technical Context` body for a related term or concept; report capabilities that have no evident Technical Context coverage as "potential coverage gaps" (not errors); present the report after the inferred-fields walkthrough completes

**Checkpoint**: User Story 4 complete — the review skill surfaces Product Brief / Technical Context gaps.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T020 [P] Perform a full consumer-consistency check: re-read all six modified files (output-schema.md, diagram-methodology.md, quality-rubric.md, handoff-start/SKILL.md, handoff-review/SKILL.md, handoff-validate/SKILL.md) and verify that every reference to `product_brief`, `### Product Brief`, and source-code api_summary is internally consistent (field names match, rule numbers match, step references match)
- [x] T021 [P] Update the quality-rubric applicability table in `.handoff/toolkit/rules/quality-rubric.md` — add a footnote confirming that for `handover_node` documents with `### Product Brief`, `business_value_clarity` covers both the Business Context paragraph and the Product Brief subsection; confirm `snippet_relevance` remains N/A for api_summary
- [x] T022 Dry-run `/handoff-start` on the Kershless-backend-app `competition/` domain in-session — verify: (a) `### Product Brief` appears under `## Business Context` with no code identifiers; (b) `api-summary.md` is generated from `urls.py`; (c) `code_refs` has one entry per endpoint; (d) no existing validation rules are broken; record any bugs found and fix them before closing the feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Schema)**: Depends on Phase 1 — BLOCKS all story phases
- **Phase 3 (US1 Product Brief)**: Depends on Phase 2
- **Phase 4 (US2 API Reference)**: Depends on Phase 2; can run in parallel with Phase 3
- **Phase 5 (US3 VS Code)**: Depends on Phase 4 (needs api_summary code_refs from T014)
- **Phase 6 (US4 Review)**: Depends on Phase 3 (needs Product Brief from T005/T006)
- **Phase 7 (Polish)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no story dependencies
- **US2 (P1)**: Can start after Phase 2 — no story dependencies; parallel with US1
- **US3 (P2)**: Depends on US2 (code_refs emitted by T014)
- **US4 (P3)**: Depends on US1 (Product Brief content from T005/T006)

### Within Each Story

- Schema updates (output-schema.md) → diagram-methodology.md template → SKILL.md instructions → review/validate consumers
- Foundational rules before instruction logic (T002/T003/T004 before T005-T011)

### Parallel Opportunities

- T005 and T015 can run in parallel (diagram-methodology.md vs SKILL.md)
- T006 and T009 can run in parallel (SKILL.md Step 2c.4 vs quality-rubric.md)
- T012 and T015 can run in parallel (SKILL.md Step 2c.3 extension vs diagram-methodology.md § 3.4)
- T016 and T017 can run in parallel (validate SKILL.md vs fixture creation)
- T020 and T021 can run in parallel (consumer check vs rubric update)

---

## Parallel Example: User Story 1

```text
# After Phase 2 completes, these US1 tasks can start in parallel:
T005: Add Product Brief template to diagram-methodology.md
T006: Add Step 2c.4 to SKILL.md (inference trigger + drafting)
T009: Update quality-rubric.md (business_value_clarity coverage)

# T007 and T008 depend on T006 (must add the step before referencing assembly/validation):
T007: Update SKILL.md Step 5 assembly to insert ### Product Brief
T008: Update SKILL.md Step 5.4 validation for product_brief

# T010 and T011 are independent of T006-T008:
T010: Update handoff-review/SKILL.md for product_brief walkthrough
T011: Update handoff-validate/SKILL.md for Product Brief drift checks
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 — both P1)

1. Complete Phase 1: Setup (consumer trace)
2. Complete Phase 2: Schema rule changes (T002–T004)
3. Complete Phase 3 (US1) and Phase 4 (US2) in parallel
4. **STOP and VALIDATE**: Dry-run on Kershless `competition/` (T022)
5. Ship — US3 and US4 can follow in a subsequent session

### Incremental Delivery

1. Phase 2 → schema foundation
2. Phase 3 → Product Brief in docs (non-technical stakeholder value)
3. Phase 4 → API reference from source (developer value)
4. Phase 5 → VS Code navigation for API entries (reader integration)
5. Phase 6 → PRD coverage check in review (quality gate value)

---

## Notes

- All tasks modify Markdown instruction files — no build step required; changes take effect next `/handoff-start` session
- The producer/consumer drift risk is high for this feature (6 files touch the same concepts); T001 and T020 exist specifically to catch this
- T022 (dry-run on Kershless) is the ground-truth validation — typecheck and unit tests do not cover generator instruction correctness
- Commit after each phase completes, not after each task, to keep the diff reviewable
