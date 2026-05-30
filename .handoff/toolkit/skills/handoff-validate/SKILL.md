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

## Step 8 — Act on the Verdict

**If VALIDATION PASSED**: Report the result. The calling skill (or giver) may proceed to write the file. Do not write the file yourself unless explicitly asked.

**If VALIDATION FAILED**: Report all failures with specific corrections. Do NOT write or overwrite the node file. Tell the giver what to fix before the node can be saved. If this skill was invoked from `/handoff-start`, control returns to that skill to collect corrections and re-validate.
