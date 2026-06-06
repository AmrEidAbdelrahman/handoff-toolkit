# Implementation Plan: Detailed Docs — PRD & API Reference

**Branch**: `008-detailed-docs-prd-api` | **Date**: 2026-06-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-detailed-docs-prd-api/spec.md`

## Summary

Add two new enrichment layers to the Handoff generator:

1. **`### Product Brief` H3 subsection** within `## Business Context` of `handover_node` documents — a PRD-style narrative (problem statement, target users, capability list, out-of-scope items, success indicators) generated from source code when a user-facing story can be confidently inferred.

2. **`doc_type: api_summary` extended** — the existing API Summary node type is expanded beyond contract-file detection (OpenAPI/Swagger/proto) to also generate from HTTP route source files (Django `urls.py`, Express routers, Flask blueprints, etc.) with per-endpoint `code_refs` so the VS Code reader can navigate to handler functions.

**Schema constraint resolution**: `## Product Brief` cannot be a new H2 in a `handover_node` because BD-09 prohibits any H2 other than the four permitted names. The implementation uses a `### Product Brief` H3 subsection under `## Business Context` — consistent with the OP-16 pattern for H3s under `## Technical Context`. No BD-09 change required.

## Technical Context

**Language/Version**: Markdown + AI instruction language (the Handoff toolkit is composed of `.md` instruction files that Claude follows; no compiled code is involved)

**Primary Dependencies**: The toolkit files in `.handoff/toolkit/` — specifically:
- `rules/output-schema.md` — field/section validation rules
- `rules/diagram-methodology.md` — node templates, detection triggers
- `rules/quality-rubric.md` — scoring rubric
- `skills/handoff-start/SKILL.md` — the generator skill (Step 2c, Step 3, Step 5)
- `skills/handoff-review/SKILL.md` — interactive review skill
- `skills/handoff-validate/SKILL.md` — validation skill
- `extension/src/handoff/nodeParser.ts` — VS Code extension node parser
- `extension/src/webview/panelManager.ts` — VS Code extension reader types

**Storage**: `.handoff/output/` — generated node Markdown files and `index.json`

**Testing**: Unit tests (`extension/tests/unit/`) for parser changes; integration tests (`extension/tests/integration/`) for end-to-end extension behaviour; manual dry-run against Kershless-backend-app for generator instruction correctness

**Target Platform**: AI instruction Markdown (consumed by Claude in-session); TypeScript (VS Code extension)

**Project Type**: AI instruction toolkit + VS Code extension

**Performance Goals**: No regression in generation time; API Summary source-code extraction must complete within a single `/handoff-start` session without hitting context limits (limit per-domain endpoint extraction to entry-point file only)

**Constraints**: BD-09 is a hard constraint — no new H2 sections in `handover_node`; `schema_version` stays at `1`; all existing validation rules must continue to pass on existing nodes

**Scale/Scope**: Affects all generator runs on codebases with discoverable HTTP routes or user-facing entry points; currently the Kershless backend (competition/, users/, social/ domains) is the in-session grounding target

## Constitution Check

The project constitution is an unfilled template — no project-specific gates apply. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/008-detailed-docs-prd-api/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Files (modified by this feature)

```text
.handoff/toolkit/
├── rules/
│   ├── output-schema.md         # Update OP-16, OP-12(api_summary), add Product Brief H3 convention
│   ├── diagram-methodology.md   # Extend § 3.4 detection + template; add § 3.x Product Brief
│   └── quality-rubric.md        # Add Product Brief and enriched api_summary to rubric
├── skills/
│   ├── handoff-start/
│   │   └── SKILL.md             # Step 2c.3 source-code detection; Step 2c.4 Product Brief extraction;
│   │                            # Step 5 assembly; validation rules; quality-score applicability
│   ├── handoff-review/
│   │   └── SKILL.md             # Review awareness of Product Brief H3 and api_summary code_refs
│   └── handoff-validate/
│       └── SKILL.md             # Validation checks for new content

extension/src/
├── handoff/
│   ├── types.ts                 # No change needed (code_refs already supported)
│   └── nodeParser.ts            # No change needed (api_summary code_refs parsed via existing path)
└── webview/ui/main.js           # No change needed (chips/scroll-sync already handle code_refs)
```

**Structure Decision**: All substantive changes are to the AI instruction Markdown toolkit files. The VS Code extension already supports `code_refs` navigation (feature 007/008 reader work); no extension changes are needed for this feature — the generator just needs to emit `code_refs` in api_summary nodes.

## Phase 0: Research

### R-001 — Product Brief inference: what signals are sufficient?

**Decision**: Infer a Product Brief when the domain has at least one HTTP endpoint **or** a named business-domain module (views, controllers, handlers, services that name a user-facing concept). Skip when the domain is pure data models, migrations, utilities, or infrastructure.

**Rationale**: These signals reliably indicate a user-facing feature with a describable purpose. Pure infrastructure/utility domains have no product narrative to infer.

