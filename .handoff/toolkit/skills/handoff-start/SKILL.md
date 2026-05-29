---
name: handoff-start
description: Autonomously document a project for developer handover — no giver input required
---

# Handoff Start

This skill runs a fully autonomous project documentation session. It scans the codebase, infers all node content from code signals, writes output nodes, and completes without asking the giver questions — except as a last resort for truly unknowable required fields.

Read this skill completely before taking any action. Follow every part in sequence. All file paths are relative to the project root.

---

## Part 1 — Session Initialisation

### Step 1.1 — Read the session protocol

Read `.handoff/toolkit/rules/session-protocol.md` completely. Follow those rules exactly throughout this session.

### Step 1.2 — Determine session state

Attempt to read `.handoff/session.json`. Determine which case applies per session-protocol.md Rule 1 and act accordingly:

- **Case A (no session.json)**: Derive `project_name` from the repository root folder name (check the README for a more descriptive name if available). Write initial `session.json` with `status: "in_progress"`, `pending_sections: []`, `completed_nodes: []`, `current_section: null`, and `started_at` set to the current ISO 8601 timestamp. Proceed to Part 2.

- **Case B (status: "paused")**: Announce how many nodes are complete and which sections remain. Set `status: "in_progress"` in session.json and write it. Skip Part 2 — proceed directly to Part 3 using the existing `pending_sections` list.

- **Case C (status: "complete")**: Check `index.json` for `generated_at_sha`. If present, enter delta re-run mode (see Part 4). If absent, stop and ask the giver whether to start a fresh session or exit.

- **Case D (status: "in_progress")**: Treat as Case B. Announce that the previous session was interrupted and resume from the first section in `pending_sections`. Skip Part 2.

- **Case E (status: "reviewing" or "paused_review")**: Stop immediately. Tell the giver: "This project is in review mode. Run `/handoff-review` to continue." Do not proceed.

Do not proceed past Step 1.2 until session state is resolved and written to disk.

---

## Part 2 — Autonomous Project Scan

Run Part 2 only on a fresh session (Case A). For resumes and delta re-runs, skip to Part 3 or Part 4.

### Step 2.1 — Scan the project structure

Read the following in order:
1. Any README file at the project root (`README.md`, `README.rst`, `README.txt`, or similar)
2. Top-level directory listing
3. Key manifest files if present: `package.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod`, `Makefile`, `docker-compose.yml`
4. One level of sub-directory listing inside the main source directories (`src/`, `lib/`, `app/`, `pkg/`, `internal/`, or equivalent)

Read file contents only for README and manifest files in this step. Scan names and structure for everything else.

### Step 2.2 — Identify logical sections

Based on the scan, identify between 5 and 15 logical sections. Each section corresponds to a major module, service, or functional concern — not individual files.

Apply these naming heuristics:
- A top-level directory with its own entry point (e.g., `src/auth/index.ts`) → one section named after the directory (e.g., "Authentication")
- A top-level directory containing only configuration or static assets → merge into a "Configuration" or "Project Setup" section
- Shared infrastructure directories (`src/lib/`, `src/utils/`, `pkg/common/`) → one "Shared Utilities" or "Core Library" section
- Infrastructure directories (`deploy/`, `infra/`, `.github/`) → one "Deployment & CI/CD" section unless they contain major logic
- For very small projects (fewer than 5 meaningful directories): include developer experience sections (local setup, testing strategy, configuration)

Produce an ordered list of section names. Order them roughly from most fundamental to most peripheral.

### Step 2.3 — Write pending_sections

Write the identified section names to `pending_sections` in `session.json`. Write the complete session.json object. Do not present this list to the giver for confirmation — proceed immediately.

Print a brief status line: "Identified N sections. Documenting autonomously..."

---

## Part 3 — Field Inference

Process each section in `pending_sections` in order. For each section, follow all steps in Part 3 before moving to the next section.

### Step 3.1 — Set current_section

Write `current_section: "<section name>"` to session.json before starting work on the section.

### Step 3.2 — Read the relevant files

