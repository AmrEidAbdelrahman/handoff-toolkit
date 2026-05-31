# Research: Narrative Navigation & Git-History Risk Surfacing

**Feature**: `006-narrative-git-insight`
**Date**: 2026-05-31

---

## Decision 1 — Capture generation SHA and permalink base at session START

**Decision**: In Part 1 (session init), run `git rev-parse HEAD` to capture `generated_at_sha`, and derive the repository permalink base from `git remote get-url origin`. Store both in the session/memory for consumption by Step 5.3 (permalinks). Part 7.1 still writes `generated_at_sha` to `index.json`.

**Rationale**: Permalinks are rendered at Step 5.3, long before the old Part 7.1 SHA capture. The SHA must be known at render time. Capturing HEAD at the start is also semantically correct — the code the toolkit reads is the working tree at session start.

**Consumers updated**: Step 5.3 (permalinks). Part 7.1 changes from "capture + write" to "write the already-captured value" (re-confirming HEAD is unchanged; if it differs, prefer the start value since that is what was read).

---

## Decision 2 — Dirty working tree degrades permalinks (correctness, not just availability)

**Decision (refined against Kershless grounding)**: In Part 1, capture the set of **tracked, modified paths** — `git status --porcelain` filtered to EXCLUDE untracked (`??`) entries → `dirty_tracked_paths`. A snippet permalink degrades to the plain `**`path` lines N–M**` label **only when that snippet's specific file is in `dirty_tracked_paths`**. This is per-file, NOT a global tree-dirty boolean.

**Why per-file, not global (grounding finding)**: on the real Kershless target, `git status --porcelain` is non-empty — but only because the toolkit install (`.claude/`, `.handoff/`, `CLAUDE.md`) is untracked (`??`). No tracked source file is modified. A global "tree dirty → disable all permalinks" rule would kill US4 entirely on *every real install* of the toolkit (the act of installing dirties the tree). Checking per-file, excluding untracked, means a clean `competition/views.py` still gets a correct permalink even though the toolkit install is present.

**Rationale**: A link that resolves but points to the wrong lines is worse than no link — it is silently incorrect. But the unsafe condition is specifically "this snippet's file has uncommitted *tracked* changes," not "something somewhere is untracked." Untracked unrelated files do not shift the line numbers of a clean tracked file.

**Scope note**: only snippet permalinks depend on line accuracy. Cross-links between nodes (D4) and commit permalinks (tribal-knowledge) do not depend on the working tree.

---

## Decision 3 — Critical-flow tracing is Step 2a.2b (before the 004 save sub-sequence)

**Decision**: Insert critical-flow tracing as **Step 2a.2b**, between the architecture-overview body draft (2a.2) and the existing Step 2a.3 (which since feature 004 performs citations → Part 5d quality pass → assemble → write). The flow diagrams are part of the overview body, so they must be drafted before the node is scored and saved.

**Mechanics**: 2a.2b reads the top 1–3 request entry points (route/URL files, then the handler/service each calls, then the model and any external client in that call path) — a lightweight targeted read independent of Part 3's per-domain reads. It produces 1–3 `sequenceDiagram` blocks, each with a one-sentence journey description, placed in the overview's `## Diagrams` section. Cap participants at ~8 hops; summarise the rest in the description.