**Alternatives considered**:
- Always generate (rejected: produces empty/generic content for infrastructure domains)
- Only generate when a PRD template is committed to the repo (rejected: defeats the purpose of automated generation)

### R-002 — How to extract HTTP endpoints from source code without a contract file

**Decision**: For each domain, read the domain's URL/route registration file (e.g., `urls.py` for Django, the file that imports the router for Express/Fastify, the Blueprint registration for Flask). Extract: HTTP method, path pattern, view/handler reference. Then read the handler to extract: docstring/comment, parameter names, return shape.

**Rationale**: Route registration files are dense, predictable, and short — exactly the right extraction target. Reading the full handler is bounded by the 5–15 line snippet rule already in SKILL.md Step 3.7.

**Alternatives considered**:
- Parse all `@app.route`/`@router.get` decorators across the codebase (rejected: unbounded, misses Django-style central URL conf)
- Require an OpenAPI file (rejected: that's the existing behaviour, which this feature extends)

**Supported route file patterns** (Step 2c.3 extension):
- Django: `urls.py` in the domain directory or project root's URL conf
- Express/Fastify: any file importing `Router()` or `express.Router()`
- Flask: any file containing `Blueprint(` or `@app.route(`
- FastAPI: any file containing `APIRouter(` or `@app.` decorator on a function

### R-003 — code_refs format for api_summary nodes

**Decision**: Each endpoint entry in `## Endpoints / Operations` carries a `code_refs` entry pointing to the handler function's definition line. The `note` field contains the HTTP method + path (e.g., `"GET /competitions/"`) to make it self-describing in the code pane tab.

**Rationale**: This is the exact same `code_refs` format already used by handover_node snippets — no new schema fields needed. The VS Code extension already renders tabs by `basename(ref.file) + lineLabel` and shows `ref.note` as the tab tooltip.

**Alternatives considered**:
- A new `endpoint_refs` frontmatter key (rejected: duplicates code_refs, adds schema complexity)
- Linking to the route registration line instead of the handler (rejected: handler is where logic lives)

### R-004 — BD-09 constraint on `### Product Brief` placement

**Decision**: `### Product Brief` is an H3 subsection **within** `## Business Context`. It appears after the opening paragraph(s) of Business Context and before any other H3 in that section.

**Rationale**: BD-09 prohibits additional H2s; H3s are explicitly permitted per OP-16's pattern. Placing it inside Business Context is semantically correct (it IS a business-layer enrichment). Validators that check BD-09 will not flag it.

**Schema update required**: Add a new advisory rule (OP-17) documenting `### Product Brief` as the conventional H3 subsection name within `## Business Context`. Mirror OP-16's wording.

### R-005 — quality_score applicability for new content

**Decision**: For `handover_node` documents with a `### Product Brief` subsection, the existing `business_value_clarity` dimension covers the Product Brief's quality (it is part of Business Context). No new rubric dimension needed.

For enriched `api_summary` nodes: `snippet_relevance` remains N/A (no inline snippets); `no_unsupported_claims` applies to `## Overview` and `## Authentication`; `actionability` applies to the Endpoints list.

**Rationale**: Reusing existing dimensions avoids schema changes to `quality_score` permitted keys (OP-14).

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](data-model.md).

### Interface Contracts

The Handoff generator is an AI instruction system — its "interface" is the instruction protocol in SKILL.md. The contracts produced by this feature are:

1. **`### Product Brief` H3 structure** — defined in diagram-methodology.md § 3.x and enforced by OP-17
2. **Enriched `api_summary` template** — updated in diagram-methodology.md § 3.4 with `code_refs` per endpoint
3. **Extended source-code detection trigger** — updated in diagram-methodology.md § 3.4

See [contracts/](contracts/).

### Key Design Decisions

**D-01 — No new doc_type for Product Brief**
Product Brief is a H3 within Business Context, not a new node. Rationale: it is always paired with the domain's other content; a standalone PRD node would be disconnected from Technical Context and Decisions.

**D-02 — api_summary code_refs are mandatory when generated from source**
Any api_summary node generated by the source-code path (not just contract files) MUST emit `code_refs`. An api_summary generated from a contract file (OpenAPI/Swagger/proto) MAY omit `code_refs` where the contract file doesn't reference source locations (preserves backward compatibility).

**D-03 — Omission is the fallback, never placeholder**
If Product Brief inference confidence is low (the generator cannot articulate a coherent problem statement from the codebase), the `### Product Brief` subsection is omitted entirely from Business Context. The existing Business Context paragraph remains.

**D-04 — Source-code api_summary respects the 8-file cap**
Route file reading counts toward the 8-file business-logic cap in Step 3 of SKILL.md. This prevents context exhaustion on large codebases.

**D-05 — handoff-review updated to display Product Brief**
The interactive review currently walks `inferred_fields`. `product_brief` is added as a new valid `inferred_fields` value (alongside `business_context`, `depth`, `decisions`, `warnings`). Reviewers can confirm or correct the Product Brief content.
