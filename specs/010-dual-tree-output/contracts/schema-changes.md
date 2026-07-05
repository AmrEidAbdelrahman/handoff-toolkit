# Contract: Schema Changes for Dual-Tree Output

## Additive Changes (no breaking changes)

### 1. `session.json` — new fields

Two new top-level fields added alongside any existing fields:

```json
{
  "proposed_business_tree": { "<node-id>": "<parent-id> | null" },
  "proposed_technical_tree": { "<node-id>": "<parent-id> | null" },
  "cross_references": { "<node-id>": ["<dep-id>", ...] }
}
```

Existing `proposed_tree` field (from feature 009) is **deprecated** — new toolkit sessions use `proposed_business_tree` + `proposed_technical_tree` instead. Old `session.json` files without these fields continue to work (the toolkit treats absent fields as empty maps).

### 2. `index.json` — no schema change

The `parent` and `dependencies` fields already exist. `business` and `technical` nodes use them exactly as any other node would.

### 3. Node frontmatter — no schema change

`parent`, `dependencies`, `code_refs` all already exist and are unchanged.

---

## Behavioral Changes (extension)

### Removed: `technical-overview` as pinned root

- `PINNED_IDS` in `tree.ts`: `['project-overview', 'technical-overview']` → `['project-overview']`
- `RESERVED_ROOT_IDS` in `validation.ts`: removes `'technical-overview'`

**Impact on existing output**: Any `index.json` that contains a node with `id: "technical-overview"` will render that node as a regular depth-group member instead of a pinned root. No errors. No migration needed.

**Impact on validation**: `INDEX_ROOT_HAS_PARENT` (IX-05) will no longer fire for `technical-overview` nodes that have a `parent` field set. This is correct behavior — `technical-overview` is no longer a reserved root.

---

## Backward Compatibility Matrix

| Scenario | Before 010 | After 010 | Status |
|----------|-----------|-----------|--------|
| Output with `technical-overview` pinned node | Renders pinned at top | Renders in core depth group | Safe — no errors |
| Output without `technical-overview` | Works normally | Works normally | No change |
| Output with `business`/`technical` parent nodes | Renders in depth groups | Renders in depth groups (collapsible) | No change |
| `session.json` with only `proposed_tree` | Used for generation | Ignored (no dual tree) | Safe — new fields optional |
| `session.json` with `proposed_business_tree` | Field unknown | Used for generation | New behavior |
