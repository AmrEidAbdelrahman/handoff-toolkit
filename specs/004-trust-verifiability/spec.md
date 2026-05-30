# Feature Specification: Trust & Verifiability in Autonomous Documentation

**Feature Branch**: `004-trust-verifiability`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: Theme A — Trust & verifiability. Two-pass quality refinement, claim provenance citations, and confidence tagging for AI-generated handoff documentation.

## Context

The primary risk with fully autonomous documentation is that receivers distrust what the AI inferred. When a receiver cannot tell whether a claim in a node came from explicit code comments, README prose, or pure naming guesswork, they default to low trust — and the documentation loses its value as a handover tool. This feature introduces three mechanisms that transform AI-generated nodes from unverifiable assertions into evidence-backed, human-reviewable outputs.

## User Scenarios & Testing

### User Story 1 — Two-Pass Quality Refinement (Priority: P1)

A developer receiving a handover opens a domain node and finds the Business Context clearly explains the business value the domain delivers (not just what the code does), with concrete "why" explanations rather than structural descriptions. The Technical Context includes actionable observations, not just file lists.

**Why this priority**: Every node goes through this pass. It is the highest-leverage change — one additional self-critique step applied to all nodes raises the floor on doc quality more than any additive section.

**Independent Test**: Generate documentation on a project with at least 3 domains. Inspect each node's Business Context against the rubric dimensions. Every dimension must score ≥ 1. Any dimension that scored 0 at draft time must have been rewritten before the node was saved.

**Acceptance Scenarios**:

1. **Given** a drafted node whose Business Context describes only file structure with no user-facing value statement, **When** the quality pass runs, **Then** the Business Context is rewritten to include at least one sentence explaining what breaks for users if this domain stops working.
2. **Given** a node with an unsupported claim (e.g., "this module is the most critical part of the system"), **When** the quality pass runs, **Then** the unsupported claim is either removed or replaced with a claim that can be traced to a source signal.
3. **Given** a node that already scores ≥ 1 on all rubric dimensions, **When** the quality pass runs, **Then** the node is saved as-is without modification (no unnecessary rewrites).
4. **Given** any generated node file, **When** a reader opens it, **Then** a `quality_score` frontmatter field is present showing the per-dimension scores from the quality pass.

---

### User Story 2 — Claim Provenance Citations (Priority: P1)

A developer reading a handover node wants to verify a claim about the system. They see a citation marker `(src: README §Architecture)` inline and can immediately open that file/section to confirm the claim is accurate. Receivers can audit rather than trust.

**Why this priority**: Citations directly address the trust gap for receivers. Without them, every sentence in Business Context and Decisions is an unverifiable assertion — receivers have no way to know if the AI hallucinated or read it from the code.

**Independent Test**: Generate documentation on a project. Open any domain node. Every sentence in `## Business Context`, `## Decisions`, and `## Warnings` must end with a `(src: …)` citation. The cited file/section must exist in the project.

**Acceptance Scenarios**:

1. **Given** a generated node's Business Context section, **When** a receiver reads it, **Then** every sentence that was inferred from code ends with a citation in the format `(src: <source-identifier>)` where source-identifier is a readable pointer to the evidence.
2. **Given** a sentence derived from the README, **When** the citation is rendered, **Then** the citation reads `(src: README §<section-name>)` pointing to the specific section.
3. **Given** a sentence inferred from a source file, **When** the citation is rendered, **Then** the citation reads `(src: <relative-path>:<line-number>)` pointing to the specific line.
4. **Given** a sentence inferred from a git commit message, **When** the citation is rendered, **Then** the citation reads `(src: commit <short-sha>)`.
5. **Given** a sentence that cannot be traced to any specific signal (a fallback inference), **When** it is written, **Then** it is marked `(src: inferred)` and added to `inferred_fields` for human review.

---

### User Story 3 — Confidence Tagging (Priority: P2)

A developer running `/handoff-review` wants to spend their review time on the inferences most likely to be wrong. Instead of reviewing all nodes in index order, `/handoff-review` surfaces the lowest-confidence inferences first — so human attention is directed where it matters most.

**Why this priority**: P2 because the trust gap is already addressed by US1 and US2. Confidence tagging is an efficiency improvement on top of that — it makes the review phase smarter, not just the generation phase.

**Independent Test**: Generate documentation on a project where at least one field was inferred purely from directory/file names (no README or comment support). Run `/handoff-review`. Confirm that the field carries `low` confidence and appears before high-confidence fields in the review queue.

**Acceptance Scenarios**:

1. **Given** a node field inferred from an explicit README heading or source comment, **When** the node is saved, **Then** that field is tagged `confidence: high`.
2. **Given** a node field inferred only from directory or file names with no corroborating documentation, **When** the node is saved, **Then** that field is tagged `confidence: low`.
3. **Given** a node field inferred from route registrations, model names, or import patterns (no explicit comment or README), **When** the node is saved, **Then** that field is tagged `confidence: medium`.
4. **Given** a `/handoff-review` session with a mix of high, medium, and low confidence inferences, **When** the walkthrough begins, **Then** `low` confidence fields are presented first, followed by `medium`, then `high`.
5. **Given** a field confirmed by the giver during `/handoff-review`, **When** confirmation is recorded, **Then** the confidence tag is removed and the field is removed from `inferred_fields`.

---

### Edge Cases

