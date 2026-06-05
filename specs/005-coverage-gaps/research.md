# Research: Coverage Gaps

**Feature**: `005-coverage-gaps`
**Date**: 2026-05-31

---

## Decision 1 — Per-domain subsections are H3 under `## Technical Context`

**Decision**: Render **Dependencies & Integrations** and **Testing** as H3 subsections (`### Dependencies & Integrations`, `### Testing`) inside the existing `## Technical Context` H2 section, not as new H2 sections.

**Rationale**: BD-09 permits only four H2 sections in a `handover_node` (Business Context, Technical Context, Decisions, Warnings). BD-07 restricts H1. No schema rule constrains H3. So H3 subsections under Technical Context are schema-valid and break no existing node. Adding new H2 sections would require changing BD-09 — a breaking schema change affecting every existing node.

**Alternatives considered**:
- New H2 sections + relax BD-09 — breaking change; rejected.
- Separate per-domain nodes for dependencies/testing — fragments the domain story across multiple files; rejected.

---

## Decision 2 — Citation/Technical-Context collision: narrow the feature 004 exemption (CRITICAL)

**Problem**: Feature 004 Step 5.3 states "Do NOT add citations to `## Technical Context` paragraphs… those are self-evidently sourced from the code." But Decision 1 routes **inferred** content into Technical Context:
- A dependency's **failure mode** ("what breaks for users if this service is down") is an inference, not a transcription from code.
- Some **Testing** notes (e.g., which fixtures matter) are inferred.

Feature 005's FR-012 requires inferred claims to carry `(src: …)`. So the structure places citation-requiring content in the one zone 004 exempted, and the exemption's rationale ("self-evidently sourced from code") is false for a failure-mode guess.

**Decision**: **Narrow the 004 exemption.** The Technical Context citation exemption applies only to (a) the narrative paragraphs and (b) inline snippet bold-label lines — content transcribed directly from code. It does NOT apply to inferred sub-bullets in the new H3 subsections. Specifically:
- Each **Dependencies & Integrations** bullet: the service name is factual (no citation needed for the name itself), but the **failure-mode clause** is inferred and MUST carry a trailing `(src: …)` citation (concrete source where the SDK/connection is used, or `inferred`).
- Each **Testing** bullet: test file paths and run commands are factual (cite the source file/`package.json`/`Makefile` where helpful but not required); any **inferred** note (e.g., "these tests need the seed fixtures") carries `(src: …)`.

**Why not Option (b) — failure modes in `## Warnings`**: Splitting a dependency's name (Technical Context) from its failure mode (Warnings) breaks the cohesion that makes the subsection useful — a receiver wants the service and its failure together. Rejected.

**Implementation impact**: Feature 005's Step 5.3 edit must update the 004 citation rule wording from "do NOT cite Technical Context" to "do NOT cite Technical Context narrative paragraphs or snippet labels; DO cite inferred sub-bullets in `### Dependencies & Integrations` and `### Testing`." The `no_unsupported_claims` rubric dimension's score-0 trigger extends to these sub-bullets.

---

## Decision 3 — Config Reference and Glossary are typed documents (OP-12 body sections)

**Decision**: Two new `doc_type` values with explicit required H2 sections (so OP-12 has something to validate):

- **`config_reference`** — required sections: `## Overview`, `## Variables`. `## Variables` must contain a table (or a structured list) with one row per environment variable: name, purpose, required/optional, default, consuming domain, sensitivity.
- **`glossary`** — required sections: `## Terms`. `## Terms` must contain at least 3 term entries, each a term + one-line definition + owning domain(s).

**Rationale**: OP-12 validates typed documents by required H2 section presence. Without enumerated sections there is nothing to check. These mirror the API Summary pattern (`## Overview` + `## Endpoints / Operations` + `## Authentication`).

**Cardinality & conditionality**:
- `config_reference`: exactly one per project; omitted if zero env vars found (like API Summary).
- `glossary`: exactly one per project; omitted if fewer than 3 distinct terms.

**Index placement**: both sort among business documents (after API Summary, before domain nodes) in Part 5c.5 ordering and in `index.md`'s Business Overview.

---

## Decision 4 — Three-way invariant for the new typed docs

**Decision**: Preserve feature 004's invariant (`(src: inferred)` ⟺ `low` confidence ⟺ in `inferred_fields`) at node granularity for the consolidated typed docs, using a single coarse inferred-field name per doc:

- `config_reference` → inferred field name `variable_purposes`. If ANY variable's purpose rests on `(src: inferred)`, then `variable_purposes` is in `inferred_fields` and tagged `low` in `confidence_tags`. If every purpose traces to a concrete source, no entry needed.
- `glossary` → inferred field name `term_definitions`. Same rule: any `(src: inferred)` definition forces `term_definitions` into `inferred_fields` at `low`.

**Rationale**: `inferred_fields` is node-level and field-named, not row-level. Tagging each of 20 glossary rows individually would not map onto the existing mechanism. A single coarse field per doc keeps the invariant intact (no orphan `(src: inferred)` content) and lets `/handoff-review` surface these docs in the confidence-sorted queue, without per-row bookkeeping.

