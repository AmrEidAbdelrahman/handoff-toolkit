---
description: "Task list for Handoff VS Code Extension implementation"
---

# Tasks: Handoff VS Code Extension

**Input**: Design documents from `/specs/007-vscode-extension/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included. plan.md defines a test strategy (pure-domain unit tests + `@vscode/test-electron` integration tests) and quickstart.md ships the test commands, so test tasks are generated. They are not strict-TDD-gated; write them alongside each story.

**Organization**: Tasks are grouped by user story (US1–US3 from spec.md) for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 (user-story phases only)
- All paths are under `extension/` (single TypeScript VS Code-extension project, per plan.md)

## Path Conventions

Project root for this feature is `extension/`. Pure, `vscode`-free domain lives in `extension/src/handoff/`; `vscode`-aware code in `extension/src/{workspace,tree,webview,state}/`; tests in `extension/tests/{unit,integration}/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffold, manifest, build/test tooling.

- [X] T001 Create the `extension/` project tree (`src/handoff/`, `src/workspace/`, `src/tree/`, `src/webview/ui/`, `src/state/`, `tests/unit/fixtures/`, `tests/integration/fixtures/`) per plan.md Project Structure.
- [X] T002 Initialize `extension/package.json`: `engines.vscode ^1.90`; `activationEvents` (`workspaceContains:**/.handoff/output/index.json`, `onView:handoff.nav`); `contributes` view container `handoff` + tree view `handoff.nav` + commands (`handoff.open`, `handoff.openNode`, `handoff.next`, `handoff.previous`, `handoff.markAllRead`, `handoff.markAllUnread`) per contracts/vscode-contributions.md; runtime deps `gray-matter`, `markdown-it`, `shiki`; dev deps `typescript`, `esbuild`, `@types/vscode`, `@types/markdown-it`, `@vscode/test-cli`, `@vscode/test-electron`, `mocha`, `@types/mocha`.
- [X] T003 [P] Add `extension/tsconfig.json` (ES2022, `strict`) and `extension/esbuild.js` (bundle `src/extension.ts` and `src/webview/ui/main.js`).
- [X] T004 [P] Add npm scripts (`watch`, `compile`, `test:unit`, `test`, `package`) to `extension/package.json` and `extension/.vscode-test.mjs` for `@vscode/test-cli`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared, `vscode`-free schema-contract core plus detection/reading and the activation skeleton — every user story depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Define domain types in `extension/src/handoff/types.ts` (`IndexManifest`, `IndexEntry`, `ParsedNode`, `CodeRef`, `Section`, `ValidationIssue`, `TreeNode`, `ReadState`, `CodeRefResolution`) per data-model.md.
- [X] T006 Implement schema validation in `extension/src/handoff/validation.ts` (all §7 rules: index, frontmatter, body, ordering; `schema_version != 1` → `warning`) returning `ValidationIssue[]`, never throwing. Depends on T005.
- [X] T007 [P] Implement `extension/src/handoff/indexLoader.ts` (parse `index.json`, apply index validation, produce `IndexManifest` + issues). Depends on T005, T006.
- [X] T008 [P] Implement `extension/src/handoff/nodeParser.ts` using `gray-matter` + `markdown-it` (frontmatter → fields; body H2 split into the four `Section` kinds, ignore unknown H2, no-H1 check; apply node validation). Depends on T005, T006.
- [X] T009 [P] Implement `extension/src/handoff/tree.ts` `buildTree()` and `flattenReadingOrder()` (pinned overviews → depth groups → forward-compatible `parent` nesting → cycle safety; pre-order flatten for nav) per data-model.md tree rule. Depends on T005.
- [X] T010 [P] Implement `extension/src/workspace/detector.ts` (locate `.handoff/output/`; `FileSystemWatcher` for appear/disappear → activation refresh). Depends on T005.
- [X] T011 [P] Implement `extension/src/workspace/outputRepository.ts` (read-only `workspace.fs` reads of `index.json` and `nodes/*.md`). Depends on T005.
- [X] T012 Implement activation skeleton in `extension/src/extension.ts` (`activate`/`deactivate`; dormant "No Handoff output found" state when absent; wire detector → outputRepository → indexLoader/nodeParser → register tree view + `handoff.open`). Depends on T006–T011.
- [X] T013 [P] Unit tests for the pure domain in `extension/tests/unit/` (`indexLoader`, `nodeParser`, `validation`, `tree` incl. parent-nesting + reading-order) against fixtures, no extension host. Depends on T006–T009.
- [X] T014 [P] Create fixture `.handoff/output/` in `extension/tests/unit/fixtures/` and `extension/tests/integration/fixtures/` (≥1 node per depth tier, a node with multiple `code_refs` incl. a range, a node omitting optional sections, one deliberately broken node, plus the referenced source files) per quickstart.md. Depends on T005.

