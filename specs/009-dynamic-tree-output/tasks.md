# Tasks: Dynamic Tree Output Structure

**Input**: Design documents from `specs/009-dynamic-tree-output/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/schema-changes.md ✓

**Organization**: Tasks follow the plan's four phases (A–D), mapped to spec user stories. Extension data plumbing (Phase B) and schema docs (Phase A) are foundational and block all user-story work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase
- **[Story]**: User story from spec.md (US1–US4)

---

## Phase 1: Setup

**Purpose**: Confirm starting state; no structural setup needed — this project already has the required directories and tooling.

- [ ] T001 Read `extension/src/handoff/types.ts`, `indexLoader.ts`, `validation.ts`, and `tree.ts` fully to confirm the as-built state matches `research.md` §"Existing Extension State"
- [ ] T002 Read `.handoff/toolkit/rules/output-schema.md` and `.handoff/toolkit/skills/handoff-start/SKILL.md` fully to identify exact insertion points for new rules and step 2.4

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema spec docs + extension type/loader/validation changes. No user-story work can begin until this phase is complete.

**⚠️ CRITICAL**: US1, US2, US3, and US4 all depend on this phase completing first.

### Schema Documentation

- [ ] T003 [P] In `Handoff_Node_Schema_Spec.md` §3 (Optional Fields table): add `parent` row — type string, optional, description "id of the parent node; absence means root-level", validation "must match id pattern; must not be self-referential; must not create a cycle; must not be set on reserved root ids"
- [ ] T004 [P] In `Handoff_Node_Schema_Spec.md` §5 (Index Schema): add `parent` to the node entry JSON example and document it as optional; add a "Reserved Root Nodes" sub-section naming `project-overview` and `technical-overview` as always-present, always root-level
- [ ] T005 [P] In `Handoff_Node_Schema_Spec.md` §7 (Validation Rules): add three rules — one for the `parent` frontmatter field (OP-18), one for index entry dangling parent (IX-04: warning), one for reserved-root with parent set (IX-05: warning)
- [ ] T006 [P] In `.handoff/toolkit/rules/output-schema.md`: add **Rule OP-18** after OP-17 — full text for `parent` field validation (pattern, self-ref prohibited, cycle prohibited, reserved roots prohibited, absence valid)
- [ ] T007 [P] In `.handoff/toolkit/rules/output-schema.md`: add **Rule IX-04** and **Rule IX-05** in Part 3 (Index Consistency Validation) — IX-04: dangling `parent` reference is a warning; IX-05: reserved root ids must not have `parent`

### Extension: TypeScript Data Plumbing

- [ ] T008 In `extension/src/handoff/types.ts`: add `parent?: string` to the `IndexEntry` interface (after the `dependencies` field, before `file`)
- [ ] T009 In `extension/src/handoff/indexLoader.ts`: in the `.map()` that builds `IndexEntry` objects, extract `parent` from each raw node entry: `parent: typeof n.parent === 'string' && n.parent.trim() !== '' ? n.parent.trim() : undefined`
- [ ] T010 In `extension/src/handoff/validation.ts`: add `crossCheckParents(entries: IndexEntry[], knownIds: Set<string>): ValidationIssue[]` function — for each entry with a `parent` value: (a) if `parent` not in `knownIds` → warning `INDEX_DANGLING_PARENT`; (b) if entry `id` is `project-overview` or `technical-overview` → warning `INDEX_ROOT_HAS_PARENT`; call this from `validateIndex()` after the existing checks

**Checkpoint**: Schema docs updated, `IndexEntry.parent` typed, index loader extracts parent, validation checks dangling refs. All downstream phases can now start.

---

## Phase 3: User Story 1 — Receiver Navigates a Project-Shaped Tree (Priority: P1) 🎯 MVP

**Goal**: A receiver opens the VS Code extension and sees a nested sidebar tree that mirrors the actual project structure. They can drill down to find the node they need.

**Independent Test**: Load the updated fixture in the extension. Verify the sidebar shows nested nodes (e.g., `authentication` appears as a child under `modules`, not at the flat depth-group level).

### Implementation

- [ ] T011 [US1] In `extension/src/workspace/outputRepository.ts`: update the `parentById` map construction to use `IndexEntry.parent` as a fallback when the parsed node file's `parent` is undefined — `new Map(manifest.nodes.map(e => [e.id, nodeById.get(e.id)?.parent ?? e.parent]))` — so the tree builds correctly even before node files are individually read
- [ ] T012 [US1] Update `extension/tests/integration/fixtures/sample-workspace/.handoff/output/index.json`: add `parent` fields to existing node entries — set `authentication.parent = "technical-overview"`, `jwt-internals.parent = "authentication"`, `dev-environment.parent = "technical-overview"` (or another sensible grouping); verify `project-overview` and `error-handling` remain root-level
- [ ] T013 [US1] Update the corresponding node `.md` files in `extension/tests/integration/fixtures/sample-workspace/.handoff/output/nodes/`: add `parent: technical-overview` (or matching parent) to the frontmatter of `authentication.md`, `jwt-internals.md`, and `dev-environment.md`
- [ ] T014 [US1] In `extension/tests/integration/`: add or update an integration test that loads the updated fixture and verifies the built tree contains `jwt-internals` as a grandchild of `technical-overview` (through `authentication`); verify the `flattenReadingOrder` result has `jwt-internals` immediately after `authentication`

**Checkpoint**: Load the updated fixture in the extension dev host. The sidebar shows `authentication` nested under `technical-overview`, and `jwt-internals` nested under `authentication`. A receiver can expand the tree to find the right node.

---

## Phase 4: User Story 2 — Toolkit Infers Tree Shape (P2) + User Story 3 — Parent Nodes with Content (P2)

**Goal (US2)**: Running `/handoff-start` on any project produces a project-appropriate tree with no user configuration. **Goal (US3)**: Every parent/grouping node has meaningful Business Context and Technical Context explaining why the grouping exists.

**Independent Test (US2)**: Run `/handoff-start` on the sample-workspace. Verify `session.json` contains a `proposed_tree` that assigns parents to all domain nodes and that grouping nodes are present in the output.

**Independent Test (US3)**: Open any generated grouping node (e.g., the `modules` parent). Verify it has a non-empty `## Business Context` and `## Technical Context` with no placeholder text.

