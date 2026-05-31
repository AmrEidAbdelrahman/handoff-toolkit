# Feature Specification: Narrative Navigation & Git-History Risk Surfacing

**Feature Branch**: `006-narrative-git-insight`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User feedback — Theme C (narrative & navigation) and Theme D (risk surfacing from git history).

## Context

Features 001–005 made Handoff documentation business-first, trustworthy, verifiable, and operationally complete. Two gaps remain. **Narrative & navigation**: the output is still a set of flat, siloed nodes — there is no end-to-end story of how a request flows across domains, no fast skim path, and no clickable links between related nodes or to source. **Risk surfacing**: the toolkit already records the generation SHA and reads commit messages, but barely uses git — the single richest source of "where the bodies are buried" knowledge (churn hotspots, single-author files, hard-won fixes recorded in commit messages) goes uncaptured. This feature closes both: it adds a cross-domain flow narrative, progressive disclosure, real hyperlinks, and three forms of git-derived risk insight.

## User Scenarios & Testing

### User Story 1 — Critical-Flow Sequence Diagrams (Priority: P1)

A receiver opens the architecture overview and sees 2–3 end-to-end sequence diagrams tracing the system's core user journeys (e.g., "user places order": route → service → model → external call → response) across domain boundaries. In one diagram they understand how the system actually works as a whole, not domain by domain.

**Why this priority**: An end-to-end cross-domain trace is the single most illuminating artifact in a handover. Today sequence diagrams are optional and per-section, so cross-cutting flows are never drawn — this is the biggest narrative gap.

**Independent Test**: Run `/handoff-start` on a multi-domain project with clear entry points. Confirm the architecture overview node contains 2–3 `sequenceDiagram` blocks, each tracing one critical flow across at least two domains.

**Acceptance Scenarios**:

1. **Given** a project with identifiable request entry points (routes, handlers, CLI commands), **When** `/handoff-start` completes, **Then** the architecture overview node contains between 1 and 3 critical-flow sequence diagrams.
2. **Given** a critical flow that starts at a route and calls a service, a model, and an external dependency, **When** its sequence diagram is generated, **Then** the diagram shows the ordered participants (entry point → service → data layer → external call → response) crossing the domains involved.
3. **Given** a chosen flow, **When** the diagram is drawn, **Then** it is accompanied by a one-sentence description naming the user journey it traces (e.g., "User places an order").
4. **Given** a project with no discernible end-to-end flow (e.g., a pure library), **When** `/handoff-start` completes, **Then** no critical-flow diagrams are forced and the architecture overview omits the section.

---

### User Story 2 — Hotspot / Fragility Analysis (Priority: P1)

A receiver about to make changes sees, in each domain's Warnings, the files that are most likely to break — the high-churn, high-complexity files where past changes clustered. They know which code to touch carefully before they touch anything.

**Why this priority**: This is the "where the bodies are buried" insight every departing developer wishes they had left. It is derivable entirely from data the toolkit already has access to (git history + file size/complexity) and directly prevents the receiver from breaking fragile code.

**Independent Test**: Run `/handoff-start` on a project with git history. Confirm that files ranking high on churn × complexity appear as "fragile — change carefully" warnings in the relevant domain nodes, each with a churn figure.

**Acceptance Scenarios**:

1. **Given** a project with git history, **When** `/handoff-start` analyses it, **Then** files are ranked by churn (commit count touching the file) combined with size/complexity, and the top-ranked files are surfaced.
2. **Given** a high-churn, high-complexity file in a domain, **When** that domain's node is generated, **Then** a Warnings bullet flags the file as "fragile — change carefully" with its churn count and a citation to the evidence.
3. **Given** a file that is high-churn but trivial (e.g., a config or version file), **When** ranking is applied, **Then** it is not flagged as fragile (low complexity excludes it).
4. **Given** a project with no git history, **When** `/handoff-start` runs, **Then** hotspot analysis is skipped without error.

---

### User Story 3 — Progressive Disclosure (TL;DR First) (Priority: P2)

A receiver skims the whole handover in minutes: every node's Technical Context opens with a 1–2 sentence TL;DR before the detailed paragraphs. They read the TL;DRs first to build a map, then drill into the nodes that matter.