**Checkpoint**: Output is detected, parsed, validated, and turned into a tree model — user stories can begin.

---

## Phase 3: User Story 1 - Browse and read the handover (Priority: P1) 🎯 MVP

**Goal**: Sidebar tree (grouped, pinned overviews, parent nesting) + documentation pane rendering color-coded sections, so a receiver can read every node's Business/Technical/Decisions/Warnings.

**Independent Test**: Open a workspace with valid output → tree lists all nodes grouped core→supporting→peripheral with overviews pinned; selecting a node renders its title and colored sections (required always, optional only when present), markdown formatted.

### Tests for User Story 1

- [X] T015 [P] [US1] Integration test in `extension/tests/integration/browse.test.ts`: activation builds the grouped tree with pinned overviews; selecting a node renders ordered colored sections and omits absent optional sections.

### Implementation for User Story 1

- [X] T016 [US1] Implement `HandoffTreeProvider` (`TreeDataProvider`) in `extension/src/tree/handoffTreeProvider.ts`: render `TreeNode`s from `buildTree()` (pinned overviews, depth group headers, collapsible `parent` children), selection fires `handoff.openNode`. Depends on T009, T012.
- [X] T017 [US1] Implement webview shell in `extension/src/webview/panelManager.ts`: create/retain the `handoff.reader` `WebviewPanel` (`retainContextWhenHidden`, `WebviewPanelSerializer`, CSP + nonce, `localResourceRoots` → `ui/`), message router skeleton. Depends on T012.
- [X] T018 [P] [US1] Create webview UI scaffold `extension/src/webview/ui/index.html`, `main.js`, and `styles.css`: two-column doc|code fl/grid layout (code column placeholder for now) and section color treatment (Business=purple, Technical=blue, Decisions=green, Warnings=orange).
- [X] T019 [US1] Implement doc-pane rendering in `extension/src/webview/ui/main.js`: handle `showNode` → render title + ordered colored sections (required always, optional only when present) with `markdown-it` HTML. Depends on T017, T018.
- [X] T020 [US1] Wire tree selection → load `ParsedNode` → `postMessage` `showNode` (per contracts/webview-protocol.md) in `extension/src/webview/panelManager.ts` / `extension/src/extension.ts`. Depends on T016, T017, T019.
- [X] T021 [US1] Render validation / schema-version issue banners in the doc pane and keep navigation working for other nodes when one node is invalid, in `extension/src/webview/ui/main.js`. Depends on T019, T020.

**Checkpoint**: US1 is independently functional — a receiver can browse and read the whole handover (no live code pane yet).

---

## Phase 4: User Story 2 - Navigate to the referenced code, live (Priority: P2)

**Goal**: Live, syntax-highlighted code pane with one tab per `code_ref`, auto-loaded first ref, line highlighting, clickable ref list + inline mentions, and non-fatal handling of missing/out-of-range refs.

