# Feature Specification: Handoff VS Code Extension

**Feature Branch**: `007-vscode-extension`

**Created**: 2026-06-04

**Status**: Draft

**Input**: User description: "Build the VS Code extension (Product 2) for Handoff. It reads the generated `.handoff/output/` (index.json + node markdown files) and renders it as a three-panel interactive experience: a sidebar navigation tree, a documentation pane with color-coded sections, and a live code snippet pane. State (read/unread) lives in workspace storage; the extension only reads the output and reads code live from workspace files."

## Overview

Handoff is a two-product developer handover tool. Product 1 (the toolkit) is complete: it guides an AI agent through a project and produces structured handover documentation under `.handoff/output/` — a master `index.json` manifest plus one markdown node file per handover section. This output is committed to the repository, so whoever clones the repo receives it.

This feature is Product 2: the VS Code extension that **consumes** that output and turns it into a guided, browsable reading experience. The extension is a pure reader — it never writes to the handover output. It reads referenced source code live from the workspace so snippets always reflect the current code.

The formal contract between the two products is the **Node Schema Specification** (`Handoff_Node_Schema_Spec.md`), which is the source of truth for all parsing and rendering behavior described here.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and read the handover (Priority: P1)

A developer clones a repository that contains Handoff output, opens it in VS Code, and is presented with a navigation tree of handover sections. They click a section and read its content, broken into clearly distinguished Business Context, Technical Context, Decisions, and Warnings. They move through the sections and come away understanding the project's "why" and "how" without reverse-engineering the code.

**Why this priority**: This is the minimum viable product. Structured, sectioned, navigable reading of business and technical context is already meaningfully better than a flat README — it delivers the core promise even before live code navigation exists.

**Independent Test**: Open a workspace containing a valid `.handoff/output/`. Confirm the sidebar lists every node grouped by depth with the overview nodes at the top, selecting a node renders its four sections with distinct visual treatment, and required sections always appear while omitted optional sections are simply absent.

**Acceptance Scenarios**:

1. **Given** a workspace with a valid `.handoff/output/` folder, **When** the extension activates, **Then** the sidebar shows a navigation tree of all nodes from `index.json`, grouped core → supporting → peripheral, with `project-overview` and `technical-overview` pinned at the top.
2. **Given** the navigation tree is visible, **When** the user selects a node, **Then** the documentation pane renders the node title and its body sections, with Business Context, Technical Context, Decisions, and Warnings each visually distinguished by their assigned color.
3. **Given** a node that omits the optional Decisions and Warnings sections, **When** it is rendered, **Then** only Business Context and Technical Context appear and no empty section placeholders are shown.
4. **Given** a node whose markdown contains lists, inline code, code blocks, and links, **When** it is rendered, **Then** that markdown displays as formatted content rather than raw text.
5. **Given** a node carries a `parent` reference to another node, **When** the tree is built, **Then** the node appears nested as a collapsible child of its parent; **and given** no node carries a `parent`, **Then** the tree is a flat depth-grouped list.

---

### User Story 2 - Navigate to the referenced code, live (Priority: P2)

While reading a section, the developer sees exactly which files and line ranges it refers to. A code pane beside the documentation shows the real, syntax-highlighted source from the workspace, with the referenced lines highlighted. The developer clicks between multiple referenced locations and clicks code mentions embedded in the prose to jump the code pane to the relevant spot — connecting explanation to implementation without hunting through the file tree.

**Why this priority**: This is the interactive differentiator over a README. It requires US1's rendering to exist first, but adds the "see the actual code being discussed" capability that makes the handover feel like a guided tour.

**Independent Test**: Select a node with multiple `code_refs`. Confirm the code pane auto-loads the first ref with the correct file shown and referenced lines highlighted, one tab appears per code ref, switching tabs changes the displayed source, and clicking a code reference (from the list or an inline mention) updates the code pane.

**Acceptance Scenarios**:

1. **Given** a node with one or more `code_refs`, **When** the node is selected, **Then** the code pane automatically loads the first code ref, displaying the live file content with syntax highlighting and the referenced line range highlighted.
2. **Given** a node with multiple `code_refs`, **When** the node is rendered, **Then** the code pane shows one tab per code ref, and selecting a tab displays that ref's file and highlighted range.
3. **Given** the documentation pane shows a list of code references with file, line, and note, **When** the user clicks one, **Then** the code pane switches to that reference.
4. **Given** the Technical Context contains an inline code mention that corresponds to a code reference, **When** the user clicks it, **Then** the code pane switches to the matching reference.
5. **Given** a `code_ref` whose file no longer exists in the workspace, or whose line range is beyond the file's length, **When** that ref is loaded, **Then** the code pane shows a clear "reference not found / out of range" message instead of failing, and the rest of the node remains usable.

---

### User Story 3 - Track and pace progress through the handover (Priority: P3)

The developer works through the handover over one or more sessions. Sections they have already read are visually marked as read, and a progress indicator shows how much of the handover remains. They move sequentially with Previous/Next controls and always see where they are — which depth tier and their position within it. When they reopen the workspace later, their read progress is preserved.

**Why this priority**: This turns the extension from a viewer into a workflow. It is valuable but not required to extract the handover's content, so it layers on top of US1 and US2.

**Independent Test**: Visit several nodes, confirm each becomes marked read and the progress indicator advances, navigate with Previous/Next in tree order, confirm the breadcrumb reflects depth and position, then close and reopen the workspace and confirm read state persists.

**Acceptance Scenarios**:

1. **Given** an unread node, **When** the user views it, **Then** its unread indicator clears and it is recorded as read.
2. **Given** some nodes are read, **When** the user looks at the sidebar, **Then** a progress indicator shows completion (e.g., proportion of nodes read).
3. **Given** a selected node, **When** the user activates Previous or Next, **Then** the adjacent node in the tree's reading order is selected.
4. **Given** a selected node, **When** it is displayed, **Then** a breadcrumb shows its depth tier and position within the handover (e.g., "core · 2 of 8").
5. **Given** the user has read some nodes, **When** they close and later reopen the same workspace, **Then** previously read nodes remain marked read.

---

### Edge Cases

- **No handover present**: The workspace has no `.handoff/output/` folder — the extension stays dormant / shows a clear "no Handoff output found" state rather than erroring.
- **Malformed or missing index**: `index.json` is missing, not valid JSON, or fails index validation — the extension surfaces a clear, specific error and does not crash.
- **Index/file mismatch**: An index entry points to a node file that does not exist, or a node file has no index entry — the extension reports the inconsistency and renders what it validly can.
- **Invalid node frontmatter or body**: A node fails frontmatter or body validation (e.g., missing required section, bad `depth`) — that node is flagged as problematic without breaking navigation to other nodes.
- **Outdated schema version**: A node or index declares a `schema_version` other than `1` — the extension shows a version-mismatch warning but still attempts to render the node (per schema spec §10).
- **Dependency to a missing node**: A node's `dependencies` reference an id not present in the index — the reference is shown but flagged or ignored gracefully.
- **Code ref drift**: A `code_ref` points at a file that has moved/been deleted, or a `line`/`end_line` beyond the current file length — handled as a non-fatal "not found / out of range" state in the code pane.
- **Empty handover**: `index.json` is valid but contains zero nodes — the extension shows an empty-but-valid state.
- **Overview nodes absent**: `project-overview` / `technical-overview` nodes don't exist — the tree simply omits the pinned-top section without error.

## Requirements *(mandatory)*

### Functional Requirements

**Detection & lifecycle**

