# Contract (Consumed): Node Schema

**Direction**: Input to the extension. The extension is a *consumer* of this contract; the Handoff toolkit is the producer.

**Source of truth**: [`Handoff_Node_Schema_Spec.md`](../../../Handoff_Node_Schema_Spec.md) (repo root), version 1.0, `schema_version: 1`. That document governs; this file only records how the extension binds to it and where the brief and the schema diverge.

## What the extension relies on

- **Output location**: `.handoff/output/` with `index.json` and `nodes/{id}.md`. UTF-8, LF.
- **Index shape** (§5): `{ schema_version, project_name, generated_at, nodes: [{ id, title, depth, dependencies, file }] }`. Ordered core → supporting → peripheral.
- **Node frontmatter** (§3): required `id`, `title`, `depth`, `schema_version`, `code_refs[]` (≥1, each with `file` + `note`, optional `line`/`end_line`); optional `dependencies`, `tags`, `generated_at`.
- **Node body** (§4): H2 sections — required `## Business Context`, `## Technical Context`; optional `## Decisions`, `## Warnings`; in that order; no H1.
- **Validation** (§7): the extension re-implements these rules in `src/handoff/validation.ts` and treats failures as non-fatal `ValidationIssue`s.
- **Schema evolution** (§10): a non-`1` `schema_version` produces a warning but the extension still attempts to render.

## Documented divergences from the brief

| Item | Brief says | Schema (authoritative) says | Extension behavior |
|------|------------|-----------------------------|--------------------|
| `parent` field | Optional `parent` enables collapsible hierarchy | Not defined; index entries are only `{id,title,depth,dependencies,file}` | **Forward-compatible**: read `parent` if present and nest; function as flat depth-grouped tree otherwise. Inert against v1 output. |
| Inline code mentions | Clickable inline mentions in Technical Context | No inline-mention syntax defined | **Heuristic**: match inline `<code>` against the node's `code_refs`; matched spans become clickable. |
| `project-overview` / `technical-overview` | Special nodes pinned at top | Ordinary nodes by id convention | Recognized by id; pinned if present, omitted gracefully if absent. |

## Stability

The extension MUST NOT require the toolkit to change to satisfy this feature. Any reliance on `parent` or inline-mention tagging is best-effort over fields/signals that may or may not be present. The contract is consumed read-only; the extension never writes to `.handoff/output/`.
