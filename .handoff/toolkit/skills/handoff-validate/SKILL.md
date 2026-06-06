---
name: handoff-validate
description: Validate a Handoff node file against the schema before saving
---

# Handoff Validate

This skill validates a single Handoff node `.md` file against the output schema. It is invoked with a file path as the argument and produces a structured PASS/FAIL report.

**Input**: `$ARGUMENTS` contains the path to a node `.md` file to validate. Example: `.handoff/output/nodes/authentication.md`

---

## Step 1 — Read the Schema Rules

Read `.handoff/toolkit/rules/output-schema.md` completely before checking any rules. That file is the authoritative source of all validation rules. Do not rely on memory — read it fresh every time this skill is invoked.

---

## Step 2 — Read the Node File

Read the file at the path provided in `$ARGUMENTS`.

If the file does not exist: output `VALIDATION FAILED — File not found: <path>` and stop. Do not proceed further.

---

## Step 3 — Parse the File

The file has two parts separated by YAML frontmatter delimiters (`---`):
1. **YAML frontmatter**: everything between the first `---` and the second `---`
2. **Markdown body**: everything after the second `---`

Parse both parts. If the frontmatter cannot be parsed as valid YAML, output `VALIDATION FAILED — Frontmatter is not valid YAML` with the parse error and stop.

---

## Step 4 — Run Frontmatter Validation Rules

Work through **every rule in Part 1 — Frontmatter Validation** of `output-schema.md` exactly as written there. Do not rely on memory — the schema file is the authoritative rule list. Check each rule in the order it appears.

Important behavioural notes:
- **FM-09 (`code_refs` optional)**: Absence of `code_refs` is always valid. Only check CR-01–CR-05 if `code_refs` is present.
- **OP-05, OP-11, OP-13 (advisory rules)**: Log "Advisory: <message>" but do not record a FAIL. These rules never cause a node to fail validation.
- **OP-12 (typed documents)**: If `doc_type` is present and is not `handover_node`, note which body section requirements apply (per the OP-12 sub-rules for that doc_type) — you will use this in Step 5.

For each non-advisory rule: record PASS or FAIL. On FAIL, record the rule ID, the specific value that failed, and the exact correction needed.

---

## Step 5 — Run Body Validation Rules

Work through every rule in **Part 2 — Body Section Validation** of `output-schema.md`. Apply the correct ruleset based on `doc_type`:

- **`handover_node` (or absent `doc_type`)**: Apply BD-01 through BD-09 as written.
- **Any other `doc_type` (`adr`, `runbook`, `onboarding_guide`, `api_summary`)**: Apply the OP-12 body section requirements for that specific type instead of BD-01 through BD-09. Rule BD-07 (no H1 headings) still applies to all doc types. Ignore BD-01 through BD-06, BD-08, BD-09 for typed documents.

For each applicable rule: record PASS or FAIL with the same detail as Step 4.

---

## Step 6 — Run Index Consistency Rules (if applicable)

If `.handoff/output/index.json` exists, read it and check the rules in **Part 3 — Index Consistency Validation** of `output-schema.md`.

If `index.json` does not exist yet (the node is being saved for the first time), skip Part 3 rules entirely.

---

## Step 7 — Output the Report

Produce a validation report in the format defined in the **Part 4 — Validation Outcome** section of `output-schema.md`. The report must include:

- A result line for every rule that was checked (PASS or FAIL)
- A final verdict: either `VALIDATION PASSED` or `VALIDATION FAILED (N issues)`
- For each failure: the rule ID, the specific value or content that failed, and an actionable correction

---

## Step 7b — Advisory: `### Product Brief` Content Checks (handover_node only)

Run these advisory checks after Step 7 for `handover_node` documents (or nodes with no `doc_type`). Log each finding as "Advisory (OP-17): <message>" — these do NOT cause a FAIL verdict.

1. **Capability purity**: If `### Product Brief` is present, scan every bullet in the **Capabilities** list. If any bullet contains a backtick, a forward slash `/` (indicating a path or URL fragment), or an identifier matching a known framework term (Django, Flask, FastAPI, Express, Fastify, ViewSet, Router, Blueprint, APIRouter), warn: "Capability bullet may contain a technical identifier — rephrase as a user-facing outcome."

2. **Frontmatter drift (present but unlabelled)**: If `### Product Brief` is present in the body but `product_brief` is NOT in `inferred_fields`, warn: "### Product Brief is present but `product_brief` is missing from `inferred_fields`. Add `product_brief` to `inferred_fields` to prevent reviewer skip."

3. **Frontmatter drift (labelled but absent)**: If `product_brief` is in `inferred_fields` but no `### Product Brief` subsection is found in `## Business Context`, warn: "`product_brief` is listed in `inferred_fields` but no `### Product Brief` subsection is present. Either add the subsection or remove `product_brief` from `inferred_fields`."

4. **Placeholder check**: If a `### Product Brief` subsection exists but contains only placeholder text (e.g., "TODO", "TBD", "placeholder", or a single word), warn: "`### Product Brief` appears to contain placeholder content. Either populate all five elements or remove the subsection entirely."

## Step 7c — Advisory: `api_summary` code_refs Consistency

Run these advisory checks after Step 7 for nodes with `doc_type: api_summary`. Log each finding as "Advisory (OP-12): <message>" — these do NOT cause a FAIL verdict unless OP-12 explicitly requires `code_refs` (source-code path).

1. **Source-code path detection**: If `code_refs` is present in the frontmatter (heuristic: source-code-generated api_summary), count the number of `code_refs` entries. Count the number of endpoint rows in `## Endpoints / Operations` (each row in a Markdown table or each `**METHOD /path**` bold entry counts as one endpoint).

2. **Count mismatch**: If the two counts differ, warn: "`code_refs` has N entries but `## Endpoints / Operations` has M endpoint rows. Each endpoint must have exactly one `code_refs` entry when generated from source code."

3. **File path plausibility**: For each `code_refs` entry, check whether the `file` path value appears (wholly or as a basename) anywhere in the `## Endpoints / Operations` section body. If a `code_refs` entry's `file` cannot be matched to any visible handler reference in the section, warn: "`code_refs` entry for `<file>` has no matching endpoint row visible in `## Endpoints / Operations`."

---

## Step 8 — Act on the Verdict

**If VALIDATION PASSED**: Report the result. The calling skill (or giver) may proceed to write the file. Do not write the file yourself unless explicitly asked.

**If VALIDATION FAILED**: Report all failures with specific corrections. Do NOT write or overwrite the node file. Tell the giver what to fix before the node can be saved. If this skill was invoked from `/handoff-start`, control returns to that skill to collect corrections and re-validate.
