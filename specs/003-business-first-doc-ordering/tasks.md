# Tasks: Business-First Doc Generation & Inline Code References

**Input**: Design documents from `specs/003-business-first-doc-ordering/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks are grouped by user story. US1 and US2 are both P1 and share the SKILL.md file, so their tasks are sequenced within Phase 3. US3 is P2 and handled in Phase 4. The Foundational phase (Phase 2) updates the schema and rules files that SKILL.md references — must complete before Phase 3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in the same phase)
- **[Story]**: US1 = Business docs first; US2 = Semantic domain grouping; US3 = Inline code snippets

---

## Phase 1: Setup

**Purpose**: Verify current file state before modifications — no changes made here.

- [x] T001 Verify `.handoff/toolkit/rules/output-schema.md` exists and confirm current FM-09, OP-10, OP-11 rule text
- [x] T002 Verify `.handoff/toolkit/rules/diagram-methodology.md` exists and confirm § 2.2 current content
- [x] T003 Verify `.handoff/toolkit/skills/handoff-start/SKILL.md` exists and confirm Part 2c, Step 3.7, Step 2b.5 current content

---

## Phase 2: Foundational — Schema & Rules File Updates

**Purpose**: Update `output-schema.md` and `diagram-methodology.md` before SKILL.md changes reference updated validation rules. MUST complete before Phase 3.

**⚠️ CRITICAL**: SKILL.md (Phase 3+) references these rule files. Rule changes must land first.

- [x] T004 [P] In `.handoff/toolkit/rules/output-schema.md` — update Rule FM-09: change from required (`code_refs` is present and is an array containing at least one item) to optional (`code_refs` is optional; if present it must be an array with at least one item; absence is valid)
- [x] T005 [P] In `.handoff/toolkit/rules/output-schema.md` — update the "Code Ref Rules" section header to read: "If `code_refs` is present, check each item:" so Rules CR-01 through CR-05 are conditional on presence
- [x] T006 In `.handoff/toolkit/rules/output-schema.md` — add deprecation notice to Rule OP-10: append "Deprecated as of feature 003. `/handoff-start` no longer writes `code_refs[].id`. Existing nodes with this field remain valid."
- [x] T007 In `.handoff/toolkit/rules/output-schema.md` — add deprecation notice to Rule OP-11: append "Deprecated as of feature 003. Diagram-to-code navigation is no longer wired through `code_refs[].id`."
- [x] T008 In `.handoff/toolkit/rules/output-schema.md` — add new Rule OP-13 after OP-12: "Advisory: If a node has `depth: core` or `depth: supporting` and contains a `## Technical Context` section, that section SHOULD include at least one inline code snippet (a bold label line `**\`path\` lines N–M**` immediately followed by a fenced code block). Absence is not a validation failure."
- [x] T009 [P] In `.handoff/toolkit/rules/diagram-methodology.md` — rename § 2.2 heading from "Element label and `code_refs[].id` naming" to "Diagram element naming"
- [x] T010 [P] In `.handoff/toolkit/rules/diagram-methodology.md` — replace the body of § 2.2: remove the paragraph about assigning `id` to `code_refs` entries and the naming-convention bullets; replace with: "Use descriptive, stable labels for diagram elements. Labels should reflect the component's name as it appears in the codebase. Use lowercase-hyphen format for multi-word labels (e.g., `auth-service`, `user-repository`). These labels are for diagram readability only — they are not used for navigation wiring."
- [x] T011 In `.handoff/toolkit/rules/diagram-methodology.md` — remove the YAML example block in § 2.2 that shows `code_refs` with `id` fields; replace it with a plain Mermaid block example showing element labels without any YAML

**Checkpoint**: Schema and rules updated. Phase 3 can now begin.

---

## Phase 3: User Stories 1 & 2 — SKILL.md: Generation Order + Semantic Domain Grouping (P1)

**Goal (US1)**: Business documents and architecture overview are generated and saved before any domain nodes. The output index has Business Overview at the top.

**Goal (US2)**: Sections are identified as business domains (semantic naming) rather than directories. Cross-cutting infrastructure gets its own node.

**Independent Test**: Run `/handoff-start` on `/home/amreid/Kershless-backend-app`; confirm (1) `architecture-overview.md` exists and is the first node in `index.json`; (2) domain node titles are in plain English business language; (3) `index.md` exists with `## Business Overview` section first.

### US1 — Generation Order Changes

