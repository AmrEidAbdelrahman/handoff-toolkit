# Quickstart: Handoff VS Code Extension

This is the developer-facing path to running and validating the extension during build. It doubles as the manual acceptance script for the spec's success criteria.

## Prerequisites

- Node.js 20+, VS Code 1.90+
- A workspace containing a valid `.handoff/output/` (use `extension/tests/integration/fixtures/.handoff/output/` or any repo with committed Handoff output)

## Set up

```bash
cd extension
npm install
npm run watch      # esbuild in watch mode (bundles src/ + webview ui/)
```

Press **F5** in VS Code (with `extension/` open) to launch the Extension Development Host. Open a folder that contains `.handoff/output/`.

## Build / test commands

| Command | What it does |
|---------|--------------|
| `npm run watch` | Incremental esbuild bundle for dev. |
| `npm run compile` | One-off bundle + type-check. |
| `npm run test:unit` | Mocha unit tests for `src/handoff/*` (pure, no extension host). |
| `npm run test` | `@vscode/test-electron` integration tests against the fixture output. |
| `npm run package` | Produce a `.vsix` via `vsce package`. |

## Manual acceptance walkthrough (maps to Success Criteria)

1. **Detect + browse (SC-001, SC-002 · US1)**: Open a workspace with valid output. Within ~5s the **Handoff** sidebar shows the tree grouped core → supporting → peripheral, with `project-overview`/`technical-overview` pinned on top. Click each node — Business and Technical Context always render, with purple/blue/green/orange section coloring; omitted Decisions/Warnings leave no placeholder.
2. **Live code (SC-003 · US2)**: Select a node with `code_refs`. The code pane auto-loads the first ref (correct file, lines highlighted). One tab per ref; switching tabs swaps the source. Click a ref in the doc list and an inline code mention — both switch the code pane. Edit a referenced file on disk → the pane reflects it.
3. **Progress + nav (SC-005 · US3)**: Visit several nodes — each loses its unread dot and the sidebar badge advances. Use Prev/Next to move in reading order; the breadcrumb reads e.g. `core · 2 of 8`. Close and reopen the workspace — read state persists.
4. **Resilience (SC-004)**: Try each broken case — remove `index.json`, corrupt it, point a `code_ref` at a deleted file or an out-of-range line, set a node's `schema_version` to `2`. Each yields a clear in-product message; no crash, and other nodes stay navigable.
5. **Read-only (FR-003)**: Confirm nothing under `.handoff/output/` is ever modified during a session.

## Fixture

`extension/tests/integration/fixtures/.handoff/output/` should contain a small but representative handover: at least one node per depth tier, a node with multiple `code_refs` (including a range), a node omitting optional sections, and at least one deliberately broken node for the resilience checks. The referenced source files live in the fixture workspace so the code pane has real content to read.
