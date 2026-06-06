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

### Step 1.3 — Capture git context (for permalinks, SHA, and risk analysis)

Capture the git context ONCE here, at session start, so it is available to snippet permalinks (Step 5.3) and the git-history analysis (Part 2d). Store all of the following in memory for the session:

1. **`git_available`**: run `git rev-parse HEAD`. If it fails (no git, no commits), set `git_available = false` and skip the rest of this step — all git-derived output (permalinks, recorded SHA, Part 2d hotspot/ownership/tribal) is then skipped gracefully throughout the session. If it succeeds, set `git_available = true` and store the 40-char SHA as `generated_at_sha`.
2. **`repo_blob_base` + `repo_host_style`**: run `git remote get-url origin`. Normalise to `https://<host>/<owner>/<repo>` (strip a trailing `.git`; convert SSH `git@<host>:<owner>/<repo>` to the https form). If the host contains `gitlab`, set `repo_host_style = gitlab`; if it is a GitHub host, set `repo_host_style = github`; otherwise `unknown`. If there is no remote, leave `repo_blob_base` unset.
3. **`dirty_tracked_paths`**: run `git status --porcelain` and collect the set of paths whose status is a **tracked** change (staged or modified — i.e., the line does NOT begin with `??`). **Exclude untracked (`??`) entries.** This set is used per-file in Step 5.3: a snippet permalink is only unsafe if that snippet's own file is in this set. (Untracked unrelated files — e.g., the toolkit install itself — must NOT disable permalinks for clean tracked source files.)

Print nothing unless `git_available` is false, in which case note: "No git history — git-derived insights (permalinks, fragility, ownership, history notes) will be skipped."

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

### Step 2.4 — Infer tree shape and write proposed_tree

Run immediately after Step 2.3. Use the domains and manifest files already read in Steps 2.1–2.3 — no extra file reads required.

**Goal**: Decide what parent/grouping nodes to create and which domain nodes sit under which parent. Write the result as `proposed_tree` in `session.json`.

#### 2.4.1 — Detect project type

Apply the following signals in order and stop at the first match:

**Backend API** (Django, Express, Flask, Rails, FastAPI, etc.):
Signals: presence of `urls.py`, `routes.*`, `router.*`, `views.*`, `controllers.*` in multiple directories, OR an HTTP framework name in `package.json`/`pyproject.toml`/`Gemfile`.
Groupings: `modules` (one per business domain), `api` (route groups), `infrastructure` (database, deployment, dev setup).

**React / Vue / Angular frontend**:
Signals: `components/`, `pages/`, `views/` directories at the source level, OR `react`/`vue`/`@angular/core` in `package.json` dependencies.
Groupings: `pages` (if page/screen directories exist), `components` (component systems), `state-management` (if a store or context directory is found), `infrastructure` (routing, api-client, build config).

**Microservices**:
Signals: multiple independent `package.json`/`pyproject.toml`/`Cargo.toml`/`go.mod` at the second directory level, OR multiple Docker Compose service definitions with distinct source directories.
Groupings: each service becomes a root-level parent; each service parent gets `modules` and `api` children inside it; `infrastructure` is a shared root-level parent for cross-service concerns.

**Library / SDK / Package**:
Signals: a single `src/` or `lib/` directory, no route files, no UI component directories, a `README` describing a public API.
Groupings: `core` (primary library logic), `api` (public surface area), `infrastructure` (build, CI, dev tooling).

**Fallback**:
When no pattern is confidently matched, use the minimal tree: `project-overview` and `technical-overview` only. All domain nodes are root-level (no `parent`). Print a note: "Tree auto-classification not possible for this project — documenting as flat structure."

#### 2.4.2 — Construct proposed_tree

Build a flat map `{ node-id → parent-id | null }`:

1. Always include: `"project-overview": null` and `"technical-overview": null`.
2. For each grouping category determined in 2.4.1 (e.g., `modules`, `api`, `infrastructure`): add `"<category>": null` (root-level grouping node).
3. For each domain in `pending_sections`: derive a node id (lowercase hyphenated form of the domain name, e.g., "User Management" → `user-management`) and assign it under the appropriate grouping. For Backend API projects, domain nodes go under `modules`. For frontend projects, domain nodes go under their matching grouping (`pages`, `components`, etc.) based on what their directory contains.
4. For sub-domains (e.g., a domain with sub-features identified in Step 2.2): add nested entries where the sub-domain's parent is the domain node id.

Example for a Node.js API project with User Management, Competition, and Infrastructure domains:
```json
{
  "project-overview": null,
  "technical-overview": null,
  "modules": null,
  "user-management": "modules",
  "competition": "modules",
  "api": null,
  "user-endpoints": "api",
  "competition-endpoints": "api",
  "infrastructure": null,
  "database": "infrastructure",
  "dev-environment": "infrastructure"
}
```

#### 2.4.3 — Write proposed_tree to session.json

Add the `proposed_tree` key to the existing `session.json` object and write it. Do not replace the full session.json — merge the new key in.

Also add a `grouping_nodes` list to session.json — the set of ids that appear only as parent values (not as domain sections). These need to be generated as grouping nodes in 2.4.4.

Example addition to session.json:
```json
"proposed_tree": { ... },
"grouping_nodes": ["modules", "api", "infrastructure"]
```

#### 2.4.4 — Generate grouping nodes

For each id in `grouping_nodes`: generate and write a full handover node file immediately. Grouping nodes:
- Have `depth: supporting` (or `core` for the primary business/technical groupings like `modules`)
- Have no `parent` (they are root-level, under the pinned overviews conceptually but not nested under them in the tree)
- Have no `code_refs` (grouping nodes describe a layer, not a specific file)
- Have `## Business Context`: explain WHY this layer exists from a product and architectural perspective — what problem it solves, what value it organises
- Have `## Technical Context`: describe HOW the pieces within this layer relate to each other — shared patterns, interaction model, entry points

