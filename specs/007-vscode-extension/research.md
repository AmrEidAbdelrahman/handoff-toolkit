# Phase 0 Research: Handoff VS Code Extension

All unknowns were resolvable from the feature brief, the Node Schema Specification, and established VS Code extension practice. No external research agents were dispatched. Each decision below records what was chosen, why, and what was rejected.

## R1. Three-panel layout in VS Code

**Decision**: Native `TreeView` in the extension's Activity Bar container for Panel 1 (sidebar); a single editor `WebviewPanel` for Panels 2+3, split into two columns via CSS (doc pane left, code pane right).

**Rationale**: VS Code has no API for arbitrary multi-pane custom layouts, but a webview panel can hold any HTML, so a CSS two-column split inside one panel gives the "permanent doc|code" main area the brief wants while remaining a single tab the extension owns and can reopen. The sidebar maps naturally to a native tree, which provides collapse/expand (needed for `parent` nesting), selection, keyboard navigation, and themed icons for free.

**Alternatives considered**:
- *All-webview (sidebar included as a `WebviewView`)*: would allow a literal bottom progress bar, but forces re-implementing tree collapse, selection, keyboard nav, and read/unread rendering by hand. Rejected for MVP cost.
- *Two separate editor webviews (doc and code as distinct tabs)*: breaks the "always visible side-by-side" requirement and complicates layout persistence. Rejected.

## R2. Sidebar progress indicator

**Decision**: Use `TreeView.badge` (a numeric badge, e.g. unread count) plus per-node read/unread icons; optionally reflect completion in the view title. No literal progress bar.

**Rationale**: A native TreeView has no footer region, so the brief's "progress bar at bottom" is not achievable without abandoning the native tree. FR-014 specifies a progress *indicator*, which a badge + icons satisfy. This is a conscious trade documented in plan.md (Decision 1).

**Alternatives considered**: Hand-built `WebviewView` sidebar to get a real bottom bar — rejected (see R1).

## R3. Frontmatter + markdown parsing

**Decision**: `gray-matter` for YAML frontmatter (per brief); `markdown-it` to render each H2 section's body to HTML. Sections are split by scanning for `## ` headings and bucketing content into the four recognized sections (Business Context, Technical Context, Decisions, Warnings); unknown H2s are ignored per schema §4.

**Rationale**: Both libraries are mature, dependency-light, and the brief explicitly calls for gray-matter and "render markdown sections by splitting on H2 headings." Splitting before rendering keeps section coloring trivial (each section is its own rendered HTML block in a colored container).

**Alternatives considered**: `remark`/`unified` pipeline — more powerful but heavier than needed for four flat sections. Rejected for MVP simplicity.

## R4. Syntax highlighting

**Decision**: `shiki` running in the extension host. Initialize a single highlighter instance asynchronously on `activate` (cached promise). Highlight produces HTML that is posted to the webview. Cache highlighted HTML per file+theme; for large referenced files, highlight a window around the referenced line range rather than the whole file.

**Rationale**: Shiki uses the same TextMate grammars and VS Code themes as the editor, giving fidelity close to the native editor. Running it in Node (extension host) keeps grammar/theme assets out of the webview bundle and lets the webview CSP stay strict (no eval, no remote). Windowing + caching keeps tab/code-ref switches snappy (SC-001/SC-003).

**Caveats to honor in implementation**:
- Shiki's bundled theme won't perfectly match the user's *active* VS Code theme. Pick a close default (e.g. follow `ColorThemeKind` light/dark and choose a matching Shiki theme); accept minor divergence for MVP.
- Don't await highlighter init on the activation critical path for the tree — only the code pane needs it.

**Alternatives considered**:
- *VS Code's built-in tokenizer*: not exposed as a clean API for arbitrary file highlighting in a webview. Rejected.
- *highlight.js / Prism in the webview*: lighter but lower fidelity and pulls highlighting into the webview (CSP/bundle cost). Rejected in favor of Shiki fidelity.

