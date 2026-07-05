# Tasks: Dual-Tree Output (Business + Technical)

**Input**: Design documents from `specs/010-dual-tree-output/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/schema-changes.md ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US4)

---

## Phase 1: Setup

**Purpose**: Verify branch and test baseline before making changes.

- [ ] T001 Confirm branch is 010-dual-tree-output and run `npm test` in extension/ to establish baseline (all 100 tests must pass before any changes)

---

## Phase 2: Foundational — Extension Constant Updates

**Purpose**: Remove `technical-overview` from pinned roots. This is a prerequisite for all fixture and test work — fixtures and integration tests must reflect the new single-root model.

**⚠️ CRITICAL**: No fixture or integration test work can begin until this phase is complete and tests pass.

- [ ] T002 In `extension/src/handoff/tree.ts` line 12, change `PINNED_IDS` from `['project-overview', 'technical-overview']` to `['project-overview']`
- [ ] T003 In `extension/src/handoff/validation.ts`, change `RESERVED_ROOT_IDS` from `new Set(['project-overview', 'technical-overview'])` to `new Set(['project-overview'])`
- [ ] T004 In `extension/tests/unit/index-validation.test.ts`, update the test `'warns when technical-overview has a parent set (IX-05)'` — it should now expect `issues.length === 0` (technical-overview is no longer reserved, so a parent field on it is not an error)
- [ ] T005 In `extension/tests/unit/index-validation.test.ts`, add a new test in the `crossCheckParents` suite: `'does not warn when technical-overview has a parent (no longer a reserved root)'` — assert `crossCheckParents([{ id: 'technical-overview', parent: 'technical', ... }]).length === 0`
- [ ] T006 In `extension/tests/integration/browse.test.ts`, update the assertion `assert.equal(tree[1].kind, 'pinned'); assert.equal(tree[1].id, 'technical-overview')` — with only one pinned root, remove this assertion and update any test that checks for two pinned nodes
- [ ] T007 Run `cd extension && npx tsc && npm test` — all tests must pass (some will fail due to fixture mismatch; note which, proceed to Phase 4)

**Checkpoint**: Extension constants updated. Foundational change complete.

---

## Phase 3: User Story 1 — Giver Confirms Inferred Tree Structure (Priority: P1) 🎯 MVP

**Goal**: The toolkit scans the project, proposes both business and technical trees to the giver, accepts adjustments, and writes the confirmed structure to `session.json` before any node generation begins.

**Independent Test**: Run the toolkit against a sample project; verify it presents two ASCII trees and asks for confirmation before writing any node files.

### Implementation for User Story 1

- [ ] T008 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md`, rewrite **Step 2.4** heading and opening to: "**Step 2.4 — Detect dual-tree structure**". Add sub-step 2.4.1: business domain inference — scan top-level non-infrastructure folders (`auth/`, `billing/`, `users/` etc.), route file prefixes (`/api/billing` → billing domain), model/schema/service file names (`payment.service.ts` → payment/billing domain); deduplicate signals into a proposed business domains list; if no signals found, propose a single `general` domain and note this to the giver
- [ ] T009 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md`, add sub-step 2.4.2 under the rewritten Step 2.4: technical structure detection — scan for `services/` or `*.service.*` → `services` branch; `routes/`, `controllers/`, `api/`, `endpoints/` → `api` branch; `models/`, `schemas/`, `migrations/` → `data-model` branch; `components/`, `pages/`, `views/` → `ui` branch (frontend only); `Dockerfile`, `docker-compose.yml`, `k8s/`, `terraform/`, `.github/workflows/` → `infrastructure` branch; include only branches where at least one file is detected
- [ ] T010 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md`, add sub-step 2.4.3: infer cross-references — for each business domain, find matching technical nodes by name similarity (e.g., `billing` domain ↔ `payment-service`, `billing-routes`); store as `cross_references: { node-id → [dep-id, ...] }` map
- [ ] T011 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md`, add sub-step 2.4.4: write proposed state to `session.json` — fields `proposed_business_tree: { node-id → parent-id | null }` and `proposed_technical_tree: { node-id → parent-id | null }` and `cross_references: { node-id → [dep-id, ...] }`; deprecate the old `proposed_tree` field (new sessions omit it)
- [ ] T012 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md`, add **Step 2.5** after Step 2.4: "**Step 2.5 — Present proposed trees and get giver confirmation**". Instruct Claude to render both trees as ASCII art in a single message (business tree first, then technical tree, then inferred cross-references). After the trees, list the adjustment commands the giver can use: merge domains, rename branches, add domains, remove branches, adjust cross-refs. End with: "Say 'looks good' when ready." Wait for giver response; process any adjustments by re-rendering the updated trees; repeat until the giver confirms. Update `session.json` with the confirmed trees.

**Checkpoint**: Toolkit now proposes both trees interactively. US1 complete — test by running `/handoff-start` against any project.

---

## Phase 4: User Story 2 & 3 — Receiver Navigation via Business and Technical Trees (Priority: P2)

**Goal**: The extension renders a dual-tree fixture correctly — `business` and `technical` as top-level collapsible branches, with nested children and bidirectional cross-references accessible as clickable links.

