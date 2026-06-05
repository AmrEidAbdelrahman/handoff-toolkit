---
name: handoff-review
description: Interactive review of AI-inferred Handoff documentation — confirm or correct per field
---

# Handoff Review

This skill guides the giver through an interactive review of AI-generated node content. It walks through each node that has AI-inferred fields, labels them clearly, and lets the giver confirm or correct them field by field. Progress is automatically saved — the skill can be interrupted and resumed at any time.

Read this skill completely before taking any action. All file paths are relative to the project root.

---

## Part 1 — Invocation Check and Session Setup

### Step 1.1 — Handle `--help` flag

If `$ARGUMENTS` contains `--help`, display the help text defined in Part 6 and stop. Do not proceed with the walkthrough.

### Step 1.2 — Read the session protocol

Read `.handoff/toolkit/rules/session-protocol.md` completely before taking any other action.

### Step 1.3 — Check for output

Attempt to read `.handoff/output/index.json`. If the file does not exist, stop and tell the giver:

> "No Handoff output found. Run `/handoff-start` first to generate documentation."

### Step 1.4 — Update session status

Read `.handoff/session.json`. Update `status` to `"reviewing"` and write the file (session-protocol.md Rule 2, event: review started).

### Step 1.5 — Count nodes and announce

Read `index.json` to get the full node list. For each node, read the node file and check whether `inferred_fields` is present and non-empty. Count:
- N = total nodes with non-empty `inferred_fields` (need review)
- M = total nodes where `inferred_fields` is absent or `[]` (already confirmed, will be skipped)

Print:

```
Reviewing N nodes with AI-inferred content (M already confirmed, skipping).
```

If N is 0, print:

```
✓ All nodes already confirmed — nothing to review. Handoff is ready to commit.
```

Then set `status: "complete"` in session.json, write it, and stop.

---

## Part 2 — Walkthrough Loop

Process nodes in **confidence-sorted order** (lowest confidence first) so the giver's attention goes to the inferences most likely to be wrong.

### Step 2.1 — Build the confidence-sorted queue

Before starting the loop, build the review queue:

1. Read `index.json` to get the node list in its stored order (core → supporting → peripheral).
2. For each node, read its `.md` file and inspect the `confidence_tags` frontmatter mapping.
3. Assign each node a **tier** based on its lowest-confidence field:
   - **Tier 1** — the node has at least one field tagged `low`
   - **Tier 2** — no `low` fields, but at least one field tagged `medium`
   - **Tier 3** — all inferred fields are `high` (or the node has no `confidence_tags`)
4. Sort the queue: Tier 1 first, then Tier 2, then Tier 3. Within each tier, preserve the node's original `index.json` order (core → supporting → peripheral).
5. Apply the resumption cursor within this sorted queue: silently skip nodes where `inferred_fields` is absent or empty (already confirmed). Start the walkthrough at the first node in the sorted queue that still has non-empty `inferred_fields`.

This replaces the plain index-order cursor from session-protocol.md Rule 6: the skip-confirmed behaviour is unchanged, but the order is now confidence-sorted rather than index-sorted.

### Step 2.2 — Process each node

For each node starting from the resumption point:

1. Read the node file at `.handoff/output/nodes/<id>.md`
2. If `inferred_fields` is absent or `[]`: skip this node without printing anything
3. If `inferred_fields` is non-empty: display the node per Part 2 field display rules, then prompt for giver action per Part 3

---

## Part 3 — Field Display

For each node with non-empty `inferred_fields`, display the following before prompting for action:

### Display format

```
─────────────────────────────────────────
Node: <title> [<depth>]
─────────────────────────────────────────

Business Context  <label>
  <content>

Technical Context  [from code]
  <content>

Decisions  <label>          (omit this block if the Decisions section is absent)
  <content>

Warnings  <label>           (omit this block if the Warnings section is absent)
  <content>
```

### Label rules

- For each field listed in `inferred_fields`: display label `[AI-guessed · <confidence>]` where `<confidence>` is the field's value from `confidence_tags` (`high` / `medium` / `low`). Example: `[AI-guessed · low]`. If a field is in `inferred_fields` but has no `confidence_tags` entry, display `[AI-guessed]` with no confidence suffix.
- For all other fields (not in `inferred_fields`): display label `[from code]`
- `technical_context` is never in `inferred_fields` — always show as `[from code]`
- `title` and `depth` are not displayed in the review prompt (they are structural, not narrative)
- Inline code snippets (fenced code blocks in `## Technical Context`) are structural content derived from source files — they are never reviewed interactively

Showing the confidence level tells the giver why this node surfaced early (the queue is sorted low → high) and where their scrutiny matters most: `low` fields rest on weak signals (directory/file names) and are the most likely to be wrong.

### Typed document display

For nodes where `doc_type` is `adr`, `runbook`, `onboarding_guide`, `api_summary`, `config_reference`, or `glossary`, the body sections differ from the standard `handover_node` sections (`## Business Context`, `## Technical Context`). Display whichever sections are present in the node file, using the same label rules above. Do not require the standard four sections — use the actual section headings as they appear in the node body.

For the two consolidated typed docs that carry a coarse inferred field:
- `config_reference` with `inferred_fields: [variable_purposes]` — display the `## Variables` table and label the inferred Purpose column `[AI-guessed · <confidence>]`. Confirming clears `variable_purposes` from both `inferred_fields` and `confidence_tags`.
- `glossary` with `inferred_fields: [term_definitions]` — display the `## Terms` list and label the inferred definitions `[AI-guessed · <confidence>]`. Confirming clears `term_definitions` from both `inferred_fields` and `confidence_tags`.

