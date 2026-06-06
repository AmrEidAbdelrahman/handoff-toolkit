# Data Model: Dynamic Tree Output Structure

**Feature**: `009-dynamic-tree-output`

---

## 1. Node Frontmatter — `parent` field addition

The `parent` field is added as an optional field to the node schema.

```yaml
---
id: authentication              # required
title: Authentication           # required
depth: supporting               # required: core | supporting | peripheral
schema_version: 1               # required
parent: modules                 # NEW — optional. Must be the id of another node in the same output.
code_refs: []                   # optional (may be absent on grouping nodes)
---
```

### Rules

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `parent` | string | No | The `id` of another node in the same output. Absence means root-level. Must match `^[a-z0-9]+(-[a-z0-9]+)*$`. Must not create a cycle. Must not reference the node's own `id`. Reserved root nodes (`project-overview`, `technical-overview`) may not have a `parent`. |

---

## 2. Index Entry — `parent` field addition

The `index.json` node entries gain an optional `parent` field, enabling tree reconstruction from the index alone.

```json
{
  "schema_version": 1,
  "project_name": "MyApp",
  "generated_at": "2026-06-06T10:00:00Z",
  "nodes": [
    {
      "id": "project-overview",
      "title": "Project Overview",
      "depth": "core",
      "dependencies": [],
      "file": "nodes/project-overview.md"
    },
    {
      "id": "modules",
      "title": "Modules",
      "depth": "supporting",
      "dependencies": [],
      "file": "nodes/modules.md"
    },
    {
      "id": "authentication",
      "title": "Authentication",
      "depth": "supporting",
      "dependencies": [],
      "parent": "modules",
      "file": "nodes/authentication.md"
    },
    {
      "id": "billing",
      "title": "Billing",
      "depth": "supporting",
      "dependencies": [],
      "parent": "modules",
      "file": "nodes/billing.md"
    }
  ]
}
```

---

## 3. `IndexEntry` TypeScript type (extension `types.ts`)

```typescript
export interface IndexEntry {
  id: string;
  title: string;
  depth: Depth;
  dependencies: string[];
  file: string;
  parent?: string;   // NEW — absent means root-level
}
```

---

## 4. Tree model (unchanged — already correct)

The `TreeNode` and `buildTree()` algorithm in `tree.ts` already handles parent-based nesting correctly. No changes needed.

```
TreeNode {
  kind: 'pinned' | 'group' | 'node'
  id: string
  label: string
  depth?: Depth
  children: TreeNode[]
  collapsible: boolean
}
```

Tree construction rules (already implemented in `tree.ts`):
1. Reserved roots (`project-overview`, `technical-overview`) are always pinned at top, never nested.
2. Nodes with a valid `parent` reference are nested under their parent's `TreeNode`.
3. Nodes without a `parent` (or with a dangling/cyclic `parent`) are placed in depth groups.
4. Cycle detection: if following parent links loops back, the link is dropped.

---

## 5. `proposed_tree` in `session.json` (toolkit only)

The toolkit writes a `proposed_tree` to `session.json` during Step 2.4 so all subsequent node-writing steps use consistent parent assignments.

```json
{
  "status": "in_progress",
  "project_name": "MyApp",
  "proposed_tree": {
    "project-overview": null,
    "technical-overview": null,
    "modules": null,
    "authentication": "modules",
    "billing": "modules",
    "notifications": "modules",
    "services": null,
    "user-service": "services",
    "payment-service": "services",
    "api": null,
    "auth-endpoints": "api",
    "user-endpoints": "api",
    "infrastructure": null,
    "database": "infrastructure",
    "dev-environment": "infrastructure"
  },
  "pending_sections": [...],
  "completed_nodes": [...],
  ...
}
```

`proposed_tree` is a flat map of `{ node-id → parent-id | null }`. The toolkit reads this when writing each node to assign the correct `parent` value in the frontmatter and index entry.

---

## 6. Validation rules (new)

### Node-level (added to `output-schema.md` as Rule OP-18)

**Rule OP-18**: If `parent` is present in a node's frontmatter, it must:
- Be a non-empty string matching `^[a-z0-9]+(-[a-z0-9]+)*$`
- Not equal the node's own `id`
- Not create a circular reference chain
- Not be set on reserved root nodes (`project-overview`, `technical-overview`)

Absence of `parent` is valid — it means the node is root-level.

### Index-level (added to `validation.ts`)

**Rule IX-04**: If `parent` is present in an index entry, it must reference an `id` that exists elsewhere in the same index. A missing reference is a warning (the node is rendered at root level), not an error.

**Rule IX-05**: Reserved root node IDs (`project-overview`, `technical-overview`) must not have a `parent` field in the index.

---

## 7. Minimum valid tree

Any output produced by the toolkit must contain at minimum:

```
project-overview    (depth: core, no parent)
technical-overview  (depth: core, no parent)
```

All other nodes are optional. A project too small or ambiguous to classify may produce only these two nodes.

---

## 8. Typical tree shapes by project type

The toolkit uses these as reference patterns. Actual shapes may vary.

### Node.js API / Django / Rails backend
```
project-overview
technical-overview
modules/           (supporting, no parent)
  <domain>/        (supporting, parent: modules)
    <sub-feature>/ (supporting, parent: <domain>)
services/          (supporting, no parent — if separate service layer exists)
  <service>/       (supporting, parent: services)
api/               (supporting, no parent)
  <domain>-endpoints/ (supporting, parent: api)
infrastructure/    (peripheral, no parent)
  database/        (peripheral, parent: infrastructure)
  dev-environment/ (peripheral, parent: infrastructure)
```

### React / Vue / Angular frontend
```
project-overview
technical-overview
pages/             (supporting, no parent)
  <page>/          (supporting, parent: pages)
components/        (supporting, no parent)
  <component-system>/ (supporting, parent: components)
state-management/  (supporting, no parent)
  <store>/         (supporting, parent: state-management)
infrastructure/    (peripheral, no parent)
  routing/         (peripheral, parent: infrastructure)
  api-client/      (peripheral, parent: infrastructure)
```

### Microservices
```
project-overview
technical-overview
<service-a>/       (core/supporting, no parent — each service is a root)
  modules/         (supporting, parent: <service-a>)
  api/             (supporting, parent: <service-a>)
<service-b>/       (core/supporting, no parent)
  ...
infrastructure/    (peripheral, no parent — shared infra)
```