**Why this priority**: P2 because it is a cheap, universal readability win layered on existing content. High skim value, but the underlying detail already exists — this reorders and summarizes rather than adding new information.

**Independent Test**: Open any generated node. Confirm `## Technical Context` begins with a clearly marked 1–2 sentence TL;DR, followed by the detailed paragraphs.

**Acceptance Scenarios**:

1. **Given** any generated node with a Technical Context section, **When** a receiver opens it, **Then** the section's first content is a 1–2 sentence TL;DR summarizing what the domain does technically, visually distinct from the detail that follows.
2. **Given** the TL;DR, **When** a receiver reads only the TL;DRs across all nodes, **Then** they form a coherent skim of the whole system.
3. **Given** the detailed paragraphs, **When** they follow the TL;DR, **Then** the TL;DR does not merely duplicate the first detail sentence — it abstracts the whole section.

---

### User Story 4 — Cross-Links & Source Permalinks (Priority: P2)

A receiver navigates the handover like a map: related nodes are hyperlinked to each other, and every inline code-snippet label is a clickable permalink to the exact source lines at the documented commit. They jump from a domain to its dependency, or from a snippet straight to the file on the repository host.

**Why this priority**: P2 because it turns existing data (dependencies, doc_refs, recorded SHA) into navigation. High value for usability, but additive to content already present.

**Independent Test**: Open a node in a Markdown viewer. Confirm related-node references are clickable links to the other node files, and inline-snippet labels are clickable permalinks of the form `…/blob/<sha>/path#L<start>-L<end>`.

**Acceptance Scenarios**:

1. **Given** a node with `dependencies` or `doc_refs`, **When** the node is generated, **Then** those related nodes appear as clickable Markdown links to the corresponding node files.
2. **Given** an inline code snippet with a recorded file path and line range, **When** the node is generated and a repository host URL is known, **Then** the snippet's label is a clickable permalink to `<host>/blob/<sha>/<path>#L<start>-L<end>` using the documented commit SHA.
3. **Given** a project whose repository host URL cannot be determined (no remote, or unsupported host), **When** snippets are rendered, **Then** the labels degrade gracefully to the existing plain `path lines N–M` form with no broken links.
4. **Given** the recorded generation SHA, **When** permalinks are built, **Then** they pin to that SHA (not a branch name) so the linked lines remain stable.

---

### User Story 5 — Bus-Factor / Ownership (Priority: P2)

A receiver learns who to ask. Each domain notes its de facto owner (the dominant author by commit count) and flags single-author files where knowledge is concentrated in one person — or where that person has already left.

**Why this priority**: P2 because it answers "who do I talk to" — valuable for onboarding but not blocking comprehension of the code itself.

**Independent Test**: Run `/handoff-start` on a project with multi-author git history. Confirm each domain node notes the dominant author and flags single-author files.

**Acceptance Scenarios**:

1. **Given** a domain's files with git authorship history, **When** the node is generated, **Then** it names the de facto owner (the author with the most commits to the domain's files).
2. **Given** a file changed by exactly one author, **When** the node is generated, **Then** that file is flagged as a single-author / bus-factor-1 risk.
3. **Given** a `CODEOWNERS` file exists, **When** ownership is determined, **Then** the declared owner from `CODEOWNERS` is used and noted alongside the git-derived owner.
4. **Given** a project with no git history and no `CODEOWNERS`, **When** `/handoff-start` runs, **Then** ownership notes are skipped without error.

---

### User Story 6 — Tribal-Knowledge Mining (Priority: P2)

A receiver sees the hard-won lessons buried in commit history: messages containing `revert`, `hotfix`, `workaround`, `don't`, `careful`, or `gotcha` are surfaced as warnings, each linking to the commit. These are the cautionary tales that usually leave with the departing developer.

**Why this priority**: P2 because it mines a currently-unused, high-signal source — but it enriches Warnings rather than enabling a new primary workflow.

**Independent Test**: Run `/handoff-start` on a project whose history contains a `hotfix` or `revert` commit. Confirm the relevant domain's Warnings includes a bullet derived from that commit message, with a link to the commit.

