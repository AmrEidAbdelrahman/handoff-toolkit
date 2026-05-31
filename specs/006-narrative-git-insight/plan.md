# Implementation Plan: Narrative Navigation & Git-History Risk Surfacing

**Branch**: `006-narrative-git-insight` | **Date**: 2026-05-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-narrative-git-insight/spec.md`

## Summary

Add narrative and navigation affordances plus git-history risk insight to the Handoff toolkit:
1. **Critical-flow sequence diagrams** in the architecture overview (cross-domain user journeys)
2. **TL;DR-first** Technical Context (progressive disclosure)
3. **Cross-links + source permalinks** (clickable navigation)
4. **Hotspot/fragility analysis** (churn × complexity → Warnings)
5. **Bus-factor/ownership** (dominant author + single-author flags + CODEOWNERS)
6. **Tribal-knowledge mining** (commit-message keywords → Warnings)

All deliverables are Markdown AI-instruction files. No compiled code, no runtime. All new content inherits feature 004 trust mechanisms and feature 005 H3-subsection structure.

## Technical Context

**Language/Version**: Markdown (AI instruction files)

**Primary Dependencies**: Existing toolkit files — `handoff-start/SKILL.md`, `rules/diagram-methodology.md`, `rules/output-schema.md`. The agent uses `git` CLI at generation time (log, shortlog, rev-parse, remote).

**Storage**: Files only — `.handoff/toolkit/` Markdown skill and rule files

**Testing**: Manual dogfood test — run `/handoff-start` on Kershless and inspect output

**Target Platform**: Claude Code CLI reading `.handoff/toolkit/` as agent instructions

**Project Type**: AI instruction library — no runtime, no build step

**Constraints**: Backward-compatible with `schema_version: 1`. No new H2 sections (preserve BD-08/BD-09) — new body content uses existing sections or H3 subsections. All git analysis degrades to absence (no error) when no git history exists.

**Scale/Scope**: 3 files modified (`handoff-start/SKILL.md`, `diagram-methodology.md`, `output-schema.md`). No new files.

## Constitution Check

Constitution is a template stub — no project-specific principles defined. No gates. Proceeding.

## Key Design Decisions

### D1 — Capture the generation SHA and repo permalink base at session START (not end)

**Problem**: Source permalinks (US4) are rendered at Step 5.3, but `generated_at_sha` is currently captured only at Part 7.1 (session end). A permalink needs the SHA at render time.

**Decision**: In Part 1 (session init), capture `git rev-parse HEAD` into the session as `generated_at_sha`, and derive the repository permalink base from `git remote get-url origin`. Both are stored once and consumed by Step 5.3. Part 7 still writes `generated_at_sha` to `index.json` (same value — the autonomous run does not commit during generation). This is correct: the code being read is at HEAD when the run starts.

### D2 — Critical-flow tracing runs during architecture-overview assembly, before the node is saved

**Problem**: Tracing a flow (route → service → model → external) needs reads of entry-point files. The architecture overview is drafted and saved in Part 2a, before Part 3's per-domain reads.

**Decision**: Add **Step 2a.2b — Critical-flow tracing** (NOT "2a.4") that does its own lightweight reads of the top 1–3 entry points (route/handler files and the services they call), produces 1–3 `sequenceDiagram` blocks, and contributes them to the overview body. **Numbering matters**: feature 004 inserted a citation → quality-pass (Part 5d) → save sub-sequence *inside* Step 2a.3. The flow diagrams must exist in the body BEFORE that sub-sequence scores and writes the node. Numbering the step "2a.4" (after 2a.3) would place it after the node is already saved — the by-sequence-number editing trap. It is therefore inserted as **2a.2b**, between the body draft (2a.2) and the 2a.3 citation/quality/save sub-sequence. Sequence-diagram description lines live in `## Diagrams` and are citation-exempt (see research.md Decision 6).

### D3 — One global git-analysis pass, consumed per domain

**Problem**: Hotspot, ownership, and tribal-knowledge analyses each need git data; running them per-domain would re-invoke git repeatedly.

**Decision**: Add **Part 2d — Git history analysis** (run once, after domain discovery, before Part 3). It runs the churn ranking, authorship/ownership, and tribal-knowledge keyword scan once, storing results keyed by file and by domain. Each domain node's Step 3.5/3.6 (decisions/warnings) and Step 5.3 (ownership note) consult the stored slice. If the project has no git history, Part 2d records "no git data" and all consumers skip gracefully.

### D4 — New body content uses existing sections + two new H3 subsections

