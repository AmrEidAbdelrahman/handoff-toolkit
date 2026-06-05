# Handoff Toolkit Output Contract — v6.0

**Supersedes**: v5.0 (feature 005)
**Date**: 2026-05-31
**Backward compatible with**: v2.0–v5.0

---

## New Rules (feature 006)

**O-19**: The architecture overview node MUST include 1–3 critical-flow `sequenceDiagram` blocks in its `## Diagrams` section, each tracing one end-to-end user journey across ≥ 2 domains and named by a one-sentence description. When no end-to-end flow is discernible, the section is omitted (not fabricated).

**O-20**: Every node's `## Technical Context` MUST open with a `**TL;DR:**` lead of 1–2 sentences that abstracts the section, placed before the detailed paragraphs. The TL;DR MUST NOT duplicate the first detail sentence.

**O-21**: Related-node references (from `dependencies` / `doc_refs`) MUST be rendered as clickable Markdown links in a `### Related` subsection. Inline-snippet labels MUST be rendered as clickable permalinks `<host>/blob/<sha>/<path>#L<a>-L<b>` (GitHub) or `<host>/-/blob/<sha>/<path>#L<a>-<b>` (GitLab) at the recorded generation SHA when a host is known AND the working tree is clean. Otherwise they MUST degrade to the plain `**`path` lines N–M**` label with zero broken links.

**O-22**: For a project with git history, the top high-churn-high-complexity files MUST be surfaced as "fragile — change carefully" Warnings in their owning domains, each with the churn figure and a citation. High-churn-but-trivial files MUST be excluded.

**O-23**: Each domain node MUST note the de facto owner (dominant git author) and flag single-author / bus-factor-1 files in a `### Ownership` subsection; `CODEOWNERS`-declared owners MUST be reported when present.

**O-24**: Commits whose messages match tribal-knowledge keywords (`revert`, `hotfix`, `workaround`, `don't`, `careful`, `gotcha`, case-insensitive) MUST surface as deduplicated, commit-cited Warnings in the relevant domains, capped per domain.

**O-25**: All git-derived output (O-22/O-23/O-24, snippet permalinks, recorded SHA) MUST degrade to absence with no error and no fabricated data when the project has no git history. A dirty working tree MUST disable snippet permalinks (degrade to plain labels) to avoid linking to wrong lines.

---

## Inherited Rules (v5.0, unchanged)

- **O-12–O-18** (feature 005): config_reference node, secret safety, Dependencies & Integrations + Testing H3 subsections, glossary node, field-level data-model, feature-004 trust compliance.
- **O-09–O-11** (feature 004): quality_score, citations on inferred claims (narrative + snippet labels exempt; inferred H3 sub-bullets cited), confidence_tags.
- **O-01–O-08** (features 002/003): frontmatter validity, required sections, ordering, code_refs absence, architecture-overview at index 0, plain-English titles, index.md.

---

## Schema Touch Points

- **OP-16 extended**: conventional `## Technical Context` H3 names now include `### Related` and `### Ownership` (joining `### Dependencies & Integrations`, `### Testing`). Advisory; BD-09 (H2-only) untouched.
- `schema_version` stays 1. No new H2 sections. All new content is body content in existing sections or OP-16 H3 subsections.

---

## Breaking Changes from v5.0

None. O-19 through O-25 are new requirements on output generated from feature 006 onwards. Nodes generated before feature 006 (no TL;DR, no permalinks, no git-derived sections) remain schema-valid. The TL;DR and critical-flow requirements are content expectations enforced by the quality pass / generation instructions, not hard schema validation rules — so pre-006 nodes do not retroactively fail validation.
