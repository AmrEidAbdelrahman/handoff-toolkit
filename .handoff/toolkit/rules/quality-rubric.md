# Handoff Quality Rubric

Read this file during the quality refinement pass (handoff-start Part 5d, and the equivalent calls in Part 2a.3 and Part 5c). It defines the five dimensions used to score a node after it has been assembled, the **objective trigger** that forces a rewrite (score 0), and what 1 and 2 look like.

**Critical instruction**: You are scoring a node you just wrote. Self-assessment bias will push you to rate everything ≥ 1. Resist this. Apply each dimension's score-0 trigger as a **mechanical test** — if the trigger condition is literally true, the score is 0 and you MUST rewrite, regardless of how good the node feels.

---

## Scoring Scale

- **0 — Failing**: The objective trigger below is met. You MUST rewrite the relevant section(s), then re-score that one dimension. A saved node may never carry a 0.
- **1 — Acceptable**: The trigger is not met; the section does its job.
- **2 — Exemplary**: Acceptable, plus the "exemplary" condition below is met.

Only values 1 and 2 may appear in the saved `quality_score` frontmatter. A 0 is an intermediate state that must be resolved by rewriting before the node is saved.

**Rewrite scope**: When a dimension scores 0, rewrite ONLY the section(s) named in that dimension's "Section(s)" line. Do not rewrite the whole node. Do not re-draft sections that already score ≥ 1.

---

## Dimension Applicability by `doc_type`

| Dimension | handover_node | adr | runbook | onboarding_guide | api_summary | architecture-overview |
|---|---|---|---|---|---|---|
| `business_value_clarity` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `why_coverage` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `snippet_relevance` | ✓ | N/A | N/A | N/A | N/A | N/A |
| `actionability` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `no_unsupported_claims` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

For a dimension marked **N/A**, omit its key from `quality_score` entirely — do not write `0`, do not write `N/A` as a value.

---

## Dimension 1 — `business_value_clarity`

**Section(s)**: `## Business Context` (for typed docs: `## Context` / `## Purpose` / `## Project Summary` / `## Overview` as applicable).

**Score 0 trigger (mechanical)**: The section contains **zero sentences that name a user-facing or business outcome**. Concretely: no sentence states what a user can do, what the business gains, or what would break for a user/the business if this stopped working. A section that only describes code structure ("this module contains three classes that handle requests") scores 0.

**Score 1**: At least one sentence names a user-facing or business outcome.

**Score 2**: The section names the outcome AND states what breaks for users if the domain disappeared (the "stakes" sentence).

**Rewrite action on 0**: Add at least one sentence answering "what does this do for a user or the business?" Draw on README, model names, or route names. If no signal exists, the field should already be in `inferred_fields` with a `(src: inferred)` citation — keep it, but still phrase it as a user-facing outcome.

---

## Dimension 2 — `why_coverage`

**Section(s)**: `## Decisions` (handover_node, architecture-overview); `## Decision` + `## Consequences` (adr); `## Technical Context` reasoning sentences for all types.

**Score 0 trigger (mechanical)**: A `## Decisions` section is present but **at least one bullet states only WHAT was chosen with no WHY** (no "because", "to", "in order to", "avoids", "instead of", or equivalent reasoning clause). For ADRs: the `## Consequences` section is empty or restates the decision without naming a trade-off. If no `## Decisions` section is present and the doc_type does not require one, this dimension scores 1 by default (nothing to fail).

**Score 1**: Every decision bullet includes a reasoning clause; no bare "what" bullets.

**Score 2**: Every decision states both the reasoning AND the trade-off accepted (what was given up).

**Rewrite action on 0**: For each bare bullet, append the reasoning inferred from the source comment/pattern. If the why cannot be inferred, soften the claim to an observation rather than asserting a decision, and ensure it carries a `(src: …)` citation.

---

## Dimension 3 — `snippet_relevance`

**Section(s)**: inline code snippets within `## Technical Context`. **Applies to `handover_node` only.**

**Score 0 trigger (mechanical)**: The node has `depth: core` or `depth: supporting`, has a `## Technical Context` section, but contains **zero inline snippets**, OR every snippet present is boilerplate (imports-only blocks, empty `__init__`, auto-generated migrations, pure configuration with no business logic). A snippet of framework scaffolding with no domain-specific logic counts as boilerplate.

**Score 1**: At least one snippet shows domain-specific public API surface or business logic.

**Score 2**: Snippets cover both the public API surface (what the domain exposes) AND a key business-logic method (how a core rule is implemented).

**Rewrite action on 0**: Re-select snippets from the files read in Step 3.2 using the Step 3.7 priority order (public API surface first, key business logic second). If the domain genuinely has only boilerplate, reduce to one representative snippet and note in Technical Context that the domain is thin.

---

## Dimension 4 — `actionability`

**Section(s)**: `## Technical Context`; for runbooks `## Steps` + `## Expected Outcome`.

**Score 0 trigger (mechanical)**: A reader finishes the section without a single concrete entry point — **no file path, no function/class/endpoint name, no command** appears in the section. For runbooks: `## Steps` has a step with no concrete command or action a reader could perform. A section written entirely in abstract terms ("the system processes the data and returns a result") scores 0.

**Score 1**: The section names at least one concrete entry point (file, symbol, endpoint, or command) a reader could go to next.

**Score 2**: The section gives a clear "start here" — it names the primary entry point AND describes what a reader should do/read first.

**Rewrite action on 0**: Add the concrete entry-point file path(s) and the primary symbol/endpoint name. These are already known from Step 3.2 — surface them.

---

## Dimension 5 — `no_unsupported_claims`

**Section(s)**: `## Business Context`, `## Decisions`, `## Warnings` (and the prose sections of typed docs).

**Score 0 trigger (mechanical)**: **Any sentence in these sections lacks a trailing `(src: …)` citation.** This is a literal check — scan each sentence; if it does not end with `(src: …)`, the dimension scores 0. (Sentences that are genuine inferences with no specific source must still carry `(src: inferred)` — absence of any citation is the failure, not the use of `inferred`.)

**Score 1**: Every sentence in these sections carries a `(src: …)` citation.

**Score 2**: Every sentence is cited AND no more than one sentence per section rests on `(src: inferred)` (i.e., most claims trace to a concrete source, not a guess).

**Rewrite action on 0**: Add the missing citation to each uncited sentence. If the sentence cannot be traced to any source, append `(src: inferred)` and ensure the enclosing field is listed in `inferred_fields` with `confidence: low` (see the three-way link rule in handoff-start Step 5.2 / Step 5.3).

---

## The `(src: inferred)` ⟺ `low` ⟺ `inferred_fields` link

These three facts about a claim always travel together. If any one is true, all three must be true:

1. A sentence carries `(src: inferred)` — no concrete source was found.
2. The enclosing field's `confidence_tags` entry is `low`.
3. The enclosing field appears in `inferred_fields`.

When the quality pass adds a `(src: inferred)` citation during a rewrite, it must also ensure the field is in `inferred_fields` and tagged `low` in `confidence_tags`. When `/handoff-review` confirms such a field, all three are cleared together (citation may be upgraded by the giver, field removed from `inferred_fields`, entry removed from `confidence_tags`).
