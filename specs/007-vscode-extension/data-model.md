# Phase 1 Data Model: Handoff VS Code Extension

These are the in-memory entities the extension builds from the handover output. They mirror the Node Schema Specification (the contract) and add a few extension-only constructs (tree nodes, read state, resolution results). Field shapes are described conceptually; the TypeScript types live in `src/handoff/types.ts`.

## 1. IndexManifest

Parsed from `.handoff/output/index.json`.

| Field | Type | Notes |
|-------|------|-------|
| `schemaVersion` | integer | Must be `1`; mismatch → warning, still render (FR-007). |
| `projectName` | string | Non-empty (validation). |
| `generatedAt` | string (ISO 8601) | Optional in practice; informational. |
| `nodes` | IndexEntry[] | Ordered core → supporting → peripheral. |

### IndexEntry

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Matches `^[a-z0-9]+(-[a-z0-9]+)*$`, matches node filename. |
| `title` | string | Shown in tree. |
| `depth` | `core` \| `supporting` \| `peripheral` | Drives grouping. |
| `dependencies` | string[] | Ids of related nodes (may be empty/absent). |
| `file` | string | Relative path under output, e.g. `nodes/{id}.md`. |

**Validation (per schema §7)**: `schemaVersion === 1`; `projectName` non-empty; each entry has `id`/`title`/`depth`/`file`; no duplicate ids; every `file` exists; every node file has an entry. Failures produce `ValidationIssue`s, not crashes.

## 2. ParsedNode

Parsed from a node markdown file (`gray-matter` frontmatter + body).

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Must equal filename stem and the index entry id. |
| `title` | string | Non-empty, ≤120 chars. |
| `depth` | enum | One of core/supporting/peripheral. |
| `schemaVersion` | integer | `1`; mismatch → warning, still attempt render. |
| `codeRefs` | CodeRef[] | ≥1 item required. |
| `dependencies` | string[] | Optional; each should exist in index (else flagged). |
| `tags` | string[] | Optional; ≤10. |
| `parent` | string \| undefined | **Not in current schema contract.** Read forward-compatibly: if present and resolves to another node id, drives nesting; otherwise ignored. |
| `generatedAt` | string | Optional ISO 8601. |
| `sections` | Section[] | Parsed from H2 headings. |
| `issues` | ValidationIssue[] | Per-node validation problems; node still listed/navigable. |

### CodeRef (schema §3)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `file` | string | yes | Relative to project root, forward slashes. |
| `line` | integer | no | 1-indexed start; positive. |
| `endLine` | integer | no | Only valid with `line`; `endLine >= line`. |
| `note` | string | yes | ≤200 chars; shown in ref list and tab tooltip. |

### Section

| Field | Type | Notes |
|-------|------|-------|
| `kind` | `business` \| `technical` \| `decisions` \| `warnings` | Maps to color: business=purple, technical=blue, decisions=green, warnings=orange. |
| `headingText` | string | The literal H2 text matched. |
| `html` | string | `markdown-it`-rendered body of the section. |

**Body validation (schema §7)**: Business Context + Technical Context present and non-empty; Decisions/Warnings, if present, contain ≥1 list item; no H1 in body; sections in order business → technical → decisions → warnings. Order/presence violations → `ValidationIssue`, render best-effort.

## 3. ValidationIssue

| Field | Type | Notes |
|-------|------|-------|
| `severity` | `error` \| `warning` | Schema-version mismatch and missing-dependency are warnings; missing required section / bad enum are errors. |
| `code` | string | Stable id, e.g. `SCHEMA_VERSION_MISMATCH`, `MISSING_BUSINESS_CONTEXT`, `INDEX_FILE_MISSING`, `DEP_NOT_FOUND`. |
| `message` | string | Human-readable, shown in-product. |
| `nodeId` | string \| undefined | Scope of the issue. |

Issues never throw past the loader; they surface in the UI (FR-006, SC-004).

## 4. TreeNode (extension-only)

The renderable tree the `TreeDataProvider` serves. Built by `buildTree()`.

