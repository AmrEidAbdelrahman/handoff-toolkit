# Feature Specification: Coverage Gaps — The Sections Receivers Most Want

**Feature Branch**: `005-coverage-gaps`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User feedback — the things a new owner asks in week one that the current node shape doesn't capture.

## Context

Features 001–004 made Handoff documentation business-first, trustworthy, and verifiable. But real handovers still miss the operational questions a new owner asks in their first week: *What environment variables do I need? What external services does this talk to and how do they fail? How do I run the tests? What does this jargon mean? What are the actual fields on this model?* This feature adds five coverage sections that close those gaps. Each is independently valuable; together they turn a readable handover into an operable one.

## User Scenarios & Testing

### User Story 1 — Config & Environment Reference Node (Priority: P1)

A new owner needs to stand up the project locally. Instead of grepping the codebase for `process.env` and `os.environ`, they open a single **Config & Environment Reference** node that lists every environment variable: what it does, whether it is required or optional, its default, and which domain uses it.

**Why this priority**: Missing configuration is consistently the #1 thing handovers omit — without it, a receiver cannot even start the application. It is a single consolidated node, generated once, with the highest value-to-effort ratio.

**Independent Test**: Run `/handoff-start` on a project that reads environment variables. Confirm a single `config-reference` node exists, listing each env var with name, purpose, required/optional, default, and consuming domain.

**Acceptance Scenarios**:

1. **Given** a project that reads environment variables from `process.env.*`, `os.environ`, settings files, `.env.example`, or `docker-compose`, **When** `/handoff-start` completes, **Then** exactly one node with `doc_type: config_reference` exists in the output.
2. **Given** the config reference node, **When** a receiver opens it, **Then** each environment variable appears as a row showing: variable name, one-line purpose, required vs optional, default value (or "none"), and which domain(s) consume it.
3. **Given** an env var that has a default in code but no `.env.example` entry, **When** the node is generated, **Then** the variable is marked optional with its default recorded.
4. **Given** an env var read in code with no default and no documentation, **When** the node is generated, **Then** the variable is marked required with default "none" and its purpose inferred from its name and usage site (citation applied per feature 004).
5. **Given** a project that reads zero environment variables, **When** `/handoff-start` completes, **Then** no config reference node is produced (the node is conditional, like API Summary).

---

### User Story 2 — Dependencies & Integrations per Domain (Priority: P2)

A receiver maintaining a domain needs to know what external systems it depends on. Each domain node gains a **Dependencies & Integrations** subsection listing the external services that domain talks to — third-party APIs, databases, queues, caches — and how each one fails.

**Why this priority**: P2 because it is per-domain enrichment rather than a blocking gap. It matters most when a receiver is debugging a production incident, which is the second-week question after "how do I run it".

**Independent Test**: Run `/handoff-start` on a domain that imports an SDK client or opens a connection. Confirm that domain's node has a Dependencies & Integrations subsection naming the external service and its failure mode.

**Acceptance Scenarios**:

1. **Given** a domain whose code imports a third-party SDK client (e.g., a payment, email, or storage SDK), **When** its node is generated, **Then** the node lists that service under Dependencies & Integrations.
2. **Given** a domain that opens a database, queue, or cache connection (connection string, broker topic, cache client), **When** its node is generated, **Then** that backing service is listed with the integration type (database / queue / cache).
3. **Given** a listed external dependency, **When** a receiver reads the entry, **Then** it includes a one-line failure mode (what breaks for users if that service is unavailable).
4. **Given** a domain with no external dependencies, **When** its node is generated, **Then** the Dependencies & Integrations subsection is omitted (not left empty).

---

### User Story 3 — Testing Guide per Domain (Priority: P2)

A receiver about to change a domain needs to know how to verify the change. Each domain node gains a **Testing** subsection: which test files cover the domain, the command to run them, and any fixtures or seed data required.

**Why this priority**: P2 because it enables safe change, not just reading. A receiver who cannot run the tests cannot confidently modify the code — but they can still understand it, so it ranks below the config blocker.

**Independent Test**: Run `/handoff-start` on a domain that has test files. Confirm the node's Testing subsection names the covering test files, the run command, and any fixtures.

**Acceptance Scenarios**:

1. **Given** a domain with test files (under `tests/`, `__tests__/`, or matching `*_test.*` / `*.test.*` / `test_*.*`), **When** its node is generated, **Then** the Testing subsection lists the test files that cover this domain.
2. **Given** a project with a test command in `Makefile`, `package.json` scripts, or an equivalent task runner, **When** a domain node is generated, **Then** the Testing subsection includes the command to run that domain's tests.
3. **Given** a domain whose tests rely on fixtures, factories, or seed data, **When** the node is generated, **Then** the Testing subsection notes the fixtures/seeds required.
4. **Given** a domain with no discoverable test files, **When** its node is generated, **Then** the Testing subsection states that no tests were found for this domain (rather than being omitted) so the gap is visible.

