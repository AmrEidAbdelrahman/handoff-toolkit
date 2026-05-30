# Feature Specification: Business-First Doc Generation & Inline Code References

**Feature Branch**: `003-business-first-doc-ordering`

**Created**: 2026-05-29

**Status**: Draft

**Input**: User feedback after testing the toolkit on the Kershless Django REST API project

## Clarifications

### Session 2026-05-29

- Q: When a file serves multiple business domains, how should the AI assign it? → A: List the file in every relevant domain node (snippets may be duplicated across nodes).
- Q: How many business domains should the AI aim to produce? → A: No fixed target — AI identifies domains based on the project's natural seams.
- Q: What should the AI prioritise as "key entry points" for inline snippets? → A: Public API surface (exported functions/classes) + the most important business logic methods.

## Context

This feature addresses three concrete problems discovered during real-world testing of the Handoff toolkit (features 001–002) against the Kershless backend project:

1. The current `/handoff-start` skill generates individual code module nodes first, then appends business documents at the end — resulting in documentation that leads with low-level details rather than business understanding.
2. Documentation nodes mirror the file-system directory layout (`users/`, `competition/`, `social/`) rather than grouping around business domains — creating tech-centric, not business-centric, output.
3. The `code_refs` frontmatter system produces no visible output in the generated Markdown and relies entirely on an unbuilt VS Code extension to surface — making code references invisible to most readers.

## User Scenarios & Testing

### User Story 1 — Business Documents and Diagrams Generated First (Priority: P1)

A developer receiving a handover opens `.handoff/output/` and immediately sees high-level business context (architecture diagram, ADRs, onboarding guide) before any per-module detail. They can understand the system's purpose and major components without reading any code-level nodes.

**Why this priority**: The primary value of a handover document is rapid orientation for someone unfamiliar with the project. Leading with business context dramatically reduces the cognitive overhead of onboarding.

**Independent Test**: Run `/handoff-start` on a multi-module project; confirm the index lists business documents and architecture overview before any module nodes.

**Acceptance Scenarios**:

1. **Given** a project with multiple modules, **When** `/handoff-start` completes, **Then** the output index lists: system architecture diagram → ADRs → Onboarding Guide → (optional: Runbook, API Summary) → domain group nodes.
2. **Given** the output directory, **When** a receiver opens `index.md`, **Then** the first section is "Business Overview" containing links to the architecture diagram node and all business documents.
3. **Given** a project with detectable architecture decisions, **When** `/handoff-start` completes, **Then** at least one ADR is present in the output before any code-level nodes appear in the index.

---

### User Story 2 — Code Grouped by Business Domain, Not Directory (Priority: P1)

A developer reading the handover can navigate the output by business capability (e.g., "User Authentication & Profiles", "Competition Management") rather than by file-system path (e.g., `users/`, `competition/`). Each domain node covers the code that implements that business capability, regardless of where those files live in the repository.

**Why this priority**: Code directories reflect historical technical decisions; business domains reflect what the system actually does. A receiver who doesn't know the codebase has no way to map directories to capabilities without this grouping.

**Independent Test**: Run `/handoff-start` on the Kershless project; confirm nodes are titled by business domain name and reference cross-directory files when a domain spans multiple directories.

**Acceptance Scenarios**:

1. **Given** a project where `users/` and `social/` both contribute to a "User Profiles" domain, **When** `/handoff-start` completes, **Then** there is a single "User Profiles" node referencing files from both directories — not separate `users/` and `social/` nodes.
2. **Given** a project directory structure, **When** the AI derives business domains, **Then** domain names are written in plain English business language (e.g., "Competition Management"), not directory names (e.g., `competition/`).
3. **Given** a domain node, **When** a reader opens it, **Then** the node explains what business problem the domain solves, which code implements it, and how the components interact.
4. **Given** a utility module that supports multiple domains (e.g., `common/`, `services/`), **When** `/handoff-start` completes, **Then** pure infrastructure utilities appear in the cross-cutting node; files with business logic serving multiple domains appear in each relevant domain node.

---

### User Story 3 — Inline Code Snippets Replace Invisible Metadata References (Priority: P2)

A developer reading a handover node in any Markdown viewer (GitHub, VS Code preview, browser, terminal) sees actual code snippets inline, with clearly labelled file paths and line ranges, without needing any extension or plugin installed.

**Why this priority**: The current `code_refs` frontmatter is invisible in plain Markdown rendering and depends entirely on an extension that does not yet exist. Code references must degrade gracefully and be immediately useful.

**Independent Test**: Open a generated node `.md` file in GitHub web UI; confirm code snippets are visible with file path + line range labels and the actual code.

**Acceptance Scenarios**:

1. **Given** a generated handover node, **When** opened in any Markdown viewer, **Then** key code snippets appear as fenced code blocks with a label showing `file: path/to/file.py  lines: 12–34` above each block.
2. **Given** a section describing a business logic entry point, **When** the AI writes the node, **Then** the most important 5–15 lines of that entry point are quoted verbatim in a fenced code block.
3. **Given** a large function that is too long to quote in full, **When** the AI writes the node, **Then** only the signature and key lines are quoted, with a comment indicating omitted lines (e.g., `# ... (lines 45–89 omitted)`).
4. **Given** the `code_refs` frontmatter field from feature 002, **When** nodes are generated under feature 003, **Then** `code_refs` is no longer written; frontmatter remains clean.
5. **Given** a diagram that previously used `code_refs[].id` for click navigation, **When** the AI writes a diagram under feature 003, **Then** diagrams still include node labels but no longer depend on `code_refs` IDs for linking — diagrams are self-contained visual references.

---

### Edge Cases

- What if a project's directory structure is already domain-aligned (one directory = one domain)? Domain grouping still applies but produces one node per directory — acceptable.
- What if the AI cannot confidently identify business domains (very small project, single-purpose tool)? Fall back to a single node describing the whole project rather than splitting.
- What if a code file is 1000+ lines and the most important snippet is ambiguous? Quote the public interface / class signature only (up to 20 lines), note that internal implementation is omitted.
- What if a domain spans 50+ files? Quote only the 3–5 most important entry points; note in the node how many files belong to the domain.
- What if the project has no detectable architectural decisions? Skip ADR generation; output still starts with the architecture diagram and Onboarding Guide.

## Requirements

### Functional Requirements

- **FR-001**: The `/handoff-start` skill MUST generate business documents (architecture diagram, ADRs, Onboarding Guide, and conditionally Runbook / API Summary) before generating any domain or module nodes.
- **FR-002**: The output index MUST have a "Business Overview" section at the top, listing business documents, followed by a "Domain Reference" section listing domain nodes.
- **FR-003**: The skill MUST derive business domains from the codebase semantics (what the code does) rather than mapping one-to-one from directory names. The number of domains is determined by the project's natural seams — no fixed target is imposed.
- **FR-004**: Each business domain node MUST include: domain name (plain English), business purpose summary, list of files belonging to the domain, architecture diagram (if the domain has multiple components), and inline code snippets for key entry points.
- **FR-005**: Inline code snippets MUST be formatted as fenced code blocks with a label line immediately above each block specifying the file path and line range: `**`file: <relative-path>  lines: <start>–<end>`**`.
- **FR-006**: The `code_refs` frontmatter field MUST NOT be written in any node generated by this skill version.
- **FR-007**: The skill MUST limit inline code snippets to the most important 5–15 lines per entry point; longer functions MUST be truncated with an omission comment. Priority order for snippet selection: (1) public API surface — exported functions, class definitions; (2) key business logic methods that implement the domain's core rules.
- **FR-008**: Pure infrastructure / shared utilities (no direct business logic) MUST be documented in a dedicated cross-cutting node. Files that contain business logic serving multiple domains MUST be listed in each relevant domain node, with their snippets included in each.
- **FR-009**: The architecture diagram node MUST be the first entry in the output index.
- **FR-010**: The updated skill MUST remain backward-compatible with the existing output schema (schema_version: 1); the changes are additive to the SKILL.md generation logic only.

### Key Entities

- **Business Domain**: A named business capability implemented by one or more code directories/files. Has a name, purpose, list of file paths, and key entry points.
- **Architecture Overview Node**: A special handover node (doc_type: handover_node) containing the system-wide architecture diagram and a summary of all domains.
- **Inline Code Snippet**: A fenced code block with language annotation, preceded by a label showing file path and line range.
- **Domain Node**: A handover node scoped to one business domain; replaces the previous per-directory nodes.
- **Cross-Cutting Node**: A handover node for shared utilities, middleware, or infrastructure that serves multiple domains.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Running `/handoff-start` on the Kershless project produces an index where the first 3 entries are business documents (architecture overview + at least one ADR + Onboarding Guide) before any domain nodes.
- **SC-002**: Domain nodes are named in plain business language; zero node titles contain raw directory path components like `users/`, `competition/`, `social/`.
- **SC-003**: Every generated node file containing a "Key Components" or "Implementation" section contains at least one inline fenced code snippet with a file path label.
- **SC-004**: Generated node files contain no `code_refs` frontmatter field.
- **SC-005**: A developer unfamiliar with the project can identify the 3 main business domains within 5 minutes of reading the output, without opening any source files.

## Assumptions

- The Handoff toolkit skill files are the primary deliverable; no VS Code extension changes are in scope for this feature.
- The Kershless Django project is the primary test target; generalisation to other projects is a quality criterion but not a hard requirement for this feature.
- The existing `diagram-methodology.md` diagram decision matrix from feature 002 remains valid; this feature changes generation *order* and *code reference format*, not diagram types.
- Inline code snippets are read directly from the target project's source files during `/handoff-start` execution; no pre-indexing or caching step is needed.
- `schema_version` remains at 1; all changes are to SKILL.md generation logic.
- The feature does not change the `handoff-review` or `handoff-validate` skill behaviour.
