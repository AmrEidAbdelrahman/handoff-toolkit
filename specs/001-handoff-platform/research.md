# Research: Handoff — Interactive Developer Handover Tool

**Phase**: 0 | **Date**: 2026-05-23 | **Plan**: [plan.md](plan.md)

## 1. Toolkit Skill Format

**Decision**: Skill files use YAML frontmatter + Markdown body, identical to the `.claude/skills/` pattern in this project. Each skill is a directory containing a `SKILL.md` file.

**Rationale**: This project already uses this pattern for all Spec Kit skills. The format is natively understood by Claude Code — the AI reads the SKILL.md body as instructions when the slash command is invoked. The YAML frontmatter (name, description, compatibility) is used by the harness for skill discovery and display.

**Alternatives considered**:
- Single flat markdown file: Rejected — directory-per-skill allows co-locating assets and keeps skills independently versionable.
- JSON-based skill manifest: Rejected — markdown is more readable and LLM-friendly; no parsing overhead for the AI.

---

## 2. Session State Management

**Decision**: Session state is stored in `.handoff/session.json` as a plain JSON file. The AI reads and writes it between turns using the Write tool. Structure:

```json
{
  "status": "in_progress | paused | complete",
  "started_at": "ISO 8601",
  "project_name": "string",
  "pending_sections": ["string"],
  "completed_nodes": ["node-id"],
  "current_section": null
}
```

**Rationale**: The session cache needs to survive process restarts (user closes and reopens Claude Code). A plain JSON file is the simplest durable store that the AI can read and write without external dependencies. The schema is minimal — just enough to resume without re-scanning.

**Alternatives considered**:
- VS Code workspaceState: Rejected for session cache — workspaceState is extension-only; the toolkit runs in the AI agent context, not in the extension.
- SQLite: Rejected — overkill for a flat list of completed node IDs.

---

## 3. YAML Frontmatter Parsing (Extension)

**Decision**: Use `gray-matter` (npm) to parse YAML frontmatter from node `.md` files in the extension.

**Rationale**: `gray-matter` is the de facto standard for frontmatter parsing in Node.js. It supports YAML, TOML, and JSON frontmatter with a single API call (`matter(fileContent)`). Returns `{ data: {...}, content: '...' }` — exactly the split needed: structured metadata in `data`, markdown body in `content`.

**Alternatives considered**:
- `js-yaml` directly: Rejected — requires manually stripping the `---` delimiters before parsing; `gray-matter` handles this cleanly.
- Custom regex parser: Rejected — fragile for edge cases (multi-line strings, nested objects in frontmatter).

---

## 4. Markdown Rendering in Extension Webview

**Decision**: Use `marked` (npm) to convert node markdown body to HTML, rendered in a VS Code WebviewPanel. Apply VS Code's built-in webview CSS variables for theme-consistent styling.

**Rationale**: `marked` is fast, well-maintained, and produces clean HTML from CommonMark markdown. The WebviewPanel approach is the standard VS Code pattern for rich content display. Using VS Code's CSS variables (`--vscode-editor-background`, `--vscode-editor-foreground`, etc.) ensures the panel respects the user's light/dark theme automatically.

**Alternatives considered**:
- `markdown-it`: Also good — slightly more configurable, but `marked` is simpler for this use case.
- VS Code's built-in markdown preview API: Rejected — it's designed for full `.md` files, not for programmatically controlled panels with custom navigation actions (code ref click handlers).
- TextDocument with language ID `markdown`: Rejected — no way to inject interactive click handlers for code references.

---

## 5. Code Reference Navigation

**Decision**: In the extension, code references are rendered as clickable links in the webview. Clicks post a message to the extension host (`vscode.postMessage`). The host receives the `file` + `line` values, opens the document with `vscode.workspace.openTextDocument`, then reveals the range with `vscode.window.showTextDocument` and `editor.revealRange`.

**Rationale**: The webview/host message passing pattern is the standard VS Code approach for webview-initiated navigation. `openTextDocument` + `showTextDocument` is the correct API for opening and revealing specific lines.

**Stale ref resolution**: When a file path doesn't resolve in the current workspace, the extension runs `git show <sha>:<file>` (via Node.js `child_process.exec`) to retrieve the file content at the recorded SHA, writes it to a temp file, and opens that. The SHA is read from `index.json`.

**Alternatives considered**:
- `vscode.commands.executeCommand('vscode.open', uri)`: Less precise — doesn't support line reveal.
- Inline `vscode://` links: Rejected — these only work for already-open files and don't support line numbers reliably in webview context.

---

## 6. VS Code TreeDataProvider (Sidebar)

**Decision**: Implement a `HandoffTreeDataProvider` that implements `vscode.TreeDataProvider<HandoffTreeItem>`. Items are grouped into three root nodes by depth: **Core**, **Supporting**, **Peripheral**. Each root expands to show the node titles from `index.json`.

**Rationale**: TreeDataProvider is the standard VS Code API for sidebar tree views. Grouping by depth mirrors the node schema's depth semantics and guides receivers to start with core nodes.

**File watcher**: Register a `vscode.workspace.createFileSystemWatcher` on `.handoff/output/index.json`. When the file changes (toolkit adds a new node), fire `_onDidChangeTreeData` to trigger a sidebar refresh.

**Alternatives considered**:
- Flat list (no depth grouping): Rejected — loses the core/supporting/peripheral navigation guidance that helps receivers prioritize reading.
- Custom tree structure based on `dependencies`: Deferred to post-MVP — dependency-based trees require cycle detection and are complex to render cleanly.

---

## 7. Progress Tracking

