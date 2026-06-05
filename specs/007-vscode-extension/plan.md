# Implementation Plan: Handoff VS Code Extension

**Branch**: `007-vscode-extension` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-vscode-extension/spec.md`

## Summary

Build a VS Code extension (Product 2) that consumes the Handoff toolkit's committed output (`.handoff/output/` — `index.json` + node markdown files) and renders it as a three-panel reading experience: a **native sidebar TreeView** (navigation, read/unread, progress badge) plus a **single editor webview** split via CSS into a documentation pane (color-coded H2 sections) on the left and a live, syntax-highlighted code pane on the right. The extension is read-only over the handover output, reads referenced source live from workspace files, and persists per-node read state in `workspaceState`. The Node Schema Specification is the parsing/rendering contract; parsing and validation live in a pure, `vscode`-independent module.

## Technical Context

**Language/Version**: TypeScript 5.x, compiled to ES2022, running on the VS Code extension host (Node.js 20, bundled with VS Code 1.90+).

**Primary Dependencies**:
- `gray-matter` — YAML frontmatter parsing (per brief)
- `markdown-it` — markdown body rendering to HTML
- `shiki` — syntax highlighting for the code pane (TextMate grammars + VS Code themes; runs in the extension host)
- VS Code Extension API (`vscode`) — TreeView, Webview, FileSystemWatcher, workspaceState
- Build/test: `esbuild` (bundling), `@vscode/test-electron` + Mocha (integration), Mocha/assert (unit), `@vscode/test-cli`

**Storage**: `ExtensionContext.workspaceState` (per-node read state). No backend, no remote, no global state.

**Testing**: Unit tests for the pure parser/validator (no extension host needed); integration tests via `@vscode/test-electron` for activation, tree building, webview messaging, and code-ref resolution against a fixture `.handoff/output/`.

**Target Platform**: VS Code desktop 1.90+ (and API-compatible forks). Single-root workspace.

**Project Type**: VS Code extension (single TypeScript project).

**Performance Goals**: Tree visible and first node openable in < 5s on a typical handover (SC-001). Tab/code-ref switches feel instant (< ~150ms) — achieved by highlighting a window around the referenced range and caching highlighted HTML per file.

**Constraints**: Read-only over `.handoff/output/`; no network; offline-capable; webview CSP-locked; must degrade non-fatally on every malformed-input case (FR-006–FR-008, FR-029, SC-004).

**Scale/Scope**: Typical handover 5–20 nodes, each with a handful of `code_refs`; referenced files up to a few thousand lines.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an unratified template with no concrete principles defined. There are therefore **no enforceable gates** to evaluate. Status: **N/A — PASS by absence**.

The design nonetheless follows the spirit commonly encoded in such constitutions and the user's stated preference for clean separations / formal contracts:
- **Contract-first**: the Node Schema Spec is the single source of truth; parsing/validation is one isolated module.
- **Testable core**: the parser/validator is `vscode`-free and unit-testable in plain Node.
- **Simplicity / YAGNI**: native TreeView over a hand-rolled webview sidebar; everything out of MVP scope (Q&A, wizard, multi-root, search, analytics) excluded.

No complexity-tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/007-vscode-extension/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── node-schema.md          # Consumed contract (ref to Handoff_Node_Schema_Spec.md)
│   ├── vscode-contributions.md # Exposed contract: commands, views, activation
│   └── webview-protocol.md     # Internal contract: extension ↔ webview messages
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

The extension lives in its own top-level folder so it stays cleanly separated from the toolkit and the handover output it reads.

```text
extension/
├── package.json                # Extension manifest: contributes views, commands, activationEvents
├── tsconfig.json
├── esbuild.js
├── src/
│   ├── extension.ts            # activate()/deactivate(); wires detection, tree, webview, watchers
│   ├── handoff/                # PURE domain — no `vscode` imports, unit-testable
│   │   ├── types.ts            # Node, IndexManifest, CodeRef, Section, ParsedNode, ValidationIssue
│   │   ├── indexLoader.ts      # Parse + validate index.json
│   │   ├── nodeParser.ts       # gray-matter frontmatter + H2 section split (markdown-it)
│   │   ├── validation.ts       # Schema validation rules (frontmatter, body, index)
│   │   └── tree.ts             # buildTree(): pinned overviews + depth groups + parent nesting
│   ├── workspace/              # `vscode`-aware adapters
│   │   ├── detector.ts         # Find .handoff/output/; FileSystemWatcher for (re)detection
│   │   ├── outputRepository.ts # Read index + node files via workspace.fs (read-only)
│   │   └── codeResolver.ts     # Read referenced source live; range/out-of-bounds handling
│   ├── tree/
│   │   └── handoffTreeProvider.ts  # TreeDataProvider; read/unread icons; progress badge; reveal()
│   ├── webview/
│   │   ├── panelManager.ts     # Create/retain the editor webview; message router; serializer
│   │   ├── highlighter.ts      # Shiki singleton; windowed highlight; per-file cache
│   │   └── ui/                 # Webview assets (HTML/CSS/JS for doc|code split)
│   │       ├── index.html
│   │       ├── main.js         # Renders sections, tabs, inline mentions; posts messages
│   │       └── styles.css      # Section colors, two-column layout, breadcrumb
│   └── state/
│       └── readState.ts        # workspaceState read/unread; progress computation
└── tests/
    ├── unit/                   # Parser/validator/tree — pure, no extension host
    │   └── fixtures/.handoff/output/
    └── integration/            # @vscode/test-electron: activation, tree, messaging, code refs
