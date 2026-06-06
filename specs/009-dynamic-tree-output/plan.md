# Implementation Plan: Dynamic Tree Output Structure

**Branch**: `009-dynamic-tree-output` | **Date**: 2026-06-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-dynamic-tree-output/spec.md`

## Summary

Add a `parent` field to the node schema (both node frontmatter and `index.json` entries), enabling any output to form an arbitrarily deep project-shaped tree. The extension's sidebar renders whatever tree the toolkit produces — no project-type knowledge required. The toolkit gains a tree-inference step that scans the codebase, decides on an appropriate grouping structure, writes parent/grouping nodes with meaningful content, and assigns `parent` fields on all child nodes. The schema stays at version 1 (additive optional field); all existing outputs remain valid.

The extension already has `buildTree()`, cycle detection, parent-based nesting, and `ParsedNode.parent?` in place (from feature 007). This feature wires in the missing data plumbing (`IndexEntry.parent`, index loader, validation) and adds the toolkit intelligence that produces parent-aware output.

## Technical Context

**Language/Version**: Markdown + AI instruction language (toolkit files); TypeScript (VS Code extension)

**Primary Dependencies**:
- `.handoff/toolkit/rules/output-schema.md` — schema validation rules (add Rule OP-18)
- `.handoff/toolkit/skills/handoff-start/SKILL.md` — generator skill (add Step 2.4 tree inference)
- `Handoff_Node_Schema_Spec.md` — schema spec document (document `parent` field)
- `extension/src/handoff/types.ts` — add `parent?: string` to `IndexEntry`
- `extension/src/handoff/indexLoader.ts` — extract `parent` from index JSON node entries
- `extension/src/handoff/validation.ts` — add `validateParent()`, Rules IX-04 and IX-05
- `extension/src/handoff/tree.ts` — already correct, no changes needed
- `extension/src/workspace/outputRepository.ts` — already correct (builds `parentById` from parsed nodes); update to also source `parent` from `IndexEntry` as fallback

**Storage**: `.handoff/output/` (node files + `index.json`); `.handoff/session.json` (toolkit-internal `proposed_tree`)

**Testing**: Unit tests (`extension/tests/unit/`) for indexLoader and validation changes; integration tests (`extension/tests/integration/`) for end-to-end tree rendering; fixture update for sample-workspace

**Target Platform**: AI instruction Markdown (consumed by Claude); TypeScript (VS Code extension)

**Project Type**: AI instruction toolkit + VS Code extension

**Performance Goals**: No regression. Tree building is O(n) in node count — no concern at documentation scale.

**Constraints**:
- `schema_version` stays at `1` — additive optional field only
- All existing outputs (no `parent` field) must continue to load and render correctly
- Reserved roots (`project-overview`, `technical-overview`) must not accept a `parent` field
- No new `doc_type` — grouping nodes use existing `handover_node` type

**Scale/Scope**: Affects all toolkit-generated outputs; extension renders any depth of nesting

## Constitution Check

The project constitution is an unfilled template — no project-specific gates apply. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/009-dynamic-tree-output/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── schema-changes.md   # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source changes (repository root)

```text
# Toolkit (AI instruction Markdown)
Handoff_Node_Schema_Spec.md                     — document parent field (§3, §5, §7)
.handoff/toolkit/rules/output-schema.md         — add Rule OP-18 (parent field)
.handoff/toolkit/skills/handoff-start/SKILL.md  — add Step 2.4 (tree inference + proposed_tree)

# Extension (TypeScript)
extension/src/handoff/types.ts          — IndexEntry.parent?: string
extension/src/handoff/indexLoader.ts    — extract parent from index node entries
extension/src/handoff/validation.ts     — validateParent(), IX-04, IX-05

