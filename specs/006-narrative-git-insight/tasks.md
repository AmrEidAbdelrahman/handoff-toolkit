---
description: "Task list for Narrative Navigation & Git-History Risk Surfacing"
---

# Tasks: Narrative Navigation & Git-History Risk Surfacing

**Input**: Design documents from `specs/006-narrative-git-insight/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Not requested — no automated test tasks. Validation is via the manual dogfood test (T024) against SC-001–SC-008.

**Organization**: Tasks are grouped by user story (US1–US6). All implementation tasks edit one of three existing toolkit files (`output-schema.md`, `diagram-methodology.md`, `handoff-start/SKILL.md`). The Foundational phases land the schema/diagram rules and the session-level captures (SHA, permalink base, git-availability) that every later phase references. Within `handoff-start/SKILL.md`, tasks are sequenced to avoid overlapping edits.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in the same phase)
- **[Story]**: US1 = Critical-flow diagrams; US2 = Hotspot/fragility; US3 = TL;DR; US4 = Cross-links/permalinks; US5 = Ownership; US6 = Tribal-knowledge

**Priorities**: US1 (P1), US2 (P1), US3–US6 (P2).

---

## Phase 1: Setup

**Purpose**: Verify current file state before modifications — no changes made here.

- [X] T001 Verify `.handoff/toolkit/rules/output-schema.md` exists; confirm OP-16 current text (the 005 H3 subsection rule) so it can be extended
- [X] T002 Verify `.handoff/toolkit/rules/diagram-methodology.md` exists; confirm § 2.1 / § 2.3 sequenceDiagram guidance and Part 1 decision matrix
- [X] T003 Verify `.handoff/toolkit/skills/handoff-start/SKILL.md` exists; confirm current content of Part 1 (session init), Part 2a (Steps 2a.1/2a.2/2a.3 — note the 004 citation→Part 5d→save sub-sequence inside 2a.3), Part 2c/2d area, Step 3.6 (warnings), Step 5.3 (assembly: TL;DR target, snippet labels, 005 H3 subsections), and Part 7.1 (SHA record)

---

## Phase 2: Foundational — Schema & Diagram Rules

**Purpose**: Land the schema and diagram-methodology changes that later SKILL.md edits reference. MUST complete before Phases 4–9.

- [X] T004 [P] In `.handoff/toolkit/rules/output-schema.md` — amend advisory Rule OP-16 to extend the conventional `## Technical Context` H3 subsection names with `### Related` and `### Ownership` (joining `### Dependencies & Integrations` and `### Testing`); reaffirm these do not violate BD-09 (H2-only) or BD-07
- [X] T005 [P] In `.handoff/toolkit/rules/diagram-methodology.md` — add critical-flow `sequenceDiagram` authoring guidance: cross-domain end-to-end traces (entry → service → data layer → external → response), participants in lowercase-hyphen labels, cap ~8 participants (summarise overflow in the description), one-sentence journey description per diagram; note these descriptions live in `## Diagrams` and are citation-exempt

**Checkpoint**: Schema + diagram rules ready.

---

## Phase 3: Foundational — Session Captures (Part 1)

**Purpose**: Capture the SHA, permalink base, dirty-tree flag, and git-availability at session start — consumed by US1/US2/US4/US5/US6. MUST complete before those phases.

**⚠️ CRITICAL**: Per research.md Decisions 1 & 2, the SHA and permalink base MUST be captured at session START (not Part 7), and a dirty tree MUST disable snippet permalinks.

- [X] T006 In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 1 — add a "Step 1.3 — Capture git context" step: run `git rev-parse HEAD` → store `generated_at_sha`; run `git status --porcelain` → store `tree_dirty` (true if non-empty); run `git remote get-url origin` → normalise (SSH/HTTPS) to `repo_blob_base` and derive `repo_host_style` (`github`/`gitlab`/`unknown`); set `git_available` (false if `git rev-parse HEAD` fails). Store all in session/memory. If `git_available` is false, record that all git-derived output is skipped (FR-009)
- [X] T007 In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 7.1 — update the SHA step to WRITE the already-captured `generated_at_sha` from Step 1.3 (rather than re-capturing at the end); if HEAD changed during the run, prefer the start value (that is what was read). Keep the no-git fallback

