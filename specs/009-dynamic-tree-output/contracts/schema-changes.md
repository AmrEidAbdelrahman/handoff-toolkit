# Contract Changes: Dynamic Tree Output Structure

**Direction**: Producer (toolkit) → Consumer (extension + any future reader)

**Schema version**: Remains `1` — `parent` is an additive optional field. No version bump required. Old outputs remain valid (all nodes treated as root-level).

---

## Node Frontmatter Contract (additive change)

### New optional field: `parent`

```yaml
parent: <id>   # optional string — id of the parent node in the same output
```

| Constraint | Value |
|-----------|-------|
| Type | string |
| Required | No |
| Pattern | `^[a-z0-9]+(-[a-z0-9]+)*$` |
| Self-reference | Prohibited (`parent` must not equal `id`) |
| Cycles | Prohibited (chain must not loop back) |
| Reserved roots | `project-overview` and `technical-overview` must not have `parent` |
| Absence | Valid — node is treated as root-level |

---

## Index Entry Contract (additive change)

### Updated `index.json` node entry shape

```json
{
  "id": "authentication",
  "title": "Authentication",
  "depth": "supporting",
  "dependencies": [],
  "parent": "modules",        // NEW — optional
  "file": "nodes/authentication.md"
}
```

When `parent` is absent or null, the node is root-level. When present, it must match the `id` of another entry in the same `nodes` array.

---

## Reserved Root Node Contract

Two node IDs are reserved and always expected to be present in toolkit-generated output:

| ID | Title convention | Depth | Parent |
|----|-----------------|-------|--------|
| `project-overview` | "Project Overview" | `core` | none (root) |
| `technical-overview` | "Technical Overview" | `core` | none (root) |

The extension already pins these at the top of the sidebar. This contract formalises what the extension already assumes.

---

## Backward Compatibility Guarantee

- Any existing `index.json` or `nodes/*.md` file without a `parent` field loads without errors.
- Nodes with a dangling `parent` reference (the referenced id does not exist) are treated as root-level and produce a warning, not an error.
- The `schema_version` stays at `1` — no migration required.

---

## `session.json` Contract (toolkit-internal)

The `session.json` gains a `proposed_tree` key during Step 2.4. This is an internal toolkit contract — the extension never reads `session.json`.

```json
{
  "proposed_tree": {
    "<node-id>": "<parent-id> | null"
  }
}
```
