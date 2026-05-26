# Handoff Session Protocol

**Purpose**: These are the rules the AI agent follows when managing the session state file at `.handoff/session.json`. Read this file completely at the start of every `/handoff-start` and `/handoff-review` invocation before taking any action.

---

## Session Cache Structure

The session cache is stored as JSON at `.handoff/session.json`. The full structure is:

```json
{
  "status": "in_progress | paused | complete | reviewing | paused_review",
  "started_at": "ISO 8601 datetime",
  "project_name": "string",
  "pending_sections": ["string"],
  "completed_nodes": ["node-id"],
  "current_section": "string | null"
}
```

Field descriptions:
- `status`: Current session state. One of `in_progress`, `paused`, `complete`, `reviewing`, or `paused_review`.
- `started_at`: ISO 8601 timestamp when this session was first created.
- `project_name`: The name of the project being documented. Derived from the repository folder name or the README.
- `pending_sections`: Ordered list of section names that have not yet been completed. Sections are removed from this list as they are completed.
- `completed_nodes`: List of node `id` values that have been successfully written and validated. Never remove entries from this list.
- `current_section`: The section currently being worked on, or `null` if between sections.

---

## State Machine

The following transitions are the only valid state changes. Any other transition is an error — do not make it.

```
(none) → in_progress          [/handoff-start invoked; no session.json exists]
(none) → in_progress          [/handoff-start invoked; existing complete session — delta re-run from stored SHA]
paused → in_progress          [/handoff-start invoked; existing paused session — resumes from pending_sections]
in_progress → paused          [giver signals pause or exits session mid-way]
in_progress → complete        [all sections documented autonomously; SHA recorded]
complete → reviewing          [/handoff-review invoked; nodes with non-empty inferred_fields are pending review]
reviewing → paused_review     [giver exits /handoff-review mid-way]
paused_review → reviewing     [/handoff-review invoked again — resumes from first node with inferred_fields]
reviewing → complete          [all nodes confirmed or corrected; all inferred_fields cleared]
```

---

## Rule 1 — On Invocation: Determine Session State

When `/handoff-start` is invoked, the first action is to attempt to read `.handoff/session.json`.

### Case A — No session.json exists

Start a fresh session:

1. Derive `project_name` from the repository root folder name (read the README if available to get a more descriptive name).
2. Write `.handoff/session.json` with:
   - `status: "in_progress"`
   - `started_at`: current ISO 8601 timestamp
   - `project_name`: derived project name
   - `pending_sections: []` (populated during project scanning)
   - `completed_nodes: []`
   - `current_section: null`
3. Proceed to project scanning.

### Case B — session.json exists with `status: "paused"`

Resume the existing session:

1. Read the current state and announce:
   - How many nodes have been completed: `completed_nodes.length`
   - Which sections remain: every item in `pending_sections` (numbered)
2. Set `status: "in_progress"` in session.json, set `current_section: null`, write the file.
3. Proceed directly to field inference, starting from the first section in `pending_sections`.

### Case C — session.json exists with `status: "complete"`

A complete session exists. Check whether `index.json` has a `generated_at_sha`:

- If `generated_at_sha` is present: enter delta re-run mode. Set `status: "in_progress"`, write session.json, then proceed to the delta re-run logic in the skill.
- If `generated_at_sha` is absent: inform the giver that a complete session exists with no git checkpoint and ask whether to start a full fresh session or exit.

### Case D — session.json exists with `status: "in_progress"`

The previous session was interrupted without being paused. Treat as Case B — announce the interruption and resume from the first section in `pending_sections`.

### Case E — session.json exists with `status: "reviewing"` or `status: "paused_review"`

The session is in the review phase. Do not restart or modify it. Tell the giver: "This project is currently in review mode. Run `/handoff-review` to continue the review." Stop. Do not proceed with `/handoff-start` logic.

---

## Rule 2 — Writing session.json

Write `.handoff/session.json` after each of these events:

1. **Session start**: write initial state (see Case A above)
2. **Section confirmed**: when a section name is added to `pending_sections`, write the file
3. **Node completed**: after a node is written and validated as PASS:
   - Add the node `id` to `completed_nodes`
   - Remove the section name from `pending_sections`
   - Set `current_section: null`
   - Write the file
4. **Section started**: when beginning work on a section:
   - Set `current_section` to the section name
   - Write the file
5. **Session paused**: when the giver signals a pause (says "pause", "stop for now", "continue later", or similar):
   - Set `status: "paused"`
   - Set `current_section: null`
   - Write the file
   - Tell the giver: "Session paused. Your progress is saved. Run `/handoff-start` to resume."
6. **Session complete** (all sections done):
   - Set `status: "complete"`
   - Set `pending_sections: []`
   - Set `current_section: null`
   - Write the file
7. **Review started** (`/handoff-review` invoked on a complete session):
   - Set `status: "reviewing"`
   - Write the file
8. **Review paused** (giver quits review mid-way):
   - Set `status: "paused_review"`
   - Write the file
9. **Review complete** (all nodes confirmed or corrected):
   - Set `status: "complete"`
   - Write the file

Always write the complete session.json object — never a partial update. Read the current state, modify the relevant fields in memory, then write the full object.

---

## Rule 3 — Managing `pending_sections`

`pending_sections` is the ordered list of section names to document. It is the single source of truth for what work remains.

- Populate `pending_sections` during project scanning after identifying logical sections.
- Write section names as plain strings (e.g., `"Authentication"`, `"Data Model"`, `"API Layer"`).
- Always work through sections in the order they appear in `pending_sections`.
- When a node is successfully saved for a section, remove that section's name from `pending_sections` and add the node `id` to `completed_nodes` in the same write operation.
- Never modify `completed_nodes` except to append to it. Never remove or reorder existing entries.

---

## Rule 4 — Managing `completed_nodes`

`completed_nodes` is an append-only list of node `id` values. An entry is added only after:

1. The node content is assembled (frontmatter + body)
2. Validation rules from `output-schema.md` are checked and all pass
3. The node file is written to `.handoff/output/nodes/<id>.md`
4. The node entry is added to `.handoff/output/index.json`

All four steps must succeed before appending to `completed_nodes`. If any step fails, do not add the id to `completed_nodes`.

---

## Rule 5 — Session Completion

A documentation session is complete when `pending_sections` is empty. At that point:

1. Verify `completed_nodes` matches the count of `.md` files in `.handoff/output/nodes/`.
2. Run `git rev-parse HEAD` to get the current commit SHA.
   - If the command succeeds: write `generated_at_sha` to `index.json`.
   - If the command fails (no git history or not a git repo): omit `generated_at_sha` from `index.json`. Do not fail the session.
3. Set `status: "complete"` in session.json and write the file.
4. Present a final summary to the giver.

---

## Rule 6 — Review Resumption Cursor

When `/handoff-review` is invoked, identify which node to start from using this algorithm:

1. Read `index.json` to get the ordered node list (core → supporting → peripheral).
2. For each node in that order, read the node's `.md` file and check the `inferred_fields` frontmatter value.
3. The first node where `inferred_fields` is present and non-empty is the starting point.
4. All nodes before that starting point (where `inferred_fields` is absent or `[]`) are skipped silently — they are already confirmed.

This algorithm is stateless — no separate cursor or pointer file is needed. The `inferred_fields` value in each node file is the single source of truth for review state.

---

## Rule 7 — What NOT to Do

- Do not delete completed node files or remove entries from `completed_nodes` under any circumstances during a session.
- Do not start a new session automatically without explicit confirmation from the giver.
- Do not write `status: "complete"` while `pending_sections` is non-empty.
- Do not write `status: "in_progress"` after the session is complete without the giver explicitly confirming a fresh start or delta re-run.
- Do not infer or guess the session state — always read `session.json` first.
- Do not ask the giver questions to gather documentation content. Infer all node fields autonomously from code signals. Ask a question only when a required field (`business_context`, `code_refs`) cannot be inferred from any available source.
- Do not prompt the giver with WHY questions, confirm/deny section lists, or ask for depth classifications. All of these are determined autonomously.