- [x] T012 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — replace the Part 2 intro paragraph and Step 2.2 "Identify logical sections" with a new Step 2.2 "Identify business domains" following the four-signal discovery algorithm from plan.md § 3.1: (1) README sections, (2) framework app boundaries + models content, (3) route/URL registrations, (4) import topology for cross-cutting detection. Output: `pending_sections` list of business domain names, each with associated directory paths. Print: "Identified N business domains."
- [x] T013 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — insert new **Part 2a** (after Step 2.3, before Part 2b) "Architecture Overview Generation" with steps: (2a.1) draft system-level `flowchart TD` Mermaid diagram showing all domains and their relationships; (2a.2) draft architecture overview node body (`## Business Context`, `## Technical Context` with `### Domains` subsection listing each domain with one-sentence description, `## Diagrams` with the system diagram); (2a.3) save architecture overview node immediately (id: `architecture-overview`, title: "Architecture Overview", depth: `core`, no `code_refs`, `diagram_format: mermaid`) — write to `.handoff/output/nodes/architecture-overview.md` and add as position-0 entry in `index.json`
- [x] T014 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — move **Part 2c** (Business Document Planning — currently positioned after all Part 3 sections complete) to execute immediately after Part 2a. Rename its label to "Part 2c — Business Document Planning (run once, after Part 2a, before domain node documentation)". Update its step text to reflect it runs before Part 3. Note: the Onboarding Guide still saves last (in Part 5c.4) because it needs the complete node list — only the drafting moves earlier.
- [x] T015 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — update **Part 5c.5** "Final index sort" to enforce the new ordering: `architecture-overview` node always at position 0, then ADR nodes, then Onboarding Guide, then Runbook nodes, then API Summary, then domain nodes sorted core → supporting → peripheral
- [x] T016 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — add new **Step 7.1b** (after Step 7.1, before Step 7.2) "Generate index.md": (1) read final `index.json`; (2) build `## Business Overview` section linking to architecture-overview, each ADR, Onboarding Guide, Runbooks, API Summary; (3) build `## Domain Reference` section with `### Core Domains`, `### Supporting Domains`, `### Peripheral / Infrastructure` subsections, each domain listed as `- [title](nodes/<id>.md) — <first sentence of business_context>`; (4) write to `.handoff/output/index.md`; (5) print "✓ index.md written"

### US2 — Semantic Domain Grouping Changes