Identify the entry-point file for this section (e.g., `src/auth/index.ts`, `auth/views.py`, `internal/auth/handler.go`). Then read:
- The entry-point file (full content if under ~200 lines; first 150 lines if longer)
- 2–4 additional files that implement the core logic of this section
- Any configuration or type definition files specific to this section

Limit reading to 8 files total. Prioritise files that reveal how the section works over files that merely use it.

### Step 3.3 — Infer `business_context`

Derive the business purpose from these sources, in priority order:

1. **README**: Look for sentences that describe what this module/feature does for users or the business. Extract the most relevant sentence or phrase.
2. **Package/manifest description**: Check `package.json` `description`, `pyproject.toml` `[project] description`, module-level docstrings at the top of the entry-point file.
3. **Folder name semantics**: Apply these mappings:
   - `auth/`, `authentication/`, `login/` → "handles user authentication and session management"
   - `billing/`, `payments/`, `subscriptions/` → "manages billing, payment processing, and subscription lifecycle"
   - `notifications/`, `emails/` → "sends and manages user notifications"
   - `api/`, `routes/`, `handlers/` → "exposes the application's HTTP API endpoints"
   - `db/`, `database/`, `models/`, `schema/` → "defines the data model and manages database interactions"
   - `workers/`, `jobs/`, `queues/` → "processes background jobs and async tasks"
   - `admin/` → "provides administrative interfaces and management tools"
   - `config/`, `settings/` → "manages application configuration and environment settings"
   - `lib/`, `utils/`, `helpers/` → "provides shared utility functions used across the application"
   - `tests/`, `__tests__/`, `spec/` → "contains the automated test suite"
   - For any other name: use the directory name as a plain English phrase (e.g., `recommendations/` → "handles product recommendations")
4. **Commit message patterns**: Scan git log for recent commits touching this section's files. Look for messages that describe user-facing value (e.g., "add JWT expiry" → authentication section handles token expiry).

Write `business_context` as 2–4 sentences describing: what this section does, why it exists, and what would break for users if it disappeared.

If none of the above sources yield usable signal — that is, the README has no description, there is no docstring, the folder name is opaque (e.g., `widgets/`, `misc/`), and commit messages are unhelpful — fall back to Part 6 (minimal-question fallback) for this field only.

### Step 3.4 — Infer `depth`

Count inbound references to this section from all other sections:
- Read the entry-point files of the other sections already identified
- Count how many import or require this section's files (e.g., `import { ... } from '../auth'`)
- Also check `package.json` `dependencies` for shared packages that correspond to sections

Apply this classification:
- 3 or more other sections import from this section → `core`
- 1–2 other sections import from this section → `supporting`
- No other sections import from this section, or it is a standalone utility/config → `peripheral`

Override heuristic: sections named "Data Model", "Database", "Core", "Shared Library", or "Configuration" are almost always `core` regardless of import count.

### Step 3.5 — Infer `decisions`

Scan the files read in Step 3.2 for signals of documented architectural choices:

