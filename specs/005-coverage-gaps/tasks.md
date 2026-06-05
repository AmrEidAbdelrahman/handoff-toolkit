---
description: "Task list for Coverage Gaps feature implementation"
---

# Tasks: Coverage Gaps — The Sections Receivers Most Want

**Input**: Design documents from `specs/005-coverage-gaps/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Not requested — no automated test tasks. Validation is via the manual dogfood test (T026) against SC-001–SC-007.

**Organization**: Tasks are grouped by user story (US1–US5). All implementation tasks edit one of three existing toolkit files (`output-schema.md`, `diagram-methodology.md`, `handoff-start/SKILL.md`). The Foundational phase lands the schema + catalogue changes that every later phase references. Within `handoff-start/SKILL.md`, tasks are sequenced to avoid overlapping edits.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in the same phase)
- **[Story]**: US1 = Config Reference; US2 = Dependencies & Integrations; US3 = Testing; US4 = Glossary; US5 = Richer data-model

---

## Phase 1: Setup

**Purpose**: Verify current file state before modifications — no changes made here.

- [X] T001 Verify `.handoff/toolkit/rules/output-schema.md` exists; confirm OP-06 doc_type set, OP-12 typed-doc rules, and the current highest OP number (OP-15) so new rules append cleanly
- [X] T002 Verify `.handoff/toolkit/rules/diagram-methodology.md` exists; confirm Part 3 catalogue structure (API Summary §3.4 as the template to mirror) and the erDiagram guidance in § 2.1 / Part 1
- [X] T003 Verify `.handoff/toolkit/skills/handoff-start/SKILL.md` exists; confirm current content of Part 2c (business-doc planning), Part 3 (Steps 3.2/3.5/3.6/3.7), Step 5.3 (assembly + citation rule), Part 5c (save business docs), and Part 5c.5 (index ordering)

---

## Phase 2: Foundational — Schema & Catalogue

**Purpose**: Extend the schema and the business-document catalogue so SKILL.md edits in later phases have rules and templates to reference. MUST complete before Phases 3–7.

**⚠️ CRITICAL**: Every user-story phase references these. Land them first.

- [X] T004 [P] In `.handoff/toolkit/rules/output-schema.md` — amend Rule OP-06 to extend the allowed `doc_type` set with `config_reference` and `glossary` (full set: handover_node, adr, runbook, onboarding_guide, api_summary, config_reference, glossary)
- [X] T005 In `.handoff/toolkit/rules/output-schema.md` — amend Rule OP-12: add body-section requirements for `config_reference` (`## Overview` then `## Variables`; `## Variables` must contain a table or structured list with ≥ 1 variable row) and `glossary` (`## Terms` with ≥ 3 term entries)
- [X] T006 In `.handoff/toolkit/rules/output-schema.md` — add new advisory Rule OP-16: a `handover_node` MAY include `### Dependencies & Integrations` and/or `### Testing` H3 subsections within `## Technical Context`; these are the only conventional H3 subsection names; presence/absence does not affect validation; note explicitly that these H3 subsections do NOT violate BD-09 (which constrains only H2)
- [X] T007 [P] In `.handoff/toolkit/rules/diagram-methodology.md` Part 3 — add a `config_reference` catalogue entry (§3.5): purpose, frontmatter template (no `code_refs`; `quality_score` placeholder; `doc_type: config_reference`), required sections `## Overview` + `## Variables` with the variable table columns (Variable, Purpose, Required, Default, Domain, Sensitive), detection trigger (any env-var read / `.env.example` / docker-compose env), secret-safety rule, and naming `config-reference.md`
- [X] T008 [P] In `.handoff/toolkit/rules/diagram-methodology.md` Part 3 — add a `glossary` catalogue entry (§3.6): purpose, frontmatter template, required section `## Terms` with the `- **<Term>** (<domains>): <definition> (src: …)` entry format, detection trigger (≥ 3 distinct domain terms), and naming `glossary.md`
- [X] T009 [P] In `.handoff/toolkit/rules/diagram-methodology.md` — deepen the `erDiagram` guidance (§ 2.1 and the Data layer row of Part 1): require field-level entities (fields with types and PK/FK/UK markers), FK relationships with cardinality, and the >15-field truncation rule (show keys/FKs/business-critical columns; note total count in prose)