### Implementation

- [ ] T015 [P] [US2] [US3] In `.handoff/toolkit/skills/handoff-start/SKILL.md`: insert new **Step 2.4 — Infer tree shape** immediately after Step 2.3. Step 2.4 must: (1) determine project type using the four detection signals from `plan.md §Phase C`, (2) construct a `proposed_tree` map of `{ node-id → parent-id | null }` that always includes `"project-overview": null` and `"technical-overview": null`, (3) write `proposed_tree` to `session.json`
- [ ] T016 [P] [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md`: update **Steps 3.x** (node writing) to read the assigned parent from `proposed_tree[node_id]` and write it as the `parent` frontmatter field on every generated node; write the same `parent` value to the corresponding `index.json` node entry
- [ ] T017 [US3] In `.handoff/toolkit/skills/handoff-start/SKILL.md`: add **grouping node generation** instructions — for each id that appears only as a `parent` value in `proposed_tree` (not as a pending domain section), generate a full `handover_node` with: `id` matching the proposed_tree key, `depth: supporting`, no `parent` (root-level grouping), no `code_refs` required, `## Business Context` explaining why this grouping exists, `## Technical Context` describing how the pieces within it relate to each other; these grouping nodes are written before the domain leaf nodes that reference them
- [ ] T018 [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md`: add fallback instructions for Step 2.4 — when no confident project type can be determined, set `proposed_tree` to `{ "project-overview": null, "technical-overview": null }` and write all domain nodes as root-level; add a note in the output to the giver that auto-classification was not possible

**Checkpoint**: Run `/handoff-start` on the sample-workspace (or a test project). Confirm `session.json` has `proposed_tree`, each generated node file has a `parent` frontmatter field, each index entry has a `parent` field, and grouping parent nodes exist with non-empty content.

---

## Phase 5: User Story 4 — Extension Renders Any Tree Without Modification (Priority: P3)

**Goal**: The extension's sidebar renders arbitrary tree shapes produced by the toolkit. Adding a new project type or grouping to the toolkit requires zero extension code changes.

**Independent Test**: Produce a hand-crafted output with an unusual tree (e.g., a monorepo layout with package-level root nodes). Load it in the extension. Verify correct nesting without any code change to the extension.

### Unit Tests

- [ ] T019 [P] [US4] In `extension/tests/unit/indexLoader.test.ts`: add tests for `parent` extraction — (a) parent present and valid string → carried into `IndexEntry.parent`; (b) parent absent → `IndexEntry.parent` is `undefined`; (c) parent is non-string value → silently discarded (undefined)
- [ ] T020 [P] [US4] In `extension/tests/unit/validation.test.ts`: add tests for `crossCheckParents` — (a) valid parent reference → no issues; (b) parent references a non-existent id → one warning `INDEX_DANGLING_PARENT`; (c) `project-overview` node with `parent` set → one warning `INDEX_ROOT_HAS_PARENT`; (d) `technical-overview` node with `parent` set → one warning `INDEX_ROOT_HAS_PARENT`

### Fixture Extension (edge cases)

- [ ] T021 [US4] Add a second fixture variant at `extension/tests/integration/fixtures/dangling-parent-workspace/` (or as a separate test case within existing fixture): a minimal `index.json` with one node whose `parent` references a non-existent id; verify the integration test confirms the node loads at root level and a validation warning is surfaced, with no crash

**Checkpoint**: All unit tests pass. The extension loads a fixture with a dangling parent without crashing. Any tree shape the toolkit produces renders correctly — no hard-coded project-type logic exists in the extension.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T022 [P] Update `Handoff_Node_Schema_Spec.md` §8 and §9 (example nodes and index file): update the Authentication example to include `parent: modules` in its frontmatter; update the example `index.json` to include `parent` fields on the auth and error-handling entries, showing a shallow two-level tree
- [ ] T023 [P] In `.handoff/toolkit/skills/handoff-validate/SKILL.md`: ensure the validate skill checks Rule OP-18 (parent field) — add it to the checklist if not already present (check first; it may already be covered by the output-schema.md rules the skill reads)
- [ ] T024 Run the full extension test suite (`npm test` in `extension/`) and confirm all tests pass including the new ones added in T019–T021

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user-story phases
- **US1 (Phase 3)**: Depends on Phase 2 (specifically T008–T010 for IndexEntry.parent and outputRepository)
- **US2+US3 (Phase 4)**: Depends on Phase 2 completion (schema rules must be in place before toolkit instructions reference them)
- **US4 (Phase 5)**: Depends on T008–T010 (validation); T019–T020 can run in parallel with Phase 4
- **Polish (Phase 6)**: Depends on all prior phases

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (T008–T010) + T011 (outputRepository wiring)
- **US2 (P2)**: Depends on Foundational (T003–T007 for schema rules that toolkit instructions reference)
- **US3 (P2)**: Depends on T015 (Step 2.4) — grouping node generation builds on tree inference
- **US4 (P3)**: Depends on Foundational (T008–T010); tests (T019–T020) can run after T009–T010

### Within Each Phase

- Schema doc tasks (T003–T007): all marked [P], can run in parallel
- Extension plumbing (T008–T010): sequential — T008 (types) → T009 (loader) → T010 (validation)
- Toolkit instruction tasks (T015–T018): T015 (Step 2.4) → T016 (node writing) → T017 (grouping nodes) → T018 (fallback); T015 and T016 can be written together in one edit pass

### Parallel Opportunities

All T003–T007 schema doc tasks can run in parallel (different files).
T019 and T020 (unit tests for US4) can run in parallel with Phase 4 toolkit work.
T022 and T023 (Polish) can run in parallel.

---

## Parallel Example: Foundational Phase

```
# Schema doc tasks (all [P], different files):
T003: Handoff_Node_Schema_Spec.md §3 — parent optional field
T004: Handoff_Node_Schema_Spec.md §5 — index entry parent + reserved roots
T005: Handoff_Node_Schema_Spec.md §7 — OP-18, IX-04, IX-05 rules
T006: output-schema.md — Rule OP-18
T007: output-schema.md — Rules IX-04, IX-05

# Extension tasks (sequential, same module):
T008 → T009 → T010
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T010)
3. Complete Phase 3: US1 (T011–T014)
4. **STOP and VALIDATE**: Open the sample-workspace fixture in the extension dev host. Confirm nested tree renders correctly.

**MVP deliverable**: The extension sidebar shows a nested project-shaped tree when the output contains `parent` fields.

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready (schema documented, extension plumbed)
2. Phase 3 (US1) → Receiver can navigate the tree → **Demo-able end-to-end**
3. Phase 4 (US2+US3) → Toolkit produces tree automatically → **Full feature complete**
4. Phase 5 (US4) → Edge cases covered, unit tests green → **Production-ready**
5. Phase 6 → Docs polished, full test suite passing → **Mergeable**

---

## Notes

- [P] tasks = different files, no cross-task dependencies within the same phase
- T008 → T009 → T010 must be done in order (types before loader before validation)
- T015 → T016 → T017 should be written as a single editing pass on `handoff-start/SKILL.md` to avoid partial states
- The extension already has `buildTree()`, `ParsedNode.parent?`, and `outputRepository.ts` wiring from feature 007 — do not re-implement; just add the `IndexEntry.parent` data flow (T008–T011)
- When updating fixture files (T012–T013), keep the tree shallow (max 2 levels) to avoid over-engineering the test fixture
