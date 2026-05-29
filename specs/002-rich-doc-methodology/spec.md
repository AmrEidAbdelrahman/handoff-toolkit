# Feature Specification: Rich Documentation Methodology — Diagrams & Business Documents

**Feature Branch**: `002-rich-doc-methodology`

**Created**: 2026-05-26

**Status**: Draft

**Input**: User description: "establish a methodology to how agent should write a documentation (including diagrams and needed business documents) — the extension should also be considered and how it will display and visualise this"

## Clarifications

### Session 2026-05-26

- Q: Does adding `doc_type` require a `schema_version` bump? → A: No bump — `doc_type` is a backward-compatible additive field. Nodes without `doc_type` are treated as `handover_node` by default. `schema_version` remains `1` for all documents in this feature.
- Q: Does the node frontmatter need to declare the diagram format, or does the extension always assume Mermaid? → A: Declared in frontmatter — nodes containing diagrams include `diagram_format: mermaid`; extension reads this field to select the renderer. Nodes without `diagram_format` have no diagrams to render.
- Q: How does a diagram element get connected to a `code_refs` entry for click-to-navigate? → A: New optional `id` field on `code_refs` — agent assigns a short identifier (e.g., `auth-service`) to each navigable code_ref; diagram element labels use those IDs; extension matches `code_refs[].id` to element labels for navigation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Agent Generates Diagrams Alongside Prose (Priority: P1)

When the AI agent documents a section during `/handoff-start`, it follows a defined methodology to determine which diagrams are appropriate for that section type, generates them in a text-based format embedded in the node, and labels them with a title and description. The result is documentation that is immediately visual — a receiver can understand a complex architecture or data flow without reading dense prose.

**Why this priority**: Documentation without visuals forces readers to mentally construct structures that a diagram conveys instantly. Diagrams are the single highest-value addition to the existing text-only node format, and they can be generated autonomously without giver input using the same code-scanning logic as the prose.

**Independent Test**: Run `/handoff-start` on a project with at least one section containing multiple interacting components; verify the produced node includes at least one embedded diagram in the standard format, with a title and description, renderable by the extension.

**Acceptance Scenarios**:

1. **Given** the agent is documenting a section with multiple interacting modules or services, **When** it writes the node, **Then** it includes at least one diagram (architecture or flow) embedded in the node body under a `## Diagrams` section.
2. **Given** the agent is documenting a data-heavy section (models, schemas, relationships), **When** it writes the node, **Then** it includes an entity-relationship or data structure diagram.
3. **Given** the agent is documenting a simple utility with no meaningful structural relationships, **When** it writes the node, **Then** it does NOT force a diagram — diagrams are only included when they add clarity over prose.
4. **Given** the diagram methodology defines required vs optional diagram types per section category, **When** the agent classifies a section, **Then** it follows the methodology rules to decide which diagrams to include.
5. **Given** a node contains a diagram, **When** the receiver opens the node in the VS Code extension, **Then** the diagram renders visually (not as raw source text) in the node panel.

---

### User Story 2 — Agent Produces Typed Business Documents (Priority: P1)

Beyond the standard handover node format, the agent recognises specific business document opportunities during `/handoff-start` — Architecture Decision Records (ADRs), runbooks, onboarding guides, and API summaries — and produces them as typed documents with their own templates. These documents are linked from relevant nodes so receivers can navigate from a section to its formal artefacts.

**Why this priority**: A handover that only covers technical context misses the institutional knowledge that lives in decision rationales, operational procedures, and onboarding flows. Typed business documents make this knowledge explicit and navigable without adding burden to the giver.

**Independent Test**: Run `/handoff-start` on a project with at least one significant architectural decision and one operational entry point; verify at least one ADR and one runbook are produced, formatted correctly, and linked from their associated nodes.

**Acceptance Scenarios**:

1. **Given** the agent identifies a significant architectural decision in the codebase (inferred from architectural comments, commit messages, or unusual patterns), **When** it documents that section, **Then** it produces an ADR document linked from the relevant node.
2. **Given** the agent identifies an operational entry point (e.g., a startup script, deployment config, or CLI entrypoint), **When** it documents that section, **Then** it produces a runbook document linked from the relevant node.
3. **Given** the project has a clear entry point or README-equivalent, **When** the session completes, **Then** the agent produces an onboarding guide document summarising where to start and the recommended reading order for the handover nodes.
4. **Given** the agent produces a business document, **When** the document is saved, **Then** it follows the document type's template (defined in the methodology), includes a title and classification, and is discoverable through the index.
5. **Given** a receiver opens a node linked to a business document, **When** they click the document link, **Then** the document opens in the extension's panel in a format appropriate for its type.

---

### User Story 3 — Extension Visualises Document Types with Rich Layouts (Priority: P2)

The VS Code extension detects the document type of each item in the handover index and applies a type-appropriate visual layout. Handover nodes render with the existing prose format; diagram-containing nodes render with visual diagrams; ADRs render with a structured decision layout; runbooks render with a step-by-step checklist view.

**Why this priority**: Rendering all documents identically (as undifferentiated prose) wastes the opportunity to make each document type immediately recognisable and usable. Type-aware rendering makes the difference between a document that is read and one that is actionable.

**Independent Test**: Open a handover containing at least one of each document type (node with diagram, ADR, runbook, onboarding guide) in the extension; verify each renders with a visually distinct layout that matches the document type, without any layout appearing for the wrong type.

**Acceptance Scenarios**:

1. **Given** the extension loads a node that contains a `## Diagrams` section, **When** the receiver opens that node, **Then** the diagram source is rendered as a visual diagram (not raw text) inline in the panel.
2. **Given** the extension loads an ADR document, **When** the receiver opens it, **Then** the panel displays the ADR with structured sections: Context, Decision, Consequences — visually distinct from a standard handover node.
3. **Given** the extension loads a runbook document, **When** the receiver opens it, **Then** steps are rendered as a numbered checklist with clear visual separation between steps.
4. **Given** the extension loads an onboarding guide, **When** the receiver opens it, **Then** the guide is displayed with a reading-order sequence (numbered list of node links the receiver can follow in order).
5. **Given** the sidebar tree shows the full handover index, **When** the receiver scans it, **Then** each item shows a visual type indicator (icon or label) differentiating node types (handover node, ADR, runbook, diagram, onboarding guide).

---

### User Story 4 — Receiver Navigates Diagrams to Code (Priority: P2)

Diagrams in a node are not static — labelled elements within a diagram are linkable to the corresponding code locations. A receiver who sees a component in an architecture diagram can click it to navigate directly to the code that implements it.

**Why this priority**: Diagrams without navigation are better than nothing, but diagrams linked to code close the loop between understanding the structure and exploring the implementation. This is the extension's key differentiator over a static README diagram.

**Independent Test**: Open a node with a diagram containing at least one labelled component with a corresponding code reference; click the component in the rendered diagram; verify VS Code navigates to the correct file and line.

**Acceptance Scenarios**:

1. **Given** a diagram element is labelled with an identifier that matches a code reference in the node's `code_refs`, **When** the receiver clicks that element in the rendered diagram, **Then** the extension navigates to the referenced file and line.
2. **Given** a diagram element has no matching code reference, **When** the receiver hovers over it, **Then** no navigation indicator is shown (no broken link behaviour).
3. **Given** a node contains multiple diagrams, **When** the receiver opens the node, **Then** each diagram is displayed in sequence with a title heading above it and a description below it.

---

### Edge Cases

- What happens when the agent generates a diagram with syntax errors? The diagram should be validated before saving; if invalid, the agent corrects it or falls back to a prose description rather than saving broken diagram source.
- What happens when the extension cannot render a diagram (e.g., the rendering library is unavailable)? The raw diagram source is displayed as a code block as a fallback — never silently hidden.
- What if a project has no architectural decisions or operational scripts to produce ADRs/runbooks from? The agent skips those document types rather than producing empty or fabricated documents.
- What if the same section warrants multiple business document types? The agent produces all applicable documents and links all of them from the relevant node.
- What happens when a diagram element label contains characters that prevent navigation (spaces, special chars)? Labels are normalised to match the code_ref format; non-navigable labels render as non-interactive.