- Comments starting with `// Note:`, `// Reason:`, `// Why:`, `# Note:`, `# Reason:` — extract the comment text
- Unusual patterns: a library choice that is non-standard for the language/framework (e.g., using `bcrypt` instead of built-in hashing, using a custom router instead of the framework's default)
- Configuration choices that have non-obvious values (e.g., specific timeout values, pool sizes, retry limits with comments)
- Interface/type definitions that impose unusual constraints

For each identified decision, write one bullet: describe what was decided and why (inferred from the comment or pattern). If no decisions are found, omit the `## Decisions` section entirely from the node.

### Step 3.6 — Infer `warnings`

Scan the files read in Step 3.2 for these signals:

- `TODO`, `FIXME`, `HACK`, `XXX`, `DEPRECATED` comments — extract the comment text as a warning
- Missing error handling: `catch` blocks that are empty or that only log errors without recovery
- Very long functions (over 80 lines) — flag as complexity risk
- Deeply nested conditionals (more than 4 levels) — flag as complexity risk
- Direct environment variable access in non-config files (e.g., `process.env.SECRET` inside a route handler) — flag as a config coupling warning
- Known deprecated APIs being used (e.g., `componentWillMount` in React, deprecated library methods)

For each warning found, write one bullet describing the issue and its location (file + approximate line if known). If no warnings are found, omit the `## Warnings` section entirely from the node.

### Step 3.7 — Determine `code_refs`

Identify 1–3 code references for this section:
1. **Primary ref**: The entry-point file for the section (e.g., `src/auth/index.ts`). Note: "Main entry point — start here to understand this section."
2. **Secondary ref** (if helpful): The file containing the most important business logic or the largest class/function. Note: a one-line description of what it contains.
3. **Optional third ref**: A configuration or schema file if it is essential to understanding the section.

Use only files that you have read and confirmed exist. Use forward slashes in all paths. Keep each `note` under 200 characters.

---

## Part 2b — Diagram Planning (run after Step 3.7 for each section)

After completing Part 3 field inference for a section, plan its diagrams before moving to the next section.

### Step 2b.1 — Classify the section

Read `.handoff/toolkit/rules/diagram-methodology.md` Part 1. Apply the five-category classification to the current section. Record the category.

### Step 2b.2 — Determine required diagrams

From the decision matrix, identify which diagram types are required for this section category. If "None", skip to Step 2b.4 and record no diagrams.

### Step 2b.3 — Check optional diagram evidence

For each optional diagram type applicable to this section category, check the evidence threshold defined in diagram-methodology.md § 1.2. Generate the optional diagram only if the threshold is met.

### Step 2b.4 — Draft diagram source

For each diagram to be generated:

1. Draft the Mermaid source using the correct syntax type from diagram-methodology.md § 2.1
2. Name each element in the diagram to match the primary components visible in the files read during Part 3
3. For components that have a corresponding `code_refs` entry, assign a `code_refs[].id` to that entry following the naming convention in diagram-methodology.md § 2.2. Use the same identifier as the diagram element label
4. Write a one-sentence description for the diagram
5. Choose a descriptive title (e.g., "Authentication Service Architecture", "User Data Model", "Order Processing Flow")

Store the drafted diagram(s) for this section in memory — they will be validated and saved during Part 5b.

### Step 2b.5 — Assign `code_refs[].id` values

For each `code_refs` entry whose corresponding component appears as a named element in a planned diagram, add the `id` field now (before writing the node). Apply the naming rules from diagram-methodology.md § 2.2. Do not add `id` to refs that are not represented in any diagram element.

---

## Part 2c — Business Document Planning (run once, after all sections in Part 3 are complete)

After all handover sections have been processed through Part 3 and Part 2b, plan business documents.

### Step 2c.1 — Scan for ADR signals

Re-read the files collected during Part 3 (already in memory) and check for ADR detection signals as defined in diagram-methodology.md § 3.1. For each detected signal:
- Note which section it belongs to
- Draft the ADR title and core decision
- Record it in a list: `[(section_id, decision_title), ...]`

### Step 2c.2 — Scan for Runbook signals

Check for Runbook detection signals as defined in diagram-methodology.md § 3.2. For each detected signal:
- Identify the procedure it represents
- Record it in a list: `[(signal_file, procedure_title), ...]`

### Step 2c.3 — Check for API contract file

Check whether any API contract trigger file exists (defined in diagram-methodology.md § 3.4). If found, record it for API Summary generation.

### Step 2c.4 — Draft business documents

For each item in your ADR list, draft the full ADR document using the template in diagram-methodology.md § 3.1.

For each item in your Runbook list, draft the full Runbook document using the template in diagram-methodology.md § 3.2.

If an API contract file was found, draft the API Summary using the template in diagram-methodology.md § 3.4.

Always draft one Onboarding Guide after all other documents are drafted, using the template in diagram-methodology.md § 3.3. The Onboarding Guide references all nodes and documents produced in this session.

Store all drafted documents in memory — they will be saved during Part 5c.

---

## Part 4 — Delta Re-Run Logic

Run Part 4 only when `index.json` has a `generated_at_sha` (Case C resume). For fresh sessions, skip to Part 5.

### Step 4.1 — Compute the diff

Run: `git diff --name-only <generated_at_sha> HEAD`

If the command fails with an error indicating the SHA is not in history (e.g., "unknown revision", "not a valid object name"): print "SHA not found in history — performing full regeneration" and treat this as a fresh scan (run Part 2 then Part 3 for all sections).

### Step 4.2 — Map changed files to existing nodes

Read `index.json` to get the current node list. For each changed file from the diff:
- Check whether the file path appears in any node's `code_refs[].file` values
- Collect the set of node IDs whose code refs include at least one changed file

### Step 4.3 — Identify new sections

Run Part 2's section identification on the current codebase. Compare the identified sections against the existing nodes in `index.json` (by section name or by entry-point file). Any section not covered by an existing node is a new section.

### Step 4.4 — Process affected and new sections

For affected existing nodes:
- Re-run Part 3 (Steps 3.2 through 3.7) for each affected node to re-infer all fields
- Reset `inferred_fields` to the newly inferred list (as if documenting from scratch)
- Overwrite the node file with the updated content

For new sections:
- Run Part 3 (Steps 3.2 through 3.7) as for a fresh session
- Create new node files and add entries to `index.json`

Leave all unaffected nodes completely untouched — do not re-read, re-infer, or overwrite them.

### Step 4.5 — Continue to Part 5

After processing all affected and new sections, proceed to Part 5 (session completion).

---

## Part 5 — Node Save Workflow

For each section processed in Part 3 (or Part 4 for delta re-runs), save the node as follows.

### Step 5.1 — Determine node id

Derive the `id` from the section name:
- Lowercase all characters
- Replace spaces with hyphens
- Remove any characters that are not lowercase letters, digits, or hyphens
- Truncate to 60 characters maximum

Example: "API Layer" → `api-layer`, "Authentication & Sessions" → `authentication-sessions`.

### Step 5.2 — Populate `inferred_fields`

Build the `inferred_fields` list by including the name of every field that was AI-inferred (not read directly from human-written documentation):

- Always include `business_context` (always inferred from code signals)
- Include `depth` if classified by the import-count heuristic (include in almost all cases)
- Include `decisions` if any decisions were inferred from code comments or patterns (not from explicit architecture docs)
- Include `warnings` if any warnings were inferred from code signals (TODOs, complexity, etc.)

Do NOT include a field in `inferred_fields` if:
- The giver answered a question about it (see Part 6 — it is then human-provided)
- It was read verbatim from an explicit human-written architecture document

### Step 5.3 — Assemble the node

Build the complete node file content with YAML frontmatter and Markdown body:

```
---
id: <id>
title: <section name>
depth: <core | supporting | peripheral>
schema_version: 1
code_refs:
  - file: <path>
    note: <description>
  [additional refs if applicable]
generated_at: <current ISO 8601 timestamp>
inferred_fields:
  - business_context
  [- depth]
  [- decisions]
  [- warnings]
---

## Business Context

<Inferred business context — 2–4 sentences>

## Technical Context

<Technical description — 2–5 paragraphs covering: high-level approach, data flow, key patterns/libraries, entry points>

## Decisions

<Bulleted list of decisions — omit section entirely if no decisions found>

## Warnings

<Bulleted list of warnings — omit section entirely if no warnings found>
```

### Step 5b — Validate and attach diagrams

Run this step before Step 5.4. It is part of node assembly.

**Step 5b.1 — Validate diagram source**: For each diagram drafted for this section in Part 2b, run the four-point validation procedure from diagram-methodology.md § 2.4:

1. Check for unclosed brackets, parentheses, and quotes
2. Check that the first non-whitespace line is a valid Mermaid type keyword
3. Check arrow operator correctness
4. Check node label syntax

**Step 5b.2 — Correct or replace**: If a diagram fails validation, attempt one correction. Re-validate. If it still fails, replace the diagram block with a prose description and add a `## Warnings` bullet: `- DIAGRAM VALIDATION FAILED — replaced with prose: <title>`.

**Step 5b.3 — Set `diagram_format`**: Count how many diagrams passed validation and were not replaced with prose. If at least one diagram remains, add `diagram_format: mermaid` to the node's frontmatter. If zero diagrams remain after replacements, do not add `diagram_format`.

**Step 5b.4 — Assemble `## Diagrams` section**: For each surviving diagram, append a diagram block to the node body using the structure from diagram-methodology.md § 2.3. Place the `## Diagrams` section as the last section in the body, after `## Warnings` if present. If no diagrams survived, omit the `## Diagrams` section entirely.

### Step 5.4 — Validate the node

Apply the validation rules from `.handoff/toolkit/rules/output-schema.md` to the assembled content. Check all applicable rules: FM-01 through FM-09, CR-01 through CR-05, OP-01 through OP-05, OP-06 through OP-12 (new rules from feature 002), BD-01 through BD-09 (for `handover_node` type only).

**If all rules pass**: proceed to Step 5.5.

**If any rules fail**: fix each issue without asking the giver. Re-validate until the node passes. Only ask the giver if a required field genuinely cannot be provided without human input (apply Part 6).

### Step 5.5 — Write the node file

Write the validated node content to `.handoff/output/nodes/<id>.md`.

### Step 5.6 — Update index.json

Read `.handoff/output/index.json` if it exists. If it does not exist, create it with this initial structure:

```json
{
  "schema_version": 1,
  "project_name": "<project_name from session.json>",
  "generated_at": "<current ISO 8601 timestamp>",
  "nodes": []
}
```

Add the new node as an entry in the `nodes` array:

```json
{
  "id": "<id>",
  "title": "<section name>",
  "depth": "<depth>",
  "dependencies": [],
  "file": "nodes/<id>.md"
}
```

Sort the `nodes` array: all `core` entries first, then `supporting`, then `peripheral`. Within each depth group, preserve insertion order.

Write the updated `index.json`.

### Step 5.7 — Update session state

Following session-protocol.md Rule 2 (event: node completed):
- Add the node `id` to `completed_nodes`
- Remove the section name from `pending_sections`
- Set `current_section: null`
- Write session.json

Print a one-line status: "✓ [title] ([depth]) — [N] sections remaining."

---

## Part 5c — Save Business Documents

Run Part 5c after all handover nodes have been saved through Part 5 (i.e., after the last section's Step 5.7 completes). This part saves all business documents drafted in Part 2c.

### Step 5c.1 — Save ADR documents

For each ADR drafted in Part 2c:

1. Apply FM-01 through FM-09 and OP-06 and OP-12 (adr rules) from `output-schema.md` to validate the document
2. Assign a node `id` following the naming convention: `<section-id>-<short-decision-slug>-adr` (e.g., `auth-jwt-strategy-adr`)
3. Write the document to `.handoff/output/nodes/<id>.md`
4. Add an index entry with `doc_type: "adr"`:
   ```json
   { "id": "...", "title": "ADR: ...", "depth": "supporting", "dependencies": [], "file": "nodes/<id>.md", "doc_type": "adr" }
   ```
5. Add the document path (`nodes/<id>.md`) to the `doc_refs` frontmatter of the handover node that motivated this ADR. Read the handover node file, add or update `doc_refs`, write it back.

### Step 5c.2 — Save Runbook documents

For each Runbook drafted in Part 2c:

1. Validate against FM-01 through FM-09, OP-06, and OP-12 (runbook rules)
2. Assign a node `id` following the naming convention: `<short-procedure-slug>-runbook` (e.g., `local-dev-setup-runbook`)
3. Write the document to `.handoff/output/nodes/<id>.md`
4. Add an index entry with `doc_type: "runbook"`:
   ```json
   { "id": "...", "title": "Runbook: ...", "depth": "supporting", "dependencies": [], "file": "nodes/<id>.md", "doc_type": "runbook" }
   ```
5. Add the document path to `doc_refs` of the nearest relevant handover node (the one covering the operational area)

### Step 5c.3 — Save API Summary (conditional)

If an API Summary was drafted in Part 2c:

1. Validate against FM-01 through FM-09, OP-06, and OP-12 (api_summary rules)
2. Use `id: api-summary`; write to `.handoff/output/nodes/api-summary.md`
3. Add index entry with `doc_type: "api_summary"`

### Step 5c.4 — Save Onboarding Guide

The Onboarding Guide must reference all nodes and documents now in `index.json`. Re-read `index.json` to get the complete current list.

1. Build `## Reading Order` from the `index.json` nodes array (core first, then supporting, then peripheral); exclude ADRs, Runbooks, and other business document types from this list
2. Build `## Related Documents` from all ADR and Runbook entries added to `index.json`
3. Write `## Project Summary` as a paragraph derived from the project's README and the core nodes' business contexts
4. Validate against FM-01 through FM-09, OP-06, and OP-12 (onboarding_guide rules)
5. Write to `.handoff/output/nodes/onboarding-guide.md` (overwrite if it exists from a previous run)
6. Add index entry with `doc_type: "onboarding_guide"` if not already present; update if it exists

### Step 5c.5 — Final index sort

After all business documents are added, re-sort `index.json` `nodes` array: core → supporting → peripheral. Within each depth group, handover nodes come before business documents (in insertion order within each sub-group). Write the final `index.json`.

---

## Part 6 — Minimal-Question Fallback

Invoke Part 6 only when a required field (`business_context` or `code_refs`) truly cannot be inferred from any available source after exhausting all inference steps.

### When to invoke

- `business_context`: all sources in Step 3.3 yielded no usable signal (no README, no docstring, folder name is opaque, no relevant commit messages)
- `code_refs`: no entry-point file can be identified (no `index.*`, no `main.*`, no file matching the section name pattern), and reading the directory listing does not reveal an obvious starting file

Never invoke Part 6 for `depth`, `decisions`, or `warnings` — these optional or heuristic fields always have a fallback (use `supporting` for depth; omit the section for decisions/warnings).

### What to ask

Ask exactly one focused question per missing field. Use this phrasing:

For `business_context`:
> "I couldn't determine the business purpose of `<section name>` from the code. In one sentence: what does this module do for the business or for users?"

For `code_refs`:
> "I couldn't identify the main entry point for `<section name>`. What file should a new developer open first to understand this section? (Give the path relative to the project root.)"

### After receiving an answer

- Fill the field with the giver's answer
- Do NOT add the field to `inferred_fields` — it is now human-provided
- Resume autonomous mode immediately, moving on to the next inference step or the next section
- Never ask more than one question per section, never ask follow-up questions, never ask about optional fields

---

## Part 7 — Session Completion

Run Part 7 when `pending_sections` is empty and all nodes are saved.

### Step 7.1 — Record the git SHA

Run: `git rev-parse HEAD`

If the command succeeds: read the 40-character hex SHA. Update `index.json` by adding `"generated_at_sha": "<sha>"` and setting `"generated_at"` to the current ISO 8601 timestamp. Write `index.json`.

If the command fails (no git history or not in a git repo): omit `generated_at_sha` from `index.json`. Note to the giver: "Could not record a git SHA — the project may not have any commits yet."

### Step 7.2 — Write session complete

Set `status: "complete"` in session.json and write the file (session-protocol.md Rule 2, event: session complete).

### Step 7.3 — Print completion summary

Print:

```
✓ Handoff complete — N nodes documented.

  Core:        [list titles]
  Supporting:  [list titles]
  Peripheral:  [list titles]

Run /handoff-review to review AI-inferred content, or commit .handoff/output/ to share with receivers.
```

---

## Important Constraints

- Never ask the giver for information that can be inferred from code. The only permitted questions are the one-sentence fallbacks in Part 6 for truly unknowable required fields.
- Every file write is a complete overwrite of the file. Read the current state, modify it in memory, then write the full content.
- If any file write fails (permission error, path error, etc.), stop and show the giver the error. Do not continue until the write is confirmed.
- The session can be safely interrupted at any step — session.json tracks progress, and Part 1 handles resumption.
- Write `inferred_fields` to the frontmatter of every node. This list is the single source of truth for the `/handoff-review` skill. Do not omit it.