**Checkpoint**: Schema + catalogue ready. User-story phases can begin.

---

## Phase 3: User Story 1 — Config & Environment Reference Node (P1)

**Goal**: One consolidated `config_reference` node listing every env var (name, purpose, required/optional, default, domain, sensitive), generated once like the API Summary; omitted when no env vars exist; never quotes a secret value.

**Independent Test**: Run `/handoff-start` on a project that reads env vars; confirm exactly one `config-reference` node with the variable table; confirm no secret values appear.

- [X] T010 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 2c — add an env-var scan step: mine in-code reads (`process.env.*`, `os.environ`/`os.getenv`, settings accessors), `.env.example`/`.env.sample`/`.env.template`, settings/config files, and `docker-compose*.yml` `environment:` blocks; merge by name; classify required-vs-optional (optional ⟺ a default exists; record the default); map each var to consuming domain(s) via the `pending_sections` directory map; flag sensitive vars by name pattern (`SECRET`/`KEY`/`PASSWORD`/`PASS`/`TOKEN`/`CREDENTIAL`/`PRIVATE`); store the collected variables in memory
- [X] T011 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 5c — add Step 5c.x "Save Config Reference (conditional)": if ≥ 1 env var was found, draft the `config_reference` node using the §3.5 template, render the `## Variables` table (never quoting a secret value — Default shows `none`/`(set per environment)`, Sensitive = yes), apply citations to `## Overview` and the Purpose column, run the Part 5d quality pass (snippet_relevance N/A), validate against FM-01–FM-09/OP-06/OP-12/OP-14, write to `nodes/config-reference.md`, add index entry with `doc_type: "config_reference"`; if zero env vars, skip
- [X] T012 [US1] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 5c.5 (final index sort) and Step 7.1b (index.md) — place `config-reference` among the business documents (after API Summary, before domain nodes) and link it in the `## Business Overview` section of `index.md`

**Checkpoint**: US1 complete. Config reference node generated, secret-safe, ordered with business docs.

---

## Phase 4: User Story 2 — Dependencies & Integrations per Domain (P2)

**Goal**: Each domain node gains a `### Dependencies & Integrations` H3 subsection (under Technical Context) naming external services, their type, and an inferred failure mode with a citation.

**Independent Test**: Run `/handoff-start` on a domain importing an SDK client or opening a connection; confirm the node has `### Dependencies & Integrations` with the service, type, and a cited failure mode.

