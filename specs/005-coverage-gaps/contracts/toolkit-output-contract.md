# Handoff Toolkit Output Contract — v5.0

**Supersedes**: v4.0 (feature 004)
**Date**: 2026-05-31
**Backward compatible with**: v2.0, v3.0, v4.0

---

## New Rules (feature 005)

**O-12**: When the project reads any environment variables, the output MUST contain exactly one node with `doc_type: config_reference`, listing every variable with name, purpose, required/optional, default, consuming domain, and sensitivity. When no env vars are read, the node MUST be absent.

**O-13**: No literal secret value may appear anywhere in the output. A variable whose name indicates a secret MUST be listed and described but never have its value quoted.

**O-14**: A domain node MUST include a `### Dependencies & Integrations` H3 subsection (within `## Technical Context`) when the domain talks to ≥ 1 external service; each entry names the service, its type, and an inferred failure mode carrying a `(src: …)` citation. The subsection is omitted when there are no external dependencies.

**O-15**: A domain node MUST include a `### Testing` H3 subsection (within `## Technical Context`) naming covering test files, the run command, and required fixtures. When no tests cover the domain, the subsection states that explicitly rather than being omitted.

**O-16**: When the project has ≥ 3 distinct domain terms, the output MUST contain exactly one node with `doc_type: glossary`; each term has a one-line cited definition and owning domain(s). Fewer than 3 terms → node absent.

**O-17**: For a data-layer domain, the `erDiagram` MUST be field-level (entities list fields with types and PK/FK/UK markers) and the prose MUST list foreign keys and unique constraints; notable indexes and schema-shaping migrations are referenced when present.

**O-18**: All new nodes and subsections MUST comply with feature 004 trust mechanisms — inferred claims carry `(src: …)` citations, new typed nodes carry `quality_score`, and inferred content participates in `inferred_fields`/`confidence_tags` per the three-way invariant (coarse field names `variable_purposes` / `term_definitions` for the consolidated docs).

---

## Citation Exemption Narrowed (amends O-10 / feature 004)

The Technical Context citation exemption from feature 004 now applies ONLY to narrative paragraphs and inline snippet bold-label lines. Inferred sub-bullets in `### Dependencies & Integrations` (failure modes) and `### Testing` (inferred notes) MUST carry `(src: …)` citations.

---

## Inherited Rules (v4.0, unchanged)

- **O-09**: Every generated node has a `quality_score` (values 1–2, no 0).
- **O-10**: Inferred sentences in Business Context, Decisions, Warnings carry `(src: …)` — now extended to inferred H3 sub-bullets per the narrowed exemption above.
- **O-11**: Every node has `confidence_tags` for each `inferred_fields` entry.
- **O-01–O-08**: frontmatter validity, required sections, section order, `code_refs` absence, architecture-overview at index 0, plain-English domain titles, `index.md` with Business Overview + Domain Reference.

---

## Breaking Changes from v4.0

None. O-12 through O-18 are new requirements on output generated from feature 005 onwards. The two new `doc_type` values extend the OP-06 enum; the new H3 subsections are schema-valid under existing rules (BD-09 constrains only H2). Nodes generated before feature 005 remain valid.
