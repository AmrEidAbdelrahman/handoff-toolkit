---
name: handoff-start
description: Autonomously document a project for developer handover — no giver input required
---

# Handoff Start

This skill runs a fully autonomous project documentation session. It scans the codebase, infers all node content from code signals, writes output nodes, and completes without asking the giver questions — except as a last resort for truly unknowable required fields.

Read this skill completely before taking any action. Follow every part in sequence. All file paths are relative to the project root.

---

## Part 1 — Session Initialisation

### Step 1.1 — Read the session protocol

Read `.handoff/toolkit/rules/session-protocol.md` completely. Follow those rules exactly throughout this session.

### Step 1.2 — Determine session state

Attempt to read `.handoff/session.json`. Determine which case applies per session-protocol.md Rule 1 and act accordingly:

- **Case A (no session.json)**: Derive `project_name` from the repository root folder name (check the README for a more descriptive name if available). Write initial `session.json` with `status: "in_progress"`, `pending_sections: []`, `completed_nodes: []`, `current_section: null`, and `started_at` set to the current ISO 8601 timestamp. Proceed to Part 2.

- **Case B (status: "paused")**: Announce how many nodes are complete and which sections remain. Set `status: "in_progress"` in session.json and write it. Skip Part 2 — proceed directly to Part 3 using the existing `pending_sections` list.

- **Case C (status: "complete")**: Check `index.json` for `generated_at_sha`. If present, enter delta re-run mode (see Part 4). If absent, stop and ask the giver whether to start a fresh session or exit.

- **Case D (status: "in_progress")**: Treat as Case B. Announce that the previous session was interrupted and resume from the first section in `pending_sections`. Skip Part 2.

- **Case E (status: "reviewing" or "paused_review")**: Stop immediately. Tell the giver: "This project is in review mode. Run `/handoff-review` to continue." Do not proceed.

Do not proceed past Step 1.2 until session state is resolved and written to disk.

---

## Part 2 — Autonomous Project Scan

Run Part 2 only on a fresh session (Case A). For resumes and delta re-runs, skip to Part 3 or Part 4.

### Step 2.1 — Scan the project structure

Read the following in order:
1. Any README file at the project root (`README.md`, `README.rst`, `README.txt`, or similar)
2. Top-level directory listing
3. Key manifest files if present: `package.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod`, `Makefile`, `docker-compose.yml`
4. One level of sub-directory listing inside the main source directories (`src/`, `lib/`, `app/`, `pkg/`, `internal/`, or equivalent)

Read file contents only for README and manifest files in this step. Scan names and structure for everything else.

### Step 2.2 — Identify business domains

Derive business domains from what the code *does*, not from directory names. Apply the following four-signal priority stack:

**Signal 1 — README**: Scan for section headings and feature descriptions that name capabilities (e.g., "User Authentication", "Tournament Management"). Extract named capabilities as candidate domain names.

**Signal 2 — Framework app boundaries + models**: For each top-level directory that contains an entry-point file (`__init__.py`, `index.*`, `mod.rs`, `package.json`, `app.py`) or a `models.py` / `models/` directory, treat it as a domain candidate. Read `models.py` or the models directory to understand what business entities it manages. The model names (not the directory name) inform the domain name.

**Signal 3 — Route and URL registrations**: Look for `urls.py`, `routes.*`, `router.*`, `handlers.*`. Group URL paths into the domains they implement (e.g., `/api/users/`, `/api/auth/` → "User Management"; `/api/competitions/` → "Competition Management").

**Signal 4 — Import topology for cross-cutting detection**: For each candidate directory, count how many other directories import from it. If a directory is imported by 3 or more others AND has no business models of its own (only utility functions, base classes, middleware, config loaders) → mark it as **cross-cutting infrastructure**, not a domain.

**Domain naming rule**: Name domains in plain English using business language, not directory names. Derive the name from the models and routes found, not the folder name. Examples:
- `users/` with `User`, `Profile` models → "User Management" (or "User Profiles & Authentication" if auth logic is present)
- `competition/` with `Competition`, `Team`, `Match` models → "Competition Management"
- `social/` with `Follow`, `Post`, `Like` models → "Social Features"
- `common/` with only helpers, no models → cross-cutting infrastructure
- For any domain where Signal 1–3 yield no clear name: use the directory name in Title Case as a fallback

**Consolidation**: If two directories clearly implement the same business domain (e.g., `auth/` and `users/` both handle user identity), merge them into a single domain. Record both directory paths for Step 2.3.

**Fallback for very small projects**: If fewer than 3 meaningful domain candidates are found, treat the entire project as a single domain and document it as one node.

The number of domains is determined by the project's natural seams — no fixed target.

### Step 2.3 — Write pending_sections

Write the identified domain names to `pending_sections` in `session.json`. Each entry is the domain name (plain English). Additionally, record the associated directory paths for each domain so Step 3.2 knows where to read files.

Use this extended session.json structure for `pending_sections`:

```json
"pending_sections": [
  { "name": "User Management", "directories": ["users/", "auth/"] },
  { "name": "Competition Management", "directories": ["competition/"] },
  { "name": "Cross-Cutting Infrastructure", "directories": ["common/", "services/"], "cross_cutting": true }
]
```