Write the node file to `.handoff/output/nodes/<id>.md` and add the entry to `index.json` before any domain leaf nodes that reference it as a parent.

---

## Part 2d — Git History Analysis (run once, immediately after Step 2.3, before Part 2a)

Run Part 2d exactly once per fresh session and at the start of a delta re-run (Part 4). **If `git_available` is false (Step 1.3), skip Part 2d entirely** — all consumers (hotspot warnings, ownership notes, tribal-knowledge warnings) then produce nothing, with no error. Compute the three result sets below and store them in memory, grouped by domain using the `directories` recorded in `pending_sections`.

### Step 2d.1 — Churn / hotspot ranking (feeds Step 3.6 warnings)

1. Aggregate churn: `git log --format= --name-only | sort | uniq -c | sort -rn` — this gives commit-count-per-file across history. Down-weight or drop files authored predominantly by detectable bots/automation (names containing `bot`, `[bot]`, `dependabot`, `github-actions`).
2. For each high-churn file, estimate a **complexity proxy** from signals already used by the warning heuristics (file length, function length, nesting depth) — read the file if it is a plausible hotspot.
3. Mark a file **fragile** only when churn is high AND complexity is above the triviality floor. The **triviality floor excludes** changelogs, version files, lockfiles, generated files, and config-only files even when they top the churn list (e.g., `CHANGELOG.md`, `VERSION`, `package-lock.json` are high-churn but trivial — never flag them).
4. Group fragile files by the domain that owns them. Store `{path, churn, domain}` per fragile file.

### Step 2d.2 — Ownership / bus-factor (feeds Step 5.3 `### Ownership`)

1. Per domain, find the dominant author over the domain's directories: `git shortlog -sn HEAD -- <domain paths>` (use the explicit `HEAD` argument — `git shortlog -sn` alone may read nothing in a non-interactive shell). Fallback if needed: `git log --format='%an' -- <paths> | sort | uniq -c | sort -rn`.
2. Flag **single-author files** (bus-factor 1): a file where `git log --format='%an' -- <file> | sort -u` yields exactly one distinct author.
3. If a `CODEOWNERS` file exists (root, `.github/`, or `docs/`), parse the declared owner(s) for each domain's paths.
4. Store per domain: `de_facto_owner` (+ commit count), `codeowners_owner` (if any), `single_author_files` list.

### Step 2d.3 — Tribal-knowledge mining (feeds Step 3.6 warnings)

1. Find candidate commits: `git log -i --grep='revert\|hotfix\|workaround\|don'\''t\|careful\|gotcha' --oneline` (case-insensitive). Prefer commits where the keyword leads the message, and `revert`/`hotfix` commit patterns, over incidental mid-message mentions.
2. For each candidate, determine the files it touched (`git show --name-only --format= <sha>`) and map them to domains.
3. Record `{sha7, keyword, lesson (one-line summary of the message), domain}`. **Deduplicate** by (lesson, file) and **cap at 3–5 per domain** — keep the most significant; do not emit a wall of near-identical bullets.

Store all three result sets in memory for consumption by Step 3.6 (hotspot + tribal warnings) and Step 5.3 (`### Ownership`).

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

**`## Technical Context`**: Open with a `**TL;DR:** <1–2 sentences>` lead (US3 — same as Step 5.3; the architecture overview is assembled here, not via Step 5.3, so the TL;DR must be added in this step). The TL;DR abstracts the whole system technically (stack + how the domains fit together) and is citation-exempt. Then one paragraph summarising the technology stack (language, framework, key libraries, deployment model). Then a `### Domains` subsection with one bullet per business domain: `- **<Domain Name>**: <one-sentence description of the domain's business purpose>`. If a cross-cutting infrastructure node exists, add a `### Cross-Cutting Infrastructure` subsection with one paragraph describing shared utilities. If the architecture overview frontmatter has `doc_refs` (e.g., ADRs linked to it), add a `### Related` subsection with `- [<title>](<id>.md) — <one-line why related>` links (US4); omit if no doc_refs.

**`## Diagrams`**: The system architecture diagram from Step 2a.1, using the required H3 + description + fenced mermaid block structure from `diagram-methodology.md` § 2.3.

### Step 2a.2b — Trace critical flows into the `## Diagrams` section

Run this step BEFORE Step 2a.3 (the architecture overview must contain the flow diagrams before it is scored and saved). It adds 1–3 cross-domain critical-flow sequence diagrams to the `## Diagrams` section drafted in Step 2a.2.

1. **Pick the top entry points**: identify the project's principal request entry points — the busiest/most central routes or URL patterns, top-level CLI commands, or job triggers. Choose 1–3 that represent the system's core user journeys (e.g., sign-up, the primary create/transaction flow, a key read flow).
2. **Trace each flow**: for each chosen entry point, read the entry-point file and follow the call path — the handler/view it maps to, the service or business-logic function that handler calls, the model(s) it reads/writes, and any external client it invokes. These are lightweight targeted reads, independent of the per-domain reads in Part 3.
3. **Draft one `sequenceDiagram` per flow** following `diagram-methodology.md` § 2.5: cross at least two domains, lowercase-hyphen participant labels, ≤ ~8 participants, `->>` calls / `-->>` returns, and a one-sentence H3 description naming the user journey. Run the § 2.4 diagram validation on each.
4. Append these diagram blocks to the overview's `## Diagrams` section, after the system architecture diagram.

If no end-to-end flow is discernible (e.g., a pure library with no request entry points), add no critical-flow diagrams and continue. The description lines live in `## Diagrams` and are citation-exempt.

### Step 2a.3 — Save the architecture overview node

