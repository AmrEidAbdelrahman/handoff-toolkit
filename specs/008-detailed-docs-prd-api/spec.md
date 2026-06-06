# Feature Specification: Detailed Docs — PRD & API Reference

**Feature Branch**: `008-detailed-docs-prd-api`

**Created**: 2026-06-06

**Status**: Draft

**Input**: User description: "lets make the docs in more details, including a business specific documents like prd and a documentation for apis"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Business Stakeholder Reads PRD Node (Priority: P1)

A product manager, engineering manager, or non-technical stakeholder opens the Handoff reader
(or the generated Markdown) for a domain and finds a ready-made PRD-style section: the problem
being solved, the target users, the key capabilities (as user stories), the out-of-scope list,
and measurable success criteria — all generated from the actual codebase, not written by hand.

**Why this priority**: The core pain point is that existing handover nodes are developer-centric.
Providing a business-readable PRD layer unlocks Handoff as a tool for cross-functional alignment,
not just developer onboarding.

**Independent Test**: Can be fully tested by running `/handoff-start` on a single domain and
verifying the generated node contains a populated `## Product Brief` section whose content is
coherent with the domain's actual purpose.

**Acceptance Scenarios**:

1. **Given** a domain with at least one entry-point file (views, routes, handlers), **When** `/handoff-start` generates a node, **Then** the node contains a `## Product Brief` H2 section with at minimum: a one-paragraph problem statement, a target-user description, and a bulleted capability list.
2. **Given** a thin/peripheral domain with no clear user-facing behaviour, **When** the generator cannot infer a product narrative, **Then** the section is omitted rather than left empty or filled with placeholder text.
3. **Given** the generated node, **When** a non-technical stakeholder reads the `## Product Brief`, **Then** it contains no raw code identifiers, no internal module paths, and no implementation jargon.

---

### User Story 2 — Developer Reads API Reference Node (Priority: P1)

A developer new to the codebase opens the Handoff reader for a domain and finds a structured API
reference: each public endpoint or callable interface listed with its method/path (or function
signature), a plain-English description of what it does, its inputs/outputs, auth requirements,
and known error responses — all extracted from the real code.

**Why this priority**: API documentation is the highest-friction gap in existing handover docs.
Developers waste time grepping for endpoint definitions; a generated reference eliminates that.

**Independent Test**: Can be fully tested by running `/handoff-start` on a domain that exposes
HTTP endpoints or a public module interface and verifying that the generated API reference section
lists at least the endpoints/functions visible in the entry-point file.

**Acceptance Scenarios**:

1. **Given** a domain with discoverable HTTP endpoints (e.g., Django views, Express routes, Flask blueprints), **When** the generator processes the domain, **Then** the node contains an `## API Reference` H2 section listing each endpoint with: HTTP method, path, a one-sentence description, key request parameters, and key response fields.
2. **Given** a domain that is a pure internal library (no HTTP surface), **When** the generator processes it, **Then** the API reference lists the exported functions/classes with their signatures and a description instead of HTTP endpoints.
3. **Given** an endpoint that requires authentication, **When** it appears in the API reference, **Then** the entry notes the auth requirement (e.g., "Requires: authenticated user" or "Requires: JWT token").
4. **Given** a domain with more than 15 endpoints, **When** the API reference is generated, **Then** endpoints are grouped logically (by resource or tag) rather than listed as a flat unordered list.

---

### User Story 3 — Developer Navigates from API Reference to Live Code (Priority: P2)

A developer reads the API reference in the VS Code extension reader and clicks an endpoint entry.
The code pane jumps to the handler function that implements that endpoint, just as clicking a
snippet chip does today.

**Why this priority**: Navigation from doc to code is the core value proposition of the VS Code
reader. Extending it to API reference entries makes the new doc type first-class.

**Independent Test**: Can be fully tested by generating a node with API reference entries, opening
it in the VS Code extension, and verifying that each endpoint entry has a code_ref that navigates
to the correct handler line.

**Acceptance Scenarios**:

1. **Given** an API reference entry for an endpoint, **When** the user clicks the entry in the reader, **Then** the code pane shows the handler function with the correct line highlighted.
2. **Given** an endpoint whose handler file has been deleted or moved, **When** the user clicks the entry, **Then** the code pane shows a "file not found" error rather than crashing.

---

### User Story 4 — Reviewer Uses PRD to Validate Implementation Completeness (Priority: P3)

A tech lead or QA engineer uses `/handoff-review` to check whether the implemented domain
matches its stated PRD capabilities. The review surface now flags capabilities listed in the
`## Product Brief` that have no corresponding Technical Context coverage.

**Why this priority**: Closes the feedback loop between business requirements and implementation
documentation — useful but not blocking for initial delivery.

**Independent Test**: Can be fully tested by generating a node with a Product Brief, running
`/handoff-review`, and verifying the review output includes a "Product Brief coverage" section.

**Acceptance Scenarios**:

1. **Given** a node with a `## Product Brief` listing three capabilities, **When** `/handoff-review` runs, **Then** the review output includes a check for whether each capability has evidence in the Technical Context.
2. **Given** a capability with no matching technical evidence, **When** the review runs, **Then** it is flagged as a potential coverage gap, not a hard error.