## R5. Reading code live + reacting to changes

**Decision**: Read referenced files on demand via `workspace.fs.readFile` (resolved relative to the workspace root, forward-slash paths per schema). Use a `FileSystemWatcher` on `**/.handoff/output/**` to (re)detect output and refresh the tree, and refresh the currently shown code pane when its referenced file changes.

**Rationale**: "Live from workspace" (FR-024) means never embedding code in nodes and always reflecting current source. `workspace.fs` works across local/remote/virtual workspaces. Watching output enables graceful activation when output appears/disappears mid-session.

**Out-of-bounds / missing handling**: `codeResolver` returns a typed result (`ok` | `file-not-found` | `range-out-of-bounds`); the webview renders a clear non-fatal state (FR-029).

**Alternatives considered**: Pre-reading all referenced files on activation — wasteful and stale-prone. Rejected.

## R6. Inline clickable code mentions

**Decision**: Heuristic. After rendering Technical Context HTML, post-process inline `<code>` spans: if a span's text matches one of the node's `code_refs` (by file path, basename, or a recognizable file-like token), wrap it as a clickable element carrying that ref's index. Clicking posts a `switchCodeRef` message handled within the webview.

**Rationale**: The schema defines **no** inline-mention syntax (documented assumption in spec). Matching against the node's own `code_refs` is the most reliable signal available without a contract change, and keeps the toolkit unburdened. Mentions that match nothing remain plain inline code.

**Alternatives considered**: Requiring the toolkit to emit a custom mention syntax — a contract change, out of scope. Rejected.

## R7. Read state persistence

**Decision**: Store a set of read node ids in `ExtensionContext.workspaceState`, keyed per workspace. Compute progress as `read / total`. Mark a node read when its content is shown in the doc pane.

**Rationale**: Brief mandates `workspaceState`, no backend/remote. Workspace-scoped state is exactly the right granularity (handover read progress is per-repo). Restored automatically on reopen (FR-030, SC-005).

**Stale ids on regeneration**: if the toolkit regenerates output and removes/renames nodes, `readIds` can retain dead ids and push `progress` over 100%. Guard: compute `progress` and `total` over only the ids present in the current index (intersect `readIds` with live node ids); optionally prune dead ids on load. Cheap to honor now.

**Alternatives considered**: `globalState` — wrong scope (would leak progress across repos). A file in `.handoff/` — violates read-only constraint (FR-003). Both rejected.

## R8. Webview lifecycle & messaging

**Decision**: Strict CSP webview with a nonce; `localResourceRoots` limited to the extension's `ui/` assets. Use `retainContextWhenHidden: true` (and/or register a `WebviewPanelSerializer`) so doc|code state survives hide/reopen. A typed message protocol (see `contracts/webview-protocol.md`) governs extension↔webview traffic. Selection sync is bidirectional: tree → webview (`showNode`), and webview → extension (`navigate`, `revealCodeRef`) → `treeView.reveal()`.

**Rationale**: Standard secure-webview practice; retaining context avoids re-rendering/re-highlighting on every tab switch; the serializer restores the panel after a window reload. Bidirectional sync keeps the tree and the doc pane's Prev/Next in agreement.

**Alternatives considered**: Recreating webview HTML on every selection — simpler but loses scroll/highlight state and re-pays Shiki cost. Rejected; retain context instead.

## R9. Build & test tooling

**Decision**: `esbuild` to bundle the extension and webview script; `@vscode/test-cli` + `@vscode/test-electron` with Mocha for integration tests against a fixture `.handoff/output/`; plain Mocha/assert unit tests for `src/handoff/*` (no extension host).

**Rationale**: esbuild is the de-facto fast bundler for VS Code extensions; the official test CLI is the supported path. The pure parser/validator being host-free means the bulk of contract logic is covered by fast unit tests.

**Alternatives considered**: webpack (slower, heavier config) — rejected. Jest for integration (can't drive the extension host) — rejected; Jest acceptable only for pure units, but Mocha keeps one runner.