**Checkpoint**: Session captures available to all consumers.

---

## Phase 4: User Story 1 — Critical-Flow Sequence Diagrams (P1)

**Goal**: 1–3 cross-domain `sequenceDiagram`s in the architecture overview tracing core user journeys.

**Independent Test**: Run `/handoff-start` on a multi-domain project; confirm the architecture overview has 1–3 sequence diagrams, each crossing ≥ 2 domains and naming a journey.

- [X] T008 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 2a — insert **Step 2a.2b "Critical-flow tracing"** BETWEEN Step 2a.2 (body draft) and Step 2a.3 (citation→Part 5d→save). Do NOT number it 2a.4 (that would place it after the save). It: picks the top 1–3 request entry points (route/URL files), reads each entry point and the handler/service/model/external client in its call path (lightweight targeted reads, independent of Part 3), and drafts 1–3 `sequenceDiagram` blocks per the § 2.3 guidance, each with a one-sentence journey description, into the overview `## Diagrams` section. Omit entirely if no end-to-end flow is discernible
- [X] T009 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 2a.3 — confirm the citation/quality/save sub-sequence now also covers the critical-flow diagrams drafted in 2a.2b: the quality pass scores the overview body WITH the diagrams present; `## Diagrams` description lines are citation-exempt (do not add `(src: …)`); diagrams are validated by the § 2.4 procedure before save

**Checkpoint**: US1 complete. Architecture overview narrates the system end-to-end.

---

## Phase 5: User Story 2 — Hotspot / Fragility Analysis (P1)

**Goal**: High churn × complexity files flagged "fragile — change carefully" in the owning domains' Warnings.

**Independent Test**: Run `/handoff-start` on a project with git history; confirm fragile files appear as warnings with churn counts; trivial high-churn files are excluded.

