# Research: Detailed Docs — PRD & API Reference

**Feature**: 008-detailed-docs-prd-api | **Date**: 2026-06-06

All NEEDS CLARIFICATION items resolved before planning. Research items are recorded here.

## R-001 — Product Brief inference signals

**Decision**: Infer a `### Product Brief` when: ≥1 HTTP endpoint exists in the domain OR the domain module name is a business-domain noun (not `utils`, `migrations`, `admin`, `config`, `tests`).

**Why**: These signals reliably indicate a user-facing feature with an inferable purpose. Infrastructure/utility domains produce generic content that adds no value.

**Alternatives considered**: Always generate (too noisy), require explicit annotation (defeats automation).

---

## R-002 — HTTP endpoint extraction from source code

**Decision**: Read the domain's route registration file to extract method+path+handler reference. Then read the handler function (bounded to 5–15 lines per existing snippet rules). Supported file patterns:
- Django: `urls.py` (domain-level or project-level URL conf)
- Express/Fastify: files importing `Router()` or `express.Router()`
- Flask: files containing `Blueprint(` or `@app.route(`
- FastAPI: files containing `APIRouter(` or `@app.` decorator

**Why**: Route registration files are dense, short, and predictable. The existing 8-file cap in SKILL.md Step 3 bounds total reads.

**Alternatives considered**: Parse all decorator occurrences (unbounded), require OpenAPI (existing-only behaviour).

---

## R-003 — code_refs format for api_summary

**Decision**: Reuse the existing `code_refs` frontmatter format. Each endpoint entry gets one `code_refs` entry: `file` = handler file path, `line` = handler function start line, `end_line` = handler function end (or start+15 max), `note` = "METHOD /path — one-line description".

**Why**: Zero schema changes. The VS Code extension already navigates via `code_refs`; the reader already renders chips and scroll-sync for them.

**Alternatives considered**: New `endpoint_refs` key (schema change, duplicates code_refs).

---

## R-004 — BD-09 constraint resolution

**Decision**: Product Brief is `### Product Brief` H3 under `## Business Context`, not a new H2. A new advisory rule OP-17 documents this convention (mirrors OP-16 for Technical Context H3s).

**Why**: BD-09 is a hard constraint on handover_node H2s. H3s are explicitly permitted. Business Context is the correct semantic parent.

**Alternatives considered**: New doc_type (disconnects from other domain content), amend BD-09 (breaking change).

---

## R-005 — quality_score applicability

**Decision**: No new rubric dimensions. `business_value_clarity` covers `### Product Brief` quality (it IS part of Business Context). Enriched api_summary scoring unchanged: `no_unsupported_claims` and `actionability` apply; `snippet_relevance` remains N/A.

**Why**: OP-14 limits `quality_score` keys to exactly five named dimensions. Adding a new key would invalidate existing nodes.

---

## R-006 — inferred_fields extension

**Decision**: Add `product_brief` as a valid value for the `inferred_fields` array in OP-04, alongside the existing four values. The handoff-review skill will prompt the giver to confirm/correct the Product Brief content when present.

**Why**: Consistency with the existing inference-review model. `product_brief` is just as AI-inferred as `business_context`.

**Schema change**: OP-04 currently lists exactly four valid values. Update to five.
