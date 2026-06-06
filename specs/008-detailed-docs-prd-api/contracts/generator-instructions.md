# Generator Instruction Contracts: Detailed Docs — PRD & API Reference

**Feature**: 008-detailed-docs-prd-api | **Date**: 2026-06-06

These contracts define the new instruction steps and rule changes that must be implemented in the
toolkit Markdown files. They are the "interface contracts" for this AI-instruction-based feature.

---

## Contract 1 — Step 2c.3 extension: source-code API detection

**File**: `.handoff/toolkit/skills/handoff-start/SKILL.md` — Step 2c.3

**Current behaviour**: Detects API contract files (OpenAPI, Swagger, GraphQL schema, proto) and sets a flag for API Summary generation.

**New behaviour**: After contract-file detection, ALSO check whether any of the following route patterns exist in the domain directory. If found, set `source_route_file_found = true` and record the file path:
- Django: `urls.py` in the domain directory
- Express/Fastify: `routes.js`, `router.js`, or any file that `import`s `express.Router`
- Flask: any `.py` file containing `Blueprint(` or `@app.route(`
- FastAPI: any `.py` file containing `APIRouter(` or `@app.get/post/put/delete/patch(`

If `source_route_file_found = true` AND no contract file was found: read the route file (counts toward 8-file cap); extract method+path+handler reference for each endpoint.

**Invariant**: If a contract file IS found, use the contract file (existing behaviour). Source-code detection is the fallback only.

---

## Contract 2 — Step 2c.4 (new): Product Brief extraction

**File**: `.handoff/toolkit/skills/handoff-start/SKILL.md` — new Step 2c.4

**Trigger**: Run after Step 2c.3 for every domain node (`doc_type: handover_node`).

**Inference signals** (run in order, stop when signal found):
1. Domain has ≥1 HTTP endpoint (from Step 2c.3 route detection) → confidence: HIGH
2. Domain module name is a recognisable business noun (not `utils`, `migrations`, `admin`, `config`, `tests`, `middleware`) → confidence: MEDIUM
3. No signal found → skip; do NOT generate Product Brief

**When confidence ≥ MEDIUM**: Draft `### Product Brief` content:
- **Problem**: one paragraph inferred from the domain's entry-point docstring, first-level comment, or README reference
- **Target users**: inferred from route auth requirements and endpoint path semantics
- **Capabilities**: each HTTP endpoint or major exported function expressed as a user-facing outcome (not a method name)
- **Out of scope**: inferred from neighbouring domains or from what the domain explicitly delegates to other modules
- **Success indicators**: measurable outcomes inferred from the domain's apparent purpose (e.g., "Users can browse and enter competitions", not "the CompetitionViewSet returns 200")

**Mandatory content rule**: The Product Brief MUST NOT contain: raw class names, module paths with slashes, Django/Flask/Express/FastAPI terminology, or any implementation detail. Rewrite until this passes.

**Add `product_brief` to `inferred_fields`** in the node frontmatter.

---

## Contract 3 — api_summary assembly with code_refs

**File**: `.handoff/toolkit/skills/handoff-start/SKILL.md` — Step 5 api_summary assembly

**When triggered by source-code path** (Contract 1 source detection):

For each endpoint extracted in Step 2c.3:
1. Record `file`, `line`, `end_line` for the handler function (use Step 3.7 snippet rules — 5–15 lines, truncate with comment if longer)
2. Construct a `code_refs` entry: `{file, line, end_line, note: "METHOD /path — description"}`
3. In `## Endpoints / Operations`: write the entry referencing the code_ref index

Validation: every endpoint row in `## Endpoints / Operations` MUST have a corresponding `code_refs` entry. Run CR-01 through CR-05 on these refs (Step 5.4 validation).

**When triggered by contract file** (existing behaviour): `code_refs` is optional (backward-compatible). If the contract file specifies `x-source-file` extensions or operation IDs that can be resolved to source lines, emit `code_refs`; otherwise omit.

---

## Contract 4 — OP-17: `### Product Brief` convention (new schema rule)

**File**: `.handoff/toolkit/rules/output-schema.md`

**New rule OP-17** (advisory): A `handover_node` MAY include a `### Product Brief` H3 subsection within its `## Business Context` section, following the opening paragraph(s) of Business Context. This subsection is the only conventional H3 name introduced for the Business Context section. Its presence does not violate BD-09 (which constrains H2 headings only) or BD-07 (H1). Structure: `### Product Brief` followed by bold-label paragraphs for Problem, Target users, Capabilities (bulleted list), Out of scope, and Success indicators.

---

## Contract 5 — OP-04 update: `product_brief` in inferred_fields

**File**: `.handoff/toolkit/rules/output-schema.md`

**Rule OP-04 update**: Add `product_brief` as a fifth valid `inferred_fields` value alongside: `business_context`, `depth`, `decisions`, `warnings`.

---

## Contract 6 — quality-rubric: Product Brief and api_summary coverage

**File**: `.handoff/toolkit/rules/quality-rubric.md`

**Updates**:
- `business_value_clarity` section: add note that this dimension covers `### Product Brief` content when present
- `no_unsupported_claims` section: confirm it applies to `### Product Brief` (which carries no `(src: …)` citations — it IS the citation-exempt business narrative, similar to the existing citation exemption for Business Context prose)
- `doc_type` applicability table: no change to column values; add footnote: "For `handover_node` nodes with `### Product Brief`, the `business_value_clarity` score reflects both the Business Context paragraph and the Product Brief subsection."

---

## Contract 7 — handoff-review: Product Brief awareness

**File**: `.handoff/toolkit/skills/handoff-review/SKILL.md`

**Update**: When a node has `product_brief` in `inferred_fields`, the review walkthrough presents the `### Product Brief` content for confirmation, asking:
- "Is the problem statement accurate?"
- "Is the target user description accurate?"
- "Are the capabilities listed correctly?"

The giver can confirm (`y`), edit inline, or mark for skip (same UX as existing `business_context` review).

---

## Contract 8 — handoff-validate: Product Brief content check

**File**: `.handoff/toolkit/skills/handoff-validate/SKILL.md`

**New check (advisory)**: When a `handover_node` contains `### Product Brief`:
- Warn if any capability bullet contains a code identifier or path (e.g., starts with a backtick or contains `/`)
- Warn if `product_brief` is in `inferred_fields` but no `### Product Brief` subsection is present (drift)
- Warn if `### Product Brief` is present but `product_brief` is NOT in `inferred_fields` (unlabelled inference)