The `architecture-overview` node (`depth: core`, no `doc_type` or `doc_type: handover_node`) is reviewed the same as any other core node.

---

## Part 4 — Confirm, Skip, Rewrite, or Quit

After displaying a node's fields, prompt:

```
Review complete for '<title>'?
  Enter   — confirm all AI-guessed fields as accurate
  r       — rewrite a specific field
  s       — skip for now (leave inferred_fields unchanged)
  q       — quit and save progress
```

Wait for the giver's input. Handle each option as follows:

### On Enter (or "yes", "y", "confirm")

- Remove all field names from this node's `inferred_fields` (set `inferred_fields: []`)
- Remove the corresponding `confidence_tags` entries for those fields. Since all fields are confirmed, set `confidence_tags` to an empty mapping or remove the key entirely (per OP-15, a fully-confirmed node has absent or empty `confidence_tags`).
- Write the updated node file (`.handoff/output/nodes/<id>.md`) with the empty `inferred_fields` and cleared `confidence_tags`
- Re-validate the node using the rules in `.handoff/toolkit/rules/output-schema.md`. If any rules fail, display them inline and fix automatically if possible; only stop if a required field is missing.
- Print: "✓ <title> confirmed."
- Move to the next node.

### On 'r' (rewrite)

1. Ask: "Which field? (business_context / depth / decisions / warnings)"
2. Wait for the giver's choice. If the field is not in `inferred_fields`, note: "That field is already marked as read from code. You can still edit it — continue? (y/n)"
3. Show the current content of that field.
4. Ask: "New content (or press Enter to keep current):"
5. If the giver provides new content:
   - Update the field in the node with the giver's content
   - Remove this field from `inferred_fields`
   - Remove this field's entry from `confidence_tags` (the value is now human-provided, not AI-inferred)
   - Write the updated node file
   - Re-validate against `output-schema.md` rules. Display any failures inline.
   - Print: "✓ <field> updated."
6. After handling the rewrite, re-display the updated node (Part 3 display) and re-prompt (Part 4) — the giver may want to rewrite additional fields or confirm the rest.

### On 's' (skip)

- Leave `inferred_fields` unchanged for this node
- Print: "Skipped <title> — will appear again next time."
- Move to the next node.

### On 'q' (quit)

- Save all changes made so far (all files already written are persisted)
- Set `status: "paused_review"` in session.json and write it (session-protocol.md Rule 2, event: review paused)
- Print:

```
Review paused. Progress saved.
Run /handoff-review again to continue from where you left off.
```

- Stop. Do not process any more nodes.

---

## Part 5 — Completion

When all nodes have been processed (the loop in Part 2 reaches the end of the node list with no more nodes having non-empty `inferred_fields`):

### Step 5.1 — Regenerate index.json

Read each node file in `.handoff/output/nodes/`. For each node, read the current `title` and `depth` from the frontmatter (these may have changed during rewrites). Rebuild the `nodes` array in `index.json` with updated values:

```json
{
  "id": "<id>",
  "title": "<current title from node file>",
  "depth": "<current depth from node file>",
  "dependencies": <current dependencies from node file or []>,
  "file": "nodes/<id>.md"
}
```

Sort the array: core → supporting → peripheral. Within each group, preserve the existing order.

Write the updated `index.json` without changing `schema_version`, `project_name`, `generated_at`, or `generated_at_sha`.

### Step 5.2 — Update session status

Set `status: "complete"` in session.json and write it (session-protocol.md Rule 2, event: review complete).

### Step 5.3 — Print summary

Count:
- Confirmed = nodes where `inferred_fields` was non-empty and is now `[]` (confirmed without changes)
- Updated = nodes where at least one field was rewritten

Print:

```
✓ Review complete

  N nodes confirmed (no changes)
  M nodes updated (fields rewritten)
  All inferred_fields cleared

Commit .handoff/output/ to share the confirmed documentation with receivers.
```

---

## Part 6 — `--help` Output

When invoked as `/handoff-review --help`, display this text exactly and stop:

```
handoff-review — Interactive review of AI-generated documentation

WHAT THIS COMMAND DOES
  After /handoff-start runs autonomously, this command lets you review and
  correct any content the AI inferred from your code.

LABELS
  [AI-guessed]  This field was inferred from code signals (README, imports,
                comments, TODOs). Review it — the AI may have the wrong
                business context.
  [from code]   This field was read directly from code (file paths, function
                names). It should be accurate.

HOW TO INTERACT
  Enter (or "yes")   Confirm all AI-guessed fields for this node as accurate
  r                  Rewrite a specific field
  s                  Skip this node (leave inferred_fields unchanged)
  q                  Quit and resume later — progress is saved automatically

RESUMPTION
  Re-run /handoff-review at any time. Already-confirmed nodes are skipped
  automatically. You'll only see nodes that still have AI-guessed content.

AFTER REVIEW
  Commit .handoff/output/ to share confirmed documentation with receivers.
  The VS Code extension shows an "AI-inferred" indicator on any field not
  yet confirmed via this command.
```

---

## Important Constraints

- Never modify node files that are not being actively reviewed in the current invocation. Skipped nodes are left completely untouched.
- Every file write is a complete overwrite. Read the current state, modify it in memory, then write the full object.
- The `inferred_fields` list in node frontmatter is the single source of truth for review state. Do not create any additional tracking files.
- After each node file write, re-validate against `output-schema.md` rules. A review session must never leave nodes in an invalid state.
- If any file write fails (permission error, path error), stop and tell the giver. Do not silently skip the write.