| Field | Type | Notes |
|-------|------|-------|
| `kind` | `pinned` \| `group` \| `node` | Pinned overviews, depth group headers, and actual nodes. |
| `id` | string | Node id (for `node`), or synthetic (for groups). |
| `label` | string | Title or group name. |
| `depth` | enum \| undefined | For `node`/`group`. |
| `read` | boolean | For `node`; drives the read/unread icon. |
| `children` | TreeNode[] | Group members or `parent`-nested children. |
| `collapsible` | boolean | True for groups and any node with children. |

### Tree-building rule (single authoritative algorithm)

Encoded in `src/handoff/tree.ts`. Latent for v1 (no `parent` emitted) but fully specified so the provider never needs rework:

1. **Resolve parents**: a node's `parent` is "resolvable" iff it is a non-empty string matching the id of another node present in the index. Otherwise treat the node as un-parented (and, if `parent` was non-empty but unresolved, add a `DEP_NOT_FOUND`-style warning).
2. **Pinned overviews**: if nodes with id `project-overview` and/or `technical-overview` exist, lift them out and place them at the tree root, above all groups, in that order. They do not also appear in their depth group. (They are never treated as `parent` targets for nesting in MVP.)
3. **Depth groups**: create up to three group headers in fixed order core → supporting → peripheral. Omit a group with no members.
4. **Placement**:
   - An un-parented node is a direct child of its own depth group.
   - A parented node is removed from its depth group's top level and nested as a child of its `parent` node, preserving index order among siblings.
   - A parented subtree is displayed under the **parent's** depth group (the child's own `depth` no longer determines its top-level placement; it rides under the parent).
5. **Ordering**: within any level, preserve index order (which is core→supporting→peripheral globally and toolkit-defined within a tier).
6. **Cycle/again safety**: if `parent` links would form a cycle, break it by treating the offending node as un-parented and emitting a warning (defensive; cannot occur in valid v1 output).

This composition resolves the three competing shapers (pinned overviews, depth groups, parent nesting) deterministically.

### Prev/Next reading order

FR-021's "adjacent node in the tree's reading order" is a **depth-first pre-order flatten** of the rendered tree: pinned overviews first (in order), then each depth group in core → supporting → peripheral order, and within a group each top-level node immediately followed by its nested `parent` children (recursively) before the next sibling. Group headers are skipped (not selectable targets); only `node`-kind entries participate. For v1 output (no `parent`) this reduces to: overviews, then plain index order. Specifying it now keeps Prev/Next from needing rework when nesting activates.

## 5. ReadState (extension-only)

Persisted in `workspaceState`.

| Field | Type | Notes |
|-------|------|-------|
| `readIds` | string[] (set semantics) | Node ids marked read. |
| `total` | derived | Count of `node`-kind entries. |
| `progress` | derived | `readIds.size / total`; feeds the TreeView badge. |

State transition: a node becomes `read` when its content is shown in the doc pane; never auto-reverts. Persisted immediately on change; restored on activation (FR-030, SC-005).

## Relationships

- `IndexManifest.nodes[i].id` ↔ `ParsedNode.id` ↔ node filename stem (three-way must agree).
- `ParsedNode.codeRefs[*].file` → workspace source files (resolved live, may be missing → `CodeRefResolution`).
- `ParsedNode.parent` → another `ParsedNode.id` (forward-compatible nesting).
- `ParsedNode.dependencies[*]` → other `ParsedNode.id` (shown; flagged if absent).
- `ReadState.readIds[*]` → `ParsedNode.id`.

## CodeRefResolution (extension-only, runtime)

Result of `codeResolver` reading a `CodeRef` live:

| Field | Type | Notes |
|-------|------|-------|
| `status` | `ok` \| `file-not-found` \| `range-out-of-bounds` | Non-`ok` → non-fatal UI state (FR-029). |
| `languageId` | string \| undefined | For Shiki grammar selection (by file extension). |
| `highlightedHtml` | string \| undefined | Present when `ok`. |
| `highlightRange` | { start, end } \| undefined | 1-indexed lines to emphasize. |
