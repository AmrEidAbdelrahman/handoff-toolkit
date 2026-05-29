---

description: "Task list for Handoff — Interactive Developer Handover Tool"
---

# Tasks: Handoff — Interactive Developer Handover Tool

**Input**: Design documents from `specs/001-handoff-platform/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Note on prior work**: The initial toolkit skeleton was created in a previous session. Tasks T001–T007 reflect that work. The spec was subsequently updated to require autonomous `/handoff-start` and a new `/handoff-review` command — toolkit SKILL files from the prior session need rework before the extension is started.

---

## Phase 1: Setup (Completed)

**Purpose**: Toolkit directory structure and static files — already delivered.

- [x] T001 Create `.handoff/` directory structure with `toolkit/`, `toolkit/rules/`, `toolkit/skills/`
- [x] T002 Create `.handoff/.gitignore` excluding `toolkit/` and `session.json`
- [x] T003 [P] Create `.handoff/toolkit/SKILL.md` — master toolkit entry point
- [x] T004 [P] Create `.handoff/toolkit/CLAUDE-snippet.md` — giver CLAUDE.md integration snippet

---

## Phase 2: Foundational (Rules Files)

**Purpose**: AI-readable rule files that all toolkit skills depend on. Partially complete — both files exist but need updates for the revised design.

- [x] T005 [P] Create `.handoff/toolkit/rules/output-schema.md` — node schema validation ruleset (initial version)
- [x] T006 Update `.handoff/toolkit/rules/output-schema.md` — add `inferred_fields` optional field validation rule (valid values: `business_context`, `depth`, `decisions`, `warnings`; must be absent or empty once fully confirmed)
- [x] T007 [P] Create `.handoff/toolkit/rules/session-protocol.md` — session state rules (initial version)
- [x] T008 Update `.handoff/toolkit/rules/session-protocol.md` — add `reviewing` and `paused_review` state handling; remove interactive Q&A prompt references; document review resumption cursor logic (first node with non-empty `inferred_fields`)

**Checkpoint**: Rules files are correct and complete — all toolkit skills can now reference them.

---

## Phase 3: User Story 3 — Giver Installs the Toolkit (Priority: P1) 🎯 MVP

**Goal**: Drop-in installation is complete and produces the correct git-tracked vs gitignored structure.

**Independent Test**: Copy `.handoff/` into a fresh repo, check `git status` — `toolkit/` and `session.json` are ignored; `.handoff/output/` (once created) is tracked.

- [x] T009 [P] [US3] `.handoff/.gitignore` ships correctly (toolkit/ and session.json excluded)
- [x] T010 [P] [US3] `.handoff/toolkit/CLAUDE-snippet.md` contains accurate CLAUDE.md wiring instructions
- [ ] T011 [US3] Manual verification: copy `.handoff/` into a scratch repo, confirm gitignore scoping works and toolkit files require `git add -f` in source repo

**Checkpoint**: Installation is independently verifiable — toolkit is operable from a fresh clone.

---

## Phase 4: User Story 1 — Autonomous Handoff-Start (Priority: P1) 🎯 MVP

**Goal**: `/handoff-start` runs fully autonomously, infers all node fields from code signals, writes `inferred_fields` to frontmatter, supports delta re-runs from git checkpoint.

**Independent Test**: Run `/handoff-start` on a real project with no giver interaction; confirm all output nodes pass `/handoff-validate` and `inferred_fields` is populated.

### Implementation for User Story 1

- [x] T012 [P] [US1] Create `.handoff/toolkit/skills/handoff-validate/SKILL.md` — schema validation skill (existing, unchanged)
- [x] T013 [US1] Rewrite `.handoff/toolkit/skills/handoff-start/SKILL.md` — Part 1: autonomous project scan and section identification (remove all Q&A prompts; infer sections from directory/file structure and README)
- [x] T014 [US1] Update `.handoff/toolkit/skills/handoff-start/SKILL.md` — Part 2: field inference logic per source: `business_context` from README/docstrings/commit msgs; `depth` from inbound dependency count; `decisions` from architectural comments; `warnings` from TODOs/complexity signals
- [x] T015 [US1] Update `.handoff/toolkit/skills/handoff-start/SKILL.md` — Part 3: node-save workflow writes `inferred_fields` list to frontmatter for every AI-inferred field before saving
- [x] T016 [US1] Update `.handoff/toolkit/skills/handoff-start/SKILL.md` — Part 4: delta re-run logic — read `generated_at_sha` from `index.json`; run `git diff --name-only <sha> HEAD`; map changed files to existing nodes via `code_refs[].file`; re-document changed nodes only; add new nodes for uncovered sections
- [x] T017 [US1] Update `.handoff/toolkit/skills/handoff-start/SKILL.md` — Part 5: session completion — record `git rev-parse HEAD` as `generated_at_sha` in `index.json`; mark session `complete` in `session.json`
- [x] T018 [US1] Update `.handoff/toolkit/skills/handoff-start/SKILL.md` — Part 6: minimal-question fallback — when a required field truly cannot be inferred, ask one targeted question then resume autonomous mode immediately
- [ ] T019 [US1] Manual dogfood test: run `/handoff-start` on the Handoff project itself; confirm all nodes generated without giver input
- [ ] T020 [US1] Validate dogfood output: run `/handoff-validate` on all produced nodes; confirm 0 failures and `inferred_fields` present on AI-inferred content

**Checkpoint**: US1 complete — autonomous session produces valid, schema-conforming output. Phase 1 Gate passed.

---

## Phase 5: User Story 5 — Giver Reviews AI-Generated Docs (Priority: P1)

**Goal**: `/handoff-review` walks through nodes with `inferred_fields`, labels AI guesses, allows per-field confirm/correct, is resumable after interruption, and supports `--help`.

**Independent Test**: Given output from `/handoff-start` with `inferred_fields` populated, run `/handoff-review`, correct one field, confirm the rest — verify `inferred_fields` is cleared from corrected nodes and `index.json` is regenerated.

### Implementation for User Story 5

- [x] T021 [P] [US5] Create `.handoff/toolkit/skills/handoff-review/` directory
- [x] T022 [US5] Create `.handoff/toolkit/skills/handoff-review/SKILL.md` — Part 1: walkthrough loop — iterate nodes in index order (core → supporting → peripheral); skip nodes with empty/absent `inferred_fields`
- [x] T023 [US5] Update `.handoff/toolkit/skills/handoff-review/SKILL.md` — Part 2: field display — show each field in `inferred_fields` labelled `[AI-guessed]`; show all other fields labelled `[from code]`
- [x] T024 [US5] Update `.handoff/toolkit/skills/handoff-review/SKILL.md` — Part 3: confirm/skip/rewrite interaction — accept giver input per field; on confirm or rewrite, remove field from `inferred_fields`; re-validate node via `/handoff-validate` rules before moving on
- [x] T025 [US5] Update `.handoff/toolkit/skills/handoff-review/SKILL.md` — Part 4: resumption — on invocation, find first node with non-empty `inferred_fields` and start there; announce skipped nodes count
- [x] T026 [US5] Update `.handoff/toolkit/skills/handoff-review/SKILL.md` — Part 5: completion — regenerate `index.json` with updated node metadata; display summary (N nodes changed, M accepted as-is); update `session.json` status to `complete`
- [x] T027 [US5] Update `.handoff/toolkit/skills/handoff-review/SKILL.md` — Part 6: `--help` flag — when invoked with `--help`, display interaction guide covering: what `[AI-guessed]` means, how to confirm/skip/rewrite, how resumption works, and how to exit early
- [ ] T028 [US5] Manual test: run `/handoff-review` on dogfood output; exit mid-way; re-run; confirm resumption skips already-confirmed nodes

**Checkpoint**: US1 + US5 complete — full autonomous-then-review toolkit workflow is independently functional.

---

## Phase 6: User Story 2 — Receiver Browses the Handover (Priority: P2)

**Goal**: VS Code extension reads committed Handoff output, renders a navigable depth-grouped sidebar, displays node content with AI-inferred indicators, and navigates to code references.

**Independent Test**: Clone a repo with valid `.handoff/output/` (including nodes with `inferred_fields`), open in VS Code with the extension installed, browse all nodes, click a code reference, verify AI-inferred indicator appears on unconfirmed fields.

### Implementation for User Story 2

- [ ] T029 [P] [US2] Create `extension/package.json` — VS Code extension manifest (name: handoff, activationEvents, contributes.views, contributes.commands: handoff.refresh / handoff.markAllRead / handoff.markAllUnread)
- [ ] T030 [P] [US2] Create `extension/tsconfig.json` — TypeScript config targeting ES2020, module: commonjs, strict: true
- [ ] T031 [US2] Install extension npm dependencies: `npm install --save-dev gray-matter marked @types/vscode @types/node` in `extension/`
- [ ] T032 [P] [US2] Create `extension/tests/fixtures/index.json` — test fixture with 3 nodes (one core, one supporting, one peripheral)
- [ ] T033 [P] [US2] Create `extension/tests/fixtures/nodes/` — 3 matching `.md` node files; at least one MUST include `inferred_fields: [business_context]` in frontmatter
- [ ] T034 [P] [US2] Create `extension/src/indexReader.ts` — parse `index.json` → `ParsedIndex`; validate `schema_version`, required fields; throw on malformed input
- [ ] T035 [P] [US2] Create `extension/src/nodeReader.ts` — parse node `.md` via `gray-matter` → `ParsedNode`; extract `inferredFields: string[]` from frontmatter (default `[]` if absent); extract all body sections
- [ ] T036 [US2] Verify TypeScript compiles: run `tsc --noEmit` in `extension/`; resolve all type errors (depends on T034, T035)
- [ ] T037 [US2] Create `extension/src/treeProvider.ts` — `HandoffTreeDataProvider` implementing `vscode.TreeDataProvider`; depth-grouped root items (Core / Supporting / Peripheral); checkmark prefix for read nodes from `workspaceState`
- [ ] T038 [US2] Create `extension/src/webviewPanel.ts` — render node content via `marked`; for each field in `node.inferredFields`, wrap rendered HTML with a visible `AI-inferred` label; handle code ref click messages → post to extension host
- [ ] T039 [US2] Create `extension/src/extension.ts` — activation: load index, register tree view; `FileSystemWatcher` on `.handoff/output/index.json`; register commands (refresh, markAllRead, markAllUnread); handle code ref navigation: `openTextDocument` + `revealRange`, fallback to `git show <sha>:<path>` for stale refs
- [ ] T040 [US2] Add `workspaceState` progress persistence in `extension/src/extension.ts` — key `handoff.readProgress`; mark node read on webview open; persist across restarts

**Checkpoint**: US2 complete — receiver can browse, read, and navigate from a cloned repo.

---

## Phase 7: User Story 4 — Receiver Finds Rationale Quickly (Priority: P2)

**Goal**: Depth grouping and section structure allow an unfamiliar receiver to locate decision rationale within 5 minutes.

**Independent Test**: Given a handover with 5+ nodes, a person unfamiliar with the project locates a specific architectural decision within 5 minutes.

- [ ] T041 [US4] Verify depth-group order in `extension/src/treeProvider.ts`: Core appears first, then Supporting, then Peripheral (matches index ordering rule)
- [ ] T042 [US4] Verify node display in `extension/src/webviewPanel.ts`: Business Context renders before Technical Context; Decisions section appears when node has decisions content
- [ ] T043 [US4] Manual acceptance test: unfamiliar reviewer uses extension on dogfood output — locates rationale for one architectural decision within 5 minutes

**Checkpoint**: US2 + US4 complete — full receiver experience is functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Source-repo git staging, documentation, end-to-end gate, and final test run.

- [ ] T044 [P] Stage toolkit files in source repo: `git add -f .handoff/toolkit/` (required because `.handoff/.gitignore` excludes `toolkit/` in consumer projects)
- [ ] T045 [P] Update `specs/001-handoff-platform/quickstart.md` — reflect autonomous `/handoff-start` flow, optional `/handoff-review` step, and `inferred_fields` in sample output
- [ ] T046 End-to-end gate: clone repo, open in VS Code extension, browse full handover, navigate one code ref, confirm AI-inferred indicator renders on an unconfirmed node
- [ ] T047 [P] Review `extension/src/extension.ts` error handling for missing/invalid `index.json` (per FR-019: clear actionable error message)
- [ ] T048 Run full extension test suite: `npm test` in `extension/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Setup): Complete ✅
- **Phase 2** (Rules): T006, T008 must complete before Phase 4 (handoff-start reads rules files)
- **Phase 3** (US3 install): Independent; T011 is manual verification only
- **Phase 4** (US1 autonomous): Depends on Phase 2 completion
- **Phase 5** (US5 review): Depends on Phase 4 (review acts on `inferred_fields` written by handoff-start)
- **Phase 6** (US2 extension): Depends on Phase 4 (needs real output for test fixtures); T036 depends on T034+T035
- **Phase 7** (US4 rationale): Depends on Phase 6
- **Phase 8** (Polish): Depends on all user story phases