```

**Structure Decision**: Single TypeScript VS Code-extension project under `extension/`. The hard line is between `src/handoff/` (pure, `vscode`-free, the one in-extension implementation of the Node Schema contract — unit-testable in plain Node) and everything `vscode`-aware (`workspace/`, `tree/`, `webview/`, `state/`). The sidebar is a native `TreeDataProvider`; the doc and code panes share one editor `WebviewPanel` split by CSS. This keeps the contract logic isolated and testable while letting VS Code own tree mechanics (collapse, selection, keyboard nav).

## Key Design Decisions (carried into Phase 1)

1. **Progress = TreeView badge, not a literal bottom bar.** A native TreeView has no footer slot. FR-014 says "progress *indicator*"; we satisfy it with `TreeView.badge` (count of unread / `n` total) plus per-node read icons, consciously trading the brief's literal "bar at bottom" for the idiomatic, far cheaper badge. A real bottom bar would require a hand-built `WebviewView` sidebar (re-implementing collapse, selection, keyboard nav) — rejected for MVP.

2. **One coherent tree-building rule** (encoded in `tree.ts`, see data-model.md): pinned `project-overview`/`technical-overview` at root → then depth groups core/supporting/peripheral → within a group, a node with no resolvable `parent` is a direct child of the group; a node whose `parent` resolves to another node nests under that parent and is removed from its own depth group's top level. A parented subtree is displayed under the **parent's** depth group. Inert for v1 (no `parent` emitted) but fully specified so the provider never needs rework.

3. **Highlight in the extension host, post HTML to the webview.** Shiki runs in Node (extension host), so grammars/themes aren't bundled into the webview and CSP stays strict. Singleton highlighter initialized once on activate; per-file highlighted-HTML cache; for large files, highlight a window around the referenced range.

4. **Bidirectional selection sync.** Tree click → `postMessage` to webview; webview Prev/Next/inline-mention → message to extension → `treeView.reveal()` + select. Treated as first-class, not an afterthought.

5. **Non-fatal everywhere.** Validation issues, schema-version mismatch, index/file mismatch, and code-ref drift each render an in-product state and never block other nodes (SC-004).

## Complexity Tracking

No constitution violations. Section intentionally empty.
