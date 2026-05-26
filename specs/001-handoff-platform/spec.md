# Feature Specification: Handoff — Interactive Developer Handover Tool

**Feature Branch**: `001-handoff-platform`

**Created**: 2026-05-23

**Updated**: 2026-05-26 — Autonomous handoff-start flow + /handoff-review command

**Status**: Draft

**Input**: User description: "from @Handoff_PRD_v1.docx"

## Clarifications

### Session 2026-05-26

- Q: When `/handoff-start` is invoked on a project that already has Handoff output, what should it do? → A: Git checkpoint-based delta update — the toolkit stores the git SHA when docs were last generated; re-running `/handoff-start` diffs from that checkpoint to HEAD, updating only nodes whose referenced code sections changed and adding nodes for any new sections discovered since the checkpoint. Unchanged sections are left as-is.
- Q: Are `[AI-guessed]` labels stored persistently in node files or display-only during review? → A: Stored in frontmatter — nodes include an `inferred_fields` list (e.g., `inferred_fields: [business_context, depth]`) identifying which fields the AI inferred. Fields confirmed or corrected by the giver during `/handoff-review` are removed from this list.
- Q: If the giver exits `/handoff-review` mid-way, can they resume where they left off? → A: Yes — resumable. The session cache tracks review progress; `/handoff-review` resumes from the first node still containing `inferred_fields`, skipping fully-confirmed nodes. No separate review-specific state field is needed — the `inferred_fields` presence in node files serves as the resumption cursor.
- Q: Should the VS Code extension visually distinguish AI-inferred content from confirmed content for receivers? → A: Yes — the extension shows a subtle indicator on fields still listed in `inferred_fields`, so receivers can see which content was AI-inferred and not yet confirmed by the giver.

### Session 2026-05-23

- Q: What mechanism does the toolkit use to deliver instructions to the AI agent? → A: A structured `.handoff/toolkit/` folder with skills, rules, and a master instruction file — following the same pattern as `.specify/`. The project's CLAUDE.md points to the toolkit entry point so Claude Code (and other agents) load it automatically.
- Q: How does the giver initiate a handover session in Phase 1 (toolkit-only MVP)? → A: Via a toolkit-defined slash command (e.g., `/handoff-start`) — consistent with the `.specify/` skill pattern.
- Q: What is the primary toolkit installation mechanism for MVP? → A: GitHub drop-in only — the giver copies `.handoff/toolkit/` from the Handoff repository. npm/npx packaging is deferred to Phase 3 (Launch).
- Q: How are toolkit files and the session cache gitignored? → A: The toolkit ships a `.handoff/.gitignore` file that Git reads automatically — no manual setup or scripts required.
- Q: Who is responsible for validating node schema before writing? → A: A `/handoff-validate` skill in the toolkit — the AI invokes it before saving each node, providing immediate feedback during the session.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Giver Creates a Handover (Priority: P1)

An outgoing developer (freelancer, contractor, or departing team member) installs the Handoff toolkit into their project and runs `/handoff-start`. The AI scans the codebase and autonomously produces complete documentation for every logical section — inferring business context from code patterns, commit history, naming conventions, and file structure; classifying each section by depth; and generating decisions and warnings without asking the giver any questions. The AI only pauses to ask when it genuinely cannot determine something (for example, an undocumented external dependency with no clear purpose). When the session ends, a full set of structured Markdown files is committed to the repository.

**Why this priority**: This is the foundational value of the product. Without the ability to produce structured output, the receiver-side experience has nothing to render. Making the session fully autonomous removes the primary adoption barrier — no time commitment from the giver beyond running a single command. This is Phase 1 of the MVP and gates all subsequent phases.

**Independent Test**: Drop the toolkit into a real project, run `/handoff-start` with no additional input from the giver, and verify that valid, schema-conforming Markdown files are produced in `.handoff/output/` — delivering a complete, browsable handover artifact before the extension is built.

**Acceptance Scenarios**:

1. **Given** a developer has an existing project repository, **When** they install the Handoff toolkit and run `/handoff-start`, **Then** the session begins immediately with no setup questions or configuration prompts.
2. **Given** the toolkit is installed and the session starts, **When** the AI agent scans the project, **Then** it identifies all logical sections (modules, services, or major areas), drafts both technical context AND a business context guess for each section — derived from code patterns, commit messages, naming conventions, and README content — without asking the giver any questions.
3. **Given** the AI has drafted a section, **When** it saves the node, **Then** all required fields (business context, technical context, depth classification, code references, decisions where inferable) are populated with the AI's best inference — the node is complete and valid without any giver input.
4. **Given** a section is saved, **When** the master index is updated, **Then** the node is written as a Markdown file with YAML frontmatter to `.handoff/output/nodes/` and `.handoff/output/index.json` reflects the latest state.
5. **Given** the AI encounters something it cannot determine (e.g., an undocumented external service with no code context), **When** it would otherwise produce a placeholder, **Then** it asks a single focused question to the giver for that specific gap only — resuming autonomous mode immediately after.
6. **Given** a giver pauses a session mid-way, **When** they return later, **Then** the session resumes from where it left off, with completed nodes intact.
7. **Given** `.handoff/output/` already exists with a recorded `generated_at_sha`, **When** the giver runs `/handoff-start` again after further commits, **Then** the session diffs from that SHA to HEAD, updates only nodes for sections that changed, adds nodes for new sections, and leaves unchanged sections untouched — then updates `generated_at_sha` to the new HEAD.

---

### User Story 2 — Receiver Browses the Handover (Priority: P2)

An incoming developer clones a repository that contains committed Handoff output. They open the project in VS Code with the Handoff extension installed. Without any manual setup, an interactive tree of handover sections appears in the sidebar. They can click any section to read business context, decisions, and warnings, and click code references to jump directly to the relevant file and line.

**Why this priority**: The receiver experience is the second half of the product's core value. It transforms static Markdown files into a navigable, code-linked experience that is meaningfully better than a README or wiki.

**Independent Test**: Clone a repo with valid Handoff output already present, open it in VS Code with the extension installed, browse the full handover tree, and navigate to at least one code reference — verifiable without running any generation step.

**Acceptance Scenarios**:

1. **Given** a repository contains a `.handoff/output/` folder, **When** the receiver opens the project in VS Code with the Handoff extension installed, **Then** the extension detects the output folder automatically and renders the section tree in the sidebar.
2. **Given** the sidebar tree is visible, **When** the receiver clicks any section, **Then** the full node content — business context, technical context, decisions, and warnings — is displayed.
3. **Given** a section is displayed, **When** the receiver clicks a code reference, **Then** VS Code navigates to the exact file and line referenced in the node.
4. **Given** a receiver reads a section, **When** they move to the next section, **Then** the previously read section is marked as read and the receiver's progress is persisted across VS Code sessions.

---

### User Story 3 — Giver Installs and Initialises the Toolkit (Priority: P1)

A developer needs to set up the Handoff toolkit in a new project as quickly as possible. They either drop the toolkit folder into their project manually or run an init command. The toolkit files are automatically excluded from git, and the output folder is ready to receive generated content.

**Why this priority**: Setup friction is the first barrier to adoption. If installation is complex, the tool will not be used. This is a prerequisite for User Story 1.

**Independent Test**: Follow the installation instructions from scratch on a fresh repository and confirm the toolkit is operational and the folder structure is correct, independent of running any session.

**Acceptance Scenarios**:

1. **Given** a developer has a project repository, **When** they copy the `.handoff/` folder from the Handoff GitHub repository into their project, **Then** the toolkit is present, the `.handoff/.gitignore` automatically excludes toolkit files and the session cache, and the project's CLAUDE.md references the toolkit entry point.
2. **Given** the toolkit is installed, **When** the developer inspects the git status, **Then** the `.handoff/output/` folder is tracked by git and all toolkit/session files are excluded.

---

### User Story 4 — Receiver Identifies Key Architectural Rationale Quickly (Priority: P2)

A receiver who is unfamiliar with the project needs to understand why a major architectural decision was made. They open the handover in VS Code, scan the section tree, and locate the relevant section within minutes — finding both the technical explanation and the business reason documented in one place.

**Why this priority**: Capturing the WHY is the core differentiator of this product. A receiver who cannot find decision rationale quickly receives no more value than from a codebase comment.

**Independent Test**: Given a handover with at least 5 nodes covering different areas, a person unfamiliar with the project should be able to locate the rationale for a specific architectural decision within 5 minutes without prior knowledge of the structure.

**Acceptance Scenarios**:

1. **Given** the handover tree is rendered, **When** the receiver scans section titles, **Then** they can identify which section is relevant to their question without reading all content.
2. **Given** they open the relevant section, **When** they read the content, **Then** both the technical context and the business rationale for the decisions in that area are present.

---

### User Story 5 — Giver Reviews and Refines AI-Generated Documentation (Priority: P1)