---

## Requirements *(mandatory)*

### Functional Requirements

**Diagram Methodology (Toolkit)**

- **FR-001**: The toolkit methodology MUST define a diagram decision matrix: for each section category (multi-component module, data layer, pipeline/flow, single utility), the matrix specifies which diagram types are required, which are optional, and which are not applicable.
- **FR-002**: The supported diagram types MUST include at minimum: architecture overview (box-and-arrow), data flow (directional flow), sequence (interaction order), and entity-relationship (data model).
- **FR-003**: All diagrams MUST be embedded in the node body using a text-based, version-control-friendly format that the extension can render visually. The format must be deterministically parseable by the extension without external network calls. Nodes containing one or more diagrams MUST include a `diagram_format` frontmatter field declaring the format used (e.g., `diagram_format: mermaid`). The extension reads this field to select the correct renderer; nodes without `diagram_format` are treated as having no diagrams.
- **FR-004**: Each diagram MUST include a plain-language title and a one-sentence description of what the diagram shows.
- **FR-005**: Each `code_refs` entry MAY include an optional `id` field — a short, lowercase, hyphenated identifier (e.g., `auth-service`) assigned by the agent. Diagram elements that should be navigable MUST use labels matching the `id` of the corresponding `code_refs` entry. The extension matches diagram element labels to `code_refs[].id` to resolve navigation targets. `code_refs` entries without an `id` are not navigable from diagrams but remain valid for display.
- **FR-006**: The agent MUST validate diagram syntax before saving a node. If validation fails, the agent MUST attempt correction once; if still invalid, replace the diagram with a prose description of the same content and log a warning.

**Business Document Methodology (Toolkit)**

- **FR-007**: The toolkit methodology MUST define a document type catalogue covering at minimum: ADR (Architecture Decision Record), Runbook, Onboarding Guide, and API Summary. Each type MUST have a defined template with required and optional sections.
- **FR-008**: During `/handoff-start`, the agent MUST evaluate each identified section against the document type catalogue and produce any applicable business documents, without requiring giver input.
- **FR-009**: The **Onboarding Guide** MUST be produced for every handover session. It MUST include: a one-paragraph project summary, a recommended reading order for nodes (core first, then supporting, then peripheral), and links to all ADRs and runbooks produced in the session.
- **FR-010**: The **ADR template** MUST include: Title, Date, Status (proposed/accepted/deprecated), Context (what situation prompted the decision), Decision (what was decided), and Consequences (what trade-offs result).
- **FR-011**: The **Runbook template** MUST include: Title, Purpose (one sentence), Prerequisites, numbered Steps, and Expected Outcome.
- **FR-012**: Business documents MUST be stored as typed nodes — they use the same file format (Markdown with YAML frontmatter) as handover nodes, with an additional `doc_type` frontmatter field (values: `handover_node`, `adr`, `runbook`, `onboarding_guide`, `api_summary`) and `schema_version: 1`. The `doc_type` field is optional and backward-compatible: nodes without it are treated as `handover_node`. No schema_version bump is required — existing nodes from feature 001 remain valid as-is.
- **FR-013**: Business documents MUST be listed in `index.json` alongside handover nodes, with their `doc_type` included as a top-level field in the index entry. The index ordering rule (core → supporting → peripheral) still applies to the `depth` field; documents without a meaningful depth default to `supporting`.
- **FR-014**: Each business document MUST be linked from at least one handover node via a `doc_refs` frontmatter field (list of relative paths to business document files).

**Extension Visualisation**