- **FR-001**: The extension MUST detect the presence of a `.handoff/output/` folder in the opened workspace and activate its handover experience when present.
- **FR-002**: When no `.handoff/output/` folder is present, the extension MUST remain unobtrusive and communicate that no Handoff output was found rather than erroring.
- **FR-003**: The extension MUST treat the handover output as read-only and MUST NOT modify, create, or delete any file under `.handoff/output/`.

**Parsing & validation**

- **FR-004**: The extension MUST read `.handoff/output/index.json` as the authoritative manifest of nodes and use it to drive the navigation tree.
- **FR-005**: The extension MUST parse each node markdown file's YAML frontmatter and markdown body according to the Node Schema Specification.
- **FR-006**: The extension MUST validate index and node content against the schema's validation rules and surface clear, specific errors for invalid content without crashing or blocking access to valid nodes.
- **FR-007**: When a node or the index declares a `schema_version` other than the supported version (`1`), the extension MUST display a version-mismatch warning and still attempt to render the affected content.
- **FR-008**: The extension MUST handle a missing, unreadable, or malformed `index.json` by presenting a clear error state rather than failing silently or crashing.

**Navigation tree (Panel 1 — sidebar)**

- **FR-009**: The navigation tree MUST list all nodes from the index, grouped by depth in the order core → supporting → peripheral.
- **FR-010**: The tree MUST pin the special `project-overview` and `technical-overview` nodes at the top, above the depth groups, when those nodes exist, and MUST omit them gracefully when they do not.
- **FR-011**: The tree MUST present nodes in the index's defined order within each depth tier.
- **FR-012**: When a node carries an optional `parent` reference to another node id, the tree MUST nest it as a collapsible child of that parent; when no nodes carry `parent`, the tree MUST render as a flat depth-grouped list. (Forward-compatible: `parent` is not part of the current schema contract; the tree must function whether or not it is present.)
- **FR-013**: The tree MUST show a per-node read/unread indicator that visibly distinguishes nodes the user has already viewed.
- **FR-014**: The sidebar MUST display a progress indicator reflecting how many nodes have been read out of the total.

**Documentation pane (Panel 2)**

- **FR-015**: Selecting a node MUST render its body in the documentation pane, including the node title.
- **FR-016**: The documentation pane MUST parse the body into sections by their H2 headings and render Business Context, Technical Context, Decisions, and Warnings each with its assigned, visually distinct color treatment (Business = purple/WHY, Technical = blue/HOW, Decisions = green, Warnings = orange).
- **FR-017**: The documentation pane MUST render required sections (Business Context, Technical Context) always, render optional sections (Decisions, Warnings) only when present, and never show empty section placeholders.
- **FR-018**: The documentation pane MUST render standard markdown within sections (paragraphs, lists, inline code, code blocks, links) as formatted content.
- **FR-019**: The documentation pane MUST display the node's list of code references, each showing its file, line (when present), and note.
- **FR-020**: The Technical Context MUST support inline clickable code mentions that, when clicked, switch the code pane to the corresponding code reference.
- **FR-021**: The documentation pane MUST provide Previous/Next navigation that moves to the adjacent node in the tree's reading order.
- **FR-022**: The documentation pane MUST show a breadcrumb indicating the current node's depth tier and its position within the handover (e.g., "core · 2 of 8").

**Code pane (Panel 3)**