After `/handoff-start` completes, the giver runs `/handoff-review` to begin an interactive session reviewing what the AI inferred. The command walks through each node, clearly indicating which fields were guessed (business context, depth classification, decisions, warnings) and which were directly derived from code. The giver can confirm, correct, or enrich any guessed field — or skip sections where the AI's inference is already accurate. The `--help` flag explains the interaction model and the meaning of each guessable field.

**Why this priority**: The fully autonomous `/handoff-start` produces best-effort inferences. The review command closes the accuracy gap without requiring the giver to answer questions upfront — they can skim quickly and only stop where something is wrong. Together, `/handoff-start` + `/handoff-review` replaces the old interactive session pattern.

**Independent Test**: Given output produced by an autonomous `/handoff-start`, a giver should be able to review all nodes, correct at least one AI inference, and produce an updated, re-validated set of output files — without any knowledge of the underlying schema.

**Acceptance Scenarios**:

1. **Given** `/handoff-start` has completed, **When** the giver runs `/handoff-review`, **Then** the command begins an interactive walkthrough of each node in the same order they appear in the index (core first, then supporting, then peripheral).
2. **Given** the walkthrough is active, **When** the giver sees a node, **Then** each AI-inferred field is labelled as `[AI-guessed]` and each directly-derived field is labelled as `[from code]` — making it immediately clear what to review.
3. **Given** the giver wants to correct an AI guess, **When** they provide new content for a field, **Then** the node is updated immediately and re-validated against the schema before moving to the next node.
4. **Given** the giver is satisfied with a node's content, **When** they confirm or skip it, **Then** the command moves to the next node without re-asking about the confirmed fields.
5. **Given** the giver runs `/handoff-review --help`, **Then** a help summary is displayed that explains: what fields the AI guesses, how to interact with guessed fields during review, what `[AI-guessed]` vs `[from code]` labels mean, and how to skip, confirm, or rewrite any section.
6. **Given** the review session completes, **When** all nodes have been reviewed, **Then** the index is regenerated, all reviewed nodes are re-validated, and the giver receives a summary of what was changed versus what was accepted as-is.

---

### Edge Cases

- What happens when the AI agent produces a node that is missing a required field (e.g., no code references)? The system should flag the invalid node and not add it to the index until it is corrected.
- What happens if a code reference in a node points to a file that has been renamed or deleted after the handover was committed? The toolkit records the git commit SHA at generation time; the extension uses this to resolve broken references against the last valid state of the file via an internal git checkout tree.
- What happens if the giver starts a session on a project with no meaningful code structure (e.g., empty or near-empty repo)? The AI should produce at minimum a single high-level overview node rather than producing no output.
- What happens if the AI cannot infer the business context for a section (e.g., a utility library with no comments, commit history, or README)? The AI MUST ask one targeted question for that section only, and MUST still produce all other fields autonomously. It MUST NOT use this as a justification to ask questions across all sections.
- What happens if two givers independently run handover sessions on the same repository? The spec does not cover collaborative sessions in MVP; concurrent sessions are out of scope.
- What happens if `.handoff/output/index.json` is missing or unreadable? The extension should surface a clear error to the receiver rather than silently rendering nothing.

## Requirements *(mandatory)*

### Functional Requirements

**Toolkit**

