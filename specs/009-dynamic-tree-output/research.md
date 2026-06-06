# Research: Dynamic Tree Output Structure

**Feature**: `009-dynamic-tree-output`
**Phase**: 0 — Research

---

## Decision 1: `parent` field placement — node frontmatter vs. index only vs. both

**Decision**: Both — `parent` lives in the node frontmatter AND in the index entry.

**Rationale**: The extension currently builds the tree by reading `parent` from parsed node files (`outputRepository.ts` builds `parentById` from `nodes.map(n => [n.id, n.parent])`). FR-007 requires the tree to be reconstructable from the index alone (so a lightweight consumer doesn't have to read every node file). The solution is to add `parent` to both: the index carries it for fast consumers; the node file is the authoritative source if they differ.

**Alternatives considered**:
- Index only: Would require a breaking change to how `outputRepository.ts` builds the parent map. Node files become incomplete without the index.
- Node frontmatter only (current state): Already wired in the extension. Doesn't satisfy FR-007. Fine for the extension but not for other consumers.

---

## Decision 2: Index `parent` field — required or optional?

**Decision**: Optional. Absence means root-level node.

**Rationale**: Backward compatibility. Existing `index.json` files have no `parent` field on their entries. Treating absence as root-level allows old outputs to load without modification. The extension already handles `parent: undefined` as root.

**Alternatives considered**:
- Required with `null` for roots: More explicit but breaks all existing outputs without migration.

---

## Decision 3: Reserved root node IDs

**Decision**: `project-overview` and `technical-overview` are the two reserved IDs that always appear in a valid output. Both are root-level (no `parent`). Both are expected to exist in any toolkit-generated output.

**Rationale**: Already established in the current schema spec and in `tree.ts` (`PINNED_IDS`). The extension pins them at the top of the sidebar tree. The spec formalises what the code already assumes.

**Alternatives considered**: No alternatives — this is a continuity decision, not a new design choice.

---

## Decision 4: Toolkit tree-inference strategy

**Decision**: The toolkit infers tree shape in a single new Step 2.4 (inserted after the existing domain identification in `handoff-start/SKILL.md`). It uses three signals in order: (1) framework/project-type signals from manifest files, (2) top-level source directory structure, (3) domain count vs. typical grouping heuristics.

**Rationale**: The handoff-start skill already scans the project in Steps 2.1–2.3. Step 2.4 uses the same scan results to decide what parent grouping nodes to create — no extra file reads required. The output is a `proposed_tree` structure written to `session.json` that subsequent steps use when writing parent fields.

**Alternatives considered**:
- Separate scan pass: Would duplicate the 2.1–2.3 work.
- LLM free-form inference at write time (no pre-planned tree): Too unpredictable — nodes written early in the session would have inconsistent parent assignments vs. nodes written later.
- Config file (user specifies tree): Rejected by spec — "no user configuration required."

---

## Decision 5: Parent node content — same format as leaf nodes?

**Decision**: Yes. Parent/grouping nodes are full handover nodes with `## Business Context` and `## Technical Context`, no `code_refs` required. They use the same schema as leaf nodes; the only difference is that they have children (nodes that reference their `id` via `parent`).

**Rationale**: The extension renders all nodes the same way — there's no "container-only" node type that lacks content. A `modules` parent node with a meaningful explanation of how the modules relate to each other is more useful than an empty folder label. The spec explicitly requires parent nodes to have non-empty Business and Technical Context (SC-003).

**Alternatives considered**:
- Separate `doc_type: group` for container nodes: More schema complexity. The existing `handover_node` type works fine for grouping nodes.

---

## Decision 6: Depth of parent nodes

**Decision**: Parent/grouping nodes are typically `depth: core` or `depth: supporting`. A `modules` or `services` grouping at the second level is `supporting`; `project-overview` and `technical-overview` are `core`. Leaf nodes inherit whatever depth the toolkit assigns based on importance.

**Rationale**: `depth` and `parent` are independent axes — depth controls read priority, parent controls tree position. A `services` grouping can be `supporting` even if some service leaf nodes are `core`.

---

## Decision 7: Cycle detection in `parent` references

**Decision**: The extension already implements cycle detection in `tree.ts` (`buildTree()`). The toolkit instructions should explicitly prohibit circular parent references (node A's `parent` points to node B whose `parent` points to node A). The schema adds an explicit rule: `parent` must not create a cycle.

**Rationale**: Cycles are already handled gracefully in the extension (the link is dropped). The schema rule makes the prohibition explicit so the toolkit generates clean output.

---

## Existing Extension State (what's already done vs. what's missing)

### Already implemented (no changes needed):
- `ParsedNode.parent?: string` — `types.ts`
- `nodeParser.ts` reads `parent` from node frontmatter
- `buildTree()` in `tree.ts` — full parent-based nesting, cycle detection, depth groups for unparented nodes
- `fromIndexEntries()` in `tree.ts` — accepts a `parentById` map
- `outputRepository.ts` — builds `parentById` from parsed nodes, wires it to `fromIndexEntries`
- `HandoffTreeProvider` — renders arbitrary depth nesting

### Needs implementation:
1. `IndexEntry.parent?: string` in `types.ts` — index entries don't carry parent yet
2. `indexLoader.ts` — doesn't extract `parent` from index JSON node entries
3. `validation.ts` — no `validateParent()` for dangling parent refs (should be warning, not error)
4. `crossCheckIndex` in `validation.ts` — should validate `parent` refs in index entries
5. Schema spec docs (`Handoff_Node_Schema_Spec.md`, `output-schema.md`) — `parent` not formally specified
6. `handoff-start/SKILL.md` — no tree-inference step, no parent field assignment instructions
7. `index.json` schema section in spec docs — `parent` not in index entry shape
