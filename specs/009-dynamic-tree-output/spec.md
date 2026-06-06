# Feature Specification: Dynamic Tree Output Structure

**Feature Branch**: `009-dynamic-tree-output`

**Created**: 2026-06-06

**Status**: Draft

**Input**: User description: "You don't want a fixed tree template — you want the structure to emerge from the project itself. The toolkit scans the project and creates parent nodes based on what actually exists. Every project gets a different tree because every project is different. The schema stays simple — just id, parent, and the rest. The intelligence is in the toolkit, not the schema."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receiver navigates a project-shaped tree (Priority: P1)

A developer joining a Node.js API project opens the Handoff output and sees a sidebar tree that mirrors the actual project structure — modules, services, APIs, and infrastructure — rather than a generic flat list. They can expand the "modules" section to find exactly the "authentication" node they need, without scrolling through unrelated content.

**Why this priority**: This is the core value proposition of the feature. Without a meaningful tree shape, every other improvement is cosmetic.

**Independent Test**: Run `/handoff-start` on a real Node.js API project. Verify the sidebar tree in the VS Code extension shows project-appropriate groupings (e.g., modules, services, api) rather than a flat depth-ordered list. A new developer should be able to locate the authentication documentation in under 30 seconds.

**Acceptance Scenarios**:

1. **Given** a Node.js API project with authentication, billing, and notification modules, **When** `/handoff-start` completes, **Then** the output tree shows a `modules` parent node with `authentication`, `billing`, and `notifications` as children.
2. **Given** a React frontend project, **When** `/handoff-start` completes, **Then** the output tree shows `pages`, `components`, and `state-management` groups (not `modules` or `services`), because those groupings don't match the project type.
3. **Given** a microservices project, **When** `/handoff-start` completes, **Then** each service appears as a top-level parent with its own sub-tree of modules, APIs, and config underneath.

---

### User Story 2 - Toolkit infers the right tree shape without configuration (Priority: P2)

A developer running `/handoff-start` for the first time on an unfamiliar project provides no tree template, no config file, and no instructions. The toolkit scans the codebase, infers what kind of project it is, and produces a hierarchy that makes structural sense — without the user having to specify anything.

**Why this priority**: The toolkit's value is that it works out of the box. If users must configure a tree shape, they've done half the documentation work themselves.

**Independent Test**: Run `/handoff-start` on three different project types (API, frontend, microservices) without any configuration. Verify that each produces a structurally different, project-appropriate tree. No configuration file should be required.

**Acceptance Scenarios**:

1. **Given** a project with no handoff configuration, **When** the toolkit scans the codebase, **Then** it identifies the project type (API / frontend / microservices / library / other) and selects an appropriate set of parent groupings.
2. **Given** a small project with only two meaningful modules, **When** the toolkit scans, **Then** it produces a shallow tree (not forcing deep nesting where none is warranted).
3. **Given** a project the toolkit cannot confidently classify, **When** scanning completes, **Then** it falls back to a minimal valid tree (`project-overview` + `technical-overview` at the root) rather than erroring.

---

### User Story 3 - Parent nodes provide meaningful grouping context (Priority: P2)

A receiver browsing the tree clicks on the `services` parent node — not a leaf node — and finds a description explaining what the services layer does as a whole: why it exists, how the pieces within it relate to each other. They understand the grouping before drilling into individual service nodes.

**Why this priority**: Parent nodes that are empty containers waste the hierarchy. Parent nodes with real content make the tree a documentation layer in itself.

**Independent Test**: Open any generated parent node (e.g., `modules`, `services`, `api`). Verify it has non-empty Business Context (why this grouping exists) and Technical Context (how the pieces within it work together). Verify it renders and is navigable in the extension just like a leaf node.

**Acceptance Scenarios**:

1. **Given** a `services` parent node, **When** a receiver opens it, **Then** they see a Business Context explaining why the service layer exists and a Technical Context describing how the services relate to each other.
2. **Given** a parent node with no direct code to reference, **When** it is generated, **Then** it is still valid and renderable — it simply has no `code_refs` (which is allowed by the schema).
3. **Given** a deep child node (e.g., `login-flow` under `authentication` under `modules`), **When** a receiver opens it, **Then** its content focuses on the specific concern, not repeating the parent's overview.

---

### User Story 4 - Extension renders any tree shape without modification (Priority: P3)

The VS Code extension displays the tree produced by the toolkit without needing to know the project type in advance. It reads the `parent` field on each node and builds the sidebar tree dynamically. Adding a new project type or new grouping in the toolkit does not require an extension update.

**Why this priority**: The extension is a consumer, not a co-author of the structure. Its job is to render, not to classify.

**Independent Test**: Produce a handoff output with an unusual tree structure (e.g., a monorepo with package-level root nodes). Verify the extension renders the tree correctly without any code changes to the extension.

**Acceptance Scenarios**:

1. **Given** an output with nested nodes (parent → child → grandchild), **When** the extension loads it, **Then** the sidebar shows correct nesting at all levels.
2. **Given** an output with `project-overview` and `technical-overview` as the only nodes (minimal valid tree), **When** the extension loads it, **Then** it renders correctly with no errors.
3. **Given** a node with a `parent` value that references a non-existent node, **When** the extension loads it, **Then** it surfaces a warning but still renders all other nodes without crashing.