- **FR-001**: The toolkit MUST be delivered as a structured `.handoff/toolkit/` folder containing skills, rules, and a master instruction file — following the same pattern as `.specify/`. The project's CLAUDE.md MUST include a reference to the toolkit entry point so that Claude Code (and compatible agents) load it automatically when the project is opened.
- **FR-001a**: The toolkit MUST define a `/handoff-start` slash command (skill) that, when invoked, runs fully autonomously: it scans the project, infers all node content (business context, technical context, depth, decisions, warnings, code references) from the codebase without asking the giver any questions. The AI MUST only pause to ask the giver a question when it genuinely cannot determine a required field from available context — such as an undocumented external dependency with no discoverable purpose. In all other cases the AI makes its best inference and continues.
- **FR-002**: The AI-guided session MUST scan the project structure and automatically identify logical sections to document (modules, services, or major functional areas). On first run, all sections are documented. On subsequent runs, the toolkit MUST diff from the `generated_at_sha` stored in `index.json` to HEAD: only sections whose referenced code files changed since that SHA are re-documented; new sections are added; unchanged sections are left as-is. The `generated_at_sha` in `index.json` is updated to the current HEAD SHA at the end of every successful run.
- **FR-003**: For each identified section, the AI MUST autonomously draft all node content — technical context from code analysis, business context inferred from naming conventions, commit messages, README content, and code patterns, depth classification based on how many other sections depend on it, decisions inferred from architectural patterns or comments, and warnings inferred from code complexity, TODOs, or anomalies. No giver input is required to populate any field.
- **FR-004**: During `/handoff-start`, the AI MUST NOT ask the giver questions unless a required field cannot be determined from any available context. When a question is unavoidable, the AI MUST ask the minimum number of questions (one per unresolvable gap) and resume autonomous operation immediately after receiving an answer.
- **FR-005**: Each completed section MUST be saved as a Markdown file with YAML frontmatter at `.handoff/output/nodes/<id>.md`. The filename must match the `id` field in the frontmatter.
- **FR-006**: The system MUST maintain a master index file at `.handoff/output/index.json` listing all nodes with their id, title, depth, dependencies, and file path. Nodes must be ordered: core first, then supporting, then peripheral.
- **FR-007**: The system MUST track session progress in a local cache at `.handoff/session.json` so that sessions can be paused and resumed without losing completed nodes.
- **FR-008**: The toolkit MUST ship a `.handoff/.gitignore` file that excludes the toolkit folder (`.handoff/toolkit/`) and the session cache (`.handoff/session.json`) from version control automatically — requiring no manual setup from the giver. The output folder (`.handoff/output/`) MUST be committed to the repository and must not be listed in any gitignore.
- **FR-009**: Every node's YAML frontmatter MUST include: `id` (lowercase, hyphenated, max 60 chars), `title` (max 120 chars), `depth` (core / supporting / peripheral), `schema_version` (integer, currently `1`), and `code_refs` (at least one entry, each with a `file` path and a `note`).
- **FR-009a**: The toolkit MUST define a `/handoff-validate` skill that the AI invokes before saving each node. The skill MUST check all frontmatter and body validation rules defined in `Handoff_Node_Schema_Spec.md` and report any failures to the giver before the node is written to disk.
- **FR-010**: The toolkit MUST record the git commit SHA at the time of generation and store it in the index. The extension MUST use this SHA to resolve code references against the correct version of the codebase, including when files have since been renamed or deleted.
- **FR-011**: Every node body MUST contain a `## Business Context` section and a `## Technical Context` section, each with at least one non-empty paragraph. Optional sections (`## Decisions`, `## Warnings`) may be included and must appear in that fixed order after the required sections.
- **FR-012**: For MVP, the toolkit MUST support installation via a GitHub drop-in only — the giver copies the `.handoff/toolkit/` folder from the Handoff repository into their project. No npm package or CLI install tool is required for MVP. npm/npx packaging is deferred to Phase 3.
- **FR-013**: The toolkit MUST be agent-agnostic in design, targeting Claude as the primary supported agent for MVP, with the architecture allowing additional agents to be added post-MVP.

- **FR-020**: The toolkit MUST define a `/handoff-review` slash command (skill) that, when invoked after `/handoff-start`, begins an interactive walkthrough of nodes that still contain `inferred_fields`, presented in index order (core → supporting → peripheral). The command is optional — the output of `/handoff-start` is already valid and complete without running `/handoff-review`. If the giver exits mid-way and re-runs `/handoff-review`, the session resumes from the first node still containing `inferred_fields`; fully-confirmed nodes are skipped automatically.
- **FR-021**: During `/handoff-review`, each field listed in a node's `inferred_fields` frontmatter MUST be labelled as `[AI-guessed]`; all other fields are labelled `[from code]`. The giver MUST be able to confirm (skip), correct, or rewrite any `[AI-guessed]` field. When the giver confirms or corrects a field, that field MUST be removed from `inferred_fields` in the saved node. Fully-confirmed nodes (empty `inferred_fields`) MUST NOT be re-presented in subsequent review passes.
- **FR-022**: Running `/handoff-review --help` MUST display a concise help summary covering: what fields the AI guesses during `/handoff-start`, how to interact with guessed content during review (confirm / skip / rewrite), what the `[AI-guessed]` and `[from code]` labels mean, and how the review session ends and output is updated.
- **FR-023**: After any field is corrected during `/handoff-review`, the affected node MUST be re-validated against the schema (per FR-009a) before proceeding to the next field. Validation failures MUST be shown inline and the giver prompted to fix them before continuing.
- **FR-024**: When `/handoff-review` completes, the toolkit MUST regenerate `.handoff/output/index.json` with the updated node metadata, display a summary of nodes changed versus accepted as-is, and leave the session in a `complete` state in the session cache.

**VS Code Extension**

