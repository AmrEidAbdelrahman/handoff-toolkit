# Contract: Extension Input Requirements

**Version**: 1.1 | **Date**: 2026-05-26
**Consumer**: Handoff VS Code Extension
**Producer**: Handoff Toolkit (`.handoff/toolkit/`)

This contract defines what the extension REQUIRES from its environment and what it GUARANTEES to the receiver.

---

## Environment Requirements

| Requirement | Detail |
|-------------|--------|
| VS Code version | 1.85 or later |
| Workspace | Single-root workspace containing `.handoff/output/` |
| Git | Optional — required only for stale code ref resolution |
| Network | Not required — extension is fully offline |

---

## Input: Filesystem

The extension reads from:

```
<workspace-root>/
└── .handoff/
    └── output/
        ├── index.json      ← parsed on activation + on file change
        └── nodes/
            └── *.md        ← parsed on demand when user selects a node
```

The extension MUST NOT write to `.handoff/output/` or any other location in the workspace.

---

## Activation Contract

The extension activates when a workspace is opened. On activation:

1. Check for `.handoff/output/index.json` in the workspace root
2. If found and valid: render sidebar tree, register file watcher
3. If not found: render empty sidebar with message "No Handoff output found in this workspace"
4. If found but invalid (parse error, schema_version mismatch): render error state with specific message

The extension MUST NOT crash on any malformed input — all errors are surfaced as user-visible messages.

---

## Sidebar Tree Contract

The extension GUARANTEES:
- Nodes grouped into depth sections: **Core** / **Supporting** / **Peripheral**
- Order within each group matches the order in `index.json`
- Read nodes are visually distinguished (checkmark prefix)
- Tree refreshes automatically when `index.json` changes

---

## Node Display Contract

When a receiver selects a node:
- A webview panel opens (or gains focus if already open)
- Panel displays: title, business context, technical context, and any decisions/warnings
- Code references are rendered as clickable links
- Fields listed in the node's `inferred_fields` frontmatter MUST be rendered with a visible "AI-inferred" indicator (label or icon) so receivers know the content was not confirmed by the giver. Fields absent from `inferred_fields` (or when `inferred_fields` is empty/absent) are rendered without any indicator.

---

## Code Navigation Contract

When a receiver clicks a code reference:
- If the file exists in the workspace: VS Code opens it and reveals the specified line
- If the file does not exist AND `generated_at_sha` is present in `index.json`: the extension retrieves the file at that SHA and opens it in a read-only view
- If the file does not exist AND no SHA is available: display inline message "File not found — no git history to resolve this reference"

---

## Progress Persistence Contract

- Read status is stored in `workspaceState` under key `handoff.readProgress`
- Read status persists across VS Code restarts
- Read status is scoped to the workspace (different projects have independent progress)
- The extension MUST NOT use `globalState` for progress

---

## Commands Registered

| Command ID | Title | Behaviour |
|------------|-------|-----------|
| `handoff.refresh` | Refresh Handoff | Re-reads index.json and reloads tree |
| `handoff.markAllRead` | Mark All as Read | Sets all nodes to read in workspaceState |
| `handoff.markAllUnread` | Mark All as Unread | Clears all progress in workspaceState |