**Decision**: Use `context.workspaceState` with key `handoff.readProgress` → `Record<string, boolean>` (`{ [nodeId]: true }`). A node is marked read when its webview panel is opened. The tree item label includes a checkmark (`✓`) prefix for read nodes.

**Rationale**: `workspaceState` persists across VS Code restarts, is scoped to the workspace (so different projects have independent progress), and requires no external storage. The API is synchronous for reads and returns a Promise for writes — straightforward to use.

**Alternatives considered**:
- File-based progress cache in `.handoff/`: Rejected — creates a committed file that would pollute the repo if not carefully gitignored; workspaceState is cleaner and stays local to the user's machine.
- GlobalState: Rejected — progress is per-project, not per-user globally.

---

## 8. Toolkit Rules Structure

**Decision**: Two rule files in `.handoff/toolkit/rules/`:

1. **`output-schema.md`**: Inline copy of the required frontmatter fields, body section rules, and validation checklist from `Handoff_Node_Schema_Spec.md`. The AI references this during `/handoff-validate`. Keeping it inline (not referencing the external spec doc) ensures the toolkit is self-contained after drop-in installation.

2. **`session-protocol.md`**: Instructions for how the AI manages the session file — when to read it, when to write it, how to handle the `pending_sections` list, and how to structure WHY questions for each section type.

**Rationale**: Inline rules make the toolkit self-contained and portable. The AI agent reads these files as part of the skill execution context.

---

## 9. Gitignore Strategy

**Decision**: The toolkit ships `.handoff/.gitignore` with:

```
# Handoff Toolkit — generation tools, not deliverables
toolkit/
session.json
```

The `.handoff/output/` directory is NOT mentioned (Git tracks it by default once files exist there).

**Rationale**: Git respects `.gitignore` files in any subdirectory for paths within that subdirectory. A `.handoff/.gitignore` cleanly scopes the exclusions to the `.handoff/` folder without touching the project's root `.gitignore`. Drop-in installation leaves the user's gitignore untouched.

---

## 10. Git SHA Recording

**Decision**: At the end of a `/handoff-start` session (when all nodes are complete and the giver confirms), the AI runs `git rev-parse HEAD` and writes the result as `"generated_at_sha"` in `index.json`.

**Rationale**: Recording the SHA at session completion (not at individual node creation) means all nodes in a single session reference the same snapshot. The extension can then run `git show <sha>:<path>` for any stale reference.

**Edge case**: If the project has no git history (new repo with no commits), the SHA is omitted from the index and stale ref resolution is unavailable. The extension handles this gracefully by showing the reference as unresolvable rather than crashing.

---

## 11. Autonomous Inference Strategy for `/handoff-start`

**Decision**: `/handoff-start` infers all node fields without asking questions. Inference sources by field:
- `business_context`: README content, package.json/pyproject.toml description, module-level docstrings, folder name semantics, commit message patterns
- `depth`: Count of inbound dependency references from other modules — high fan-in = core; isolated utility = peripheral
- `decisions`: Architectural comments (`// Note:`, `// TODO:`, `FIXME`), unusual patterns in code vs standard practice
- `warnings`: High cyclomatic complexity, deprecated API usage, TODOs, missing test coverage signals
- `code_refs`: Entry-point files for the section (main file + key exported symbols)

The AI asks a question only when none of the above sources yield usable signal for a required field.

**Rationale**: The original interactive design required active giver time per section. The autonomous model makes the tool zero-effort to run — givers can trigger it and check back. Inference accuracy is "good enough to start" and `/handoff-review` exists for corrections.

**Alternatives considered**:
- Confidence scoring: considered adding a `confidence` field per node. Rejected for MVP — `inferred_fields` already signals which content to review; a numeric score adds complexity without proportional value.

---

## 12. `inferred_fields` Frontmatter Persistence

**Decision**: Node files store an `inferred_fields` list in YAML frontmatter identifying which fields were AI-inferred. Values: `business_context`, `depth`, `decisions`, `warnings`. The field is removed (or set to `[]`) once all listed fields are confirmed via `/handoff-review`.

**Rationale**: Persisting inference labels in the node file makes them first-class data, not a runtime computation. This enables: (a) `/handoff-review` to resume correctly after an interrupted session without a separate tracking file, (b) the extension to render `[AI-inferred]` indicators without any additional inference logic, (c) future tooling to programmatically query review completeness.

**Alternatives considered**:
- Separate `inference-state.json` file: Rejected — splits what belongs together; node files are the single source of truth.
- Recompute labels each review session: Rejected — re-inference is non-deterministic; a corrected field might be re-labelled as inferred on the next run.

---

## 13. Delta Re-Run Strategy for `/handoff-start`

**Decision**: When `.handoff/output/index.json` exists and contains a `generated_at_sha`, a subsequent `/handoff-start` run:
1. Runs `git diff --name-only <generated_at_sha> HEAD` to get the list of changed files
2. Maps changed files to existing nodes by matching against each node's `code_refs[].file` values
3. Re-documents only matching nodes (updates content, resets `inferred_fields`)
4. Scans for entirely new sections (files/directories not covered by any existing node) and creates new nodes
5. Leaves unchanged nodes untouched
6. Updates `generated_at_sha` to current HEAD on completion

**Rationale**: Full regeneration would overwrite giver-confirmed content on every re-run, defeating the purpose of `/handoff-review`. Delta re-runs respect confirmed nodes while keeping documentation current as the codebase evolves.

**Edge cases**:
- If `generated_at_sha` is not in the current git history (e.g., force-pushed branch): fall back to full regeneration with a warning.
- If a node's code_refs file was deleted: flag the node as potentially stale rather than auto-deleting it.