- **FR-014**: The extension MUST automatically detect the `.handoff/output/` folder when a workspace is opened, without requiring any manual configuration.
- **FR-015**: The extension MUST render a navigable tree of handover sections in the VS Code sidebar, organised by depth classification (core first, then supporting, then peripheral).
- **FR-016**: Selecting any section in the sidebar MUST display its full content: business context, technical context, decisions, and warnings. Fields listed in the node's `inferred_fields` frontmatter MUST be rendered with a subtle visual indicator (e.g., an "AI-inferred" label or icon) so receivers can distinguish AI-generated content from giver-confirmed content.
- **FR-017**: Each code reference displayed in a section MUST be clickable and MUST navigate VS Code to the exact file and line number referenced. If the file no longer exists at that path, the extension MUST resolve it against the recorded git commit SHA and display it from that version.
- **FR-018**: The extension MUST persist read/unread status per node using VS Code workspace state, and this status MUST survive VS Code restarts.
- **FR-019**: If the output folder or index file is missing or unreadable, the extension MUST display a clear, actionable error message rather than rendering an empty or broken sidebar.

### Key Entities

- **Handover Node**: A single logical section of the handover documentation, stored as a Markdown file with YAML frontmatter. Frontmatter holds structured metadata: id (lowercase, hyphenated), title, depth (core / supporting / peripheral), schema_version, and at least one code reference. The Markdown body contains fixed-order sections: Business Context (required), Technical Context (required), Decisions (optional), Warnings (optional). Optional frontmatter fields: dependencies (related node IDs), tags, generated_at, `inferred_fields` (list of field names the AI inferred during `/handoff-start` — present when at least one field is still unconfirmed; absent or empty when the giver has confirmed all fields via `/handoff-review`).
- **Handover Index**: A JSON file at `.handoff/output/index.json` serving as the master manifest. Lists every node with its id, title, depth, dependencies, and file path. Also records the project name, generation timestamp, and git commit SHA. Nodes are ordered: core first, then supporting, then peripheral.
- **Session Cache**: A local (gitignored) JSON file tracking the state of an active or paused handover session. Records which nodes have been completed, which are in progress, and which sections remain. Review progress does not require a separate state field — resumption is driven by which nodes still contain `inferred_fields`; a node with an empty or absent `inferred_fields` list is fully confirmed and skipped by `/handoff-review`.
- **Code Reference**: A structured pointer in a node's frontmatter to a specific location in the codebase. Required fields: `file` (path relative to repo root) and `note` (description of what is referenced, max 200 chars). Optional: `line` (start line, 1-indexed) and `end_line` (end of range, only valid when `line` is set).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A giver can complete a full handover session for a project with 10–20 logical sections in under 2 hours from toolkit installation to committed output.
- **SC-002**: A receiver with no prior knowledge of the project can locate the rationale for any major architectural decision within 5 minutes of opening the handover in VS Code.
- **SC-003**: 100% of committed nodes contain at least one code reference and both business context and technical context fields populated.
- **SC-004**: The receiver flow (clone → open VS Code → browse handover → navigate to code) requires zero manual configuration beyond installing the VS Code extension.
- **SC-005**: Within 90 days of launch, the project achieves: 100+ GitHub stars, 50+ VS Code extension installs, and at least 5 public repositories containing committed `.handoff/output/` folders.
- **SC-006**: At least one person outside the development team completes a real handoff using the tool and reports that it helped — serving as the primary product-market fit signal.
- **SC-007**: The toolkit's validation gate is met: output quality is high enough that a human reviewer thinks "I wish I could browse this in a tree view" — confirming Phase 1 completion before Phase 2 begins.

## Assumptions

- Givers have an AI coding agent available (Claude is the primary supported agent for MVP; Copilot and Cursor support are deferred to post-MVP).
- Receivers have VS Code installed; the extension is available on the VS Code Marketplace.
- The toolkit is designed to work within an existing project repository (not a standalone tool invoked outside a repo context).
- Manual node creation is out of scope for MVP; all output is generated through the AI-guided session.
- Multi-root VS Code workspace support is deferred to post-MVP.
- Q&A mode (receivers querying docs and code) is deferred to post-MVP.
- Team progress dashboards and analytics are deferred to post-MVP.
- Both the toolkit and the extension launch free; monetisation decisions are deferred until after 90 days of adoption data.
- The product name "Handoff" is assumed available on npm, VS Code Marketplace, and GitHub — this is listed as an open question in the PRD and must be verified before launch.
- The node structure is formally defined in `Handoff_Node_Schema_Spec.md` (v1.0) and is treated as locked for MVP. Schema evolution rules are defined there: additive changes increment `schema_version`; breaking changes require a major version bump and a migration skill in the toolkit.
- Session collaboration (multiple givers contributing to the same handover) is out of scope for MVP.
