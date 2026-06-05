# Data Model: Trust & Verifiability

**Feature**: `004-trust-verifiability`
**Date**: 2026-05-31

---

## New Frontmatter Fields (additive to HandoverNode)

Both fields are optional. Absence is always valid (backward compatibility).

### `quality_score` field

Added after Part 5d (quality pass) completes. Contains the post-rewrite scores for each applicable rubric dimension.

```yaml
quality_score:
  business_value_clarity: <1 | 2>
  why_coverage: <1 | 2>
  snippet_relevance: <1 | 2>   # omitted for typed docs (ADR/runbook/onboarding/api_summary)
  actionability: <1 | 2>
  no_unsupported_claims: <1 | 2>
```

- Only values `1` and `2` are valid in saved nodes — `0` triggers a rewrite before saving
- `snippet_relevance` key is omitted for node types that do not produce inline snippets
- The mapping key names are fixed (defined in `quality-rubric.md`); the validator checks these keys by name

### `confidence_tags` field

Added during Step 5.2 (populate `inferred_fields`). Contains per-field confidence levels.

```yaml
confidence_tags:
  business_context: <high | medium | low>
  decisions: <high | medium | low>    # only if decisions are present
  warnings: <high | medium | low>     # only if warnings are present
  depth: <high | medium | low>
```

- Only fields appearing in `inferred_fields` get a `confidence_tags` entry
- When a giver confirms a field during `/handoff-review`, the field is removed from both `inferred_fields` and `confidence_tags`
- If all fields are confirmed, `confidence_tags` is absent or empty

---

## New Body Conventions

### Citation Format (inline, sentence-level)

Every inferred sentence in `## Business Context`, `## Decisions`, and `## Warnings` ends with a citation:

```
<sentence text> (src: <source-identifier>)
```

**Source identifier formats**:

| Signal source | Format | Example |
|---|---|---|
| README section | `README §<heading>` | `(src: README §Tournament Management)` |
| Source file line | `<relative-path>:<line>` | `(src: competition/models.py:14)` |
| Git commit message | `commit <sha7>` | `(src: commit a1b2c3d)` |
| Naming / pattern inference | `inferred` | `(src: inferred)` |

**Rules**:
- One citation per sentence (the primary source; use the strongest signal)
- Never fabricate a source — if no specific source can be cited, use `(src: inferred)`
- Any sentence with `(src: inferred)` causes the enclosing field to be added to `inferred_fields`
- `## Technical Context` and inline snippet labels do NOT require citations

---

## Updated HandoverNode Entity

Feature 004 changes relative to feature 003:

| Field | Feature 003 | Feature 004 |
|---|---|---|
| `quality_score` | absent | optional; YAML mapping; values 1–2; written by Part 5d |
| `confidence_tags` | absent | optional; YAML mapping; values high/medium/low; written by Step 5.2 |
| Business Context body | plain inferred sentences | sentences end with `(src: …)` citations |
| Decisions body | plain inferred bullets | bullets end with `(src: …)` citations |
| Warnings body | plain inferred bullets | bullets end with `(src: …)` citations |

---

## Rubric Dimension Definitions (summary; full definitions in quality-rubric.md)

| Dimension | Key | Applies to |
|---|---|---|
| Business value clarity | `business_value_clarity` | All node types |
| "Why" coverage | `why_coverage` | All node types |
| Snippet relevance | `snippet_relevance` | `handover_node` only |
| Actionability | `actionability` | All node types |
| No unsupported claims | `no_unsupported_claims` | All node types |

---

## Validation Rule Changes (additions to output-schema.md)

**Rule OP-14** (new, optional): If `quality_score` is present, it must be a YAML mapping. Each value must be the integer `1` or `2` (not `0`, not a string). Permitted keys are: `business_value_clarity`, `why_coverage`, `snippet_relevance`, `actionability`, `no_unsupported_claims`. Additional keys are not permitted. Absence of `quality_score` is valid — nodes from before feature 004 are not required to have this field.

**Rule OP-15** (new, optional): If `confidence_tags` is present, it must be a YAML mapping. Each value must be exactly one of `high`, `medium`, `low`. Each key must be a field name also present in `inferred_fields` (or recently cleared from it). Absence of `confidence_tags` is valid.

---

## Confidence-Sorted Queue (handoff-review logic)

The review queue tier assignment:

| Node's confidence_tags | Tier | Position in queue |
|---|---|---|
| Any field is `low` | 1 | First |
| No `low`, any field is `medium` | 2 | Second |
| All fields are `high` (or no inferred fields) | 3 | Last |

Within each tier, nodes preserve their index.json order (core → supporting → peripheral).