**Acceptance Scenarios**:

1. **Given** commit messages containing keywords (`revert`, `hotfix`, `workaround`, `don't`, `careful`, `gotcha`, case-insensitive), **When** `/handoff-start` analyses history, **Then** each such commit touching a domain's files produces a Warnings bullet in that domain's node.
2. **Given** a surfaced tribal-knowledge warning, **When** it is rendered, **Then** it summarizes the lesson and links to (or cites) the originating commit by short SHA.
3. **Given** a repository host URL is known, **When** the commit citation is rendered, **Then** it is a clickable permalink to the commit; otherwise it degrades to `commit <sha7>`.
4. **Given** a high-volume history with many matching commits, **When** warnings are produced, **Then** they are deduplicated and limited to the most significant per domain (no wall of near-identical bullets).

---

### Edge Cases

- What if a critical flow spans more than ~8 participants? Trace the principal hops and summarize the rest in the description rather than drawing an unreadable diagram.
- What if the repository has been squashed or rewritten so churn/authorship is misleading (one giant commit)? Note low confidence in the git-derived insights; do not over-claim.
- What if the recorded SHA is not pushed to the remote host? Permalinks would 404 — detect when possible and fall back to plain labels; otherwise note that links require the SHA to be pushed.
- What if `CODEOWNERS` and git history disagree on ownership? Report both, labelled (declared vs de facto).
- What if a TL;DR would be longer than the detail it summarizes (a tiny node)? Keep the TL;DR to one short sentence; do not pad.
- What if a tribal-knowledge keyword appears in a benign context (e.g., "revert" in a variable name within a message)? Prefer commit-message-leading keywords and revert/hotfix commit patterns; accept occasional false positives but keep volume low.
- What if churn data is dominated by automated commits (bots, formatters)? Exclude or down-weight known bot authors where detectable.

## Requirements

### Functional Requirements

