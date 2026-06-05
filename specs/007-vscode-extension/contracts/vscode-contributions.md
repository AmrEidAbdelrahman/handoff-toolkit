# Contract (Exposed): VS Code Contributions

**Direction**: Output from the extension to VS Code / the user. Declared in `extension/package.json` under `contributes`, `activationEvents`, and `commands`. This is the surface a user and the editor see.

## Activation

| Activation event | Trigger |
|------------------|---------|
| `workspaceContains:**/.handoff/output/index.json` | Activate when a workspace contains Handoff output. |
| `onView:handoff.nav` | Activate when the user focuses the Handoff sidebar view. |

The extension must remain dormant (no panels, no errors) in workspaces without `.handoff/output/` (FR-002).

## Views

| View id | Container | Type | Purpose |
|---------|-----------|------|---------|
| `handoff.nav` | Activity Bar view container `handoff` | Tree (`TreeDataProvider`) | Panel 1 — navigation tree, read/unread icons, progress **badge** (`TreeView.badge`). |

The doc + code panes (Panels 2 & 3) are **not** a contributed view; they are a `WebviewPanel` opened in the editor area and owned by the extension (`viewType: handoff.reader`). A `WebviewPanelSerializer` is registered for `handoff.reader` so the panel restores after reload.

## Commands

| Command id | Title | Behavior |
|------------|-------|----------|
| `handoff.open` | Handoff: Open Handover | Open/reveal the reader webview; load last or first node. |
| `handoff.openNode` | (internal) | Open a specific node id (invoked by tree selection). |
| `handoff.next` | Handoff: Next Section | Select the next node in reading order. |
| `handoff.previous` | Handoff: Previous Section | Select the previous node in reading order. |
| `handoff.markAllRead` | Handoff: Mark All Read | (Convenience) mark every node read. |
| `handoff.markAllUnread` | Handoff: Reset Progress | Clear read state for the workspace. |

`handoff.next`/`handoff.previous` are also bound to webview buttons via the message protocol.

## Behavioral guarantees

- **Read-only** over `.handoff/output/` (FR-003): no `contributes` that would write there; the extension uses `workspace.fs` reads only.
- **No configuration required** to view a handover (SC-001): zero required `contributes.configuration` settings for MVP.
- **Single-root**: behavior is specified for one workspace root containing one `.handoff/output/` (multi-root out of scope).