### User Story Dependencies

- **US3 (P1)**: Mostly complete — T011 is manual only
- **US1 (P1)**: Depends on updated rules files (T006, T008)
- **US5 (P1)**: Depends on US1 (needs `inferred_fields` in output to review)
- **US2 (P2)**: Depends on US1 (dogfood output needed for fixtures); can overlap once US1 is complete
- **US4 (P2)**: Depends on US2

### Parallel Opportunities

- T006 and T008 can run in parallel (different files)
- T013–T018 can run sequentially as parts of the same SKILL.md rewrite
- T021, T029, T030, T032, T033, T034, T035 can all run in parallel (different files)
- T037 and T038 can run in parallel after T036

---

## Implementation Strategy

### MVP First (Phase 1 Gate — Toolkit Only)

1. Complete Phase 2: T006, T008 (update rules files)
2. Complete Phase 4: T013–T018 (rewrite handoff-start for autonomous mode)
3. Complete Phase 5: T021–T027 (create handoff-review)
4. **STOP and VALIDATE**: T019+T020 (dogfood + validate) — Phase 1 Gate
5. Commit toolkit — givers can use it before the extension exists

### Incremental Delivery

1. Toolkit complete → Phase 1 Gate passed → commit `.handoff/output/` as dogfood proof
2. Extension skeleton T029–T036 → TypeScript compiles clean
3. Sidebar + webview T037–T040 → browsing works
4. AI-inferred indicators (T038) → full US2 acceptance
5. Phase 2 Gate T046 → ready for Marketplace

---

## Notes

- `[P]` = different files, no shared state — safe to parallelise
- `[Story]` labels map each task to its user story for independent delivery tracking
- Toolkit tasks (T013–T028) produce plain text AI instruction files — no compilation step
- Extension tasks (T029–T048) produce TypeScript — run T036 compile check before proceeding
- `git add -f` (T044) is required only in this source repo; consumer projects do not need it
- Do NOT skip T019+T020 (dogfood) — Phase 1 Gate must pass before extension work begins