---

### User Story 4 — Glossary / Ubiquitous Language Node (Priority: P3)

A new team member burns days decoding domain jargon. A single **Glossary** node extracts the recurring domain terms — model names, recurring nouns in routes and comments — and gives each a one-line definition.

**Why this priority**: P3 because it accelerates comprehension but is not blocking — a receiver can infer terms from context, just more slowly. Still high-value for onboarding speed.

**Independent Test**: Run `/handoff-start` on a project with domain-specific model names. Confirm a `glossary` node exists with those terms and one-line definitions.

**Acceptance Scenarios**:

1. **Given** a project with domain model/entity names and recurring nouns in routes and comments, **When** `/handoff-start` completes, **Then** exactly one node with `doc_type: glossary` exists.
2. **Given** the glossary node, **When** a receiver opens it, **Then** each term has a one-line definition derived from its model fields, usage, or surrounding comments (citation applied per feature 004).
3. **Given** terms that span multiple domains, **When** the glossary is built, **Then** each term is defined once and notes which domain(s) it belongs to.
4. **Given** a very small project with fewer than 3 distinct domain terms, **When** `/handoff-start` completes, **Then** the glossary node is omitted (not worth a standalone node).

---

### User Story 5 — Richer Data-Model Documentation (Priority: P3)

A receiver working with the data layer needs field-level detail, not a box-level diagram. The data-layer node's entity-relationship diagram and prose are enriched with actual fields, types, foreign keys, unique constraints, and notable indexes or migrations.

**Why this priority**: P3 because the existing `erDiagram` path already produces a usable box-level diagram; this deepens it. Valuable but additive to an existing capability rather than a missing one.

**Independent Test**: Run `/handoff-start` on a project with a data model. Confirm the data-layer node's ER diagram shows fields with types and the prose lists FKs, unique constraints, and notable indexes.

**Acceptance Scenarios**:

1. **Given** a domain that defines data models/entities, **When** its node's ER diagram is generated, **Then** each entity box lists its actual fields with their types (field-level, not just entity names).
2. **Given** entities with relationships, **When** the ER diagram is generated, **Then** foreign-key relationships are shown with the correct cardinality between the related entities.
3. **Given** entities with unique constraints or notable indexes, **When** the node is generated, **Then** the Technical Context prose names those constraints and indexes.
4. **Given** a project with database migrations, **When** the data-layer node is generated, **Then** notable schema-shaping migrations (table creation, significant alterations) are referenced.
5. **Given** an entity with more than 15 fields, **When** the ER diagram is generated, **Then** the diagram shows the most significant fields (keys, FKs, and business-critical columns) and the prose notes the total field count.

---

### Edge Cases

- What if an env var is referenced under different names across services (alias or rename)? List each name with a note that they refer to the same setting.
- What if a secret-looking env var (e.g., `*_SECRET`, `*_KEY`, `*_PASSWORD`) is found? List the variable name and purpose but never quote any literal value — mark it as sensitive.
- What if an external dependency is imported but never actually invoked (dead import)? Omit it from Dependencies & Integrations to avoid false signals.
- What if a domain's tests live in a central `tests/` tree mirroring the source layout rather than beside the code? Map test files to domains by path correspondence and by the symbols they import.
- What if a glossary term collides with a common English word (e.g., "Match", "Order")? Define it in the project's specific sense and note the domain to disambiguate.
- What if the data model is defined in a schema file (SQL DDL, ORM models, migration files) rather than inline? Read the schema source to extract field-level detail.
- What if there is no data layer at all (a stateless service)? Omit the richer data-model enrichment; no data-layer node is forced.

## Requirements

### Functional Requirements

