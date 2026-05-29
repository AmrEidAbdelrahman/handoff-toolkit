# Data Model: Handoff — Interactive Developer Handover Tool

**Phase**: 1 | **Date**: 2026-05-23 | **Updated**: 2026-05-26 | **Plan**: [plan.md](plan.md)

---

## Entities

### 1. HandoverIndex

**File**: `.handoff/output/index.json`
**Owner**: Toolkit (writes), Extension (reads)
**Git status**: Committed

```json
{
  "schema_version": 1,
  "project_name": "string",
  "generated_at": "ISO 8601 datetime",
  "generated_at_sha": "string (40-char hex git SHA, omitted if no git history)",
  "nodes": [
    {
      "id": "string",
      "title": "string",
      "depth": "core | supporting | peripheral",
      "dependencies": ["string"],
      "file": "nodes/{id}.md"
    }
  ]
}
```

**Validation rules**:
- `schema_version` must equal `1`
- `project_name` must be non-empty
- `nodes` array must be ordered: core → supporting → peripheral
- Each node entry: `id`, `title`, `depth`, `file` are required; `dependencies` defaults to `[]`
- No duplicate `id` values
- Every `file` value must point to an existing file in `nodes/`
- Every `.md` file in `nodes/` must have a corresponding entry here

---

### 2. HandoverNode

**File**: `.handoff/output/nodes/<id>.md`
**Owner**: Toolkit (writes), Extension (reads)
**Git status**: Committed
**Format**: Markdown with YAML frontmatter

**Frontmatter schema**:

```yaml
# Required
id: string              # lowercase, hyphenated, max 60 chars, matches filename
title: string           # max 120 chars
depth: core | supporting | peripheral
schema_version: 1       # must be integer 1 for this version
code_refs:
  - file: string        # relative path from repo root, forward slashes
    note: string        # max 200 chars, required
    line: integer       # optional, 1-indexed
    end_line: integer   # optional, only valid when line is set, end_line >= line

# Optional
dependencies: [string]  # IDs of related nodes; each must exist in index
tags: [string]          # lowercase, hyphenated, max 10 tags
generated_at: string    # ISO 8601 datetime
inferred_fields: [string]  # fields the AI inferred during /handoff-start; absent or [] once fully confirmed
                           # valid values: business_context, depth, decisions, warnings
```

**Body schema** (H2 sections, fixed order):

```markdown
## Business Context
[Required — at least one non-empty paragraph]

## Technical Context
[Required — at least one non-empty paragraph]

## Decisions
[Optional — at least one list item if section is present]

## Warnings
[Optional — at least one list item if section is present]
```

**Validation rules** (enforced by `/handoff-validate`):
- `id` matches filename (without `.md`), conforms to `^[a-z0-9]+(-[a-z0-9]+)*$`
- `title` non-empty, max 120 chars
- `depth` is one of: core, supporting, peripheral
- `schema_version` equals `1`
- `code_refs` has at least one entry; each entry has non-empty `file` and `note`
- `## Business Context` exists and is non-empty
- `## Technical Context` exists and is non-empty
- No H1 headings in body
- Sections appear in order: Business Context → Technical Context → Decisions → Warnings
- `inferred_fields` is optional; if present, each value must be one of: `business_context`, `depth`, `decisions`, `warnings`

---

### 3. SessionCache

**File**: `.handoff/session.json`
**Owner**: Toolkit (reads + writes)
**Git status**: Gitignored

```json
{
  "status": "in_progress | paused | complete",
  "started_at": "ISO 8601 datetime",
  "project_name": "string",
  "pending_sections": ["string"],
  "completed_nodes": ["string"],
  "current_section": "string | null"
}
```

**Validation rules**:
- `status` must be one of: `in_progress`, `paused`, `complete`
- `completed_nodes` contains valid node IDs (lowercase, hyphenated)
- `current_section` is the section currently being drafted, or null if between sections

**State transitions**:

```
(none) → in_progress        [/handoff-start invoked, no existing session]
(none) → in_progress        [/handoff-start invoked, existing complete session — delta re-run from stored SHA]
paused → in_progress        [/handoff-start invoked, existing paused session — resumes]
in_progress → paused        [giver signals pause or closes session mid-way]
in_progress → complete      [all sections drafted autonomously; SHA recorded]
complete → reviewing        [/handoff-review invoked; nodes with inferred_fields are pending review]
reviewing → paused_review   [giver exits /handoff-review mid-way]
paused_review → reviewing   [/handoff-review invoked again — resumes from first node with inferred_fields]
reviewing → complete        [all nodes confirmed or corrected; inferred_fields cleared]
```

**Review resumption cursor**: No explicit pointer field needed. On `/handoff-review` invocation, the AI scans nodes in index order and starts from the first node that still contains a non-empty `inferred_fields` list. Fully-confirmed nodes (empty or absent `inferred_fields`) are skipped automatically.

---

### 4. CodeReference

**Embedded in**: HandoverNode YAML frontmatter (`code_refs` array)
**Owner**: Toolkit (writes), Extension (reads and navigates)

```typescript
interface CodeReference {
  file: string;       // relative path from repo root, forward slashes only
  note: string;       // description, max 200 chars
  line?: number;      // optional, 1-indexed
  end_line?: number;  // optional, only valid when line is set
}
```

**Navigation behaviour** (extension):
- If `file` exists in current workspace: open with `vscode.workspace.openTextDocument`, reveal `line` with `editor.revealRange`
- If `file` does not exist: run `git show <generated_at_sha>:<file>` to retrieve content at recorded SHA; open in read-only temp document
- If `file` does not exist and SHA is unavailable: display inline error — "File not found and no git history available to resolve"
- If `line` is absent: open file at top

---

## Entity Relationships

```
HandoverIndex
  └── nodes[] ──────────────── references ──► HandoverNode (by id + file path)
                                                └── code_refs[] ──► CodeReference
                                                └── dependencies[] ─► HandoverNode.id

SessionCache
  └── completed_nodes[] ──── tracks progress of ──► HandoverNode.id
  └── pending_sections[] ─── queued drafts (pre-node creation)
```

---

## Extension In-Memory Types

These are TypeScript types used internally by the extension — not persisted.

```typescript
interface IndexEntry {
  id: string;
  title: string;
  depth: 'core' | 'supporting' | 'peripheral';
  dependencies: string[];
  file: string;
}

interface ParsedIndex {
  schemaVersion: number;
  projectName: string;
  generatedAt: string;
  generatedAtSha?: string;
  nodes: IndexEntry[];
}

interface ParsedNode {
  id: string;
  title: string;
  depth: 'core' | 'supporting' | 'peripheral';
  schemaVersion: number;
  codeRefs: CodeReference[];
  dependencies: string[];
  tags: string[];
  generatedAt?: string;
  inferredFields: string[];  // fields still pending giver review; empty array = fully confirmed
  businessContext: string;   // markdown string
  technicalContext: string;  // markdown string
  decisions?: string;        // markdown string
  warnings?: string;         // markdown string
}

type ReadProgress = Record<string, boolean>;  // nodeId → isRead
```