- What if the quality rubric scores every dimension ≥ 1 but the node is still clearly poor (e.g., repetitive or padded)? The rubric catches the worst cases; subjective quality beyond the five dimensions is left for `/handoff-review`.
- What if no source signal is identifiable for a claim? Mark it `(src: inferred)` and include it in `inferred_fields` — never omit the citation, never fabricate a source.
- What if a project has no README and no comments (pure code signals only)? All fields default to `confidence: medium` or `low`; none can be `high` without explicit documentation.
- What if a node passes the quality pass on the first draft? Skip the rewrite — only rewrite dimensions scoring 0, not the whole node.
- What if a citation points to a line number that shifts after a commit? Citations are recorded at generation time and stamped with the `generated_at_sha`; staleness is handled by the existing delta re-run mechanism.
- What if there are 20 low-confidence fields across many nodes? `/handoff-review` pages them in groups; the queue is sorted by confidence within each session.

## Requirements

### Functional Requirements

- **FR-001**: After a node is assembled (Step 5.3), the documentation skill MUST evaluate the node against a five-dimension quality rubric before saving. Each dimension is scored 0–2. Any dimension scoring 0 MUST trigger a targeted rewrite of the failing section. The rewritten section replaces the original before the node is saved.
- **FR-002**: The five rubric dimensions are: (1) business-value clarity — does Business Context explain user-facing impact; (2) "why" coverage — are decisions and design choices explained with reasoning; (3) snippet relevance — do inline code snippets illustrate the domain's core logic, not boilerplate; (4) actionability — can a receiver take a concrete next step based on what they read; (5) no-unsupported-claims — every assertion is traceable to a source signal.
- **FR-003**: A `quality_score` frontmatter field MUST be written to each generated node showing the per-dimension scores in the format `{dimension: score}` after the quality pass completes.
- **FR-004**: Every sentence written in `## Business Context`, `## Decisions`, and `## Warnings` sections that was inferred from code signals MUST include a trailing citation in the form `(src: <source-identifier>)`.
- **FR-005**: The citation format for source identifiers MUST follow these conventions: README section → `README §<section>`; source file line → `<relative-path>:<line>`; git commit → `commit <short-sha>`; fallback (no specific source) → `inferred`.
- **FR-006**: The documentation skill MUST record the source signal alongside each claim at the time of inference (Steps 3.3, 3.5, 3.6) and carry that signal through to the rendered citation in the node body.
- **FR-007**: Each inferred field MUST be tagged with a confidence level: `high` (explicit README heading, source comment, or docstring), `medium` (inferred from routes, model names, or import patterns), or `low` (inferred solely from directory or file names).
- **FR-008**: The confidence level for each inferred field MUST be stored in node frontmatter under `confidence_tags` as a map of `{field_name: level}`.
- **FR-009**: The `/handoff-review` skill MUST sort the review queue so that nodes/fields with `low` confidence appear first, then `medium`, then `high`. Within each confidence tier, the existing index order (core → supporting → peripheral) is preserved.
- **FR-010**: When a giver confirms a field during `/handoff-review`, the corresponding `confidence_tags` entry for that field MUST be removed from the frontmatter.
- **FR-011**: The quality rubric MUST be defined in a standalone rules file (`rules/quality-rubric.md`) that the documentation skill reads before executing the quality pass. The rubric must be independently updatable without changing the skill logic.
- **FR-012**: The quality pass and citations MUST apply to all node types: `handover_node`, `adr`, `runbook`, `onboarding_guide`, `api_summary`. The architecture-overview node is also included.

### Key Entities

- **Quality Rubric**: A set of five scored dimensions applied to each node after draft assembly. Defined in `rules/quality-rubric.md`. Scores are 0 (failing — must rewrite), 1 (acceptable), or 2 (exemplary).
- **Citation**: An inline `(src: <source-identifier>)` marker appended to inferred sentences in Business Context, Decisions, and Warnings. Never fabricated; always traceable to a real signal or marked `(src: inferred)`.
- **Confidence Tag**: A per-field label (`high` / `medium` / `low`) stored in frontmatter `confidence_tags`. Removed on giver confirmation.
- **Source Signal**: The evidence the AI used to infer a claim — a README section, a file + line number, a commit SHA, or an implicit naming inference.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every generated node file contains a `quality_score` frontmatter field, and no dimension in that score is 0 (all dimensions were at least 1 at save time).
- **SC-002**: Every sentence in `## Business Context`, `## Decisions`, and `## Warnings` in a generated node ends with a `(src: …)` citation. Zero unattributed sentences in those sections.
- **SC-003**: A receiver unfamiliar with the project can verify at least 3 specific claims in a node within 5 minutes by following the citation markers to the source files.
- **SC-004**: Running `/handoff-review` on output with mixed-confidence fields presents all `low`-confidence fields before any `medium` or `high`-confidence fields in the review queue.
- **SC-005**: After a giver confirms all fields for a node, the node's `confidence_tags` frontmatter field is absent or empty, and `inferred_fields` is empty.
- **SC-006**: The quality rubric is defined in `rules/quality-rubric.md` and can be edited independently without requiring changes to the documentation skill file.

## Assumptions

- The Handoff toolkit skill files are the primary deliverable — no VS Code extension changes are in scope for this feature.
- The Kershless Django project (`/home/amreid/Kershless-backend-app`) is the primary dogfood test target.
- `schema_version` remains at 1; the new frontmatter fields (`quality_score`, `confidence_tags`) are additive and backward-compatible.
- The quality pass runs in memory — it does not require re-reading source files, only the assembled node text.
- Citations are generated at documentation time (not validated at read time) — citation accuracy degrades with code churn, which is expected and handled by the delta re-run mechanism.
- The confidence-tagging rule is deterministic and applied at inference time (not post-hoc) — the same signal always produces the same confidence level.
- The `/handoff-review` sort-by-confidence change is additive: the existing node-by-node walkthrough loop is preserved; only the ordering of the queue changes.