First, apply citations and tags to the body drafted in Step 2a.2:
- Every sentence in the `## Business Context` section must carry a trailing `(src: …)` citation (same convention as Step 5.3 — `README §<heading>`, `<relative-path>:<line>`, `commit <sha7>`, or `inferred`). The `### Domains` bullets under `## Technical Context` do not require citations.
- Assign `confidence_tags` for `business_context` using the Step 5.2 rules (`high` if drawn from an explicit README description; `medium` if drawn from the set of model/route names; `low` if only from directory names). Honour the three-way link rule: a `business_context` resting on `(src: inferred)` is `low`.

Then run the **quality refinement pass (Part 5d)** on this node: read the rubric, score the applicable dimensions (`snippet_relevance` is N/A — the architecture overview has no inline snippets), rewrite any dimension scoring 0, and record the final `quality_score`. The body scored here includes the critical-flow diagrams added in Step 2a.2b. Note: the diagram description lines in `## Diagrams` (system diagram and critical-flow diagrams) are citation-exempt — do not add `(src: …)` to them.

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

### Step 2c.3 — Check for API contract file and source-code routes

Check whether any API contract trigger file exists (defined in `diagram-methodology.md` § 3.5). If found, set `contract_file_found = true` and record it for API Summary generation.

If NO contract file was found, check for source-code route patterns in the domain's directories. If any of the following are present, set `source_route_file_found = true` and record the file path (this read counts toward the 8-file cap):
- **Django**: `urls.py` in the domain directory
- **Express/Fastify**: `routes.js`, `router.js`, or any `.js`/`.ts` file that imports `express.Router`
- **Flask**: any `.py` file containing `Blueprint(` or `@app.route(`
- **FastAPI**: any `.py` file containing `APIRouter(` or `@app.get`/`@app.post`/`@app.put`/`@app.delete`/`@app.patch(`

**Invariant**: Use the contract file if found (existing behaviour). `source_route_file_found` is only acted on when `contract_file_found` is false.

**Extraction sub-step** (when `source_route_file_found = true`): Read the detected route file and extract for each endpoint:
1. HTTP method (GET, POST, PUT, DELETE, PATCH, etc.)
2. Path pattern (e.g., `/api/competitions/`)
3. Handler or view reference (the function or class name the route maps to)

Then for each handler reference, read the handler function body (5–15 lines, per Step 3.7 line-limit rules) and extract:
- Docstring or first comment (used as the endpoint description)
- Parameter names
- Return shape indicator (what kind of object is returned)

Record each handler's `file`, `line`, and `end_line` in memory for `code_refs` assembly in Step 2c.4.

### Step 2c.3a — Scan for environment variables (Config Reference)

Mine every environment variable the project reads. Sources, merged by variable name:
1. **In-code reads**: `process.env.X`, `os.environ['X']` / `os.environ.get('X')` / `os.getenv('X')`, framework settings accessors (`settings.X`, `env('X')`, `config('X')`).
2. **`.env.example` / `.env.sample` / `.env.template`** files — names and example values.
3. **Settings/config files** that read environment variables (`settings.py`, `config/*.py`, `config.*.js`, etc.).
4. **`docker-compose.yml` / `docker-compose.*.yml`** `environment:` blocks.

For each variable, record:
- `name`
- `purpose` — a one-line description with its source signal (the file:line where it is read, or `inferred`)
- `required` — `optional` if a default exists (code default like `os.getenv('X', default)`, `||` fallback, or a value in `.env.example`); otherwise `required`
- `default` — the default value, or `none`
- `domains` — the consuming domain name(s), mapped via the `pending_sections` directory map
- `sensitive` — `yes` if the name contains `SECRET`, `KEY`, `PASSWORD`, `PASS`, `TOKEN`, `CREDENTIAL`, or `PRIVATE`; else `no`

**Secret safety**: for a sensitive variable, NEVER record or later quote its literal value — set `default` to `none` or `(set per environment)` regardless of any value found in `.env.example`.

Store the collected variable list in memory for Part 5c. If zero variables are found, record that no Config Reference will be produced.

### Step 2c.3b — Scan for glossary terms

Extract candidate domain terms from:
1. Model/entity names (primary source — each becomes a term).
2. Recurring nouns in route/URL path segments.
3. Recurring domain nouns in comments and docstrings.

For each distinct term, record: the `term`, a one-line `definition` with its source signal (the model/field/comment it derives from, or `inferred`), and the owning `domains`. Define a term once even if it spans domains. Store the term list in memory for Part 5c. If fewer than 3 distinct terms are found, record that no Glossary will be produced.

### Step 2c.3c — Infer Product Brief (for handover_node domains only)

Run this step for every domain in `pending_sections`. Use the Step 2c.3 detection results.

**Inference trigger** (run in order, stop at first match):
1. Domain has ≥ 1 HTTP endpoint (detected via Step 2c.3 route or contract detection) → **confidence: HIGH**
2. Domain module name is a recognisable business noun — NOT `utils`, `migrations`, `admin`, `config`, `tests`, or `middleware` — AND ≥ 1 named model exists → **confidence: MEDIUM**
3. No signal found → **skip**; do NOT generate a Product Brief for this domain

**When confidence is HIGH or MEDIUM**: draft `### Product Brief` content using these five elements in order:

- **Problem**: one paragraph inferred from the domain's entry-point docstring, first-level comments, or README reference — the user pain or business gap this domain addresses
- **Target users**: inferred from route auth requirements and endpoint path semantics (e.g., authenticated-only routes → internal users; public routes → end-users)
- **Capabilities**: a bulleted list; each bullet is a user-facing outcome — translate each HTTP endpoint or major exported function into plain-English value (e.g., "Browse and filter active competitions", not "GET /competitions/")
- **Out of scope**: inferred from neighbouring domains or from what this domain explicitly delegates to other modules
- **Success indicators**: measurable outcomes inferred from the domain's apparent purpose (e.g., "Users can browse and enter competitions end to end", not "CompetitionViewSet returns 200")