**Independent Test**: Select a node with multiple `code_refs` → code pane auto-loads the first ref (correct file, lines highlighted); tabs switch source; clicking a ref-list entry or an inline mention switches the pane; a deleted/out-of-range ref shows a clear non-fatal state.

### Tests for User Story 2

- [X] T022 [P] [US2] Integration test in `extension/tests/integration/codepane.test.ts`: multi-`code_ref` node auto-loads first ref, tabs switch source, missing file and out-of-range range each render the non-fatal state.

### Implementation for User Story 2

- [X] T023 [P] [US2] Implement `extension/src/workspace/codeResolver.ts`: read referenced file live via `workspace.fs`, resolve `line`/`end_line`, return `CodeRefResolution` (`ok` | `file-not-found` | `range-out-of-bounds`). Depends on T005, T011.
- [X] T024 [P] [US2] Implement Shiki highlighter singleton in `extension/src/webview/highlighter.ts`: async init on activate, theme by `ColorThemeKind`, windowed highlight around the range, per-file HTML cache. Depends on T005.
- [X] T025 [US2] Render the code-ref list (file, line when present, note) in the doc pane and make entries clickable → `requestCodeRef`, in `extension/src/webview/ui/main.js`. Depends on T019.
- [X] T026 [US2] Implement code-pane rendering in `extension/src/webview/ui/main.js`: one tab per `code_ref`, `showCode` handling, referenced-range highlight, and the non-fatal not-found / out-of-range state. Depends on T018.
- [X] T027 [US2] Wire the host code-ref flow in `extension/src/webview/panelManager.ts`: `requestCodeRef`/`inlineMention` → `codeResolver` + `highlighter` → `showCode`; auto-load the first ref on each `showNode`. Depends on T023, T024, T026.
- [X] T028 [US2] Implement the inline code-mention heuristic: match Technical Context inline `<code>` spans against the node's `code_refs`, make matches clickable → `inlineMention` (carry `refIndex`), in `extension/src/webview/ui/main.js` (+ host mapping in `panelManager.ts`). Depends on T019, T027.
- [X] T029 [US2] Refresh the code pane when a currently-shown referenced file changes (`FileSystemWatcher` on referenced paths) in `extension/src/webview/panelManager.ts`. Depends on T027.

**Checkpoint**: US1 + US2 work independently — reading is now connected to live code.

---

## Phase 5: User Story 3 - Track and pace progress (Priority: P3)

**Goal**: Per-node read/unread tracking, progress badge, Previous/Next navigation with bidirectional tree sync, breadcrumb, persisted across reopen.

**Independent Test**: Visit several nodes → each loses its unread dot and the badge advances; Prev/Next moves in reading order and reveals the tree selection; breadcrumb reads e.g. `core · 2 of 8`; read state survives close-and-reopen.

### Tests for User Story 3

- [X] T030 [P] [US3] Integration test in `extension/tests/integration/progress.test.ts`: viewing nodes marks read + advances the badge; Prev/Next moves in reading order and reveals selection; read state persists across reload.

### Implementation for User Story 3

- [X] T031 [P] [US3] Implement `extension/src/state/readState.ts`: `workspaceState` set of read ids, `markRead`, and `progress` computed over only ids present in the current index (prune stale ids on load). Depends on T005, T012.
- [X] T032 [US3] Mark a node read on `showNode` and update the read/unread `ThemeIcon` in `extension/src/tree/handoffTreeProvider.ts`. Depends on T031, T016, T020.
- [X] T033 [US3] Set `TreeView.badge` (unread count / total) and refresh it on read-state change, in `extension/src/extension.ts` / `handoffTreeProvider.ts`. Depends on T031, T016.
- [X] T034 [US3] Implement Previous/Next: `handoff.next`/`handoff.previous` commands + webview `navigate` message → select the adjacent node in `flattenReadingOrder()` and `treeView.reveal()` (bidirectional sync), in `extension/src/extension.ts` / `panelManager.ts`. Depends on T009, T016, T017.
- [X] T035 [US3] Render the breadcrumb (depth tier + `depthIndex of depthTotal`) in the doc pane from the `showNode` `position` payload, in `extension/src/webview/ui/main.js`. Depends on T019, T034.
- [X] T036 [P] [US3] Implement `handoff.markAllRead` and `handoff.markAllUnread` (reset progress) commands in `extension/src/extension.ts`. Depends on T031.