---

### Edge Cases

- What happens when the toolkit cannot detect a meaningful project structure? → Falls back to a minimal tree (`project-overview` + `technical-overview`) with a warning logged.
- What happens when a node's `parent` references a node that doesn't exist in the index? → The extension treats it as a root-level node and shows a validation warning, but does not crash.
- What happens when the tree is very deep (5+ levels)? → Schema imposes no depth limit; the extension must render unlimited nesting. Performance is not a concern for the documentation sizes expected.
- What happens when two sibling nodes have the same title but different IDs? → Allowed. The `id` is the unique key; `title` is display-only and may collide.
- What happens when the same project is re-scanned after new modules are added? → The toolkit regenerates the tree, which may add new nodes or new parent groupings. Nodes removed from the codebase are not automatically removed from the output (the giver reviews before sharing).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The schema MUST support a `parent` field on any node, where the value is the `id` of another node in the same output. A node with no `parent` is a root node.
- **FR-002**: The schema MUST designate `project-overview` and `technical-overview` as reserved root node IDs that are always present in a valid output, regardless of project type.
- **FR-003**: The schema MUST allow `code_refs` to be absent on any node, including parent/grouping nodes that describe a layer rather than specific code.
- **FR-004**: The toolkit MUST scan the project and infer an appropriate set of parent grouping nodes based on what it finds, without requiring any user configuration.
- **FR-005**: The toolkit MUST populate each parent node with meaningful Business Context (why the grouping exists) and Technical Context (how the pieces within it work together).
- **FR-006**: The toolkit MUST assign every non-root node a `parent` field pointing to its logical grouping node.
- **FR-007**: The index file MUST include each node's `parent` value (or indicate root status) so the extension can reconstruct the tree from the index alone, without reading every node file.
- **FR-008**: The extension MUST build its sidebar tree dynamically from the `parent` field values it reads from the index — it MUST NOT hard-code any project-type-specific groupings.
- **FR-009**: The extension MUST render nodes at any depth level (no maximum nesting depth in the UI).
- **FR-010**: The extension MUST handle a missing or dangling `parent` reference gracefully — displaying the affected node at root level and showing a validation indicator, without crashing.
- **FR-011**: The toolkit MUST fall back to a minimal valid tree (`project-overview` + `technical-overview` only) when it cannot confidently determine a meaningful project structure, rather than failing or producing an empty output.

### Key Entities

- **Node**: A single documentation unit. Has an `id`, `title`, optional `parent` (another node's `id`), optional `code_refs`, and a Markdown body. Nodes with no `parent` are root nodes.
- **Parent Node**: A node whose `id` is referenced by at least one other node's `parent` field. Acts as a grouping container. May or may not have `code_refs`. Has its own Business Context and Technical Context describing the group as a whole.
- **Tree**: The full hierarchy of nodes for a project, reconstructed from the `parent` fields in the index. Every project produces a different tree shape.
- **Reserved Root Nodes**: `project-overview` and `technical-overview` — always present, always root-level (no `parent`), always generated regardless of project type.
- **Index**: The manifest file listing all nodes with their `id`, `title`, `depth`, `parent`, and file path. The extension reads this first to build the tree before loading individual node files.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer new to a project can locate the documentation for a specific module or feature in under 30 seconds by navigating the sidebar tree, without using search.
- **SC-002**: Running `/handoff-start` on three structurally different project types produces three visibly different tree shapes, with no manual configuration required between runs.
- **SC-003**: 100% of generated parent nodes contain non-empty Business Context and Technical Context sections — no empty grouping containers are produced.
- **SC-004**: The extension renders any toolkit-produced tree without modification — adding a new project type or grouping to the toolkit requires no extension code changes.
- **SC-005**: A minimal valid output (only `project-overview` and `technical-overview`) loads and renders in the extension without errors.
- **SC-006**: The extension handles a dangling `parent` reference without crashing — affected nodes appear at root level and a validation indicator is shown.

## Assumptions

- The `depth` field (`core`, `supporting`, `peripheral`) is retained in the schema alongside `parent`. The tree hierarchy and the depth classification serve different purposes: `parent` controls where a node appears in the tree; `depth` signals how important it is to read.
- The existing `doc_type` variants (ADR, runbook, etc.) are fully compatible with the `parent` field — any typed document can be a child node under an appropriate grouping.
- Backward compatibility: existing output files without a `parent` field are treated as root-level nodes and remain valid under schema version 1. A schema version bump is not required for an additive optional field.
- The toolkit's project-type detection logic is a separate concern from this spec and may evolve independently. This spec only requires that the toolkit produces a meaningful tree — not that a specific detection algorithm is used.
- The VS Code extension sidebar is the primary consumer of the tree structure. Other consumers (README export, web viewer) are out of scope for this feature.
- There is no enforced maximum depth. The toolkit is expected to produce sensible depth (2–4 levels for typical projects) as a quality convention, not a schema constraint.