**Mandatory content rule**: The drafted `### Product Brief` MUST NOT contain raw class names, module paths with slashes, Django/Flask/Express/FastAPI terminology, or any other implementation detail. Rewrite every element until this passes — if a bullet cannot be expressed without a technical term, rephrase it or omit it.

**When no signal is found (confidence would be LOW)**: skip the Product Brief entirely. Do NOT write a placeholder or stub. Omission is correct.

Store the drafted content (or the skip decision) in memory, keyed by domain name. Step 5.3 inserts the `### Product Brief` block into the node body and adds `product_brief` to `inferred_fields` when content was drafted.

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

If `contract_file_found = true` (API contract file path):
1. Draft the API Summary using the contract-file template in `diagram-methodology.md` § 3.5
2. Use id: `api-summary`
3. `code_refs` is optional — emit only if the contract file specifies `x-source-file` extensions or operation IDs resolvable to source lines
4. Write to `.handoff/output/nodes/api-summary.md`
5. Add index entry with `doc_type: "api_summary"`

If `source_route_file_found = true` AND `contract_file_found = false`:
1. Draft the API Summary using the source-code template in `diagram-methodology.md` § 3.5
2. For each endpoint extracted in Step 2c.3:
   a. Write a row in `## Endpoints / Operations` — method, path, plain-English description (from docstring/comment), params, response fields, auth requirement
   b. Group under an H3 sub-heading when more than 3 endpoints share a path prefix (e.g., `### Competition Endpoints` for `/api/competitions/*`)
   c. Build one `code_refs` entry: `{file, line, end_line, note: "METHOD /path — description"}` using the handler location recorded in Step 2c.3
3. **`code_refs` is REQUIRED for source-code-generated api_summary** — one entry per endpoint. Validate CR-01 through CR-05 on every entry before saving.
4. Validate that every endpoint row in `## Endpoints / Operations` has a corresponding `code_refs` entry (same count, same order).
5. Use id: `api-summary`
6. Write to `.handoff/output/nodes/api-summary.md`
7. Add index entry with `doc_type: "api_summary"`

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

**For data-layer domains** (domains that define models/entities, schemas, or database access — see the diagram-methodology.md Part 1 "Data layer" category): additionally read the schema sources to extract field-level detail for the richer ER diagram (Step 2b / Step 5b) and prose (Step 5.3): ORM model definitions, SQL DDL/schema files, and the most recent or schema-shaping migration files. Capture each entity's fields, types, primary/foreign/unique keys, unique constraints, and notable indexes. These schema files do not count toward the 8-file business-logic cap — they are read specifically for data-model depth.

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

**Add git-derived warnings from Part 2d (skip if `git_available` is false).** Consult the Part 2d result sets for this domain and append two kinds of warning bullets:

- **Fragile-file (hotspot) bullets** from Step 2d.1 — for each fragile file owned by this domain: `Fragile — change carefully: \`<path>\` (<churn> commits, high complexity) (src: <commit range or inferred>)`. These are the high-churn-high-complexity files; trivial high-churn files were already excluded in Part 2d.
- **Tribal-knowledge bullets** from Step 2d.3 — for each retained item for this domain: the one-line lesson with a commit citation: `<lesson> (src: commit <sha7>)` (Step 5.3 upgrades this to a clickable commit permalink when a host is known).

If this domain has no fragile files and no tribal items, add nothing. These git-derived bullets are inferences — `warnings` therefore stays in `inferred_fields` with its confidence tag (the warning is `low`/`medium` per the strength of the git signal).

### Step 3.7 — Collect inline code snippets

Using the files already read in Step 3.2, identify 1–5 inline code snippets for this domain. Select snippets using this priority order:

1. **Public API surface first**: exported functions, class definitions, Django ViewSets, REST framework Views, top-level decorators/annotations. These show what the domain exposes.
2. **Key business logic methods second**: the methods that implement the domain's core rules — the functions with the most complexity, the most domain-specific names, or the clearest business logic.

For each snippet selected:
- Record: `file` (path relative to project root), `start_line`, `end_line`, and the literal source lines
- Record a short `note` (≤ 200 chars) describing what this snippet is — the symbol name and its role, e.g., "Public API: `OrderViewSet.create`" or "Core logic: bracket seeding". This note becomes both context for the reader and the `note` field of the navigable `code_refs` entry (Step 5.3).
- Apply the line limit: quote 5–15 lines per snippet
- For functions/classes longer than 15 lines: quote the signature + first 3–5 lines, insert a truncation comment (`# ... (lines X–Y omitted)` or the language equivalent), then optionally quote a meaningful closing statement
- Use only files you have confirmed exist and read in Step 3.2

If a file serves this domain AND other domains (multi-domain file), still include its most relevant snippet here — it will also appear in the other domain nodes.

Store the collected snippets in memory — they are used twice in Step 5.3: (1) embedded as visible inline code blocks in the body, and (2) emitted as structured `code_refs` frontmatter entries so the VS Code extension can navigate to the live source on click. The `file`/`start_line`/`end_line` recorded here map directly to `code_refs[].file`/`line`/`end_line`.

### Step 3.8 — Detect external dependencies & integrations

From the files read for this domain, identify the external services it talks to. Signals:
- **Imported SDK clients** (e.g., `stripe`, `boto3`, `sendgrid`, `twilio`, `redis`, `pika`/`kombu`, `elasticsearch`, database drivers)
- **Base URLs / API hostnames** in constants or config
- **Connection strings** (database URLs, `REDIS_URL`, broker URLs)
- **Broker topics / queue names / channel names**

For each external service, record:
- `service` — the service or SDK name (factual)
- `type` — one of `api` (third-party HTTP API), `database`, `queue`, `cache`
- `failure_mode` — a one-line inference of what breaks for users if this service is unavailable, WITH a source signal (the file:line where the client is used, or `inferred`)