- [X] T013 [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 3 — add Step 3.x "Detect external dependencies": from the domain's files, identify external services via imported SDK clients, base URLs, connection strings, and broker/queue topics; classify each as api/database/queue/cache; exclude dead imports (imported but never invoked); for each, record an inferred one-line failure mode with its source signal (concrete or `inferred`); store in memory
- [X] T014 [US2] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 5.3 — render `### Dependencies & Integrations` as an H3 subsection inside `## Technical Context` when ≥ 1 dependency exists (omit if none); each bullet: `- **<Service>** (<type>): <factual role>. Failure mode: <…> (src: …)`; the failure-mode clause carries a citation, the service name does not

**Checkpoint**: US2 complete. Externally-integrated domains list services + cited failure modes.

---

## Phase 5: User Story 3 — Testing per Domain (P2)

**Goal**: Each domain node gains a `### Testing` H3 subsection naming covering test files, the run command, and required fixtures; states the gap explicitly when no tests are found.

**Independent Test**: Run `/handoff-start` on a domain with test files; confirm `### Testing` lists the test files, run command, and fixtures; a domain with no tests says so.

- [X] T014b [US3] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 3 — add Step 3.y "Discover tests": find test files (`tests/`, `__tests__/`, `*_test.*`, `*.test.*`, `test_*.*`) covering the domain by path correspondence and imported symbols; find the run command from `Makefile`/`package.json` scripts/`pyproject.toml`/`tox.ini`; identify fixtures/seeds (factories, fixture dirs, `conftest.py`, seed scripts); store in memory
- [X] T015 [US3] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 5.3 — render `### Testing` as an H3 subsection inside `## Technical Context` for every core/supporting `handover_node`: list test files, the run command, and fixtures (inferred notes carry `(src: …)`); if no tests cover the domain, render the single line `- No tests found covering this domain.` (never omit the subsection)

**Checkpoint**: US3 complete. Every domain's tests are findable/runnable, or the gap is visible.

---

## Phase 6: User Story 4 — Glossary Node (P3)

**Goal**: One consolidated `glossary` node of domain terms with one-line cited definitions and owning domains; omitted when < 3 terms.

**Independent Test**: Run `/handoff-start` on a project with model names; confirm one `glossary` node with terms, definitions, and domains.

- [X] T016 [US4] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 2c — add a glossary-term scan: extract terms from model/entity names, recurring route/URL nouns, and recurring domain nouns in comments/docstrings; derive a one-line definition per term (from model fields, usage, or comments) with a source signal; record owning domain(s); store in memory
- [X] T017 [US4] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 5c — add Step 5c.z "Save Glossary (conditional)": if ≥ 3 distinct terms, draft the `glossary` node using the §3.6 template, render `## Terms` entries with cited definitions, apply the three-way invariant via the coarse field `term_definitions` (in `inferred_fields` + `confidence_tags: {term_definitions: low}` only if any definition rests on `(src: inferred)`), run the Part 5d quality pass, validate (OP-06/OP-12/OP-14), write to `nodes/glossary.md`, add index entry with `doc_type: "glossary"`; if < 3 terms, skip
- [X] T018 [US4] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 5c.5 and Step 7.1b — place `glossary` among the business documents and link it in `index.md` `## Business Overview`

**Checkpoint**: US4 complete. Glossary generated with cited definitions, ordered with business docs.

---

## Phase 7: User Story 5 — Richer Data-Model Docs (P3)

**Goal**: Data-layer domains get field-level ER diagrams and prose listing FKs, unique constraints, notable indexes, and schema-shaping migrations.

**Independent Test**: Run `/handoff-start` on a project with a data model; confirm the data-layer node's ER diagram shows fields with types and the prose lists FKs and unique constraints.

- [X] T019 [US5] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 3.2 — for data-layer domains, additionally read schema sources (ORM model definitions, SQL DDL/schema files, migration files) to extract field-level detail: fields, types, PK/FK/UK markers, unique constraints, notable indexes, and schema-shaping migrations
- [X] T020 [US5] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 2b (diagram planning) / Step 5b — when the section is classified Data layer, author the `erDiagram` at field level per the deepened §2.1 guidance (fields + types + key markers, FK cardinality, >15-field truncation with total-count note in prose)
- [X] T021 [US5] In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 5.3 — for data-layer domains, extend the `## Technical Context` prose to list foreign keys, unique constraints, notable indexes, and reference schema-shaping migrations (these are factual/transcribed — exempt from citation; any inferred commentary on a field's business meaning carries `(src: …)`)

**Checkpoint**: US5 complete. Data-layer node is field-level.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Citation-rule amendment, consistency check, and dogfood validation.

- [X] T022 In `.handoff/toolkit/skills/handoff-start/SKILL.md` Step 5.3 — amend the feature 004 citation rule wording: the Technical Context exemption now applies ONLY to narrative paragraphs and inline snippet bold-label lines; inferred sub-bullets in `### Dependencies & Integrations` (failure modes) and `### Testing` (inferred notes) MUST carry `(src: …)`. Extend the `no_unsupported_claims` rubric trigger note accordingly (per research.md Decision 2)
- [X] T023 In `.handoff/toolkit/skills/handoff-start/SKILL.md` Part 5c.0 — add `config_reference` (cited: `## Overview` + the Purpose column of `## Variables`) and `glossary` (cited: definitions in `## Terms`) to the citation-routing enumeration so their inferred claims get citations during the business-document save pass
- [X] T024 Verify `.handoff/toolkit/rules/output-schema.md` and `diagram-methodology.md` are internally consistent: OP-06/OP-12 list the two new doc_types; OP-16 is advisory; §3.5/§3.6 templates match the OP-12 required sections; no contradictions
- [X] T025 In `CLAUDE.md` — confirm the plan pointer references `specs/005-coverage-gaps/plan.md` (already updated during planning; verify)
- [ ] T026 MANUAL: Run `/handoff-start` on `/home/amreid/Kershless-backend-app` — inspect against SC-001 (one config reference node, all startup vars), SC-002 (zero secret values), SC-003 (each integrated domain names service + failure mode), SC-004 (tested domains findable/runnable; untested say so), SC-005 (≥ 5 terms resolvable from glossary), SC-006 (field-level ER + FKs/constraints in prose), SC-007 (new nodes carry quality_score + citations + confidence_tags). Isolate behavior by feature (003 → 004 → 005) if output looks wrong
- [ ] T027 [P] Push updated toolkit files to `https://github.com/AmrEidAbdelrahman/handoff-toolkit` master branch after the dogfood test passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: read-only verification
- **Foundational (Phase 2)**: depends on Phase 1 — BLOCKS all user-story phases (schema + catalogue must exist first)
- **US1 (Phase 3)**: depends on Phase 2
- **US2 (Phase 4)**, **US3 (Phase 5)**: depend on Phase 2; logically independent of US1; sequenced after US1 because they edit the same SKILL.md Step 5.3
- **US4 (Phase 6)**: depends on Phase 2
- **US5 (Phase 7)**: depends on Phase 2
- **Polish (Phase 8)**: depends on all prior phases. T022/T023 are cross-cutting citation edits that finalize US2/US3/US4 correctness — do them after the subsections exist.

### File Edit Sequencing

`handoff-start/SKILL.md` is edited across Phases 3–8. Work top-to-bottom through the file within each phase; read back each changed section. Order of concern: Part 2c scans (T010, T016) → Part 3 inference (T013, T014b, T019) → Part 2b/5b diagrams (T020) → Step 5.3 rendering (T014, T015, T021, T022) → Part 5c saves (T011, T017) → Part 5c.0/5c.5/7.1b (T023, T012, T018).

### Parallel Opportunities

- Phase 2: T004 + T007/T008/T009 (output-schema.md vs diagram-methodology.md — different files) can run in parallel; T005/T006 are sequential after T004 (same file).
- T027 runs only after T026 passes.

---

## Implementation Strategy

### MVP (US1 only — the P1 story)

1. Phase 1 (Setup), Phase 2 (Foundational)
2. Phase 3 (US1 — config reference node)
3. **STOP and VALIDATE**: run `/handoff-start` on Kershless; check SC-001, SC-002
4. If P1 passes, proceed to US2–US5

### Full Delivery

1. Phases 1–2
2. Phases 3–7 (US1 → US5)
3. Phase 8 (citation amendment + consistency + dogfood + push)

---

## Notes

- All edits are to AI instruction Markdown files — no compiled code, no runtime
- `schema_version` stays 1; new doc_types and H3 subsections are additive/backward-compatible
- The H3 subsections (Dependencies & Integrations, Testing) live under `## Technical Context` to keep BD-09 (H2-only) intact
- `git add -f` required for all `.handoff/toolkit/` files (gitignored)
- The Kershless project is the primary dogfood target; this is the 3rd unverified feature stacked on 003+004 — isolate by feature at T026