**Citations regardless of tagging**: Every inferred definition/purpose sentence carries `(src: …)` — concrete (e.g., the model field that defines a term, the settings line that defaults a var) or `inferred`. This is required by FR-008/FR-002 + FR-012 independent of the coarse inferred-field tagging.

**Part 5c.0 routing**: Add `config_reference` (cited sections: `## Overview`, the purpose column of `## Variables`) and `glossary` (cited sections: the definitions in `## Terms`) to the Part 5c.0 citation enumeration so their inferred claims get citations during the business-document save pass.

---

## Decision 5 — Environment variable mining (US1)

**Decision**: Mine env vars from these sources during Part 2c, merging by variable name:
1. In-code reads: `process.env.X`, `os.environ['X']` / `os.environ.get('X')`, `os.getenv('X')`, framework settings accessors (`settings.X`, `config('X')`, `env('X')`).
2. `.env.example` / `.env.sample` / `.env.template` files — names and example values (example values are safe to show as defaults only for non-secret vars).
3. Settings/config files (`settings.py`, `config/*.py`, `config.*.js`, etc.).
4. `docker-compose.yml` / `docker-compose.*.yml` `environment:` blocks.

**Required vs optional**: a var is **optional** if it has a default in code (`os.getenv('X', default)`, `||` fallback, `.env.example` entry with a value) — record the default. It is **required** if read with no default and no `.env.example` value — default recorded as "none".

**Consuming domain**: map each var to the domain(s) whose files reference it (using the `pending_sections` directory map).

**Secret safety (FR-003)**: a var whose name contains `SECRET`, `KEY`, `PASSWORD`, `PASS`, `TOKEN`, `CREDENTIAL`, `PRIVATE`, or `API_KEY` is marked **sensitive**; its purpose is described but no literal value (from `.env.example` or anywhere) is ever quoted.

---

## Decision 6 — External dependency detection (US2)

**Decision**: Detect external services from these signals in the domain's files:
- Imported SDK clients (e.g., `stripe`, `boto3`, `sendgrid`, `redis`, `pika`/`kombu`, `elasticsearch`, database drivers).
- Base URLs / API hostnames in constants or config.
- Connection strings (database URLs, `REDIS_URL`, broker URLs).
- Broker topics / queue names / channel names.

**Type classification**: each dependency is typed as `api` (third-party HTTP API), `database`, `queue`, or `cache`.

**Dead-import exclusion (FR-005)**: an SDK imported but never invoked (no client instantiation or method call in the domain's files) is excluded.

**Failure mode**: one inferred line per dependency — what breaks for users if the service is unavailable — carrying a `(src: …)` citation per Decision 2.

---

## Decision 7 — Test discovery (US3)

**Decision**: Discover a domain's tests by:
1. Test files matching `tests/`, `__tests__/`, `*_test.*`, `*.test.*`, `test_*.*`, mapped to the domain by path correspondence (mirrored layout) and by the source symbols they import.
2. Run command from `Makefile` test targets, `package.json` `scripts.test` (and related), `pyproject.toml`/`tox.ini`, or equivalent task runner — narrowed to the domain's tests where the runner supports path/marker selection.
3. Fixtures/seeds: factory files, fixture directories, `conftest.py`, seed scripts referenced by the domain's tests.

**No-tests visibility (FR-006)**: if no tests cover the domain, the `### Testing` subsection states "No tests found covering this domain." explicitly — it is NOT omitted, so the gap is visible to the receiver.

---

## Decision 8 — Glossary term extraction (US4)

**Decision**: Extract terms from:
1. Model/entity names (the primary source — each becomes a term).
2. Recurring nouns in route/URL path segments.
3. Recurring domain nouns in comments and docstrings.

Each term gets a one-line definition derived from its model fields, usage, or surrounding comments, with a `(src: …)` citation. Each term notes its owning domain(s). A term spanning domains is defined once. Common-English collisions (e.g., "Match", "Order") are defined in the project's specific sense with the domain noted. Omit the glossary entirely if fewer than 3 distinct terms.

---

## Decision 9 — Richer data-model (US5)

**Decision**: For data-layer domains, deepen both the ER diagram and the prose:
- **ER diagram**: render Mermaid `erDiagram` with field-level entities — each entity lists its fields with types and key markers (PK/FK). Foreign-key relationships shown with cardinality.
- **>15 fields (FR-011)**: show keys, FKs, and business-critical columns only; note the total field count in prose.
- **Prose** (`## Technical Context`): list foreign keys, unique constraints, and notable indexes; reference schema-shaping migrations (table creation, significant alterations) where migrations exist.
- **Sources**: ORM model definitions, SQL DDL/schema files, and migration files.

**Citation note**: field/type/constraint facts are transcribed from the schema source (factual, exempt like other Technical Context narrative). Any inferred commentary about a field's business meaning carries `(src: …)` per Decision 2.

---

## Decision 10 — No schema version bump

**Decision**: `schema_version` stays 1. New `doc_type` values (`config_reference`, `glossary`) extend the OP-06 enum; new OP-12 body rules are additive; the H3 subsection rule is advisory. All existing nodes remain valid. Output contract advances to v5.0 (internal) without a schema_version change.