**Exclude dead imports**: if an SDK is imported but never instantiated or invoked in the domain's files, do not list it.

Store the dependency list in memory for Step 5.3. If the domain has no external dependencies, record none (the subsection will be omitted).

### Step 3.9 — Discover tests

Find how this domain's changes are verified:
1. **Test files** covering the domain — match `tests/`, `__tests__/`, `*_test.*`, `*.test.*`, `test_*.*`; map to the domain by path correspondence (mirrored layout) and by the source symbols the tests import.
2. **Run command** — from `Makefile` test targets, `package.json` `scripts.test` (and related), `pyproject.toml` / `tox.ini`, or an equivalent task runner; narrow to this domain's tests where the runner supports path/marker selection.
3. **Fixtures/seeds** — factory files, fixture directories, `conftest.py`, or seed scripts referenced by the domain's tests (any inferred note carries a source signal).

Record the test files, run command, and fixtures in memory for Step 5.3. If no tests cover this domain, record that explicitly — the `### Testing` subsection will state the gap rather than being omitted.

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

**For `erDiagram` (data-layer domains)**: author it **field-level** per diagram-methodology.md § 2.1.1 — list each entity's fields with types and `PK`/`FK`/`UK` markers, and show foreign-key relationships with cardinality, using the schema detail captured in Step 3.2. For an entity with more than 15 fields, include only keys/FKs/unique keys and business-critical columns, and note the total field count in the prose (Step 5.3). Do not produce a box-only ER diagram.

Store the drafted diagram(s) for this section in memory — they will be validated and saved during Part 5b.

---

## Part 4 — Delta Re-Run Logic

Run Part 4 only when `index.json` has a `generated_at_sha` (Case C resume). For fresh sessions, skip to Part 5.

### Step 4.1 — Compute the diff

First, capture the git context for this run by running **Step 1.3** (it may not have run if the session jumped straight to delta mode): refresh `generated_at_sha` to current HEAD, `repo_blob_base`, `repo_host_style`, and `dirty_tracked_paths`. Then run **Part 2d (Git History Analysis)** so the hotspot/ownership/tribal result sets are fresh for the re-run — affected and new nodes consume them in Step 4.4. (Skip Part 2d if `git_available` is false.)

Then run: `git diff --name-only <generated_at_sha-from-index.json> HEAD`

If the command fails with an error indicating the SHA is not in history (e.g., "unknown revision", "not a valid object name"): print "SHA not found in history — performing full regeneration" and treat this as a fresh scan (run Part 2, Part 2d, then Part 3 for all sections).

### Step 4.2 — Map changed files to existing nodes

Read `index.json` to get the current node list. For each changed file from the diff:
- For nodes with `code_refs`: check whether the file path appears in any node's `code_refs[].file` values
- For nodes without `code_refs` (feature 003+ style): scan the node's `## Technical Context` body for snippet label lines and extract the `<path>` from each. Labels appear in TWO forms — match both: the plain form `**\`<path>\` lines N–M**` and the feature-006 permalink form `**[\`<path>\` lines N–M](<url>)**` (note the `[` between `**` and the backtick). If the changed file path appears in any such label (either form), include that node as affected
- Collect the set of node IDs whose references include at least one changed file

### Step 4.3 — Identify new domains

Run Part 2's semantic domain discovery (Step 2.2) on the current codebase. Compare the identified domain names against the existing non-business-document nodes in `index.json` (by domain name or by title). Any domain not covered by an existing node is a new domain to document.

### Step 4.4 — Process affected and new sections

For affected existing nodes:
- Re-run **all per-domain Part 3 steps** (every Step 3.x — currently 3.2 read, 3.3 business_context, 3.4 depth, 3.5 decisions, 3.6 warnings incl. the Part 2d hotspot/tribal bullets, 3.7 snippets, 3.8 dependencies, 3.9 tests) for each affected node to re-infer all fields. (Stated as "all Part 3 steps" rather than a fixed number range so new steps added by future features are not silently skipped.)
- Reset `inferred_fields` to the newly inferred list (as if documenting from scratch)
- Overwrite the node file with the updated content

For new sections:
- Run **all per-domain Part 3 steps** as for a fresh session
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
parent: <parent-id from proposed_tree, if non-null — omit the field entirely if null/absent>
generated_at: <current ISO 8601 timestamp>
code_refs:
  # One entry per inline snippet collected in Step 3.7 — these make the code
  # navigable: the VS Code extension opens <file> at <line> on click.
  - file: <relative/path/to/file.ext>
    line: <start_line>
    end_line: <end_line>
    note: <the snippet's note from Step 3.7>
  # ... repeat for each snippet (omit the whole code_refs key only if the node has no snippets)
inferred_fields:
  - business_context
  [- depth]
  [- decisions]
  [- warnings]
  [- product_brief]   # include when Step 2c.3c drafted a Product Brief for this domain
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