- **TL;DR** → first line of `## Technical Context` (`**TL;DR:** …`), a paragraph, not a heading — no schema impact.
- **Cross-links** → new `### Related` H3 subsection under Technical Context.
- **Ownership note** → new `### Ownership` H3 subsection under Technical Context.
- **Hotspot + tribal-knowledge** → bullets in the existing `## Warnings` section.
- **Permalinks** → reshape the existing inline-snippet label into a Markdown link; no structural change.

OP-16 (feature 005) is extended to list `### Related` and `### Ownership` as additional conventional H3 names. BD-09 stays intact (H2-only constraint untouched).

### D5 — Permalink host support: GitHub + GitLab patterns, graceful degradation

Derive the blob base from the remote URL. Support the GitHub shape (`<host>/<owner>/<repo>/blob/<sha>/<path>#L<a>-L<b>`) and the GitLab shape (`<host>/<owner>/<repo>/-/blob/<sha>/<path>#L<a>-<b>`). SSH (`git@host:owner/repo.git`) and HTTPS remotes are both normalised. Unknown/unsupported host, no remote, or no SHA → fall back to the plain `**`path` lines N–M**` label with zero broken links.

## Project Structure

### Documentation (this feature)

```text
specs/006-narrative-git-insight/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output (output contract v6.0)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Files (this feature changes these)

```text
.handoff/toolkit/
├── rules/
│   ├── diagram-methodology.md     # MODIFY — critical-flow sequenceDiagram guidance (cross-domain participants)
│   └── output-schema.md           # MODIFY — extend OP-16 with ### Related and ### Ownership H3 names
└── skills/
    └── handoff-start/SKILL.md     # MODIFY — Part 1 (capture SHA + repo base); Part 2a.4 (critical flows);
                                   #          Part 2d (git analysis); Part 3 (hotspot/tribal warnings);
                                   #          Step 5.3 (TL;DR, permalinks, ### Related, ### Ownership)
```

**Structure Decision**: No new files. Three existing toolkit files change, consistent with features 004/005. Git analysis is centralised in one pass (Part 2d) for efficiency; the architecture overview gains a tracing step (2a.4); Step 5.3 renders the four navigation/disclosure additions.

## Implementation Phases

### Phase 1 — Schema & diagram-methodology foundations

- Extend OP-16 (`output-schema.md`) with `### Related` and `### Ownership` conventional H3 names
- Add critical-flow `sequenceDiagram` guidance to `diagram-methodology.md` (cross-domain participants, ≤ 8 hops, naming the journey)

### Phase 2 — Session foundations (Part 1: SHA + permalink base)

- Part 1: capture `generated_at_sha` (HEAD) and derive repo permalink base; store in session/memory

### Phase 3 — US1: Critical-flow sequence diagrams (P1)

- Part 2a: add Step 2a.4 (trace top entry points → 1–3 sequence diagrams); update Step 2a.3 save to include them

### Phase 4 — US2: Hotspot / fragility analysis (P1)

- Part 2d: churn × complexity ranking (once)
- Part 3 (Step 3.6 warnings): consume hotspot slice → "fragile — change carefully" bullets

### Phase 5 — US3: Progressive disclosure (P2)

- Step 5.3: lead Technical Context with `**TL;DR:** …`

### Phase 6 — US4: Cross-links & source permalinks (P2)

- Step 5.3: render `### Related` links from dependencies/doc_refs; reshape snippet labels into permalinks (with graceful degradation)

### Phase 7 — US5: Bus-factor / ownership (P2)

- Part 2d: authorship + CODEOWNERS analysis
- Step 5.3: render `### Ownership` subsection (de facto owner, single-author flags)

### Phase 8 — US6: Tribal-knowledge mining (P2)

- Part 2d: commit-message keyword scan (dedup, limit per domain)
- Part 3 (Step 3.6 warnings): consume tribal slice → commit-linked Warnings

### Phase 9 — Polish & validation

- Update CLAUDE.md plan pointer
- Consistency check (OP-16, diagram guidance, Step 5.3)
- Dogfood test on Kershless against SC-001 through SC-008

## Quality Gates

- SC-001/002: 1–3 cross-domain critical-flow diagrams in the architecture overview
- SC-003: every Technical Context opens with a TL;DR; TL;DR-only skim is coherent
- SC-004: related-node links resolve; snippet permalinks are correct at the SHA (or degrade to plain labels, zero broken links)
- SC-005: fragile files flagged in owning domains; trivial high-churn files excluded
- SC-006: de facto owner + single-author flags per domain; absent (not erroneous) without git/CODEOWNERS
- SC-007: tribal-knowledge commits surface as deduplicated, commit-linked Warnings
- SC-008: all git-derived insight degrades to absence (no error) without git history