- **FR-015**: The extension MUST render embedded diagram source visually in the node panel. Diagrams MUST NOT be displayed as raw source text in the final render.
- **FR-016**: The extension MUST apply document-type-aware rendering: standard handover nodes use the existing prose layout; ADRs display Context/Decision/Consequences in a structured card layout; runbooks display numbered steps with checkbox-style step markers; onboarding guides display a numbered reading sequence with clickable node links.
- **FR-017**: The extension sidebar tree MUST display a distinct icon or label for each `doc_type`, allowing receivers to visually distinguish handover nodes from ADRs, runbooks, and onboarding guides at a glance.
- **FR-018**: In a diagram, elements whose labels match a `code_refs[].id` value in the same node MUST be rendered as clickable — clicking navigates to the referenced file and line of that code_ref. Elements whose labels have no matching `code_refs[].id` render as non-interactive.
- **FR-019**: When a receiver opens an onboarding guide, the reading order sequence MUST render as a numbered list of clickable node titles — clicking a title opens that node in the panel without leaving the onboarding guide open (panel replaces content).

### Key Entities

- **Diagram**: A text-based visual representation embedded in a node's body under `## Diagrams`. Has a title, description, and source (in the format declared by the node's `diagram_format` frontmatter field). Element labels that match a `code_refs[].id` in the same node are navigable — clicking them opens the referenced code location. Types: architecture, data-flow, sequence, entity-relationship.
- **Code Reference (extended)**: The existing `code_refs` entry gains an optional `id` field — a short, lowercase, hyphenated string the agent assigns when it wants the reference to be navigable from a diagram element. `id` is unique within a node's `code_refs` list.
- **Document Type**: A classification for a handover output. Stored as `doc_type` in YAML frontmatter. Values: `handover_node` (default), `adr`, `runbook`, `onboarding_guide`, `api_summary`.
- **ADR (Architecture Decision Record)**: A business document capturing a significant architectural decision. Sections: Title, Date, Status, Context, Decision, Consequences. Linked from the node covering the relevant section.
- **Runbook**: A business document providing step-by-step operational instructions. Sections: Title, Purpose, Prerequisites, Steps (numbered), Expected Outcome. Linked from the node covering the relevant operational area.
- **Onboarding Guide**: A meta-document produced once per session. Sections: Project Summary, Reading Order (ordered list of node links), Related Documents (ADR and runbook links). Always created, always linked from the index.
- **Diagram Decision Matrix**: The methodology rule table the agent follows to determine required vs optional diagrams per section category. Stored as a rule in the toolkit.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A receiver with no prior project knowledge can understand the high-level architecture of a 5-section project in under 3 minutes, using only diagrams and the onboarding guide — without reading any prose sections.
- **SC-002**: 100% of handover sessions produce an onboarding guide and at least one diagram-containing node (for projects with more than 2 logical sections).
- **SC-003**: A receiver can navigate from a diagram element to its implementing code in a single click, with no intermediate steps or search required.
- **SC-004**: Each business document type (ADR, runbook) is visually distinguishable from a handover node within 2 seconds of opening it in the extension — without the receiver needing to read the content.
- **SC-005**: Zero rendering fallbacks (raw diagram source displayed instead of rendered diagram) in a correctly produced handover on a correctly installed extension.

---

## Assumptions

- Diagrams are expressed using Mermaid syntax — the de facto standard for text-based diagrams with wide tooling support, including native rendering in VS Code webviews via open-source libraries. This is the assumed default; the choice can be revisited post-MVP if a different format is preferred.
- Business documents use the same `.md` + YAML frontmatter format as handover nodes — no new file format is introduced; the `doc_type` field distinguishes them.
- The diagram decision matrix is defined as a rule file in the toolkit (`.handoff/toolkit/rules/diagram-methodology.md`) and is part of the existing toolkit rules pattern.
- Onboarding guides are always produced exactly once per session — there is no "multiple onboarding guides" scenario in scope.
- API Summary document type is defined in the catalogue for completeness but its generation trigger (an API endpoint or contract file) is deferred to a later iteration; for now, the agent produces it only if a clear API contract file exists (e.g., `openapi.yaml`, `schema.graphql`).
- The reading order in the onboarding guide follows the existing node depth ordering (core → supporting → peripheral), not a custom sequence; custom ordering is deferred.
- Diagram-to-code navigation requires that diagram element identifiers exactly match `code_refs` keys. The agent is responsible for consistent naming during generation.
- Business documents built for the same project increment reuse the same `generated_at_sha` from the `/handoff-start` session — they are part of the same snapshot.