---

### Edge Cases

- What happens when a domain has no public API surface (pure data models, migrations, configs)?
  → API Reference section is omitted; a one-line note ("No public API surface detected") is added
  to Technical Context instead.
- What happens when the generator cannot determine a product narrative with confidence?
  → Product Brief is omitted; the existing Business Context H2 is kept as the sole business-layer section.
- What happens when an endpoint has no docstring and a non-descriptive name (e.g., `view_12`)?
  → Generator uses the HTTP method + path as the description fallback and marks it with a low confidence note.
- How does the system handle an API with hundreds of endpoints?
  → Scope is limited to the domain's own entry-point file; endpoints in imported sub-routers are
  listed by name only (no full detail) with a note pointing to their own Handoff node.

## Requirements *(mandatory)*

### Functional Requirements

**Product Brief (PRD-style) section:**

- **FR-001**: The generator MUST produce a `## Product Brief` H2 section for domains where a user-facing product narrative can be confidently inferred from the codebase.
- **FR-002**: The `## Product Brief` MUST contain: (a) a problem-statement paragraph, (b) a target-user description, (c) a bulleted list of key capabilities expressed as user-facing outcomes, (d) an out-of-scope list, and (e) success indicators (measurable outcomes the domain is meant to achieve).
- **FR-003**: The `## Product Brief` MUST be written in plain English with no code identifiers, module paths, or technical jargon.
- **FR-004**: The generator MUST omit the `## Product Brief` section entirely (rather than producing placeholder text) when no confident narrative can be inferred.
- **FR-005**: The `## Product Brief` MUST be placed before `## Technical Context` in node ordering so it is read first by business stakeholders.

**API Reference section:**

- **FR-006**: The generator MUST produce an `## API Reference` H2 section for domains that expose a discoverable HTTP or programmatic interface.
- **FR-007**: Each HTTP endpoint entry MUST include: HTTP method, full path, a one-sentence plain-English description, key request parameters (name, type, required/optional), key response fields (name, type), and auth requirements.
- **FR-008**: Each non-HTTP public function/class entry MUST include: name, signature (parameter names and types in language-agnostic notation), a one-sentence description, and return type.
- **FR-009**: The generator MUST omit the `## API Reference` section when no public interface is detected.
- **FR-010**: Endpoints with a shared authentication or base path pattern MUST be grouped under a sub-heading rather than listed flat.
- **FR-011**: Each API reference entry MUST carry a `code_ref` pointing to the handler/function definition so the VS Code extension can navigate to it.
- **FR-012**: The generator MUST limit detailed coverage to the domain's own entry-point file; endpoints in imported sub-routers are summarised by name with a reference to their own node.

**Schema & output:**

- **FR-013**: Both `product_brief` and `api_reference` MUST be valid doc_types recognised by the output schema, quality rubric, handoff-review, and the VS Code extension's node parser.
- **FR-014**: A node MAY contain both, one, or neither of these new sections depending on what the domain's code supports.
- **FR-015**: The existing four mandatory H2 sections (Business Context, Technical Context, Decisions, Warnings) remain unchanged; the new sections are additive.

### Key Entities

- **ProductBrief**: A structured business narrative tied to one domain node. Attributes: problem statement, target users, capability list, out-of-scope list, success indicators.
- **ApiEntry**: One endpoint or callable interface. Attributes: type (http | function | class), method (for http), path/name, description, parameters, response/return, auth requirement, code_ref.
- **ApiReference**: A collection of ApiEntry items for one domain node, optionally grouped by resource or tag.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer new to the codebase can identify all public endpoints of a domain within 2 minutes of opening its node in the reader, without opening any source file.
- **SC-002**: A non-technical stakeholder can read the `## Product Brief` and accurately describe the domain's purpose and target users without assistance (verified by informal review).
- **SC-003**: 100% of `## API Reference` entries link to a navigable code location in the VS Code extension (no broken code_refs for existing files).
- **SC-004**: The generator produces a `## Product Brief` for at least 80% of domains that have an identifiable user-facing entry point.
- **SC-005**: Running `/handoff-start` on the Kershless backend (competition/, users/, social/ domains) produces at least one `## Product Brief` and one `## API Reference` in the generated nodes, verifiable in-session.

## Assumptions

- The primary target codebase has discoverable API surfaces: HTTP routes registered in a central file (Django `urls.py`, Express `router.js`, Flask blueprints, etc.) or exported module interfaces.
- The generator runs in a session with read access to the full domain source, not just the entry-point file.
- The `## Product Brief` replaces or subsumes the existing `## Business Context` section in intent but not in structure — both coexist; Business Context remains the short mandatory section, Product Brief is the richer optional expansion.
- The out-of-scope list in the Product Brief is inferred from what the domain does NOT handle (based on what neighbouring domains or missing patterns suggest), not hand-authored.
- Mobile-specific or GraphQL-specific API formats are out of scope for v1; REST/HTTP and function-call interfaces are the primary targets.
- The VS Code extension reader already handles `code_refs` correctly (shipped in feature 007/commit a74c203); this feature adds more entries, not a new navigation mechanism.