Write the complete session.json object. Do not present this list to the giver for confirmation — proceed immediately.

Print a brief status line: "Identified N business domains. Documenting autonomously..."

---

## Part 2a — Architecture Overview Generation (run once, immediately after Step 2.3)

Run Part 2a before any domain nodes are documented. This produces the first node saved to output.

### Step 2a.1 — Draft the system architecture diagram

Create a `flowchart TD` Mermaid diagram where each node represents one business domain identified in Step 2.2. Use the domain names (not directory names) as node labels. Add directed edges between domains that import from or call each other (infer from the import topology built in Step 2.2, Signal 4). Mark the cross-cutting infrastructure node (if present) with edges from all domains that depend on it.

Apply the element naming convention from `diagram-methodology.md` § 2.2: lowercase-hyphen labels (e.g., `user-management`, `competition-management`).

Run the four-point diagram validation from `diagram-methodology.md` § 2.4 before proceeding.

### Step 2a.2 — Draft the architecture overview node body

Build the following sections:

**`## Business Context`**: 2–4 sentences from the project README and manifests. Describe what the project does, who it serves, and what would break for users if it stopped working.

**`## Technical Context`**: One paragraph summarising the technology stack (language, framework, key libraries, deployment model). Then a `### Domains` subsection with one bullet per business domain: `- **<Domain Name>**: <one-sentence description of the domain's business purpose>`. If a cross-cutting infrastructure node exists, add a `### Cross-Cutting Infrastructure` subsection with one paragraph describing shared utilities.

**`## Diagrams`**: The system architecture diagram from Step 2a.1, using the required H3 + description + fenced mermaid block structure from `diagram-methodology.md` § 2.3.

### Step 2a.3 — Save the architecture overview node

First, apply citations and tags to the body drafted in Step 2a.2:
- Every sentence in the `## Business Context` section must carry a trailing `(src: …)` citation (same convention as Step 5.3 — `README §<heading>`, `<relative-path>:<line>`, `commit <sha7>`, or `inferred`). The `### Domains` bullets under `## Technical Context` do not require citations.
- Assign `confidence_tags` for `business_context` using the Step 5.2 rules (`high` if drawn from an explicit README description; `medium` if drawn from the set of model/route names; `low` if only from directory names). Honour the three-way link rule: a `business_context` resting on `(src: inferred)` is `low`.

Then run the **quality refinement pass (Part 5d)** on this node: read the rubric, score the applicable dimensions (`snippet_relevance` is N/A — the architecture overview has no inline snippets), rewrite any dimension scoring 0, and record the final `quality_score`.

Assemble the complete node file:

```
---
id: architecture-overview
title: Architecture Overview
depth: core
schema_version: 1
diagram_format: mermaid
generated_at: <current ISO 8601 timestamp>
inferred_fields:
  - business_context
confidence_tags:
  business_context: <high | medium | low>
quality_score:
  business_value_clarity: <1 | 2>
  why_coverage: <1 | 2>
  actionability: <1 | 2>
  no_unsupported_claims: <1 | 2>
---

<body from Step 2a.2, with citations applied>
```

1. Write to `.handoff/output/nodes/architecture-overview.md`
2. Create or update `index.json`: add the architecture overview as position-0 entry:
   ```json
   { "id": "architecture-overview", "title": "Architecture Overview", "depth": "core", "dependencies": [], "file": "nodes/architecture-overview.md" }
   ```
   If `index.json` does not exist yet, create it with the standard initial structure plus this node.
3. Print: "✓ Architecture Overview (core)"

---

## Part 2c — Business Document Planning (run once, after Part 2a, before domain node documentation)

Run Part 2c immediately after Part 2a. Business documents are drafted and saved here — before any domain nodes are written. Exception: the Onboarding Guide is saved last (in Part 5c.4) because it references the complete node list.

### Step 2c.1 — Scan for ADR signals

Re-read the files collected during the project scan and check for ADR detection signals as defined in `diagram-methodology.md` § 3.1. For each detected signal:
- Note which domain it belongs to
- Draft the ADR title and core decision
- Record it in a list: `[(domain_name, decision_title), ...]`

### Step 2c.2 — Scan for Runbook signals

Check for Runbook detection signals as defined in `diagram-methodology.md` § 3.2. For each detected signal:
- Identify the procedure it represents
- Record it in a list: `[(signal_file, procedure_title), ...]`

### Step 2c.3 — Check for API contract file

Check whether any API contract trigger file exists (defined in `diagram-methodology.md` § 3.4). If found, record it for API Summary generation.

### Step 2c.4 — Draft and save business documents

For each item in your ADR list:
1. Draft the full ADR using the template in `diagram-methodology.md` § 3.1
2. Assign id: `<domain-id>-<short-decision-slug>-adr`
3. Validate against FM-01 through FM-09, OP-06, OP-12 (adr rules)
4. Write to `.handoff/output/nodes/<id>.md`
5. Add index entry with `doc_type: "adr"`
6. Add the document path to `doc_refs` of the architecture overview node (read, update, write back)