**Rationale**: Numbering it "2a.4" (the user's phrasing) would place it after 2a.3 — after the node is already written — given the toolkit is edited top-to-bottom by sequence number. The correct insertion point is before 2a.3's save sub-sequence.

---

## Decision 4 — One global git-analysis pass (Part 2d), consumed per domain

**Decision**: Add **Part 2d — Git history analysis**, run once after domain discovery (Step 2.3) and the git-availability check, before Part 3. It computes three result sets, keyed by file path and grouped by domain:

1. **Churn ranking** — commit count per file (`git log --format= --name-only` aggregated), down-weighting known bot/automation authors where detectable.
2. **Ownership** — dominant author per domain (`git shortlog -sn -- <domain paths>`), single-author file flags, and `CODEOWNERS` declared owners.
3. **Tribal-knowledge** — commits whose messages match the keyword set (`revert`, `hotfix`, `workaround`, `don't`, `careful`, `gotcha`, case-insensitive), with the touched files, short SHA, and message summary; deduplicated.

Results are stored in memory. Step 3.6 (warnings) consumes the hotspot and tribal slices; Step 5.3 (`### Ownership`) consumes the ownership slice.

**Rationale**: Running git once and slicing per domain avoids re-invoking git for every domain. Centralising also gives a single place to handle the no-git-history case.

**No-git degradation (FR-009)**: if the Part 1 git-availability check found no git history (or `git rev-parse HEAD` fails), Part 2d records "no git data" and all consumers (hotspot, ownership, tribal, permalinks, SHA) skip without error.

---

## Decision 5 — Hotspot ranking: churn × complexity, with a triviality floor

**Decision**: Rank files by `churn × complexity_proxy`. Churn = commit count touching the file. Complexity proxy reuses the toolkit's existing warning-heuristic signals (file size / length, nesting depth, function length). A file is surfaced as **"fragile — change carefully"** only if it is high on BOTH axes — a **triviality floor** excludes high-churn-but-trivial files (config files, version bumps, lockfiles, generated files). Surface the top few per domain (not a global list), each with its churn count.

**Rationale**: FR-006 requires excluding high-churn-trivial files. Pure churn would flag `version.py` or `package.json`; the complexity floor keeps the signal meaningful — fragility is "changes often AND is hard to change."

**Citation**: the churn count is factual (`commit <sha>` range or `inferred` from the aggregate); the "fragile" judgment is an inference, so the warning bullet carries a citation and `warnings` remains in `inferred_fields` per feature 004.

---

## Decision 6 — Sequence-diagram description lines are citation-exempt

**Decision**: The one-sentence description accompanying each critical-flow `sequenceDiagram` lives in the `## Diagrams` section. `## Diagrams` is NOT in the feature-004/005 cited-sections set (Business Context, Decisions, Warnings, and the inferred H3 sub-bullets). Diagram descriptions are therefore citation-exempt — do not bolt `(src: …)` onto them.

**Rationale**: Diagram descriptions narrate a structure the reader can see in the diagram (which is itself derived from code the agent traced). They are self-evident like Technical Context narrative. Adding citations there would be noise and would wrongly trip the `no_unsupported_claims` rubric trigger.

---

## Decision 7 — TL;DR placement and shape

**Decision**: `## Technical Context` opens with a bold-led line `**TL;DR:** <1–2 sentences>`, followed by a blank line and then the existing detailed paragraphs (and the H3 subsections after those). The TL;DR abstracts the whole section — it must not duplicate the first detail sentence.

**Rationale**: A bold inline lead-in is visually distinct in every Markdown renderer without introducing a heading (which would risk BD-09). It is a paragraph, so BD-04 (Technical Context has ≥ 1 non-empty paragraph) is still satisfied. Citation-exempt like the rest of Technical Context narrative.

**Rubric tie-in**: extend the `actionability` / readability expectation — a Technical Context with no TL;DR lead is a quality-pass observation, but not a hard validation failure (keep it advisory to avoid breaking pre-006 nodes).

---

## Decision 8 — Cross-links (`### Related`) and Ownership (`### Ownership`) are new H3 subsections

**Decision**: Two new H3 subsections under `## Technical Context`, joining feature 005's `### Dependencies & Integrations` and `### Testing`:

- **`### Related`** — Markdown links to related nodes, built from the node's `dependencies` and `doc_refs` frontmatter: `- [<title>](<id>.md) — <one-line why related>`. Omitted if the node has no dependencies or doc_refs.
- **`### Ownership`** — the de facto owner (dominant git author), `CODEOWNERS` declared owner if present, and single-author / bus-factor-1 file flags. Omitted entirely when no git data and no CODEOWNERS.

OP-16 is extended to list these as conventional H3 names alongside the 005 pair. BD-09 (H2-only) is untouched.

**Rationale**: Consistent with the 005 H3 pattern, keeping all new per-domain content inside Technical Context and out of the H2 namespace. Ownership is informational (who to ask) → its own note; single-author *risk* could also echo into Warnings, but to avoid duplication the bus-factor flag lives in `### Ownership` and Warnings is reserved for hotspot + tribal-knowledge.

---

## Decision 9 — Permalink host derivation (GitHub + GitLab, graceful otherwise)

**Decision**: Normalise the remote URL and build a blob base:
- SSH `git@<host>:<owner>/<repo>.git` and HTTPS `https://<host>/<owner>/<repo>(.git)` both normalise to `https://<host>/<owner>/<repo>`.
- **GitHub-shape** hosts → `<base>/blob/<sha>/<path>#L<start>-L<end>`.
- **GitLab-shape** hosts (host contains `gitlab`) → `<base>/-/blob/<sha>/<path>#L<start>-<end>`.
- Unknown/unsupported host, no remote, dirty tree (Decision 2), or no SHA → plain `**`path` lines N–M**` label, no link.

**Rationale**: GitHub and GitLab cover the dominant hosts and have stable, documented blob-anchor shapes. Bitbucket and others differ enough that guessing risks broken links — graceful degradation is safer than a wrong URL.

---

## Decision 10 — Tribal-knowledge volume control

**Decision**: After keyword matching, deduplicate by (lesson, file) and cap at the most significant N per domain (default 3–5). Prefer commits where the keyword leads the message or matches a `revert`/`hotfix` commit pattern over incidental mid-message mentions. Each surfaced item: one-line lesson + commit link/citation.

**Rationale**: FR-008 requires deduplication and a volume cap so a busy history does not produce a wall of near-identical warnings. Leading-keyword preference reduces false positives from benign mentions.

---

## Decision 11 — No schema version bump

`schema_version` stays 1. The only schema change is extending advisory OP-16 with two more H3 names. TL;DR, permalinks, cross-links, and git-derived warnings are all body content within existing sections/subsections. Output contract advances to v6.0 (internal) without a schema_version change. All pre-006 nodes remain valid.