- [x] T017 [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — update **Step 3.2** "Read the relevant files": change "Identify the entry-point file for this section" to "Identify the entry-point files for this domain" — for each directory path associated with the domain (recorded in `pending_sections`), read the entry-point file and 1–2 core logic files. Cap at 8 files total across all directories in the domain.
- [x] T018 [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — update **Step 3.3** "Infer `business_context`": replace the folder-name-to-semantics mapping table with: "Use the domain name identified in Step 2.2 as the semantic basis. Derive a 2–4 sentence description of what this domain does for the business, focusing on user-facing value. Do not reference directory names." Keep the README/docstring priority sources but remove the directory-name heuristic mapping table.
- [x] T019 [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — update **Step 5.1** "Determine node id": derive `id` from the business domain name (not the directory name). Example: "User Management" → `user-management`, "Competition Management" → `competition-management`. Note: the old mapping `auth/` → `auth` is now derived from the domain name "User Authentication & Profiles" → `user-authentication-profiles`.
- [x] T020 [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — update **Part 4 (Delta Re-Run)** Step 4.3 "Identify new sections" to use semantic domain discovery (same as updated Step 2.2) rather than directory listing when identifying new domains

**Checkpoint**: US1 + US2 complete. Run `/handoff-start` on Kershless to verify: architecture-overview node is first in index.json; domain nodes have business-language titles; index.md exists.

---

## Phase 4: User Story 3 — SKILL.md: Inline Snippets Replace code_refs (P2)

**Goal (US3)**: Nodes generated by `/handoff-start` contain no `code_refs` frontmatter. Instead, `## Technical Context` embeds inline fenced code snippets with bold file-path labels. Every snippet is readable in any Markdown viewer.

**Independent Test**: Open a generated node in GitHub web UI; confirm: (1) no `code_refs` in frontmatter; (2) `## Technical Context` contains ≥1 bold label + fenced code block; (3) label format is `**\`path/to/file.ext\` lines N–M**`.

- [x] T021 [P] [US3] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — **remove Step 2b.5** ("Assign `code_refs[].id` values") entirely. Update Step 2b.4 to remove the sentence "For components that have a corresponding `code_refs` entry, assign a `code_refs[].id`..." and the sub-step about assigning `id`. Keep the rest of Step 2b.4 (diagram drafting) intact.
- [x] T022 [P] [US3] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — **replace Step 3.7** "Determine `code_refs`" with a new Step 3.7 "Collect inline code snippets": (1) re-read the files already loaded in Step 3.2; (2) identify snippets using priority: first public API surface (exported functions, class definitions, Django ViewSets/views, decorators), then key business logic methods; (3) select 1–5 snippets for the domain (5–15 lines each); (4) for each snippet record: `file` (relative path), `start_line`, `end_line`, and the literal source lines; (5) for functions longer than 15 lines: quote signature + first 3–5 lines, add `# ... (lines X–Y omitted)` comment, optionally quote important return/exit lines; (6) store snippets in memory for use in Step 5.3
- [x] T023 [P] [US3] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — **update Step 5.3** "Assemble the node": (a) remove `code_refs:` block from the YAML frontmatter template; (b) after the `## Technical Context` narrative paragraphs, insert the collected inline snippets formatted as: bold label line `**\`<relative-path>\` lines N–M**` immediately followed by fenced code block with language identifier (python/typescript/go/etc.) and the quoted lines
- [x] T024 [US3] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — **update Step 5.4** "Validate the node": remove reference to FM-09 as a required-field check (it is now optional); remove CR-01 through CR-05 from the mandatory checklist (they are now conditional on code_refs presence); add OP-13 as an advisory check (log "Advisory: Technical Context section has no inline snippets" but do not fail validation)
- [x] T025 [US3] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — **update Part 4 Step 4.2** "Map changed files to existing nodes": replace the `code_refs[].file` lookup with a fallback — for new-style nodes (no code_refs), scan the node's `## Technical Context` body for bold label lines matching the pattern `**\`<path>\`` to identify which files a node references; for old-style nodes with code_refs, keep the existing lookup
- [x] T026 [US3] In `.handoff/toolkit/skills/handoff-start/SKILL.md` — **update Part 6** "Minimal-Question Fallback": the `code_refs` fallback question ("I couldn't identify the main entry point...") is no longer applicable for code_refs. Update the fallback to apply only to `business_context`. Remove the `code_refs` "when to invoke" bullet and the corresponding question template. Update the "Never invoke Part 6 for..." list to include snippets (inline snippets always have a fallback: omit if no readable file found).

**Checkpoint**: US3 complete. Verify: no node file has `code_refs` in frontmatter; Technical Context has inline snippets with bold labels; validation still passes for old nodes that do have code_refs.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation, backward compat check, and any cleanup.

- [ ] T027 Run `/handoff-start` on `/home/amreid/Kershless-backend-app` — inspect output against all 5 success criteria: SC-001 (architecture-overview + ADR + onboarding-guide are first 3 entries), SC-002 (zero directory-path titles), SC-003 (every domain node has ≥1 inline snippet), SC-004 (zero nodes have code_refs frontmatter), SC-005 (index.md exists with Business Overview section)
- [ ] T028 Verify `.handoff/toolkit/rules/output-schema.md` validation rules are internally consistent: FM-09 optional, CR rules conditional, OP-13 advisory. Re-read the full file to confirm no contradictions.
- [ ] T029 [P] Push updated toolkit files to `https://github.com/AmrEidAbdelrahman/handoff-toolkit` master branch: `git add -f .handoff/toolkit/skills/handoff-start/SKILL.md .handoff/toolkit/rules/output-schema.md .handoff/toolkit/rules/diagram-methodology.md && git commit && git push`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — read-only verification
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all SKILL.md edits (Phases 3+)
- **US1 + US2 (Phase 3)**: Depends on Phase 2 completion — SKILL.md ordering + domain grouping
- **US3 (Phase 4)**: Depends on Phase 2 completion — can run in parallel with Phase 3 (different SKILL.md sections)
- **Polish (Phase 5)**: Depends on all Phase 3 + Phase 4 tasks complete

### Parallel Opportunities Within Phase 2

- T004 + T005 (both in output-schema.md) → sequential (same file section)
- T006 + T007 → sequential (same file)
- T008 → after T006/T007
- T009 + T010 + T011 (diagram-methodology.md) → can run in parallel with T004–T008 (different file)

### Parallel Opportunities Within Phase 3 + 4

Phase 3 tasks (T012–T020) are sequential within SKILL.md but cover different parts:
- T012–T016 (US1 ordering): Parts 2, 2a, 2c, 5c.5, 7 — sequential
- T017–T020 (US2 domain grouping): Steps 3.2, 3.3, 5.1, Part 4 — can be [P] with T012–T016 if editing different Part numbers simultaneously

Phase 4 tasks (T021–T026):
- T021 (remove Step 2b.5) and T022 (new Step 3.7) and T023 (Step 5.3) are in different Parts — [P] if working simultaneously
- T024, T025, T026 each touch a different step — [P] relative to each other

---

## Parallel Example: Phase 2

```
Parallel batch A (output-schema.md, sequential):
  T004 → T005 → T006 → T007 → T008

Parallel batch B (diagram-methodology.md, sequential):
  T009 → T010 → T011

Batches A and B can run concurrently (different files).
```

---

## Implementation Strategy

### MVP (US1 + US2 only — P1 stories)

1. Complete Phase 1 (Setup — verification)
2. Complete Phase 2 (Foundational — schema + rules)
3. Complete Phase 3 (US1 + US2 — generation order + semantic domains)
4. **STOP and VALIDATE**: Run `/handoff-start` on Kershless; check SC-001, SC-002, SC-005
5. If SC-001/002/005 pass, proceed to Phase 4 (US3)

### Full Delivery (all stories)

1. Phases 1–3 as above
2. Phase 4 (US3 — inline snippets)
3. Phase 5 (Polish — dogfood + push)

---

## Notes

- All edits are to AI instruction Markdown files — no compiled code, no runtime
- Edit order within SKILL.md: work top-to-bottom through the file to avoid accidental overwrites
- After each SKILL.md edit, read back the changed section to confirm correctness
- `git add -f` required for all `.handoff/toolkit/` files (gitignored by `.handoff/.gitignore`)
- The Kershless project at `/home/amreid/Kershless-backend-app` is the primary dogfood target
