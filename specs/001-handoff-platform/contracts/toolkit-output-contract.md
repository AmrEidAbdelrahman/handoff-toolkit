# Contract: Toolkit Output

**Version**: 1.1 | **Date**: 2026-05-26
**Producer**: Handoff Toolkit (`.handoff/toolkit/`)
**Consumer**: Handoff VS Code Extension

This contract defines what the toolkit MUST produce for the extension to function correctly. It is the formal boundary between Phase 1 (toolkit) and Phase 2 (extension).

---

## Output Location

All output lives under `.handoff/output/` and is committed to the repository.

```
.handoff/output/
├── index.json          ← master manifest (REQUIRED)
└── nodes/
    └── <id>.md         ← one file per section (1 or more REQUIRED)
```

---

## index.json Contract

The toolkit MUST produce a valid `index.json` conforming to:

```json
{
  "schema_version": 1,
  "project_name": "<non-empty string>",
  "generated_at": "<ISO 8601 datetime>",
  "generated_at_sha": "<40-char hex SHA or omitted>",
  "nodes": [
    {
      "id": "<lowercase-hyphenated>",
      "title": "<non-empty, max 120 chars>",
      "depth": "core | supporting | peripheral",
      "dependencies": ["<node-id>"],
      "file": "nodes/<id>.md"
    }
  ]
}
```

**Ordering rule**: `nodes` array MUST be ordered core → supporting → peripheral.

**Consistency rule**: Every node `id` in `nodes[]` MUST have a corresponding file at the listed `file` path. No orphaned entries; no orphaned files.

---

## Node File Contract

Each node file at `nodes/<id>.md` MUST:

1. Have a filename matching its `id` field (e.g., `id: auth-module` → `auth-module.md`)
2. Begin with valid YAML frontmatter delimited by `---`
3. Include all required frontmatter fields: `id`, `title`, `depth`, `schema_version: 1`, `code_refs` (min 1)
4. Each `code_ref` MUST have `file` (non-empty) and `note` (non-empty, max 200 chars)
4a. MAY include `inferred_fields: [string]` listing AI-inferred fields not yet confirmed by the giver. Valid values: `business_context`, `depth`, `decisions`, `warnings`. Absent or empty list means fully confirmed.
5. Markdown body MUST contain `## Business Context` and `## Technical Context` (in that order, non-empty)
6. Optional sections `## Decisions` and `## Warnings` MUST appear after `## Technical Context` if present
7. Body MUST NOT contain H1 headings

The full validation ruleset is defined in `Handoff_Node_Schema_Spec.md` (v1.0).

---

## Guarantee to Extension

If the toolkit output passes all validation rules above, the extension MUST be able to:
- Parse `index.json` and enumerate all nodes
- Parse every node file and extract all content sections
- Render the section tree grouped by depth
- Navigate to every code reference that exists in the current workspace

---

## Breaking Changes

If the schema changes in a breaking way, `schema_version` MUST be incremented. The extension MUST check `schema_version` before parsing and display a user-actionable warning for unsupported versions rather than failing silently.