For each item in your Runbook list:
1. Draft the full Runbook using the template in `diagram-methodology.md` § 3.2
2. Assign id: `<short-procedure-slug>-runbook`
3. Validate against FM-01 through FM-09, OP-06, OP-12 (runbook rules)
4. Write to `.handoff/output/nodes/<id>.md`
5. Add index entry with `doc_type: "runbook"`

If an API contract file was found:
1. Draft the API Summary using the template in `diagram-methodology.md` § 3.4
2. Use id: `api-summary`
3. Write to `.handoff/output/nodes/api-summary.md`
4. Add index entry with `doc_type: "api_summary"`

**Note**: Do NOT save the Onboarding Guide here. It is saved in Part 5c.4 after all domain nodes are complete.

---

## Part 3 — Field Inference

Process each section in `pending_sections` in order. For each section, follow all steps in Part 3 before moving to the next section.

### Step 3.1 — Set current_section

Write `current_section: "<section name>"` to session.json before starting work on the section.

### Step 3.2 — Read the relevant files

Using the directory paths recorded in `pending_sections` for the current domain, identify entry-point files and core logic files across all directories in this domain. For each directory in the domain:
- Read the entry-point file (e.g., `views.py`, `index.ts`, `handler.go`) — full content if under ~200 lines; first 150 lines if longer
- Read 1–2 additional files containing the most important business logic for this domain

Limit reading to 8 files total across all directories in the domain. Prioritise files that reveal how the domain's business logic works over files that merely use it. For the cross-cutting infrastructure domain, prioritise reading the most widely-imported utility files.

### Step 3.3 — Infer `business_context`

Use the domain name identified in Step 2.2 as the semantic basis. Derive a 2–4 sentence description of what this domain does for the business, focusing on user-facing value. Do not reference directory names.

Draw on these sources, in priority order:

1. **README**: Look for sentences that describe what this domain's capabilities do for users or the business.
2. **Model names and docstrings**: The entities managed by this domain (e.g., `Competition`, `Team`, `Match`) directly indicate the business problem being solved. Use model names and their field names to infer business rules.
3. **Route/endpoint paths and view names**: URL patterns and view class/function names describe the user actions this domain supports.
4. **Commit message patterns**: Scan git log for recent commits touching this domain's files for user-facing value signals.

Write `business_context` as 2–4 sentences describing: what business capability this domain provides, why it exists, and what would break for users if it disappeared.

**Record the source signal for each sentence (for citations).** As you write each sentence, note the strongest signal it rests on, using one of these four forms — you will render it as a trailing `(src: …)` citation in Step 5.3:
- A README section → `README §<heading>` (e.g., `README §Tournament Management`)
- A specific source line → `<relative-path>:<line>` (e.g., `competition/models.py:14`)
- A git commit message → `commit <7-char-sha>` (e.g., `commit a1b2c3d`)
- A pure naming/pattern inference with no concrete source → `inferred`

Keep each sentence's source signal in memory alongside the sentence text. Never fabricate a source — if the sentence is a genuine inference with no concrete file/section/commit behind it, its signal is `inferred`, and per the three-way link rule (see Step 5.2) the `business_context` field must then be in `inferred_fields` and tagged `low` in `confidence_tags`.

If none of the above sources yield usable signal, fall back to Part 6 (minimal-question fallback) for this field only.

### Step 3.4 — Infer `depth`

Count inbound references to this section from all other sections:
- Read the entry-point files of the other sections already identified
- Count how many import or require this section's files (e.g., `import { ... } from '../auth'`)
- Also check `package.json` `dependencies` for shared packages that correspond to sections

Apply this classification:
- 3 or more other sections import from this section → `core`
- 1–2 other sections import from this section → `supporting`
- No other sections import from this section, or it is a standalone utility/config → `peripheral`

Override heuristic: sections named "Data Model", "Database", "Core", "Shared Library", or "Configuration" are almost always `core` regardless of import count.

### Step 3.5 — Infer `decisions`

Scan the files read in Step 3.2 for signals of documented architectural choices:

- Comments starting with `// Note:`, `// Reason:`, `// Why:`, `# Note:`, `# Reason:` — extract the comment text
- Unusual patterns: a library choice that is non-standard for the language/framework (e.g., using `bcrypt` instead of built-in hashing, using a custom router instead of the framework's default)
- Configuration choices that have non-obvious values (e.g., specific timeout values, pool sizes, retry limits with comments)
- Interface/type definitions that impose unusual constraints

For each identified decision, write one bullet: describe what was decided and why (inferred from the comment or pattern). If no decisions are found, omit the `## Decisions` section entirely from the node.

**Record the source signal for each decision bullet (for citations).** Note the signal each bullet rests on, using the same four forms as Step 3.3 (`README §<heading>`, `<relative-path>:<line>`, `commit <sha7>`, or `inferred`). A decision inferred from a `// Note:` comment cites that comment's line; a decision inferred from an unusual library choice cites the line where the library is imported/used. Keep each bullet's signal in memory for rendering in Step 5.3.

### Step 3.6 — Infer `warnings`

Scan the files read in Step 3.2 for these signals:

- `TODO`, `FIXME`, `HACK`, `XXX`, `DEPRECATED` comments — extract the comment text as a warning
- Missing error handling: `catch` blocks that are empty or that only log errors without recovery
- Very long functions (over 80 lines) — flag as complexity risk
- Deeply nested conditionals (more than 4 levels) — flag as complexity risk
- Direct environment variable access in non-config files (e.g., `process.env.SECRET` inside a route handler) — flag as a config coupling warning
- Known deprecated APIs being used (e.g., `componentWillMount` in React, deprecated library methods)

For each warning found, write one bullet describing the issue and its location (file + approximate line if known). If no warnings are found, omit the `## Warnings` section entirely from the node.

**Record the source signal for each warning bullet (for citations).** Most warnings have a concrete location — cite it as `<relative-path>:<line>` (e.g., the line of the `TODO`/`FIXME` comment, or the start line of an over-long function). Use the same four forms as Step 3.3. A warning that is a general observation with no specific line is `inferred`. Keep each bullet's signal in memory for rendering in Step 5.3.

### Step 3.7 — Collect inline code snippets

Using the files already read in Step 3.2, identify 1–5 inline code snippets for this domain. Select snippets using this priority order:

1. **Public API surface first**: exported functions, class definitions, Django ViewSets, REST framework Views, top-level decorators/annotations. These show what the domain exposes.
2. **Key business logic methods second**: the methods that implement the domain's core rules — the functions with the most complexity, the most domain-specific names, or the clearest business logic.

For each snippet selected:
- Record: `file` (path relative to project root), `start_line`, `end_line`, and the literal source lines
- Apply the line limit: quote 5–15 lines per snippet
- For functions/classes longer than 15 lines: quote the signature + first 3–5 lines, insert a truncation comment (`# ... (lines X–Y omitted)` or the language equivalent), then optionally quote a meaningful closing statement
- Use only files you have confirmed exist and read in Step 3.2

If a file serves this domain AND other domains (multi-domain file), still include its most relevant snippet here — it will also appear in the other domain nodes.

Store the collected snippets in memory — they will be embedded in the node body during Step 5.3.

---

## Part 2b — Diagram Planning (run after Step 3.7 for each section)

After completing Part 3 field inference for a section, plan its diagrams before moving to the next section.

### Step 2b.1 — Classify the section

Read `.handoff/toolkit/rules/diagram-methodology.md` Part 1. Apply the five-category classification to the current section. Record the category.

### Step 2b.2 — Determine required diagrams

From the decision matrix, identify which diagram types are required for this section category. If "None", skip to Step 2b.4 and record no diagrams.

### Step 2b.3 — Check optional diagram evidence

For each optional diagram type applicable to this section category, check the evidence threshold defined in diagram-methodology.md § 1.2. Generate the optional diagram only if the threshold is met.

### Step 2b.4 — Draft diagram source

For each diagram to be generated:

1. Draft the Mermaid source using the correct syntax type from diagram-methodology.md § 2.1
2. Name each element in the diagram to match the primary components visible in the files read during Part 3, using the element naming convention from diagram-methodology.md § 2.2 (lowercase-hyphen labels)
3. Write a one-sentence description for the diagram
4. Choose a descriptive title (e.g., "Competition Management Architecture", "User Data Model", "Order Processing Flow")

Store the drafted diagram(s) for this section in memory — they will be validated and saved during Part 5b.

---

## Part 4 — Delta Re-Run Logic

Run Part 4 only when `index.json` has a `generated_at_sha` (Case C resume). For fresh sessions, skip to Part 5.

### Step 4.1 — Compute the diff

Run: `git diff --name-only <generated_at_sha> HEAD`

If the command fails with an error indicating the SHA is not in history (e.g., "unknown revision", "not a valid object name"): print "SHA not found in history — performing full regeneration" and treat this as a fresh scan (run Part 2 then Part 3 for all sections).

### Step 4.2 — Map changed files to existing nodes

Read `index.json` to get the current node list. For each changed file from the diff:
- For nodes with `code_refs`: check whether the file path appears in any node's `code_refs[].file` values
- For nodes without `code_refs` (feature 003+ style): scan the node's `## Technical Context` body for bold label lines matching the pattern `**\`<path>\`` — if the changed file path appears in any such label, include that node as affected
- Collect the set of node IDs whose references include at least one changed file

### Step 4.3 — Identify new domains

Run Part 2's semantic domain discovery (Step 2.2) on the current codebase. Compare the identified domain names against the existing non-business-document nodes in `index.json` (by domain name or by title). Any domain not covered by an existing node is a new domain to document.

### Step 4.4 — Process affected and new sections

For affected existing nodes:
- Re-run Part 3 (Steps 3.2 through 3.7) for each affected node to re-infer all fields
- Reset `inferred_fields` to the newly inferred list (as if documenting from scratch)
- Overwrite the node file with the updated content

For new sections:
- Run Part 3 (Steps 3.2 through 3.7) as for a fresh session
- Create new node files and add entries to `index.json`

Leave all unaffected nodes completely untouched — do not re-read, re-infer, or overwrite them.

### Step 4.5 — Continue to Part 5

After processing all affected and new sections, proceed to Part 5 (session completion).

---

## Part 5 — Node Save Workflow

For each section processed in Part 3 (or Part 4 for delta re-runs), save the node as follows.

### Step 5.1 — Determine node id

Derive the `id` from the **business domain name** (the plain English name from `pending_sections`, not the directory name):
- Lowercase all characters
- Replace spaces, ampersands (`&`), and underscores with hyphens
- Remove any characters that are not lowercase letters, digits, or hyphens
- Truncate to 60 characters maximum

Examples: "User Management" → `user-management`, "Competition Management" → `competition-management`, "Social Features" → `social-features`, "Cross-Cutting Infrastructure" → `cross-cutting-infrastructure`.

### Step 5.2 — Populate `inferred_fields`

Build the `inferred_fields` list by including the name of every field that was AI-inferred (not read directly from human-written documentation):

- Always include `business_context` (always inferred from code signals)
- Include `depth` if classified by the import-count heuristic (include in almost all cases)
- Include `decisions` if any decisions were inferred from code comments or patterns (not from explicit architecture docs)
- Include `warnings` if any warnings were inferred from code signals (TODOs, complexity, etc.)

Do NOT include a field in `inferred_fields` if:
- The giver answered a question about it (see Part 6 — it is then human-provided)
- It was read verbatim from an explicit human-written architecture document

**Build `confidence_tags` alongside `inferred_fields`.** For every field in `inferred_fields`, assign a confidence level using these deterministic rules (apply the first that matches the strongest signal that produced the field):

- **`high`** — the field was inferred from an explicit README heading, a docstring, or a source comment (`# Note:`, `# Why:`, `# ADR:`, `// Reason:`, etc.). The intent was written by a human in prose.
- **`medium`** — the field was inferred from structured-but-undocumented signals: route/URL paths, model or entity names, view/handler class names, or import patterns.
- **`low`** — the field was inferred solely from directory or file names, with no corroborating model, route, comment, or README signal.

**Three-way link rule (must hold for every field):** these three facts always travel together — if any one is true, all three must be true:
1. The field's claim(s) rest on `(src: inferred)` (no concrete source found in Step 3.3/3.5/3.6).
2. The field's `confidence_tags` entry is `low`.
3. The field is in `inferred_fields`.

So: any field whose sentences are all `(src: inferred)` is `low` and must be in `inferred_fields`. Conversely, a field tagged `high` must have at least one concrete (non-`inferred`) citation.

### Step 5.3 — Assemble the node

Build the complete node file content with YAML frontmatter and Markdown body:

```
---
id: <id>
title: <domain name>
depth: <core | supporting | peripheral>
schema_version: 1
generated_at: <current ISO 8601 timestamp>
inferred_fields:
  - business_context
  [- depth]
  [- decisions]
  [- warnings]
confidence_tags:
  business_context: <high | medium | low>
  [depth: <high | medium | low>]
  [decisions: <high | medium | low>]
  [warnings: <high | medium | low>]
quality_score:   # values filled in by Part 5d after assembly — leave as placeholders here
  business_value_clarity: <1 | 2>
  why_coverage: <1 | 2>
  snippet_relevance: <1 | 2>
  actionability: <1 | 2>
  no_unsupported_claims: <1 | 2>
---

## Business Context

<Inferred business context — 2–4 sentences. Each sentence ends with a citation: see "Citation rendering" below.>

## Technical Context

<Technical description — 2–5 paragraphs covering: high-level approach, data flow, key patterns/libraries, entry points. NO citations in this section.>

<For each inline snippet collected in Step 3.7, insert immediately after the narrative paragraphs:>

**`<relative/path/to/file.ext>` lines N–M**
```<language>
<quoted source lines, truncated with omission comment if needed>
```

<Repeat for each snippet — 1 to 5 snippets total>

## Decisions

<Bulleted list of decisions — each bullet ends with a citation. Omit section entirely if no decisions found>

## Warnings

<Bulleted list of warnings — each bullet ends with a citation. Omit section entirely if no warnings found>
```

The bold label line (`**\`path\` lines N–M**`) must appear on the line immediately before the opening fence with no blank line between them.

**`confidence_tags`**: Include one entry per field in `inferred_fields`, using the levels assigned in Step 5.2. Do not include entries for fields not in `inferred_fields`.

**`quality_score`**: Write the five keys as placeholders here (omit `snippet_relevance` only for typed documents that have no inline snippets). The actual integer values (1 or 2) are determined and written by the quality refinement pass in Part 5d, which runs after this assembly and before validation.

**Citation rendering (the `(src: …)` markers)**: For every sentence in `## Business Context`, every bullet in `## Decisions`, and every bullet in `## Warnings`, append a trailing citation using the source signal you recorded in Steps 3.3 / 3.5 / 3.6:

- Format: a single space, then `(src: <identifier>)` at the end of the sentence/bullet.
- Identifier forms: `README §<heading>`, `<relative-path>:<line>`, `commit <sha7>`, or `inferred`.
- Example: `Manages tournament brackets and match scheduling so organisers can run competitions end to end. (src: competition/models.py:14)`
- Example (inferred): `This domain appears to coordinate notification delivery across channels. (src: inferred)`

Rules:
- **Do NOT** add citations to `## Technical Context` paragraphs or to inline snippet bold-label lines — those are self-evidently sourced from the code (the label already names the file and lines).
- **Never fabricate** a source. If a sentence is a genuine inference with no concrete file/section/commit, cite `(src: inferred)` — and ensure (per the Step 5.2 three-way link rule) that the enclosing field is in `inferred_fields` and tagged `low` in `confidence_tags`.
- Every sentence in the three cited sections must carry exactly one citation. An uncited sentence in those sections fails the `no_unsupported_claims` rubric dimension (Part 5d) and forces a rewrite.

### Step 5b — Validate and attach diagrams

Run this step before Step 5.4. It is part of node assembly.

**Step 5b.1 — Validate diagram source**: For each diagram drafted for this section in Part 2b, run the four-point validation procedure from diagram-methodology.md § 2.4:

1. Check for unclosed brackets, parentheses, and quotes
2. Check that the first non-whitespace line is a valid Mermaid type keyword
3. Check arrow operator correctness
4. Check node label syntax

**Step 5b.2 — Correct or replace**: If a diagram fails validation, attempt one correction. Re-validate. If it still fails, replace the diagram block with a prose description and add a `## Warnings` bullet: `- DIAGRAM VALIDATION FAILED — replaced with prose: <title>`.

**Step 5b.3 — Set `diagram_format`**: Count how many diagrams passed validation and were not replaced with prose. If at least one diagram remains, add `diagram_format: mermaid` to the node's frontmatter. If zero diagrams remain after replacements, do not add `diagram_format`.

**Step 5b.4 — Assemble `## Diagrams` section**: For each surviving diagram, append a diagram block to the node body using the structure from diagram-methodology.md § 2.3. Place the `## Diagrams` section as the last section in the body, after `## Warnings` if present. If no diagrams survived, omit the `## Diagrams` section entirely.

### Part 5d — Quality Refinement Pass

Run Part 5d after the node body and diagrams are assembled (Step 5b) and before validation (Step 5.4). This is the draft → critique → refine pass. It applies to every node type (handover nodes, the architecture overview, and all business documents).

**Step 5d.1 — Read the rubric**: Read `.handoff/toolkit/rules/quality-rubric.md` completely. Do not rely on memory — read it fresh.

**Step 5d.2 — Score the node**: For the node you just assembled, score each applicable dimension (per the rubric's applicability table for this `doc_type`) as 0, 1, or 2. Apply each dimension's score-0 trigger as a **mechanical test** — if the trigger condition is literally true, the score is 0. Counter your own self-assessment bias: a node you wrote will feel fine; score by the triggers, not by feel. Skip dimensions marked N/A for this doc_type.

**Step 5d.3 — Rewrite failing dimensions**: For each dimension scoring 0:
1. Rewrite ONLY the section(s) named in that dimension's "Section(s)" line (not the whole node), applying the dimension's "Rewrite action on 0".
2. Re-score that one dimension. It must now be ≥ 1. If a rewrite still scores 0 after two attempts, apply the dimension's fallback (e.g., soften an unsupported claim to a cited observation; reduce boilerplate snippets to one and note the domain is thin) so the dimension reaches 1.
3. Preserve citations and the three-way link rule during any rewrite — newly added uncited sentences must get a `(src: …)` citation; new `(src: inferred)` sentences force their field to `low` / `inferred_fields`.

**Step 5d.4 — Write final scores**: Replace the `quality_score` placeholders in the frontmatter with the final per-dimension integer values (1 or 2 only). Omit `snippet_relevance` for typed documents that have no inline snippets. No dimension may be saved as 0.

Print a one-line note only if any rewrite happened: "  ↻ refined [title]: rewrote <dimension(s)>".

### Step 5.4 — Validate the node

Apply the validation rules from `.handoff/toolkit/rules/output-schema.md` to the assembled content:
- **Always check**: FM-01 through FM-08, OP-01 through OP-09, OP-12, BD-01 through BD-09 (for `handover_node` type only)
- **OP-14** — `quality_score` must be present, a valid mapping, every value 1 or 2 (no 0), only permitted keys. Fail validation if any value is 0 (Part 5d did not complete) or a key is invalid.
- **OP-15** — `confidence_tags` must be present when `inferred_fields` is non-empty; every value must be `high`/`medium`/`low`; keys should match `inferred_fields` entries.
- **FM-09** is now optional — absence of `code_refs` is valid; skip FM-09 check if `code_refs` is absent
- **CR-01 through CR-05** apply only if `code_refs` is present; skip these checks if `code_refs` is absent
- **OP-10 and OP-11** are deprecated — skip
- **OP-13** is advisory — if `depth` is `core` or `supporting` and `## Technical Context` is present but has no inline snippet, log: "Advisory (OP-13): Technical Context has no inline snippets" but do NOT fail validation

**If all mandatory rules pass**: proceed to Step 5.5.

**If any mandatory rules fail**: fix each issue without asking the giver. Re-validate until the node passes. Only ask the giver if a required field genuinely cannot be provided without human input (apply Part 6).

### Step 5.5 — Write the node file

Write the validated node content to `.handoff/output/nodes/<id>.md`.

### Step 5.6 — Update index.json

Read `.handoff/output/index.json` if it exists. If it does not exist, create it with this initial structure:

```json
{
  "schema_version": 1,
  "project_name": "<project_name from session.json>",
  "generated_at": "<current ISO 8601 timestamp>",
  "nodes": []
}
```

Add the new node as an entry in the `nodes` array:

```json
{
  "id": "<id>",
  "title": "<section name>",
  "depth": "<depth>",
  "dependencies": [],
  "file": "nodes/<id>.md"
}
```

Sort the `nodes` array: all `core` entries first, then `supporting`, then `peripheral`. Within each depth group, preserve insertion order.

Write the updated `index.json`.

### Step 5.7 — Update session state

Following session-protocol.md Rule 2 (event: node completed):
- Add the node `id` to `completed_nodes`
- Remove the section name from `pending_sections`
- Set `current_section: null`
- Write session.json

Print a one-line status: "✓ [title] ([depth]) — [N] sections remaining."

---

## Part 5c — Save Business Documents

Run Part 5c after all handover nodes have been saved through Part 5 (i.e., after the last section's Step 5.7 completes). This part saves all business documents drafted in Part 2c.

### Step 5c.0 — Citations and quality pass for every business document

Before writing each business document below (ADR, Runbook, API Summary, Onboarding Guide), apply two passes — the same machinery used for handover nodes:

**Citations**: Add a trailing `(src: …)` citation to every sentence in the document's prose sections, using the four-form convention from Step 5.3. Prose sections by type:
- ADR → `## Context`, `## Decision`, `## Consequences`
- Runbook → `## Purpose` (the `## Steps` list and `## Prerequisites`/`## Expected Outcome` operational lines do NOT need citations — they are instructions, not inferred claims)
- Onboarding Guide → `## Project Summary` (the `## Reading Order` and `## Related Documents` link lists do NOT need citations)
- API Summary → `## Overview`, `## Authentication` (the `## Endpoints / Operations` list, derived directly from the contract file, does NOT need citations)

Never fabricate a source; use `(src: inferred)` for genuine inferences.

**Quality pass (Part 5d)**: Run the quality refinement pass on each business document. `snippet_relevance` is N/A for all business document types — omit that key. Score the remaining four dimensions, rewrite any scoring 0, and write the final `quality_score` into the document's frontmatter.

Business documents generally carry no `inferred_fields` (they are drafted from explicit signals), so `confidence_tags` is usually absent for them. If a document does include an inferred field, tag it per the Step 5.2 rules.

### Step 5c.1 — Save ADR documents

For each ADR drafted in Part 2c:

1. Apply FM-01 through FM-09 and OP-06 and OP-12 (adr rules) from `output-schema.md` to validate the document
2. Assign a node `id` following the naming convention: `<section-id>-<short-decision-slug>-adr` (e.g., `auth-jwt-strategy-adr`)
3. Write the document to `.handoff/output/nodes/<id>.md`
4. Add an index entry with `doc_type: "adr"`:
   ```json
   { "id": "...", "title": "ADR: ...", "depth": "supporting", "dependencies": [], "file": "nodes/<id>.md", "doc_type": "adr" }
   ```
5. Add the document path (`nodes/<id>.md`) to the `doc_refs` frontmatter of the handover node that motivated this ADR. Read the handover node file, add or update `doc_refs`, write it back.

### Step 5c.2 — Save Runbook documents

For each Runbook drafted in Part 2c:

1. Validate against FM-01 through FM-09, OP-06, and OP-12 (runbook rules)
2. Assign a node `id` following the naming convention: `<short-procedure-slug>-runbook` (e.g., `local-dev-setup-runbook`)
3. Write the document to `.handoff/output/nodes/<id>.md`
4. Add an index entry with `doc_type: "runbook"`:
   ```json
   { "id": "...", "title": "Runbook: ...", "depth": "supporting", "dependencies": [], "file": "nodes/<id>.md", "doc_type": "runbook" }
   ```
5. Add the document path to `doc_refs` of the nearest relevant handover node (the one covering the operational area)

### Step 5c.3 — Save API Summary (conditional)

If an API Summary was drafted in Part 2c:

1. Validate against FM-01 through FM-09, OP-06, and OP-12 (api_summary rules)
2. Use `id: api-summary`; write to `.handoff/output/nodes/api-summary.md`
3. Add index entry with `doc_type: "api_summary"`

### Step 5c.4 — Save Onboarding Guide

The Onboarding Guide must reference all nodes and documents now in `index.json`. Re-read `index.json` to get the complete current list.

1. Build `## Reading Order` from the `index.json` nodes array (core first, then supporting, then peripheral); exclude ADRs, Runbooks, and other business document types from this list
2. Build `## Related Documents` from all ADR and Runbook entries added to `index.json`
3. Write `## Project Summary` as a paragraph derived from the project's README and the core nodes' business contexts
4. Validate against FM-01 through FM-09, OP-06, and OP-12 (onboarding_guide rules)
5. Write to `.handoff/output/nodes/onboarding-guide.md` (overwrite if it exists from a previous run)
6. Add index entry with `doc_type: "onboarding_guide"` if not already present; update if it exists

### Step 5c.5 — Final index sort

After all documents are complete, sort the `index.json` `nodes` array using this strict ordering:

1. `architecture-overview` node — always position 0
2. ADR nodes (`doc_type: "adr"`) — in detection order
3. Onboarding Guide node (`doc_type: "onboarding_guide"`)
4. Runbook nodes (`doc_type: "runbook"`) — in detection order
5. API Summary node (`doc_type: "api_summary"`) — if present
6. Domain nodes (no doc_type or `doc_type: "handover_node"`) sorted: `core` first → `supporting` → `peripheral`

Write the final `index.json`.

---

## Part 6 — Minimal-Question Fallback

Invoke Part 6 only when `business_context` truly cannot be inferred from any available source after exhausting all inference steps in Step 3.3.

### When to invoke

- `business_context`: all sources in Step 3.3 yielded no usable signal (no README description, no model names that clarify the domain, no meaningful route/view names, no relevant commit messages)

Never invoke Part 6 for `depth`, `decisions`, `warnings`, or inline snippets — these fields always have a fallback (`supporting` for depth; omit the section for decisions/warnings; omit snippets if no readable file found).

### What to ask

Ask exactly one focused question per domain. Use this phrasing:

For `business_context`:
> "I couldn't determine the business purpose of the `<domain name>` domain from the code. In one sentence: what does this part of the system do for the business or for users?"

### After receiving an answer

- Fill the field with the giver's answer
- Do NOT add the field to `inferred_fields` — it is now human-provided
- Resume autonomous mode immediately, moving on to the next inference step or the next section
- Never ask more than one question per section, never ask follow-up questions, never ask about optional fields

---

## Part 7 — Session Completion

Run Part 7 when `pending_sections` is empty and all nodes are saved.

### Step 7.1 — Record the git SHA

Run: `git rev-parse HEAD`

If the command succeeds: read the 40-character hex SHA. Update `index.json` by adding `"generated_at_sha": "<sha>"` and setting `"generated_at"` to the current ISO 8601 timestamp. Write `index.json`.

If the command fails (no git history or not in a git repo): omit `generated_at_sha` from `index.json`. Note to the giver: "Could not record a git SHA — the project may not have any commits yet."

### Step 7.1b — Generate index.md

1. Read the final `index.json`
2. Build **`## Business Overview`** section: for each node in the ordering position 1–5 (architecture-overview, ADRs, Onboarding Guide, Runbooks, API Summary), write a Markdown link: `- [<title>](nodes/<id>.md)`
3. Build **`## Domain Reference`** section with three subsections. For each domain node (doc_type absent or `handover_node`) in the appropriate depth group, write: `- [<title>](nodes/<id>.md) — <first sentence of the node's business_context section>` (read the node file to extract the first sentence)
   - `### Core Domains` — all `depth: core` domain nodes
   - `### Supporting Domains` — all `depth: supporting` domain nodes
   - `### Peripheral / Infrastructure` — all `depth: peripheral` domain nodes; include the cross-cutting node here if present
4. Write the complete file to `.handoff/output/index.md`:

```markdown
# <project_name from session.json> — Handoff Index

Generated: <current ISO 8601 timestamp>

## Business Overview

- [Architecture Overview](nodes/architecture-overview.md)
[... links to ADRs, Onboarding Guide, Runbooks, API Summary ...]

## Domain Reference

### Core Domains
[... links ...]

### Supporting Domains
[... links ...]

### Peripheral / Infrastructure
[... links ...]
```

5. Print: "✓ index.md written"

### Step 7.2 — Write session complete

Set `status: "complete"` in session.json and write the file (session-protocol.md Rule 2, event: session complete).

### Step 7.3 — Print completion summary

Print:

```
✓ Handoff complete — N nodes documented.

  Core:        [list titles]
  Supporting:  [list titles]
  Peripheral:  [list titles]

Run /handoff-review to review AI-inferred content, or commit .handoff/output/ to share with receivers.
```

---

## Important Constraints

- Never ask the giver for information that can be inferred from code. The only permitted questions are the one-sentence fallbacks in Part 6 for truly unknowable required fields.
- Every file write is a complete overwrite of the file. Read the current state, modify it in memory, then write the full content.
- If any file write fails (permission error, path error, etc.), stop and show the giver the error. Do not continue until the write is confirmed.
- The session can be safely interrupted at any step — session.json tracks progress, and Part 1 handles resumption.
- Write `inferred_fields` to the frontmatter of every node. This list is the single source of truth for the `/handoff-review` skill. Do not omit it.
