# Feature Specification: Dual-Tree Output (Business + Technical)

**Feature Branch**: `010-dual-tree-output`

**Created**: 2026-06-07

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Giver confirms the inferred tree structure before generation (Priority: P1)

A developer who owns the codebase runs the handoff toolkit. Before any nodes are written, the toolkit scans the project and proposes two trees: a business tree (domains inferred from folder names, route groups, model names) and a technical tree (services, APIs, data models, infrastructure — inferred from the stack). The toolkit presents both trees to the giver and asks: "Does this look right?" The giver can say yes, or adjust — merge two domains, rename a branch, add a domain the toolkit missed (e.g. "Third-Party Integrations").

**Why this priority**: The whole value of the dual-tree depends on the structure being correct. If the giver can't shape it, the output will be wrong and the receiver won't trust it. This is the foundation everything else rests on.

**Independent Test**: Can be tested end-to-end by running the toolkit against a sample codebase with known structure, verifying the proposed trees match expectations, adjusting one item, and confirming the adjustment is reflected before generation begins.

**Acceptance Scenarios**:

1. **Given** a codebase with an `auth/` folder, `user.model.ts`, and `/api/users` routes, **When** the toolkit scans for business domains, **Then** it proposes "User Management" as a business domain.
2. **Given** the toolkit has proposed both trees, **When** the giver says "Merge User Management and Admin into one", **Then** the toolkit merges them and presents the updated tree before proceeding.
3. **Given** the toolkit has proposed both trees, **When** the giver says "Add a Third-Party Integrations domain — Stripe, SendGrid, Twilio", **Then** the toolkit adds it to the business tree with the giver's description.
4. **Given** the giver confirms the trees, **When** generation begins, **Then** the node structure exactly matches the confirmed tree.

---

### User Story 2 — Receiver explores the project through the business tree (Priority: P2)

A new developer joins the team and wants to understand the product before touching code. They open the handoff in VS Code and navigate the business tree: `business > billing > subscription-model`. The node explains why subscriptions work the way they do, what the pricing tiers are, what the client's monetization strategy is, and what happens when a user downgrades. At the bottom of the node, they see "Related: payment-service, billing-routes" — clickable links that take them directly to the technical implementation.

**Why this priority**: The business tree is the primary new value. Technical documentation already exists in codebases; business context is what's always missing and what the toolkit is uniquely positioned to capture from the giver.

**Independent Test**: Can be tested by opening a completed handoff in VS Code, navigating the business branch, reading a leaf node, and following a cross-reference link to a technical node.

**Acceptance Scenarios**:

1. **Given** a completed handoff, **When** the receiver opens the sidebar, **Then** they see `business` and `technical` as the two top-level branches beneath `project-overview`.
2. **Given** the receiver opens `billing/subscription-model`, **When** they read the node, **Then** the Business Context explains the pricing strategy and rules, and the Technical Context lists the related technical nodes as links.
3. **Given** the receiver clicks a cross-reference link in a business node, **When** the link resolves, **Then** the corresponding technical node opens in the reader panel.

---

### User Story 3 — Receiver explores the project through the technical tree (Priority: P2)

A developer needs to modify the payment flow. They navigate the technical tree: `technical > services > payment-service`. The node gives a deep technical description of the service: its methods, dependencies, Stripe webhook flow, error handling, and idempotency strategy. At the top, a brief pointer: "Implements the billing subscription model — see billing/subscription-model for business rules." Code references link directly to the service file and key methods.

**Why this priority**: Same priority as the business tree — both paths need to be navigable for the dual-tree to deliver its value.

**Independent Test**: Can be tested by navigating the technical branch, opening a service node, verifying code references open the correct file and line, and following the back-reference to the corresponding business node.

**Acceptance Scenarios**:

1. **Given** a completed handoff, **When** the receiver opens `technical/services/payment-service`, **Then** the Technical Context contains a deep description of the service and the Business Context contains a pointer back to the relevant business node.
2. **Given** the node has `code_refs`, **When** the receiver clicks a code reference, **Then** the correct file opens at the correct line in their editor.
3. **Given** a technical node with a cross-reference to a business node, **When** the receiver follows it, **Then** the business node opens in the reader panel.

---

### User Story 4 — Giver fills in business context the toolkit cannot infer (Priority: P3)

After confirming the tree structure, the toolkit begins generation. For business nodes, it prompts the giver for context it cannot extract from code: why decisions were made, what business rules apply, what the client's strategy was, what warnings the next developer needs. For technical nodes, the toolkit drafts content from the code directly and the giver reviews and supplements.

**Why this priority**: The draft-and-review flow improves output quality significantly but is a secondary concern — the structure and cross-referencing are more fundamental.

**Independent Test**: Can be tested by running generation on a business node and verifying that the toolkit asks for business context before writing, then generates a complete node with both giver-supplied and code-derived content.

**Acceptance Scenarios**:

