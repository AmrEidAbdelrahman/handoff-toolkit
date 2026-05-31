# Data Model: Coverage Gaps

**Feature**: `005-coverage-gaps`
**Date**: 2026-05-31

---

## New Node Type 1 — Config & Environment Reference

`doc_type: config_reference` — one per project, conditional (omitted if zero env vars).

**Frontmatter**:
```yaml
id: config-reference
title: "Config & Environment Reference"
depth: supporting
schema_version: 1
doc_type: config_reference
generated_at: <ISO 8601>
quality_score: { business_value_clarity, why_coverage, actionability, no_unsupported_claims }   # snippet_relevance N/A
inferred_fields: [ variable_purposes ]        # present only if any purpose rests on (src: inferred)
confidence_tags: { variable_purposes: low }   # present only if variable_purposes is in inferred_fields
```

**Required body sections (OP-12)**: `## Overview`, `## Variables`.

- `## Overview` — one paragraph: what configuration this project needs and where it is loaded from. Sentences cited.
- `## Variables` — a table, one row per env var:

| Variable | Purpose | Required | Default | Domain | Sensitive |
|---|---|---|---|---|---|
| `DATABASE_URL` | Primary database connection (src: settings.py:14) | required | none | Cross-Cutting Infrastructure | no |
| `STRIPE_SECRET_KEY` | Payment gateway auth (src: payments/client.py:8) | required | none | Payments | **yes** |

**Rules**:
- The Purpose cell carries a `(src: …)` citation (concrete or `inferred`).
- Sensitive vars (`SECRET`/`KEY`/`PASSWORD`/`PASS`/`TOKEN`/`CREDENTIAL`/`PRIVATE` in name): never quote a literal value; Default shows `none` or `(set per environment)`; Sensitive = **yes**.
- Required = optional only when a default exists (code default, `||` fallback, or `.env.example` value).

### Environment Variable Entry (logical entity)
- `name` — the variable name
- `purpose` — one-line description (cited)
- `required` — boolean (optional ⟺ a default exists)
- `default` — the default value, or `none`
- `domains` — consuming domain name(s)
- `sensitive` — boolean (name-pattern based)

---

## New Node Type 2 — Glossary

`doc_type: glossary` — one per project, conditional (omitted if < 3 terms).

**Frontmatter**:
```yaml
id: glossary
title: "Glossary: <Project Name>"
depth: supporting
schema_version: 1
doc_type: glossary
generated_at: <ISO 8601>
quality_score: { business_value_clarity, why_coverage, actionability, no_unsupported_claims }   # snippet_relevance N/A
inferred_fields: [ term_definitions ]        # present only if any definition rests on (src: inferred)
confidence_tags: { term_definitions: low }   # present only if term_definitions is in inferred_fields
```

**Required body section (OP-12)**: `## Terms` (at least 3 entries).

- `## Terms` — one entry per term:
  ```
  - **<Term>** (<domain(s)>): <one-line definition> (src: <identifier>)
  ```

### Glossary Term (logical entity)
- `term` — the domain word (model name or recurring noun)
- `definition` — one-line meaning (cited)
- `domains` — owning domain name(s)

---

## New Per-Domain Subsections (H3 under `## Technical Context`)

Rendered inside the existing `## Technical Context` H2 of a `handover_node`. Both are conditional; the Testing subsection is the one exception that is never silently omitted (states "no tests found" instead).

### `### Dependencies & Integrations`
Present only when the domain talks to ≥ 1 external service.
```
### Dependencies & Integrations
- **<Service Name>** (<type: api|database|queue|cache>): <factual role>. Failure mode: <what breaks for users> (src: <identifier>)
```
- Service name + type are factual (no citation required on the name).
- The **Failure mode** clause is inferred and carries `(src: …)`.

### `### Testing`
Always present for a `handover_node` of depth core/supporting (states the gap if none).
```
### Testing
- Test files: `path/to/test_x.py`, `path/to/test_y.py`
- Run: `<command>`
- Fixtures/seeds: <fixtures, or "none required"> (src: <identifier> if inferred)
```
- Test files and run command are factual.
- Inferred fixture notes carry `(src: …)`.
- If no tests: a single line `- No tests found covering this domain.`

---

## Citation Rule Change (amends feature 004 Step 5.3)

**Before (004)**: "Do NOT add citations to `## Technical Context` paragraphs or to inline snippet bold-label lines."

**After (005)**: "Do NOT add citations to `## Technical Context` **narrative paragraphs** or inline snippet bold-label lines. DO add `(src: …)` citations to inferred sub-bullets in `### Dependencies & Integrations` (the failure-mode clause) and `### Testing` (any inferred note)."

The `no_unsupported_claims` rubric dimension's score-0 trigger is extended: an uncited **inferred** sub-bullet in these H3 subsections fails the dimension. Factual lines (service names, test file paths, run commands, schema field/type facts) do not require citations.

---

## Richer Data-Model (US5) — field-level entity

For data-layer domains, the `erDiagram` and prose are deepened:

### ER diagram (field-level)
```mermaid
erDiagram
  USER {
    int id PK
    string email UK
    int profile_id FK
    datetime created_at
  }
  PROFILE { int id PK; string display_name }
  USER ||--|| PROFILE : has
```
- Each entity lists fields with type and key marker (`PK`, `FK`, `UK`).
- FK relationships shown with cardinality.
- > 15 fields: show keys/FKs/business-critical columns; prose notes total count.

### Prose additions (`## Technical Context`)
- Foreign keys (which entity references which)
- Unique constraints
- Notable indexes
- Schema-shaping migrations (when migrations exist)

These are factual (transcribed from schema source) and exempt from citation, like other Technical Context narrative.

---

## Validation Rule Changes (output-schema.md)

**Rule OP-06 (amended)**: extend the allowed `doc_type` set to include `config_reference` and `glossary`. Full set: `handover_node`, `adr`, `runbook`, `onboarding_guide`, `api_summary`, `config_reference`, `glossary`.

**Rule OP-12 (amended)**: add body-section requirements:
- `doc_type: config_reference` → must contain `## Overview` and `## Variables` (exact text, H2, in order). `## Variables` must contain a table or structured list with at least one variable row.
- `doc_type: glossary` → must contain `## Terms` (exact text, H2). `## Terms` must contain at least 3 term entries.
- H1 still prohibited (BD-07). `schema_version` stays 1.

**Rule OP-16 (new, advisory)**: A `handover_node` MAY include `### Dependencies & Integrations` and/or `### Testing` H3 subsections within its `## Technical Context` section. These are the only conventional H3 subsection names; their presence or absence does not affect validation. (This rule documents the convention; it is not a hard check.)

**Unchanged**: BD-07, BD-08, BD-09 (the H3 subsections do not violate BD-09, which constrains only H2 headings).
