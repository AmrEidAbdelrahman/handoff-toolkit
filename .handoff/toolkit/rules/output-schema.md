# Handoff Output Schema — Validation Rules

**Schema version covered by this file: 1**

This is the AI validation reference for Handoff node files. Read this file completely before running any validation check. Each rule is numbered and must be checked independently. A node PASSES only if every applicable rule below is satisfied.

---

## Part 1 — Frontmatter Validation

Check each rule in order. Record PASS or FAIL for each one.

### Required Field Rules

**Rule FM-01**: `id` is present.

**Rule FM-02**: `id` conforms to the pattern `^[a-z0-9]+(-[a-z0-9]+)*$`. Allowed characters: lowercase letters a–z, digits 0–9, and hyphens. No uppercase, no underscores, no spaces, no leading or trailing hyphens.

**Rule FM-03**: `id` is no more than 60 characters long.

**Rule FM-04**: `id` matches the filename of the node file (the filename without `.md` extension must equal the `id` value exactly).

**Rule FM-05**: `title` is present and non-empty (not an empty string, not whitespace only).

**Rule FM-06**: `title` is no more than 120 characters long.

**Rule FM-07**: `depth` is present and is exactly one of: `core`, `supporting`, `peripheral`. No other values are valid.

**Rule FM-08**: `schema_version` is present and equals the integer `1`. String `"1"` is not valid — it must be a YAML integer.

**Rule FM-09**: `code_refs` is present and is an array containing at least one item. An empty array `[]` fails this rule.

### Code Ref Rules

For every item in `code_refs`, check:

**Rule CR-01**: Each code ref has a `file` field that is a non-empty string. The path must use forward slashes (`/`). No backslashes.

**Rule CR-02**: Each code ref has a `note` field that is a non-empty string no more than 200 characters long.

**Rule CR-03**: If `line` is present in a code ref, it must be a positive integer (≥ 1). Zero and negative numbers are invalid.

**Rule CR-04**: If `end_line` is present in a code ref, `line` must also be present in that same code ref. `end_line` without `line` is invalid.

**Rule CR-05**: If both `line` and `end_line` are present, `end_line` must be greater than or equal to `line`.

### Optional Field Rules

**Rule OP-01**: If `dependencies` is present, it must be an array. Each element must be a non-empty string. An empty array `[]` is acceptable.

**Rule OP-02**: If `tags` is present, it must be an array of no more than 10 items. Each tag must be a non-empty string using only lowercase letters, digits, and hyphens (same pattern as `id`).

**Rule OP-03**: If `generated_at` is present, it must be a valid ISO 8601 datetime string (e.g., `2026-05-23T14:30:00Z`).

**Rule OP-04**: If `inferred_fields` is present, it must be an array. Each element must be one of the following exact string values: `business_context`, `depth`, `decisions`, `warnings`. Any other value fails this rule.

**Rule OP-05**: `inferred_fields` is optional. Its presence or absence does not affect whether a node passes or fails validation. A node with a non-empty `inferred_fields` array is still schema-valid. However, once all fields listed in `inferred_fields` have been confirmed by the giver via `/handoff-review`, `inferred_fields` must be absent or set to an empty array `[]` before the node is considered fully reviewed.

---

## Part 2 — Body Section Validation

The body is the Markdown content after the closing `---` of the YAML frontmatter.

### Required Section Rules

**Rule BD-01**: A `## Business Context` heading exists in the body (exact text, case-sensitive, H2 level using `##`).

**Rule BD-02**: The `## Business Context` section contains at least one non-empty paragraph. A paragraph is one or more lines of text that are not headings, not empty lines. A section header followed immediately by another header or end of file fails this rule.

**Rule BD-03**: A `## Technical Context` heading exists in the body (exact text, case-sensitive, H2 level using `##`).

**Rule BD-04**: The `## Technical Context` section contains at least one non-empty paragraph. Same definition as BD-02.

### Optional Section Rules

**Rule BD-05**: If `## Decisions` is present, it must contain at least one list item. A list item begins with `- ` or `* ` or `1.` (unordered or ordered). An empty Decisions section (heading with no content) fails this rule.

**Rule BD-06**: If `## Warnings` is present, it must contain at least one list item. Same definition as BD-05.

### Structural Rules

**Rule BD-07**: No H1 headings (`#` followed by a space) appear anywhere in the body. H1 is reserved for the extension to render the node title. This rule checks the entire body, not just sections.

**Rule BD-08**: The sections that are present must appear in this fixed order: `## Business Context` → `## Technical Context` → `## Decisions` → `## Warnings`. No section may appear before a section that precedes it in this sequence. For example, `## Technical Context` appearing before `## Business Context` fails this rule.

**Rule BD-09**: No H2 headings other than the four permitted section names (`Business Context`, `Technical Context`, `Decisions`, `Warnings`) appear in the body. Additional sections are not allowed.

---

## Part 3 — Index Consistency Validation

Use these rules when validating `.handoff/output/index.json` alongside a node file.

**Rule IX-01**: The node's `id` appears as exactly one entry in the `nodes` array of `index.json`. Duplicate entries fail this rule. Missing entry fails this rule.

**Rule IX-02**: The index entry's `file` value equals `nodes/<id>.md` where `<id>` is the node's `id`.

**Rule IX-03**: If `dependencies` is present in the node frontmatter, each listed `id` exists as an entry in `index.json`.

---

## Part 4 — Validation Outcome

After checking all applicable rules:

**PASS**: Every applicable rule above is satisfied. No failures.

**FAIL**: One or more rules are not satisfied. For each failure, record:
- The rule ID (e.g., FM-02)
- The exact value or content that failed the check
- A specific, actionable correction (e.g., "Change `id: My_Module` to `id: my-module` — underscores are not allowed")

### Output Format

When running a validation check, produce output in this format:

```
## Validation Results: <filename>

### Frontmatter
- FM-01: PASS
- FM-02: FAIL — id value "My_Module" contains underscores. Change to "my-module".
- ...

### Body
- BD-01: PASS
- BD-02: PASS
- ...

### Verdict
VALIDATION FAILED (2 issues)

Issues to fix:
1. [FM-02] id "My_Module" is invalid. Must match ^[a-z0-9]+(-[a-z0-9]+)*$. Rename to "my-module".
2. [BD-05] ## Decisions section is present but contains no list items. Add at least one item (e.g., "- Decision rationale here") or remove the section entirely.
```

If all rules pass:

```
### Verdict
VALIDATION PASSED — node is schema-valid.
```