[If Step 2c.3c drafted a Product Brief for this domain, insert immediately after the Business Context opening paragraph(s) — before ## Technical Context:]

### Product Brief

**Problem**: <one paragraph — the user pain or business gap this domain addresses>

**Target users**: <who uses this feature — role or persona in plain English>

**Capabilities**:
- <user-facing outcome 1>
- <user-facing outcome 2>
- ...

**Out of scope**: <what this domain intentionally does NOT do>

**Success indicators**: <measurable outcomes the domain is meant to achieve>

[End Product Brief block — omit entirely when Step 2c.3c found no signal or skipped]

## Technical Context

**TL;DR:** <1–2 sentences abstracting the whole section — what this domain does technically and how it hangs together. Must NOT duplicate the first detail sentence. Citation-exempt (Technical Context narrative).>

<Technical description — 2–5 paragraphs covering: high-level approach, data flow, key patterns/libraries, entry points. NO citations on narrative paragraphs. For data-layer domains, the prose ALSO lists foreign keys, unique constraints, and notable indexes, and references schema-shaping migrations (from Step 3.2) — these are factual transcriptions and are NOT cited; any inferred commentary on a field's business meaning IS cited.>

<For each inline snippet collected in Step 3.7, insert immediately after the narrative paragraphs. The bold label is a clickable permalink when safe (see "Snippet permalinks" below), otherwise the plain label:>

**[`<relative/path/to/file.ext>` lines N–M](<permalink>)**
```<language>
<quoted source lines, truncated with omission comment if needed>
```

<Repeat for each snippet — 1 to 5 snippets total>

<If the domain has external dependencies (Step 3.8), insert this H3 subsection — omit entirely if none:>

### Dependencies & Integrations

- **<Service>** (<api | database | queue | cache>): <factual role>. Failure mode: <what breaks for users if unavailable> (src: <identifier>)

<If this is a core/supporting handover_node, ALWAYS insert this H3 subsection (Step 3.9) — state the gap rather than omitting:>

### Testing

- Test files: `<path/to/test_x>`, `<path/to/test_y>`
- Run: `<command>`
- Fixtures/seeds: <fixtures or "none required"> <(src: …) if the fixture note is inferred>

<If no tests cover this domain, the Testing subsection contains the single line:>
- No tests found covering this domain.

<If the node has dependencies or doc_refs, insert this H3 subsection — omit if both empty:>

### Related

- [<related node title>](<related-id>.md) — <one-line why related>

<If Part 2d produced ownership data for this domain (git_available), insert this H3 subsection — omit entirely if no git data and no CODEOWNERS:>

### Ownership

- De facto owner: <author> (<n> commits) (src: inferred from git shortlog)
- Declared owner (CODEOWNERS): <owner>            <!-- only if a CODEOWNERS entry covers this domain -->
- Single-author files (bus-factor 1): `<path>`, `<path>`

## Decisions

<Bulleted list of decisions — each bullet ends with a citation. Omit section entirely if no decisions found>

## Warnings

<Bulleted list of warnings — each bullet ends with a citation. Omit section entirely if no warnings found>
```

The bold label line must appear on the line immediately before the opening fence with no blank line between them.

**Snippet permalinks (US4)**: render each snippet's bold label as a clickable permalink to the exact lines at the recorded commit, when ALL of these hold: `git_available` is true; `repo_blob_base` is known; `repo_host_style` is `github` or `gitlab`; AND the snippet's own file is NOT in `dirty_tracked_paths` (Step 1.3). Build the URL:
- GitHub: `<repo_blob_base>/blob/<generated_at_sha>/<path>#L<N>-L<M>`
- GitLab: `<repo_blob_base>/-/blob/<generated_at_sha>/<path>#L<N>-<M>`
- Rendered label: `**[`<path>` lines N–M](<url>)**`

Otherwise — no host, unsupported host style, no SHA, OR this file has uncommitted tracked changes (would link to the wrong lines) — fall back to the plain label `**`<path>` lines N–M**` with no link. The snippet label IS the citation; do not add a separate `(src: …)`.

**`### Related` subsection (US4)**: build from the node's `dependencies` and `doc_refs`. For each, render `- [<related node title>](<related-id>.md) — <one-line why related>` (read the related node's title from its frontmatter; the link target is the node filename `<id>.md`). Omit the whole subsection if the node has neither dependencies nor doc_refs. These are structural links — no citation.

**`### Ownership` subsection (US5)**: render from the Part 2d Step 2d.2 ownership data for this domain. The de facto owner line carries `(src: inferred from git shortlog)`; the CODEOWNERS line (only if a CODEOWNERS entry covers this domain) is factual. Omit the whole subsection when `git_available` is false AND no CODEOWNERS entry applies. The de-facto-owner and bus-factor flags are git-derived inferences — they keep `warnings`/ownership reasoning honest, but ownership lives in this subsection (not Warnings) to avoid duplication.

**`confidence_tags`**: Include one entry per field in `inferred_fields`, using the levels assigned in Step 5.2. Do not include entries for fields not in `inferred_fields`.

**`quality_score`**: Write the five keys as placeholders here (omit `snippet_relevance` only for typed documents that have no inline snippets). The actual integer values (1 or 2) are determined and written by the quality refinement pass in Part 5d, which runs after this assembly and before validation.

**Citation rendering (the `(src: …)` markers)**: For every sentence in `## Business Context`, every bullet in `## Decisions`, and every bullet in `## Warnings`, append a trailing citation using the source signal you recorded in Steps 3.3 / 3.5 / 3.6:

- Format: a single space, then `(src: <identifier>)` at the end of the sentence/bullet.
- Identifier forms: `README §<heading>`, `<relative-path>:<line>`, `commit <sha7>`, or `inferred`.
- Example: `Manages tournament brackets and match scheduling so organisers can run competitions end to end. (src: competition/models.py:14)`
- Example (inferred): `This domain appears to coordinate notification delivery across channels. (src: inferred)`