**Independent Test US2**: Open the updated sample-workspace fixture in the extension; verify the business branch is visible, collapsible, and cross-references resolve to technical nodes.

**Independent Test US3**: Verify the technical branch is visible, collapsible, code_refs open the correct file, and cross-references resolve to business nodes.

### Fixture: Create dual-tree sample workspace

- [ ] T013 [P] [US2] Delete `extension/tests/integration/fixtures/sample-workspace/.handoff/output/nodes/technical-overview.md` — it is replaced by `technical.md`
- [ ] T014 [P] [US2] Create `extension/tests/integration/fixtures/sample-workspace/.handoff/output/nodes/business.md` with frontmatter: `id: business`, `title: Business`, `depth: core`, `schema_version: 1`, `dependencies: []`. Body: Business Context = "Root of the business domain tree.", Technical Context = "See technical branch for implementation."
- [ ] T015 [P] [US2] Create `extension/tests/integration/fixtures/sample-workspace/.handoff/output/nodes/technical.md` with frontmatter: `id: technical`, `title: Technical`, `depth: core`, `schema_version: 1`, `dependencies: []`. Body: Business Context = "See business branch for domain context.", Technical Context = "Root of the technical structure tree — services, API, infrastructure."
- [ ] T016 [P] [US2] Create `extension/tests/integration/fixtures/sample-workspace/.handoff/output/nodes/billing.md` with frontmatter: `id: billing`, `title: Billing`, `depth: supporting`, `schema_version: 1`, `parent: business`, `dependencies: [payment-service, api-summary]`. Body: Business Context = "Billing domain — subscription model and pricing.", Technical Context = "Implemented by payment-service and api-summary. See those nodes for implementation details."
- [ ] T017 [P] [US3] Create `extension/tests/integration/fixtures/sample-workspace/.handoff/output/nodes/services.md` with frontmatter: `id: services`, `title: Services`, `depth: supporting`, `schema_version: 1`, `parent: technical`, `dependencies: []`. Body: Business Context = "See business branch.", Technical Context = "Services layer — payment-service and related service classes."
- [ ] T018 [US2] Update `extension/tests/integration/fixtures/sample-workspace/.handoff/output/index.json`: add `business` (depth: core), `technical` (depth: core), `billing` (depth: supporting, parent: business, dependencies: [payment-service, api-summary]), `services` (depth: supporting, parent: technical) nodes; update `authentication` to `parent: services`; update `api-summary` to `parent: technical`; update `error-handling` to `parent: technical`; update `dev-environment` to `parent: technical`; update `jwt-internals` to `parent: authentication`; remove technical-overview entry; keep project-overview
- [ ] T019 [US2] Update `extension/tests/integration/fixtures/sample-workspace/.handoff/output/nodes/authentication.md` frontmatter: change `parent: technical-overview` to `parent: services`
- [ ] T020 [P] [US3] Update `extension/tests/integration/fixtures/sample-workspace/.handoff/output/nodes/error-handling.md` frontmatter: change `parent: technical-overview` to `parent: technical`
- [ ] T021 [P] [US3] Update `extension/tests/integration/fixtures/sample-workspace/.handoff/output/nodes/dev-environment.md` frontmatter: change `parent: technical-overview` to `parent: technical`
- [ ] T022 [P] [US3] Update `extension/tests/integration/fixtures/sample-workspace/.handoff/output/nodes/api-summary.md` frontmatter: change `parent: technical-overview` to `parent: technical`

### Integration tests

- [ ] T023 [US2] In `extension/tests/integration/browse.test.ts`, add test `'only project-overview is pinned (not technical)'`: assert `tree.filter(n => n.kind === 'pinned').length === 1` and `tree[0].id === 'project-overview'`
- [ ] T024 [US2] In `extension/tests/integration/browse.test.ts`, add test `'business and technical appear as collapsible nodes in core depth group'`: assert core group children include `business` (collapsible) and `technical` (collapsible)
- [ ] T025 [US2] In `extension/tests/integration/browse.test.ts`, add test `'billing is nested under business, with payment-service in its dependencies'`: assert `business.children` contains `billing`; assert `billing.dependencies` includes `'payment-service'`
- [ ] T026 [US3] In `extension/tests/integration/browse.test.ts`, add test `'authentication is nested under services, which is nested under technical'`: assert `technical.children` includes `services`; assert `services.children` includes `authentication`
- [ ] T027 [US3] In `extension/tests/integration/browse.test.ts`, add test `'reading order visits business subtree then technical subtree'`: call `flattenReadingOrder(tree)` and verify `business` appears before `technical`, and `billing` appears before `services`
- [ ] T028 Run `cd extension && npx tsc && npm test` — all tests must pass including the new ones

**Checkpoint**: Extension renders dual-tree correctly. US2 and US3 complete.

---

## Phase 5: User Story 4 — Giver Fills Business Context During Generation (Priority: P3)

**Goal**: The toolkit generates business nodes before technical nodes, prompting the giver for WHY context (business rules, decisions, warnings) at each business leaf node. Technical nodes are drafted from code and the giver reviews.