1. **Given** generation reaches a business leaf node, **When** the toolkit prompts for business context, **Then** it asks specifically for: why this domain exists, key business rules, decisions made, and warnings for the next developer.
2. **Given** generation reaches a technical node, **When** the toolkit writes the node, **Then** the Technical Context is derived from code analysis and the Business Context contains the pointer back to the relevant business node.
3. **Given** a business node with no code to reference, **When** the toolkit writes it, **Then** the `code_refs` field is absent (not empty).

---

### Edge Cases

- What happens when the toolkit cannot confidently infer any business domains (e.g., a utility library with no obvious domain structure)?
- What if the giver renames a business domain to a name that collides with an existing technical node ID?
- What if a business node lists a technical node ID in dependencies that doesn't exist in the confirmed tree?
- What happens to existing handoff output (pre-dual-tree) that uses `technical-overview` as a pinned root?
- What if the giver adds a business domain with no corresponding technical nodes?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The toolkit MUST scan the codebase and infer business domains before asking the giver to write any content.
- **FR-002**: The toolkit MUST scan the codebase and infer the technical structure (services, APIs, data models, infrastructure) before asking the giver to write any content.
- **FR-003**: The toolkit MUST present both proposed trees to the giver and wait for confirmation or adjustment before beginning node generation.
- **FR-004**: The giver MUST be able to merge domains, rename branches, add new domains, and remove proposed domains during the confirmation step.
- **FR-005**: The output MUST contain a single pinned root node `project-overview`, with `business` and `technical` as regular parent nodes beneath it.
- **FR-006**: Business nodes MUST document: what the domain does, why it exists, key business rules, decisions, and warnings. `code_refs` is optional for business nodes.
- **FR-007**: Technical nodes MUST document: how the code works, key methods and dependencies, decisions, and warnings. `code_refs` is required for technical leaf nodes.
- **FR-008**: Business nodes MUST list the IDs of the technical nodes that implement them in the `dependencies` field. Technical nodes MUST list the IDs of the business nodes they implement in the `dependencies` field.
- **FR-009**: The extension MUST render cross-references (dependencies) as clickable links that open the referenced node in the reader panel.
- **FR-010**: The toolkit MUST generate business nodes before technical nodes, prompting the giver for business context during business node generation.
- **FR-011**: The schema change removing `technical-overview` as a reserved pinned root MUST be backward-compatible — existing handoff outputs using `technical-overview` MUST continue to render without errors.

### Key Entities

- **Business Domain**: A grouping of functionality by business purpose (e.g., Billing, User Management). May have child domains and leaf nodes. No required `code_refs`.
- **Business Leaf Node**: A specific business capability within a domain (e.g., subscription-model, refund-policy). Contains the WHY — business rules, decisions, stakeholder context. Cross-references the technical nodes that implement it.
- **Technical Branch**: A grouping of nodes by code structure (services, api, data-model, infrastructure). Auto-detected from the stack.
- **Technical Leaf Node**: A specific implementation unit (e.g., payment-service, billing-routes). Contains the HOW — code structure, methods, error handling. Cross-references the business node it implements. Requires `code_refs`.
- **Cross-Reference**: A `dependencies` entry where a business node lists technical node IDs (or vice versa), rendered as a clickable link in the extension.
- **Proposed Tree**: The toolkit's pre-generation output — a structured map of both trees presented to the giver for confirmation before any node is written.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A receiver with no prior project context can identify the correct business domain for any feature within 2 minutes of opening the handoff.
- **SC-002**: Every technical leaf node has at least one cross-reference to a business node, and every business leaf node has at least one cross-reference to a technical node — verifiable by inspecting the `dependencies` field across all generated output.
- **SC-003**: The giver completes the tree confirmation step (review, adjust, approve) in a single interaction — no back-and-forth after confirmation required to restructure the tree.
- **SC-004**: Existing handoff outputs generated before this feature continue to render without errors after the schema change.
- **SC-005**: A receiver can navigate from any business leaf node to its implementing technical nodes (and back) using only in-extension links — no manual search required.

## Assumptions

- The handoff toolkit runs in an interactive session with the giver present — the tree confirmation step (US1) requires a human response before generation proceeds.
- `code_refs` was already made optional in feature 009; no additional schema change is needed for business nodes.
- The `parent` field and `dependencies` field already exist in the schema (feature 009); this feature builds on them without structural schema changes beyond removing `technical-overview` from the reserved pinned roots list.
- `technical-overview` will be removed from the list of reserved pinned roots in the extension, but any node with `id: technical-overview` in existing output will continue to render as a regular node — no migration script is required.
- The toolkit's business domain inference is a best-effort heuristic and the giver confirmation step (US1) is the safety valve — imperfect inference is acceptable as long as the giver can correct it.
- The number of business domains and technical sub-branches is bounded by what the toolkit can propose and the giver can review in a single sitting (assumed: 3–8 domains, 3–6 technical branches).