**Checkpoint**: All three stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge-case hardening, dormant-state UX, packaging, and final validation.

- [X] T037 [P] Add `viewsWelcome` content for `handoff.nav` (the "No Handoff output found" dormant state, FR-002) in `extension/package.json`.
- [X] T038 Verify graceful handling end-to-end for the remaining edge cases (index/file mismatch, empty-but-valid handover, absent overview nodes, dependency-to-missing-node) across `indexLoader`/`tree`/UI; add targeted unit assertions in `extension/tests/unit/`.
- [X] T039 [P] Write `extension/README.md` (what it does, install, usage, the three panels).
- [ ] T040 Run the quickstart.md manual acceptance walkthrough and confirm SC-001…SC-007.
- [X] T041 [P] Package a `.vsix` (`npm run package` via `vsce`) and smoke-test install in a clean VS Code.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories.**
- **User Stories (Phase 3–5)**: All depend on Foundational. US1 → US2 → US3 in priority order; US2 builds on the webview/doc shell from US1, US3 builds on tree + showNode from US1.
- **Polish (Phase 6)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Only Foundational. Delivers the MVP.
- **US2 (P2)**: Foundational + US1's webview shell (T017) and doc-pane (T019). Independently testable (code pane behavior).
- **US3 (P3)**: Foundational + US1's tree (T016) and showNode wiring (T020). Independently testable (read tracking + nav).

### Within Each User Story

- Types → validation → loaders/tree (Foundational) before any rendering.
- Webview shell (T017) and UI scaffold (T018) before doc-pane (T019); doc-pane before code-ref list/code-pane (US2) and breadcrumb (US3).

### Parallel Opportunities

- Setup: T003, T004 in parallel.
- Foundational: T007, T008, T009, T010, T011 in parallel after T005/T006; T013, T014 in parallel.
- US1: T015 and T018 in parallel with early implementation.
- US2: T023, T024 in parallel; T022 alongside.
- US3: T031 and T036 in parallel; T030 alongside.
- Cross-story (with capacity): once Foundational is done, US1/US2/US3 can be staffed in parallel given the noted shell dependencies.

---

## Parallel Example: Foundational Phase

```bash
# After T005 (types) and T006 (validation) land, run in parallel:
Task: "Implement indexLoader.ts in extension/src/handoff/indexLoader.ts"
Task: "Implement nodeParser.ts in extension/src/handoff/nodeParser.ts"
Task: "Implement tree.ts buildTree() in extension/src/handoff/tree.ts"
Task: "Implement detector.ts in extension/src/workspace/detector.ts"
Task: "Implement outputRepository.ts in extension/src/workspace/outputRepository.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP and validate**: browse + read the whole handover. This alone beats a README (SC-006) and is demoable.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → test → demo (MVP: browse & read).
3. US2 → test → demo (live code navigation — the differentiator).
4. US3 → test → demo (progress + pacing).
5. Polish → package `.vsix`.

### Parallel Team Strategy

After Foundational: Dev A on US1 (tree + doc pane); once T017/T019 land, Dev B picks up US2 (code pane) and Dev C US3 (progress/nav), coordinating on the shared `main.js`/`panelManager.ts` touch points.

---

## Notes

- `[P]` = different files, no dependency on an incomplete task.
- `extension/src/webview/ui/main.js` and `panelManager.ts` are touched by multiple US2/US3 tasks — sequence those (not all `[P]`) to avoid same-file conflicts.
- The pure `src/handoff/` domain is the contract core: keep it `vscode`-free and covered by T013 unit tests.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