Rules:
- **Do NOT** add citations to `## Technical Context` **narrative paragraphs** or to inline snippet bold-label lines — those are self-evidently sourced from the code (the label already names the file and lines). The same exemption covers factual data-model prose (field/type/FK/constraint/index facts transcribed from the schema).
- **DO** add `(src: …)` citations to **inferred sub-bullets** within the `## Technical Context` H3 subsections: the **Failure mode** clause of each `### Dependencies & Integrations` bullet, and any **inferred note** in `### Testing` (e.g., which fixtures matter). Factual lines in these subsections — service names, test file paths, run commands — do NOT require citations.
- **Never fabricate** a source. If a sentence is a genuine inference with no concrete file/section/commit, cite `(src: inferred)` — and ensure (per the Step 5.2 three-way link rule) that the enclosing field is in `inferred_fields` and tagged `low` in `confidence_tags`.
- Every sentence in `## Business Context`, `## Decisions`, `## Warnings`, AND every inferred sub-bullet in the Dependencies/Testing subsections must carry exactly one citation. An uncited inferred claim in any of these fails the `no_unsupported_claims` rubric dimension (Part 5d) and forces a rewrite.

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
- **FM-09 + CR-01 through CR-05** — every node that has inline snippets MUST emit a matching `code_refs` array (one entry per snippet) so the extension can navigate to the live source. Check: `code_refs` is a non-empty array (FM-09); each entry has a non-empty forward-slash `file` (CR-01) and a non-empty `note` ≤ 200 chars (CR-02); `line` is a positive integer (CR-03); `end_line` is present with `line` (CR-04) and `end_line ≥ line` (CR-05). A node with snippets but no `code_refs` fails this check — fix by emitting the refs from the Step 3.7 snippet data. (A node with genuinely no snippets — e.g., a thin peripheral node — may omit `code_refs`; absence is then valid.)
- **Snippet/ref consistency** — every inline snippet in the body MUST have a corresponding `code_refs` entry whose `file`/`line`/`end_line` match the snippet's path and line range, and vice versa. They are generated from the same Step 3.7 data and must not drift.
- **OP-10 and OP-11** are deprecated — skip (no `code_refs[].id` is emitted; the extension navigates by `file`+`line`)
- **OP-13** is advisory — if `depth` is `core` or `supporting` and `## Technical Context` is present but has no inline snippet, log: "Advisory (OP-13): Technical Context has no inline snippets" but do NOT fail validation

**`### Product Brief` consistency checks** (fix before saving, do not ask the giver):
- If `### Product Brief` is present in the body, verify `product_brief` is in `inferred_fields`. If missing, add it.
- If `product_brief` is in `inferred_fields` but no `### Product Brief` subsection is in the body, this is a drift error — either add the missing subsection or remove `product_brief` from `inferred_fields`. Prefer removing if Step 2c.3c did not produce content.
- Verify no capability bullet in `### Product Brief` contains a backtick, a forward slash `/`, or a framework class/method name. If found, rewrite the bullet to express the user-facing outcome in plain English.
- If Step 2c.3c found no signal (skipped), verify `### Product Brief` is absent entirely — no placeholder text permitted.

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

Add the new node as an entry in the `nodes` array. Include the `parent` field if `proposed_tree[id]` is non-null:

```json
{
  "id": "<id>",
  "title": "<section name>",
  "depth": "<depth>",
  "dependencies": [],
  "parent": "<parent-id from proposed_tree — omit this key entirely if null/absent>",
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

Before writing each business document below (ADR, Runbook, API Summary, Onboarding Guide, Config Reference, Glossary), apply two passes — the same machinery used for handover nodes:

**Citations**: Add a trailing `(src: …)` citation to every sentence in the document's prose sections, using the four-form convention from Step 5.3. Prose sections by type:
- ADR → `## Context`, `## Decision`, `## Consequences`
- Runbook → `## Purpose` (the `## Steps` list and `## Prerequisites`/`## Expected Outcome` operational lines do NOT need citations — they are instructions, not inferred claims)
- Onboarding Guide → `## Project Summary` (the `## Reading Order` and `## Related Documents` link lists do NOT need citations)
- API Summary → `## Overview`, `## Authentication` (the `## Endpoints / Operations` list, derived directly from the contract file, does NOT need citations)
- Config Reference → `## Overview`, and the **Purpose** cell of each row in the `## Variables` table (the Variable/Required/Default/Domain/Sensitive cells are factual and do NOT need citations)
- Glossary → each definition in `## Terms` (the term and domain are factual; the definition is the inferred claim and IS cited)

Never fabricate a source; use `(src: inferred)` for genuine inferences.

**Quality pass (Part 5d)**: Run the quality refinement pass on each business document. `snippet_relevance` is N/A for all business document types — omit that key. Score the remaining four dimensions, rewrite any scoring 0, and write the final `quality_score` into the document's frontmatter.

> **Note**: The document templates in `diagram-methodology.md` §3.1–3.4 do NOT include a `quality_score` field — you MUST inject it into the frontmatter here, after the quality pass, before saving. The per-type validation in Steps 5c.1–5c.4 checks OP-14, so a business document saved without a valid `quality_score` will fail validation.

Business documents generally carry no `inferred_fields` (they are drafted from explicit signals), so `confidence_tags` is usually absent for them. If a document does include an inferred field, tag it per the Step 5.2 rules.

**Config Reference and Glossary — coarse inferred field (three-way invariant)**: these two carry inferred content (variable purposes, term definitions). Apply the invariant at node granularity using a single coarse field name:
- Config Reference → if ANY variable's Purpose rests on `(src: inferred)`, add `variable_purposes` to `inferred_fields` and `confidence_tags: { variable_purposes: low }`. If every purpose traces to a concrete source, omit both.
- Glossary → if ANY definition rests on `(src: inferred)`, add `term_definitions` to `inferred_fields` and `confidence_tags: { term_definitions: low }`. If every definition is concrete, omit both.

### Step 5c.1 — Save ADR documents

For each ADR drafted in Part 2c:

1. Apply FM-01 through FM-09, OP-06, OP-12 (adr rules), and OP-14 (`quality_score` present, all values 1 or 2) from `output-schema.md` to validate the document
2. Assign a node `id` following the naming convention: `<section-id>-<short-decision-slug>-adr` (e.g., `auth-jwt-strategy-adr`)
3. Write the document to `.handoff/output/nodes/<id>.md`
4. Add an index entry with `doc_type: "adr"`:
   ```json
   { "id": "...", "title": "ADR: ...", "depth": "supporting", "dependencies": [], "file": "nodes/<id>.md", "doc_type": "adr" }
   ```