- **FR-023**: The code pane MUST be a permanently visible part of the layout alongside the sidebar and documentation pane (the three-panel layout is not togglable).
- **FR-024**: The code pane MUST read source content live from the actual workspace files referenced by `code_refs`, rather than from any code embedded in the nodes.
- **FR-025**: The code pane MUST display source with syntax highlighting and MUST highlight the referenced line range (from `line` to `end_line`, or the single `line`, or none when only a file is referenced).
- **FR-026**: The code pane MUST show one tab per code reference in the current node and switch the displayed source when a tab is selected.
- **FR-027**: When a node is selected, the code pane MUST auto-load the node's first code reference.
- **FR-028**: Clicking any code reference (in the documentation pane's reference list or an inline mention) MUST switch the code pane to that reference.
- **FR-029**: When a referenced file is missing or a referenced line range is out of bounds, the code pane MUST show a clear non-fatal "not found / out of range" state while the rest of the node remains usable.

**Session state**

- **FR-030**: The extension MUST persist read/unread state per node in VS Code workspace storage, with no backend or remote service, and MUST restore it when the workspace is reopened.

### Key Entities

- **Handover Output**: The `.handoff/output/` directory committed to the repo; the complete unit the extension consumes. Contains the index and the node files.
- **Index Manifest**: The `index.json` listing project name, generation time, schema version, and the ordered set of node references (id, title, depth, dependencies, file). Drives the tree.
- **Node**: A single handover section — frontmatter metadata (id, title, depth, schema_version, code_refs, optional dependencies/tags/parent) plus a markdown body of up to four ordered sections. The atomic unit a user reads.
- **Code Reference**: A pointer from a node to a location in the workspace source — file path, optional line and end_line, and a human note. Drives the code pane tabs and highlighting.
- **Section**: One of the four recognized body parts (Business Context, Technical Context, Decisions, Warnings), each with a fixed meaning and color.
- **Read State**: Per-node viewed/unviewed status held in workspace storage, feeding the read indicators and progress.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From opening a workspace that contains valid Handoff output, the navigation tree is visible and a node can be opened in under 5 seconds, with no manual configuration steps.
- **SC-002**: 100% of nodes in a valid handover are reachable from the sidebar and render their required Business and Technical Context sections.
- **SC-003**: For any selected node with code references, the user can reach the referenced source in the code pane in a single click (auto-loaded for the first ref; one click for any other), with the correct lines highlighted.
- **SC-004**: Every malformed-input case (no output folder, bad index, invalid node, schema-version mismatch, missing/out-of-range code ref) results in a clear in-product message and never an unhandled crash or blank failure.
- **SC-005**: Read progress persists across a close-and-reopen of the workspace with 100% fidelity (no read node reverts to unread).
- **SC-006**: In validation testing, receivers report that browsing the handover in the extension is more useful for understanding the project than reading the repository's README alone.
- **SC-007**: A receiver can complete the end-to-end journey — clone, open, browse the tree, read every section's business and technical context, and navigate to referenced code in the code pane — without external instructions.

## Assumptions

- **Schema contract is authoritative**: Where the feature brief and the Node Schema Specification disagree, the schema spec governs parsing/rendering. The brief's `parent`-based hierarchy is treated as forward-compatible: the tree honors `parent` if a node carries it, but functions as a depth-grouped list against current v1 output (which does not emit `parent`). [Decision confirmed with stakeholder.]
- **Inline code mentions are inferred heuristically**: The schema defines no explicit inline-mention syntax. The extension infers clickable mentions in Technical Context by matching inline code spans to the node's `code_refs` (e.g., a referenced file path or recognizable token). This is a heuristic, not a contract field.
- **Single-root workspace**: Multi-root workspace support is out of scope for MVP; behavior targets a single workspace root containing one `.handoff/output/`.
- **Overview node convention**: `project-overview` and `technical-overview` are recognized by id convention as the pinned-top nodes; they are ordinary nodes otherwise and may be absent.
- **Code refs resolve from project root**: `code_ref.file` paths are relative to the workspace/project root, using forward slashes, per the schema.
- **Receiver-side only**: This feature covers the receiver's reading experience. Giver-side session management, Q&A mode, first-run configuration wizard, progress analytics/export, and search/filter are explicitly out of scope for MVP.
- **Output is present in the repo**: The handover output is committed and available on clone; the toolkit itself is gitignored and not required by the extension at runtime.

## Out of Scope (MVP)

- Q&A / conversational mode
- First-run configuration wizard
- Multi-root workspace support
- Progress analytics or export
- Giver-side session management
- Search / filter / tag-based filtering of nodes
- Any writing back to `.handoff/output/`