- **FR-001**: The skill MUST produce a single node with `doc_type: config_reference` when the project reads any environment variables, and MUST omit it when none are found. The node is generated once per session, like the API Summary.
- **FR-002**: The config reference node MUST list each environment variable with: name, one-line purpose, required-vs-optional classification, default value (or "none"), and the consuming domain(s). Sources mined MUST include in-code reads (`process.env.*`, `os.environ`, equivalent), settings/config files, `.env.example`, and `docker-compose` configuration.
- **FR-003**: The config reference node MUST NOT quote any literal secret value. Variables whose names indicate secrets (containing `SECRET`, `KEY`, `PASSWORD`, `TOKEN`, or similar) MUST be marked sensitive with their purpose described but no value shown.
- **FR-004**: Each domain node MUST include a Dependencies & Integrations subsection when the domain communicates with an external service (third-party API, database, queue, or cache), and MUST omit the subsection when there are none. Each listed dependency MUST include the integration type and a one-line failure mode.
- **FR-005**: External-dependency detection MUST draw on imported SDK clients, base URLs, connection strings, and broker topics. Dead imports (imported but never invoked) MUST be excluded.
- **FR-006**: Each domain node MUST include a Testing subsection naming the test files that cover the domain, the command to run them, and any required fixtures or seed data. When no tests cover the domain, the subsection MUST state that explicitly rather than being omitted.
- **FR-007**: Test discovery MUST draw on conventional test locations and patterns (`tests/`, `__tests__/`, `*_test.*`, `*.test.*`, `test_*.*`) and test commands from `Makefile`, `package.json` scripts, or an equivalent task runner.
- **FR-008**: The skill MUST produce a single node with `doc_type: glossary` when the project has at least 3 distinct domain terms, and MUST omit it otherwise. Each term MUST have a one-line definition and note its domain(s).
- **FR-009**: Glossary terms MUST be extracted from model/entity names and recurring nouns in routes and comments. Each term is defined once even if it spans multiple domains.
- **FR-010**: The data-layer node's entity-relationship diagram MUST show entity fields with their types (field-level), and the node's prose MUST list foreign keys, unique constraints, and notable indexes. Notable schema-shaping migrations MUST be referenced when migrations exist.
- **FR-011**: For an entity with more than 15 fields, the ER diagram MUST show the most significant fields (keys, foreign keys, business-critical columns) and the prose MUST note the total field count.
- **FR-012**: All new nodes and subsections MUST comply with the existing output schema (`schema_version: 1`) and the feature 004 trust mechanisms — inferred claims carry `(src: …)` citations, new nodes carry `quality_score`, and inferred fields carry `confidence_tags`.
- **FR-013**: The two new node types (`config_reference`, `glossary`) MUST be defined as typed documents with their own body-section requirements, validated like the existing typed documents (ADR, runbook, etc.).
- **FR-014**: The output index ordering and `index.md` MUST place the new consolidated nodes (config reference, glossary) among the business documents, not among the domain nodes.

### Key Entities

- **Config & Environment Reference Node**: A typed node (`doc_type: config_reference`) consolidating every environment variable with purpose, required/optional, default, consuming domain, and sensitivity flag.
- **Environment Variable Entry**: One row in the config reference — name, purpose, required/optional, default, consuming domain(s), sensitive flag.
- **External Dependency**: A service a domain talks to — type (api / database / queue / cache), identity (SDK/service name), and failure mode.
- **Testing Subsection**: Per-domain — covering test files, run command, required fixtures/seeds.
- **Glossary Node**: A typed node (`doc_type: glossary`) of domain terms, each with a one-line definition and owning domain(s).
- **Glossary Term**: A domain word — the term, its one-line definition, and the domain(s) it belongs to.
- **Data-Model Field Detail**: Per-entity field list with types, plus foreign keys, unique constraints, notable indexes, and schema-shaping migrations.

## Success Criteria

### Measurable Outcomes

- **SC-001**: For a project that reads environment variables, the output contains exactly one config reference node, and a receiver can list every variable required to start the project without reading any source file.
- **SC-002**: Zero literal secret values appear anywhere in the generated output; every sensitive variable is marked but unquoted.
- **SC-003**: For every domain that talks to an external service, the domain node names that service and its failure mode; domains with no external services have no Dependencies & Integrations subsection.
- **SC-004**: For every domain with tests, a receiver can find and run that domain's tests using only the Testing subsection; domains without tests say so explicitly.
- **SC-005**: A new team member can resolve the meaning of at least 5 project-specific terms from the glossary node within 5 minutes, without opening source files.
- **SC-006**: The data-layer node's ER diagram shows field-level detail (fields with types) for its entities, and the prose lists foreign keys and unique constraints.
- **SC-007**: All new nodes pass schema validation and carry the feature 004 trust fields (`quality_score`, citations on inferred claims, `confidence_tags`).

## Assumptions

- The Handoff toolkit skill and rule files are the only deliverables — no VS Code extension changes are in scope.
- The Kershless Django project (`/home/amreid/Kershless-backend-app`) is the primary dogfood target; the env/config and data-model mining is tuned to be framework-agnostic but validated there first.
- `schema_version` remains 1; the two new `doc_type` values (`config_reference`, `glossary`) and the new domain-node subsections are additive and backward-compatible.
- The config reference and glossary are consolidated (one each per project), generated like the API Summary; Dependencies & Integrations and Testing are per-domain subsections within existing domain nodes.
- Feature 004 trust mechanisms (citations, quality pass, confidence tags) apply to all new content without modification to their rules.
- "Notable" indexes and migrations means schema-shaping ones (table/column creation, constraint changes), not every incremental migration — the skill exercises judgement on which to surface.
