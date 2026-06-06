# Data Model: Detailed Docs — PRD & API Reference

**Feature**: 008-detailed-docs-prd-api | **Date**: 2026-06-06

This feature adds no new persistent data structures. It adds new **content shapes** within existing node files and extends existing frontmatter fields. This document records those shapes.

---

## 1. `### Product Brief` H3 subsection (within `## Business Context`)

Appears inside the `## Business Context` H2 of a `handover_node`. Optional.

```markdown
### Product Brief

**Problem**: <one paragraph — the user pain or business gap this domain addresses>

**Target users**: <who uses this feature — role or persona>

**Capabilities**:
- <user-facing outcome 1>
- <user-facing outcome 2>
- ...

**Out of scope**: <what this domain intentionally does NOT do>

**Success indicators**: <measurable outcomes the domain is meant to achieve>
```

**Rules**:
- No code identifiers, module paths, or technical jargon
- Omitted entirely if confidence is low (no placeholder)
- `product_brief` added to `inferred_fields` when AI-generated

---

## 2. Enriched `api_summary` node (source-code path)

Extends the existing `api_summary` schema. New fields in frontmatter:

```yaml
code_refs:
  - file: <path to handler file>
    line: <handler function start line>
    end_line: <handler function end line, or start + 15 max>
    note: "METHOD /path — one-line description"
  # ... one entry per endpoint
```

**Body template** (enriched `## Endpoints / Operations`):

```markdown
## Overview
<Plain-English summary of what this API does, who calls it, auth model.>

## Endpoints / Operations

### <Resource Group Name>  (H3 when >3 endpoints share a path prefix)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET    | /competitions/ | List all active competitions | Required |
| POST   | /competitions/ | Create a new competition | Required (admin) |

**GET /competitions/** — <one-sentence description>
- Request params: `page` (optional, int), `status` (optional, string)
- Response: list of Competition objects `{id, name, status, start_date}`
- Code ref: `competition/views.py:CompetitionViewSet.list` (navigable in VS Code reader)

## Authentication
<How callers authenticate. Token type, header, OAuth flow, API key location.>
```

**Validation changes** (OP-12 api_summary update):
- `code_refs` is REQUIRED when the api_summary is generated from source code
- `code_refs` is optional when generated from a contract file (backward-compatible)
- A new quality check: every row in `## Endpoints / Operations` MUST have a corresponding `code_refs` entry when source-path generation was used

---

## 3. Schema rule changes summary

| Rule | Change | Type |
|------|--------|------|
| OP-04 | Add `product_brief` to valid `inferred_fields` values | Breaking (additive) |
| OP-12 (api_summary) | `code_refs` required for source-code-generated api_summary | Additive |
| OP-16 | Extend to document `### Product Brief` H3 under Business Context | Advisory |
| OP-17 (new) | Document `### Product Brief` structure convention | Advisory |

All changes are backward-compatible for existing nodes (no existing field removed or narrowed).