5. Add the document path (`nodes/<id>.md`) to the `doc_refs` frontmatter of the handover node that motivated this ADR. Read the handover node file, add or update `doc_refs`, write it back.

### Step 5c.2 — Save Runbook documents

For each Runbook drafted in Part 2c:

1. Validate against FM-01 through FM-09, OP-06, OP-12 (runbook rules), and OP-14 (`quality_score` present, all values 1 or 2)
2. Assign a node `id` following the naming convention: `<short-procedure-slug>-runbook` (e.g., `local-dev-setup-runbook`)
3. Write the document to `.handoff/output/nodes/<id>.md`
4. Add an index entry with `doc_type: "runbook"`:
   ```json
   { "id": "...", "title": "Runbook: ...", "depth": "supporting", "dependencies": [], "file": "nodes/<id>.md", "doc_type": "runbook" }
   ```
5. Add the document path to `doc_refs` of the nearest relevant handover node (the one covering the operational area)

### Step 5c.3 — Save API Summary (conditional)

If an API Summary was drafted in Part 2c:

1. Validate against FM-01 through FM-09, OP-06, OP-12 (api_summary rules), and OP-14 (`quality_score` present, all values 1 or 2)
2. Use `id: api-summary`; write to `.handoff/output/nodes/api-summary.md`
3. Add index entry with `doc_type: "api_summary"`

### Step 5c.3a — Save Config & Environment Reference (conditional)

If ≥ 1 environment variable was collected in Step 2c.3a:

1. Draft the node using the `config_reference` template in `diagram-methodology.md` § 3.5. Build the `## Overview` paragraph(s) and the `## Variables` table, one row per variable (name, purpose, required/optional, default, domain, sensitive).
2. **Secret safety**: for any variable marked sensitive, the Default cell shows `none` or `(set per environment)` — never a literal value. Confirm no secret value appears anywhere in the body before saving.
3. Apply Step 5c.0 citations (Overview sentences + each Purpose cell) and the coarse `variable_purposes` invariant.
4. Run the Part 5d quality pass (`snippet_relevance` N/A).
5. Validate against FM-01 through FM-09, OP-06, OP-12 (config_reference rules), and OP-14.
6. Use `id: config-reference`; write to `.handoff/output/nodes/config-reference.md`.
7. Add index entry with `doc_type: "config_reference"`.

If zero environment variables were found, skip this step (no node produced).

### Step 5c.3b — Save Glossary (conditional)

If ≥ 3 distinct glossary terms were collected in Step 2c.3b:

1. Draft the node using the `glossary` template in `diagram-methodology.md` § 3.6. Render `## Terms` with one entry per term: `- **<Term>** (<domains>): <definition> (src: …)`.
2. Apply Step 5c.0 citations (each definition) and the coarse `term_definitions` invariant.
3. Run the Part 5d quality pass (`snippet_relevance` N/A).
4. Validate against FM-01 through FM-09, OP-06, OP-12 (glossary rules), and OP-14.
5. Use `id: glossary`; write to `.handoff/output/nodes/glossary.md`.
6. Add index entry with `doc_type: "glossary"`.

If fewer than 3 distinct terms were found, skip this step (no node produced).

### Step 5c.4 — Save Onboarding Guide

The Onboarding Guide must reference all nodes and documents now in `index.json`. Re-read `index.json` to get the complete current list.

1. Build `## Reading Order` from the `index.json` nodes array (core first, then supporting, then peripheral); exclude ADRs, Runbooks, and other business document types from this list
2. Build `## Related Documents` from all ADR and Runbook entries added to `index.json`
3. Write `## Project Summary` as a paragraph derived from the project's README and the core nodes' business contexts
4. Validate against FM-01 through FM-09, OP-06, OP-12 (onboarding_guide rules), and OP-14 (`quality_score` present, all values 1 or 2)
5. Write to `.handoff/output/nodes/onboarding-guide.md` (overwrite if it exists from a previous run)
6. Add index entry with `doc_type: "onboarding_guide"` if not already present; update if it exists

### Step 5c.5 — Final index sort

After all documents are complete, sort the `index.json` `nodes` array using this strict ordering:

1. `architecture-overview` node — always position 0
2. ADR nodes (`doc_type: "adr"`) — in detection order
3. Onboarding Guide node (`doc_type: "onboarding_guide"`)
4. Runbook nodes (`doc_type: "runbook"`) — in detection order
5. API Summary node (`doc_type: "api_summary"`) — if present
6. Config Reference node (`doc_type: "config_reference"`) — if present
7. Glossary node (`doc_type: "glossary"`) — if present
8. Domain nodes (no doc_type or `doc_type: "handover_node"`) sorted: `core` first → `supporting` → `peripheral`

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

Use the `generated_at_sha` captured at session start in Step 1.3 (do NOT re-run `git rev-parse HEAD` here — the SHA recorded must be the one the snippets and permalinks were rendered against). Update `index.json` by adding `"generated_at_sha": "<generated_at_sha>"` and setting `"generated_at"` to the current ISO 8601 timestamp. Write `index.json`.

If `git_available` was false at Step 1.3 (no git history or not in a git repo): omit `generated_at_sha` from `index.json`. Note to the giver: "Could not record a git SHA — the project may not have any commits yet."

(If HEAD happened to move during the run, prefer the Step 1.3 value — that is the commit the documented snippets were read at.)

### Step 7.1b — Generate index.md

1. Read the final `index.json`
2. Build **`## Business Overview`** section: for each business-document node in index order (architecture-overview, ADRs, Onboarding Guide, Runbooks, API Summary, Config Reference, Glossary), write a Markdown link: `- [<title>](nodes/<id>.md)`
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