- **FR-001**: The architecture overview node MUST include 1–3 `sequenceDiagram` blocks, each tracing one critical end-to-end flow across domain boundaries, selected from the project's principal entry points. Each diagram MUST have a one-sentence description naming the user journey. When no end-to-end flow is discernible, the section is omitted.
- **FR-002**: Critical-flow selection MUST prioritise the most significant request entry points (e.g., primary routes/handlers/commands) and trace each through the call path (entry → service/business logic → data layer → external dependency → response).
- **FR-003**: Every node's `## Technical Context` MUST begin with a clearly marked 1–2 sentence TL;DR that abstracts the whole section, placed before the detailed paragraphs and visually distinct from them. The TL;DR MUST NOT merely duplicate the first detail sentence.
- **FR-004**: Nodes MUST render related-node references (from `dependencies` and `doc_refs`) as clickable Markdown links to the corresponding node files.
- **FR-005**: Each inline code-snippet label MUST be rendered as a clickable permalink to `<repository-host-blob-URL>/<sha>/<path>#L<start>-L<end>` using the recorded generation SHA, when a repository host URL can be determined. When it cannot, the label MUST degrade gracefully to the existing plain `path lines N–M` form with no broken links.
- **FR-006**: The toolkit MUST rank files by churn (number of commits touching the file) combined with size/complexity, and surface the top high-churn-high-complexity files as "fragile — change carefully" bullets in the Warnings of the domain(s) that own them, each with the churn figure and a citation. High-churn-but-trivial files MUST be excluded.
- **FR-007**: Each domain node MUST note the de facto owner (dominant author by commit count over the domain's files) and flag single-author / bus-factor-1 files. When a `CODEOWNERS` file exists, the declared owner MUST be reported alongside the git-derived owner.
- **FR-008**: The toolkit MUST scan commit messages for tribal-knowledge keywords (`revert`, `hotfix`, `workaround`, `don't`, `careful`, `gotcha`, case-insensitive) and surface matching commits as Warnings bullets in the relevant domain node, each summarizing the lesson and linking to (or citing) the commit by short SHA. Matches MUST be deduplicated and limited to the most significant per domain.
- **FR-009**: All git-derived analyses (hotspot, ownership, tribal-knowledge) MUST be skipped gracefully when the project has no git history, with no error and no fabricated data.
- **FR-010**: Git-derived warnings and notes MUST carry citations consistent with feature 004 (commit short SHA, or a commit permalink when a host is known), and MUST participate in the existing `inferred_fields` / confidence model where they are inferences rather than facts.
- **FR-011**: The repository host URL used for permalinks MUST be derived from the project's configured remote; supported host URL patterns include the common `<host>/<owner>/<repo>/blob/<sha>/<path>#L<lines>` form. An unknown or unsupported host MUST trigger graceful degradation (FR-005), not a broken link.
- **FR-012**: All new content (sequence diagrams, TL;DRs, links, git-derived warnings) MUST comply with the existing output schema (`schema_version: 1`) and feature 004 trust mechanisms (citations, `quality_score`, `confidence_tags`), and MUST NOT introduce new H2 sections that violate the body-section rules (use existing sections or H3 subsections).

### Key Entities

- **Critical Flow**: A named end-to-end user journey traced as a `sequenceDiagram` in the architecture overview — an ordered list of participants crossing domains, with a one-sentence description.
- **TL;DR**: A 1–2 sentence abstract leading a node's Technical Context.
- **Cross-Link**: A clickable Markdown link from a node to a related node (derived from `dependencies` / `doc_refs`).
- **Source Permalink**: A clickable URL to exact source lines at the recorded SHA, replacing a plain snippet label when a host is known.
- **Hotspot / Fragile File**: A file ranked high on churn × complexity, surfaced as a "change carefully" warning with its churn figure.
- **Ownership Note**: The de facto owner (dominant git author) and/or `CODEOWNERS`-declared owner of a domain, plus single-author file flags.
- **Tribal-Knowledge Item**: A cautionary lesson extracted from a commit message keyword match, surfaced as a warning linking to the commit.

## Success Criteria

### Measurable Outcomes

- **SC-001**: The architecture overview of a multi-domain project contains 1–3 critical-flow sequence diagrams, each crossing at least two domains and naming a user journey.
- **SC-002**: A receiver can grasp the system's principal end-to-end flow from the architecture overview alone, without opening domain nodes.
- **SC-003**: Every node's Technical Context opens with a 1–2 sentence TL;DR; reading only the TL;DRs yields a coherent skim of the whole system in under 5 minutes.
- **SC-004**: In a Markdown viewer, related-node references are clickable and resolve to the correct node files; inline-snippet labels are clickable permalinks to the correct lines at the recorded SHA (or degrade to plain labels with zero broken links when no host is known).
- **SC-005**: For a project with git history, the top fragile files appear as "change carefully" warnings in the owning domains, and high-churn-but-trivial files do not.
- **SC-006**: Each domain node names a de facto owner and flags single-author files; ownership notes are absent (not erroneous) when no git history or `CODEOWNERS` exists.
- **SC-007**: Commits containing tribal-knowledge keywords surface as deduplicated, commit-linked Warnings in the relevant domains.
- **SC-008**: All git-derived insight degrades cleanly to absence (no errors, no fabricated data) on a project with no git history.

## Assumptions

- The Handoff toolkit skill and rule files are the only deliverables — no VS Code extension changes are in scope.
- The Kershless Django project (`/home/amreid/Kershless-backend-app`) is the primary dogfood target.
- `schema_version` remains 1; all new content is additive and backward-compatible, rendered within existing sections or H3 subsections (no new H2 sections, preserving BD-08/BD-09).
- Permalink host support targets the common `<host>/<owner>/<repo>/blob/<sha>/<path>#Lstart-Lend` URL shape derived from the configured git remote; unknown hosts degrade gracefully.
- Permalinks assume the recorded SHA is reachable on the host; when it is not pushed, links may not resolve — this is accepted with graceful-degradation guidance rather than blocking generation.
- Churn is measured as commit count touching a file over available history; complexity is approximated from size and structure signals already used by the toolkit's warning heuristics.
- Bot/automated authors are down-weighted in churn and ownership where detectable, but perfect bot detection is not required.
- Feature 004 trust mechanisms (citations, quality pass, confidence tags) and feature 005 structures (H3 subsections) apply to all new content without changes to their rules.