# Tests + fixtures
extension/tests/unit/indexLoader.test.ts     — parent extraction + validation
extension/tests/unit/validation.test.ts      — Rules IX-04, IX-05
extension/tests/integration/fixtures/
  sample-workspace/.handoff/output/index.json   — add parent fields to fixture
  sample-workspace/.handoff/output/nodes/*.md   — add parent fields to fixture nodes
```

**Structure Decision**: All changes are additive. No new directories. The toolkit changes are Markdown instruction edits; the extension changes are TypeScript with accompanying test updates.

---

## Implementation Phases

### Phase A — Schema Specification (toolkit docs)

Update the schema specification documents to formally define the `parent` field.

**A1 — `Handoff_Node_Schema_Spec.md`**
- Add `parent` to the Optional Fields table in §3 (Frontmatter Fields)
- Add reserved root node IDs section: `project-overview` and `technical-overview` may not have `parent`
- Update the Index Schema in §5 to include `parent` in node entries (optional)
- Add Rule for `parent` in §7 (Validation Rules): must not be self-referential, must not create cycle, must not be set on reserved roots; dangling reference → warning
- Update examples in §8 and §9 to show `parent` field in use

**A2 — `output-schema.md`**
- Add **Rule OP-18**: `parent` field validation (pattern, self-ref prohibition, cycle prohibition, reserved-root prohibition)
- Add **Rule IX-04**: index entry `parent` must reference a present id; missing reference → warning
- Add **Rule IX-05**: reserved root ids must not have `parent` in index entry

---

### Phase B — Extension: data plumbing

Wire `parent` through the extension's data layer so the tree algorithm receives it from both the index and the node files.

**B1 — `types.ts`**: Add `parent?: string` to `IndexEntry`

**B2 — `indexLoader.ts`**: Extract `parent` from each index node entry:
```typescript
parent: typeof n.parent === 'string' && n.parent.trim() !== '' ? n.parent.trim() : undefined,
```

**B3 — `validation.ts`**: Add `validateParent()` and call it from `validateIndex()`:
- Rule IX-04: if `parent` present and the referenced id is not in the known id set → warning `INDEX_DANGLING_PARENT`
- Rule IX-05: if a reserved root id (`project-overview`, `technical-overview`) has `parent` set → warning `INDEX_ROOT_HAS_PARENT`

Add `crossCheckParents(entries: IndexEntry[]): ValidationIssue[]` function alongside `crossCheckIndex`.

**B4 — `outputRepository.ts`**: The current code builds `parentById` from parsed node files. Update `fromIndexEntries` call to also consult `IndexEntry.parent` as a fallback when a node file's `parent` is undefined (so tree works even if a node file hasn't been read yet):
```typescript
const parentById = new Map(
  manifest.nodes.map((e) => [e.id, nodeById.get(e.id)?.parent ?? e.parent])
);
```

---

### Phase C — Toolkit: tree inference instruction

Add Step 2.4 to `handoff-start/SKILL.md` to infer the tree shape and write `proposed_tree` to `session.json`.

**C1 — New Step 2.4: Infer tree shape**

Insert after Step 2.3 (which writes `pending_sections`). The step:

1. Reads the domains identified in Step 2.2 and the manifest files read in Step 2.1.
2. Determines project type using these signals in order:
   - **Backend API**: presence of `urls.py`, `routes.*`, `router.*`, `views.*`, `controllers.*` in multiple directories → groupings: `modules` (per domain), `api` (routes), `infrastructure`
   - **React/Vue/Angular frontend**: presence of `components/`, `pages/`, `views/` directories or `react`/`vue`/`angular` in `package.json` → groupings: `pages`, `components`, `state-management` (if state dir found), `infrastructure`
   - **Microservices**: presence of multiple `docker-compose` service definitions or multiple independent `package.json`/`pyproject.toml` at the second level → each service becomes a root; groupings are per-service
   - **Library**: presence of `src/` + `lib/` only, no route files, no UI dirs → groupings: `core`, `api` (public surface), `infrastructure`
   - **Fallback**: if none of the above apply → minimal tree (`project-overview`, `technical-overview` only, all domains as root-level nodes)

3. Constructs `proposed_tree` mapping each planned node id to its parent id (or `null` for roots). Always includes `project-overview: null` and `technical-overview: null`.

4. Writes `proposed_tree` to `session.json`.

**C2 — Update Steps 3.x (node writing) to use `proposed_tree`**

Each node written during Part 3 reads its parent from `proposed_tree[node_id]`. If the node id is not in `proposed_tree`, it is written as root-level (no `parent`).

**C3 — New grouping node generation**

For each non-null parent id in `proposed_tree` that is not itself a leaf domain node (i.e., it appears only as a `parent` value, not as a `pending_sections` entry), the toolkit generates a grouping node with:
- `id`: the grouping id (e.g., `modules`, `services`, `api`)
- `title`: human-readable label (e.g., "Modules", "Services", "API Layer")
- `depth`: `supporting` (or `core` for the main business/technical groupings)
- `parent`: null (root-level groupings) or another grouping id (e.g., `services` parent of `user-service` in a microservices layout)
- `code_refs`: absent (grouping nodes rarely have direct code refs)
- `## Business Context`: explains why this grouping exists in the project
- `## Technical Context`: describes how the pieces within it relate to each other

---

### Phase D — Tests and fixtures

**D1 — Unit tests: `indexLoader.test.ts`**
- Test that `parent` is extracted from index entry when present
- Test that absence of `parent` maps to `undefined` (not `null`)
- Test that a non-string `parent` is silently discarded

**D2 — Unit tests: `validation.test.ts`**
- Rule IX-04: dangling `parent` reference → warning `INDEX_DANGLING_PARENT`
- Rule IX-05: `project-overview` with `parent` → warning `INDEX_ROOT_HAS_PARENT`
- No warning when `parent` references a present id

**D3 — Fixture update: `sample-workspace`**
- Update `sample-workspace/.handoff/output/index.json` to add `parent` fields on existing nodes (e.g., `authentication` → `parent: "technical-overview"`, `dev-environment` → no parent or `parent: "infrastructure"`)
- Update corresponding node `.md` files to add `parent` to frontmatter
- Add at least one grouping node to the fixture to exercise nested rendering

**D4 — Integration test: tree rendering**
- Verify the extension loads the updated fixture and renders a nested tree (parent → child visible in sidebar model)
- Verify a fixture with a dangling `parent` reference produces a warning but still loads
