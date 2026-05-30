# Research: Trust & Verifiability in Autonomous Documentation

**Feature**: `004-trust-verifiability`
**Date**: 2026-05-31

---

## Decision 1 — Citation Recording Mechanism

**Decision**: The agent records source signals in-context during inference (Steps 3.3/3.5/3.6), then renders them inline as it writes each sentence in the node body.

**Rationale**: There is no external store or pre-processing step. The agent has already read the source files by Step 3 and knows which file/section each claim came from. The simplest mechanism is to require the agent to append `(src: …)` immediately after each inferred sentence, drawing on the signal it just used. This requires zero new data structures — it is entirely a writing discipline enforced by SKILL.md prose instructions.

**Alternatives considered**:
- Pre-collecting a `source_map: {claim → source}` in memory before writing — adds complexity with no rendering benefit; rejected.
- Post-hoc citation injection (annotate the draft after writing) — harder to trace accurately once context is mixed; rejected.

---

## Decision 2 — Citation Format by Source Type

**Decision**: Four citation formats, always rendered as `(src: <identifier>)`:

| Source type | Format | Example |
|---|---|---|
| README section | `README §<section-name>` | `(src: README §Features)` |
| Source file + line | `<relative-path>:<line>` | `(src: users/models.py:42)` |
| Git commit message | `commit <7-char-sha>` | `(src: commit a1b2c3d)` |
| Naming/pattern inference | `inferred` | `(src: inferred)` |

**Rationale**: The format must be human-readable in any Markdown viewer, short enough to not disrupt reading, and specific enough to be actionable. The four types cover all signal sources used in Steps 3.3/3.5/3.6.

**On `(src: inferred)`**: Used when no specific file/line/commit is the primary signal — e.g., when `business_context` is derived from the general pattern of model names with no specific line. Any sentence with `(src: inferred)` automatically has the field added to `inferred_fields` for human review.

---

## Decision 3 — Quality Rubric Scoring Scale

**Decision**: Three-point scale: 0 (failing — must rewrite), 1 (acceptable), 2 (exemplary). Only score 0 triggers a rewrite.

**Rationale**: A two-point pass/fail collapses the signal — it does not distinguish between a node that barely passes and an excellent one. A five-point scale adds calibration burden for the AI with little practical benefit. Three points matches how code reviewers naturally think: "needs fixing", "good enough", "excellent".

**Scope of rewrite**: When a dimension scores 0, rewrite only the section(s) relevant to that dimension. Do not rewrite the entire node. E.g., if `why_coverage` scores 0, rewrite only the decision bullets that lack reasoning.

---

## Decision 4 — quality_score Frontmatter Format

**Decision**: YAML mapping stored under `quality_score:` key:

```yaml
quality_score:
  business_value_clarity: 2
  why_coverage: 1
  snippet_relevance: 1
  actionability: 1
  no_unsupported_claims: 2
```

**Rationale**: Named keys are self-documenting and stable. The validator can check them by name. Alternative (array): less readable and less queryable.

**When written**: After Part 5d completes (post-rewrite final scores). The score reflects the final state of the node, not the pre-rewrite draft.

**For typed documents (ADR, runbook, etc.)**: `snippet_relevance` is not applicable — omit that key; set the rest. This means `quality_score` for an ADR will have 4 keys instead of 5.

---

## Decision 5 — confidence_tags Frontmatter Format

**Decision**: YAML mapping stored under `confidence_tags:` key:

```yaml
confidence_tags:
  business_context: medium
  decisions: high
  depth: low
```

**Rationale**: Named keys map directly to `inferred_fields` entries. Only fields appearing in `inferred_fields` get a confidence tag — confirmed fields (removed from `inferred_fields`) also have their `confidence_tags` entry removed.

**Confidence level rules** (deterministic, applied at inference time):
- `high`: field inferred from an explicit README heading, docstring, or source comment (`# Note:`, `# Why:`, `# ADR:`, etc.)
- `medium`: field inferred from route paths, model/entity names, view class names, or import patterns — structured but not explicitly documented
- `low`: field inferred solely from directory or file names with no corroborating model, route, or comment signal

---

## Decision 6 — Confidence-Sorted Review Queue Algorithm

**Decision**: Build a sorted queue before the walkthrough loop. Algorithm:

1. Read `index.json` to get the ordered node list.
2. For each node, read its `confidence_tags` frontmatter.
3. Assign a "tier" to each node: if any field is `low` → Tier 1; else if any field is `medium` → Tier 2; else → Tier 3.
4. Sort nodes: Tier 1 first, then Tier 2, then Tier 3. Within each tier, preserve index order (core → supporting → peripheral, as in `index.json`).
5. The resumption cursor (skip already-confirmed nodes) still applies within this sorted order.

**Rationale**: The "worst-case confidence drives the tier" rule ensures that a node with one `low`-confidence field is surfaced before a node where everything is `medium`. This maximises the value of the giver's time — they fix the most uncertain inferences first.

---

## Decision 7 — Quality Pass Scope: Architecture Overview and Business Documents

**Decision**: Part 5d applies to all node types (FR-012). However `snippet_relevance` is skipped for ADR/runbook/onboarding_guide/api_summary nodes (they have no inline snippets by design). The architecture-overview node is also included.

**Mechanism**: The quality rubric file states which dimensions apply to which `doc_type`. The rubric instructs the agent to skip inapplicable dimensions (mark them N/A, not 0).

**When to run for architecture-overview**: Part 2a.3 currently saves the architecture overview immediately. Add a quality pass call between Step 2a.2 (draft body) and Step 2a.3 (save) — same logic as Part 5d.

---

## Decision 8 — Backward Compatibility

**Decision**: Both `quality_score` and `confidence_tags` are optional frontmatter fields. Existing nodes generated before feature 004 pass all validation rules unchanged.

**In output-schema.md**: Two new rules, both under Optional Field Rules:
- OP-14: Advisory. `quality_score` — if present, must be a YAML mapping with keys from the rubric dimensions and integer values 1 or 2 (post-rewrite; 0 is not a valid saved score). Absence is valid.
- OP-15: Advisory. `confidence_tags` — if present, must be a YAML mapping where keys are field names and values are exactly `high`, `medium`, or `low`. Absence is valid.

---

## Decision 9 — Citation Scope

**Decision**: Citations apply to sentences in `## Business Context`, `## Decisions`, and `## Warnings` only. NOT to `## Technical Context` and NOT to inline code snippet labels.

**Rationale**: Technical Context is directly derived from code (file paths, class names, function signatures) — it is already self-evidently sourced from the code. Inline snippet labels already carry the file path + line numbers as explicit references. Citations are most valuable where business meaning is being inferred, not where raw facts are being transcribed.

**For ADR/runbook/onboarding_guide/api_summary body sections**: Apply citations to sentences in `## Context`, `## Decision`, `## Consequences` (ADR); `## Purpose` (runbook); `## Project Summary` (onboarding guide). Skip step-list sections and structural boilerplate.

---

## Decision 10 — No Schema Version Bump

**Decision**: `schema_version` remains 1. The new fields (`quality_score`, `confidence_tags`) are optional and additive. The output contract updates to v4.0 (internal version) without incrementing the schema_version integer.

**Rationale**: A schema_version bump would require all existing nodes to be re-validated against the new version. Since both fields are optional and non-breaking, there is no semantic schema change from the validator's perspective.
