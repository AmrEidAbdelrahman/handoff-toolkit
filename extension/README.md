# Handoff — VS Code Extension

Browse a Handoff developer handover as a guided, three-panel reading experience.

The Handoff toolkit generates structured handover documentation under
`.handoff/output/` (an `index.json` manifest plus one markdown node per section). This
extension reads that committed output and renders it inside VS Code. It is a **pure
reader** — it never writes to the handover output, and it reads referenced source code
**live** from your workspace so snippets always reflect the current code.

## The three panels

1. **Sidebar tree** (Activity Bar → Handoff) — every section grouped `core → supporting
   → peripheral`, with `project-overview` and `technical-overview` pinned on top. A read
   dot clears as you visit each section; the view badge shows how many remain.
2. **Documentation pane** (left) — the selected section, split into color-coded blocks:
   Business Context (purple), Technical Context (blue), Decisions (green), Warnings
   (orange). A breadcrumb shows your depth tier and position; Previous/Next walk the
   reading order. Inline code mentions and the code-reference list jump the code pane.
3. **Code pane** (right) — live, syntax-highlighted source from your workspace, one tab
   per code reference, with the referenced lines highlighted. Missing or out-of-range
   references show a clear, non-fatal message.

## Getting started (development)

```bash
cd extension
npm install
npm run watch     # esbuild bundle in watch mode
# Press F5 in VS Code to launch the Extension Development Host,
# then open a folder that contains .handoff/output/
```

## Commands

| Command | Description |
|---------|-------------|
| `Handoff: Open Handover` | Open/reveal the reader. |
| `Handoff: Next / Previous Section` | Walk the reading order. |
| `Handoff: Reload` | Re-read the output. |
| `Handoff: Mark All Read` / `Reset Progress` | Bulk read-state controls. |

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run watch` / `npm run compile` | esbuild dev / one-off bundle |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:unit` | Pure-domain unit tests (no VS Code host) |
| `npm test` | Integration tests via `@vscode/test-electron` |
| `npm run package` | Build a `.vsix` |

## Architecture

`src/handoff/` is a pure, `vscode`-free implementation of the Node Schema contract
(parsing, validation, tree building) — unit-testable in plain Node. Everything that
touches the editor lives in `src/workspace/`, `src/tree/`, `src/webview/`, and
`src/state/`. State (read/unread) is held in `workspaceState`; there is no backend.

State and contract details are specified under `specs/007-vscode-extension/` in the
repository root.