- [X] T010 [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — add **Part 2d "Git history analysis"** (run once after Step 2.3/domain discovery, before Part 3; skip entirely if `git_available` is false). In Part 2d, compute the **churn ranking**: aggregate `git log --format= --name-only` into per-file commit counts, down-weighting detectable bot/automation authors; combine with a complexity proxy (size/length/nesting from the existing warning heuristics); mark `is_fragile` only when churn AND complexity are both high (triviality floor excludes config/version/lockfiles/generated files). Group results by domain; store in memory
- [X] T011 [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 3.6 (infer warnings) — consume the hotspot slice for the current domain: emit a Warnings bullet `Fragile — change carefully: \`<path>\` (<churn> commits, high complexity)` for each fragile file, with a source signal (commit range or `inferred`). Keep `warnings` in `inferred_fields` per feature 004

**Checkpoint**: US2 complete. Fragile files surfaced.

---

## Phase 6: User Story 3 — Progressive Disclosure (TL;DR) (P2)

**Goal**: Every Technical Context opens with a 1–2 sentence TL;DR.

**Independent Test**: Open any node; confirm `## Technical Context` begins with a `**TL;DR:**` lead before the detail.

- [X] T012 [US3] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 5.3 — update the `## Technical Context` body template to open with `**TL;DR:** <1–2 sentences>` followed by a blank line, then the detailed paragraphs. The TL;DR abstracts the whole section and must NOT duplicate the first detail sentence. It is Technical Context narrative — citation-exempt. (Apply to handover nodes AND the architecture overview / typed docs that have a Technical Context.)

**Checkpoint**: US3 complete. Skim path exists.

---

## Phase 7: User Story 4 — Cross-Links & Source Permalinks (P2)

**Goal**: Related-node links + snippet-label permalinks at the recorded SHA, with graceful degradation.

**Independent Test**: Open a node in a Markdown viewer; related nodes are clickable; snippet labels are permalinks to the right lines at the SHA (or plain labels with zero broken links).

- [X] T013 [US4] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 5.3 — add a `### Related` H3 subsection (under Technical Context, after the 005 subsections) rendering `dependencies` + `doc_refs` as `- [<title>](<id>.md) — <one-line why related>`; omit the subsection if both are empty
- [X] T014 [US4] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 5.3 — reshape the inline-snippet bold label into a permalink when `git_available` AND `repo_blob_base` known AND `repo_host_style` supported AND `tree_dirty` is false: `**[\`<path>\` lines N–M](<repo_blob_base>/blob/<sha>/<path>#LN-LM)**` (GitHub) or `/-/blob/<sha>/<path>#LN-M` (GitLab). Otherwise keep the plain `**\`<path>\` lines N–M**` label. Explicitly note: a dirty tree disables permalinks (wrong-line risk per research.md Decision 2). The snippet label IS the citation — no extra `(src: …)`

**Checkpoint**: US4 complete. Docs are navigable.

---

## Phase 8: User Story 5 — Bus-Factor / Ownership (P2)

**Goal**: Each domain notes its de facto owner and flags single-author files.

**Independent Test**: Run `/handoff-start` on a multi-author repo; confirm each domain names the dominant author and flags single-author files; absent (not erroneous) without git/CODEOWNERS.

- [X] T015 [US5] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 2d — add the **ownership analysis**: per domain, `git shortlog -sn -- <domain paths>` → dominant author; identify single-author (bus-factor-1) files; read `CODEOWNERS` (if present) for declared owners. Group by domain; store in memory. Skip if `git_available` is false
- [X] T016 [US5] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 5.3 — add an `### Ownership` H3 subsection (under Technical Context): `De facto owner: <author> (<n> commits) (src: inferred from git shortlog)`, the `CODEOWNERS` declared owner if present, and a `Single-author files (bus-factor 1):` list. Omit the entire subsection when no git data and no CODEOWNERS

**Checkpoint**: US5 complete. "Who to ask" answered.

---

## Phase 9: User Story 6 — Tribal-Knowledge Mining (P2)

**Goal**: Commit-message keywords surface as deduplicated, commit-linked Warnings.

**Independent Test**: Run `/handoff-start` on a repo with a `hotfix`/`revert` commit; confirm the relevant domain's Warnings includes a commit-linked bullet.

- [X] T017 [US6] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 2d — add the **tribal-knowledge scan**: find commits whose messages match `revert`/`hotfix`/`workaround`/`don't`/`careful`/`gotcha` (case-insensitive), preferring leading-keyword and revert/hotfix commit patterns; record short SHA, one-line lesson, touched files/domains; deduplicate by (lesson, file) and cap 3–5 per domain. Store grouped by domain. Skip if `git_available` is false
- [X] T018 [US6] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 3.6 (infer warnings) — consume the tribal slice for the current domain: emit a Warnings bullet per item — `<lesson> (src: commit <sha7>)`, or `<lesson> ([commit <sha7>](<repo_blob_base>/commit/<sha>))` when a host is known. Keep `warnings` in `inferred_fields`

**Checkpoint**: US6 complete. Hard-won lessons surfaced.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Consistency check, contract alignment, and dogfood validation.

- [X] T019 Verify `.handoff/toolkit/rules/output-schema.md` and `diagram-methodology.md` are internally consistent: OP-16 lists all four H3 names; the sequenceDiagram guidance matches Step 2a.2b's expectations; no contradictions
- [X] T020 Verify the new content honours feature 004/005: TL;DR + diagram descriptions + `### Related` are citation-exempt; `### Ownership` notes and hotspot/tribal Warnings carry citations and keep `warnings`/ownership inferences in `inferred_fields`; no new H2 sections were introduced (BD-08/BD-09 intact)
- [X] T021 Verify the delta-rerun path (Part 4) still works: confirm re-running a domain re-consults the Part 2d git analysis (or note that Part 2d must run in delta mode too) so hotspot/ownership/tribal stay fresh on re-runs
- [X] T022 In `CLAUDE.md` — confirm the plan pointer references `specs/006-narrative-git-insight/plan.md` (already updated during planning; verify)
- [X] T023 In `.handoff/toolkit/skills/handoff-review/SKILL.md` — confirm the confidence-sorted review still handles nodes that now carry git-derived `warnings` inferences (no new doc_types added by 006, so display logic is unchanged — verify, no edit expected)
- [ ] T024 MANUAL: Run `/handoff-start` on `/home/amreid/Kershless-backend-app` — inspect against SC-001/002 (1–3 cross-domain flow diagrams; system graspable from overview), SC-003 (TL;DR on every Technical Context; coherent skim), SC-004 (related links resolve; snippet permalinks correct at SHA, or plain labels with zero broken links; verify dirty-tree degradation), SC-005 (fragile files flagged; trivial high-churn excluded), SC-006 (owner + single-author flags; absent without git/CODEOWNERS), SC-007 (tribal commits surface, deduped, commit-linked), SC-008 (clean degradation with no git history). Isolate behavior by feature (003→004→005→006) if output looks wrong
- [ ] T025 [P] Push updated toolkit files to `https://github.com/AmrEidAbdelrahman/handoff-toolkit` master branch after the dogfood test passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: read-only verification
- **Schema/Diagram (Phase 2)**: depends on Phase 1 — BLOCKS phases that render the new H3s / diagrams
- **Session Captures (Phase 3)**: depends on Phase 1 — BLOCKS US1/US2/US4/US5/US6 (they consume the captures / Part 2d gate)
- **US1 (Phase 4)**: depends on Phase 2 (diagram rules) + Phase 3
- **US2 (Phase 5)**: depends on Phase 3 (Part 2d gate, churn pass)
- **US3 (Phase 6)**: depends on Phase 1 only (TL;DR is self-contained)
- **US4 (Phase 7)**: depends on Phase 2 (OP-16) + Phase 3 (SHA/base/dirty)
- **US5 (Phase 8)**: depends on Phase 2 (OP-16) + Phase 3 (Part 2d)
- **US6 (Phase 9)**: depends on Phase 3 (Part 2d)
- **Polish (Phase 10)**: depends on all prior phases

### File Edit Sequencing

`handoff-start/SKILL.md` is edited across Phases 3–9. Work top-to-bottom: Part 1 captures (T006) → Part 2a.2b flows (T008/T009) → Part 2d git analysis (T010 churn, T015 ownership, T017 tribal — same new Part, build incrementally) → Step 3.6 warnings (T011, T018) → Step 5.3 rendering (T012 TL;DR, T013 Related, T014 permalinks, T016 Ownership) → Part 7.1 (T007). Read back each changed section.

### Parallel Opportunities

- Phase 2: T004 (output-schema.md) ∥ T005 (diagram-methodology.md) — different files
- Part 2d is built by T010/T015/T017 — same new Part, sequential
- Step 5.3 edits (T012/T013/T014/T016) — same region, sequential
- T025 only after T024 passes

---

## Implementation Strategy

### MVP (US1 + US2 — the two P1 stories)

1. Phase 1 (Setup), Phase 2 (Schema/Diagram), Phase 3 (Session captures)
2. Phase 4 (US1 — critical-flow diagrams), Phase 5 (US2 — hotspot)
3. **STOP and VALIDATE**: run `/handoff-start` on Kershless; check SC-001, SC-002, SC-005, SC-008
4. If P1 criteria pass, proceed to US3–US6

### Full Delivery

1. Phases 1–3
2. Phases 4–9 (US1 → US6)
3. Phase 10 (consistency + dogfood + push)

---

## Notes

- All edits are to AI instruction Markdown files — no compiled code, no runtime
- `schema_version` stays 1; only OP-16 (advisory) is extended; everything else is body content in existing sections or H3 subsections
- Critical-flow tracing is **Step 2a.2b** (before the 004 save sub-sequence in 2a.3) — NOT 2a.4
- SHA + permalink base + dirty-tree flag captured at session START (Part 1), consumed at Step 5.3
- A dirty working tree disables snippet permalinks (wrong-line risk), not just the no-host case
- `git add -f` required for all `.handoff/toolkit/` files (gitignored)
- ⚠️ Dogfood debt: 006 is the 4th instruction-layer feature stacked on 003+004+005, none yet executed on a real project. T024 adjudicates all four at once — isolate by feature when output looks wrong