**Independent Test**: Run generation on a business leaf node; verify the toolkit asks for business context before writing the node, and the generated node contains both giver-supplied WHY content and a Technical Context pointer to related technical nodes.

### Implementation for User Story 4

- [ ] T029 [US4] In `.handoff/toolkit/skills/handoff-start/SKILL.md`, update **Step 5** generation order: (1) generate `business` root node, (2) generate business domain nodes (children of `business`), prompting giver with "Why does this domain exist? What business rules govern it?", (3) generate business leaf nodes prompting for: business rules, pricing/policy details, decisions made, warnings for the next developer, (4) generate `technical` root node, (5) generate technical sub-branch nodes from structure, (6) generate technical leaf nodes from code analysis with giver review, (7) generate `project-overview` last (can reference both trees once written)
- [ ] T030 [US4] In `.handoff/toolkit/skills/handoff-start/SKILL.md`, update the **Step 5.3 node frontmatter template** to: populate `parent` from `proposed_business_tree[node-id]` or `proposed_technical_tree[node-id]` (whichever tree the node belongs to); populate `dependencies` from `cross_references[node-id]`; omit `code_refs` for business nodes unless the giver provides them; require `code_refs` for technical leaf nodes
- [ ] T031 [US4] In `.handoff/toolkit/skills/handoff-start/SKILL.md`, add a prompt template for business leaf nodes that asks the giver for: (a) why this feature/domain works the way it does, (b) what the key business rules are, (c) what decisions were made and why, (d) what warnings the next developer needs. Specify that the giver's answers go into Business Context + Decisions + Warnings sections; the Technical Context section is pre-filled with the cross-reference pointer to implementing technical nodes.

**Checkpoint**: Toolkit generates business-first with giver prompts. US4 complete.

---

## Phase 6: Polish — Schema Documentation

**Purpose**: Update schema spec and toolkit rules to document the new model.

- [ ] T032 [P] In `Handoff_Node_Schema_Spec.md`, update §5 Reserved Root Nodes table: remove the `technical-overview` row, keep only `project-overview`. Add a §5.1 "Standard Branch Nodes" section documenting `business` and `technical` as conventional (not reserved) root-level nodes with `depth: core`
- [ ] T033 [P] In `Handoff_Node_Schema_Spec.md`, update §9 example index to show the dual-tree structure: `project-overview` (pinned), `business` (core), `technical` (core), `billing` (supporting, parent: business), `payment-service` (supporting, parent: services), etc.
- [ ] T034 [P] In `.handoff/toolkit/rules/output-schema.md`, update Rule IX-05 to reference only `project-overview` (remove `technical-overview` from the reserved root list). Add Rule OP-19: "Output SHOULD contain `business` and `technical` as the two primary branches with `depth: core` and no `parent` field." Add Rule OP-20: "Business leaf nodes MUST list implementing technical node IDs in `dependencies`; technical leaf nodes MUST list their business context node ID in `dependencies`."
- [X] T035 Run `cd extension && npx tsc && npm test` — final full test run, all tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all other phases**
- **US1 (Phase 3)**: Depends on Phase 2 — SKILL.md only, no fixture dependency
- **US2+US3 (Phase 4)**: Depends on Phase 2 — fixture + integration tests
- **US4 (Phase 5)**: Depends on Phase 3 (SKILL.md context) — sequential
- **Polish (Phase 6)**: Depends on Phase 4 passing tests — can run in parallel internally

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — SKILL.md changes are independent of fixture
- **US2 (P2)**: Depends on Foundational — fixture + tests touch same files as US3
- **US3 (P2)**: Depends on Foundational — can run in parallel with US2 in different test blocks, but fixture edits must be sequential
- **US4 (P3)**: Depends on US1 (extends the SKILL.md Step 5 that US1 sets up)

### Parallel Opportunities

- T002, T003 [P] — different files
- T013–T017 [P] — all create new fixture files (no conflicts)
- T020–T022 [P] — update different node files
- T032–T034 [P] — different doc files

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1: Baseline test run
2. Phase 2: Remove technical-overview from pinned roots
3. Phase 3: SKILL.md dual detection + giver confirmation (T008–T012)
4. **STOP and validate**: Run `/handoff-start` against a sample project; verify two-tree proposal appears
5. Ship US1 alone — giver confirmation is the highest-value change

### Incremental Delivery

1. Foundation → US1 (toolkit proposes trees) → validate
2. US2+US3 (extension renders dual tree) → validate with test run
3. US4 (generation order + business prompts) → validate
4. Polish (docs) → final test run

---

## Notes

- All 100 existing tests (12 integration + 88 unit) must continue to pass at every checkpoint
- The fixture restructure (Phase 4) will cause browse.test.ts failures until T023–T027 are added — that's expected; complete all fixture tasks before running tests
- SKILL.md changes (Phases 3 and 5) have no automated tests — validate manually by reading the updated instructions for coherence
- The `technical-overview.md` node file deletion (T013) must happen before the index.json update (T018) to avoid a broken reference in the fixture
