# Handoff — Node Schema Specification

**Version:** 1.0  
**Status:** Active  
**Last Updated:** May 2026  

This document defines the formal contract between the Handoff Toolkit (generator) and the Handoff VS Code Extension (consumer). Every node file must conform to this spec. If the toolkit produces it and the extension reads it, this document is the source of truth.

---

## 1. File Format

Each node is a single Markdown file with YAML frontmatter.

- **Location:** `.handoff/output/nodes/`
- **Naming:** `{id}.md` — the filename matches the `id` field in the frontmatter
- **Encoding:** UTF-8
- **Line endings:** LF (Unix-style)

### Why Markdown, Not JSON

- Human-readable without the extension — works on GitHub, in any editor, in any diff tool
- AI agents produce better natural language in markdown than inside JSON string values
- Developers can manually edit nodes after generation without fighting a data format
- Frontmatter gives the extension all the structured data it needs for parsing and rendering

---

## 2. Node Structure

Every node file has two parts: YAML frontmatter (structured metadata) and Markdown body (rich content).

```
---
# ── Required Fields ──
id: string
title: string
depth: core | supporting | peripheral
schema_version: 1

# ── Required Arrays ──
code_refs:
  - file: string
    line: number
    note: string

# ── Optional Fields ──
dependencies: [string]
tags: [string]
generated_at: ISO 8601 datetime

---

## Business Context
[Required — why this exists from a business perspective]

## Technical Context
[Required — how this works technically]

## Decisions
[Optional — key architectural or design decisions]

## Warnings
[Optional — gotchas, known issues, things to watch out for]
```

---

## 3. Frontmatter Fields

### Required Fields

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | string | Unique identifier for this node. Lowercase, hyphenated. Must match the filename (without `.md`). | Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`. Max 60 chars. No spaces, no underscores. |
| `title` | string | Human-readable section title. Displayed in the extension sidebar tree. | Non-empty. Max 120 chars. |
| `depth` | enum | How central this section is to the project. | One of: `core`, `supporting`, `peripheral` |
| `schema_version` | integer | Schema version this node conforms to. | Must be `1` for this version. |
| `code_refs` | array | Links to specific locations in the codebase. At least one required. | Min 1 item. See Code Ref schema below. |

### Optional Fields

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `parent` | string | The `id` of the parent node in the same output. Absence means root-level. Parent/grouping nodes have no `parent`; leaf nodes reference their grouping node's `id`. | Must match `^[a-z0-9]+(-[a-z0-9]+)*$`. Must not equal the node's own `id`. Must not create a cycle. Must not be set on reserved root nodes (`project-overview`, `technical-overview`). |
| `dependencies` | array of strings | IDs of other nodes this section relates to. | Each value must be a valid node `id` that exists in the index. |
| `tags` | array of strings | Freeform tags for filtering and grouping. | Lowercase, hyphenated. Max 10 tags. |
| `generated_at` | string | When this node was generated or last updated. | ISO 8601 format: `2026-05-23T14:30:00Z` |

### Code Ref Schema

Each item in `code_refs` describes a specific location in the codebase.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | string | Yes | Relative path from project root. Forward slashes only. |
| `line` | integer | No | Starting line number (1-indexed). Omit if referencing the whole file. |
| `end_line` | integer | No | Ending line number for ranges. Only valid if `line` is set. |
| `note` | string | Yes | Short description of what this reference points to. Max 200 chars. |

---

## 4. Markdown Body Sections

The body uses H2 headings (`##`) to delimit sections. The extension parses these by heading name.

### Required Sections

**`## Business Context`**  
Why this part of the project exists from a business, product, or user perspective. This is the "WHY" — the context that cannot be inferred from reading the code. Should answer questions like: What problem does this solve? Who requested it? What business rule drives the behavior? What would break from a user perspective if this disappeared?

**`## Technical Context`**  
How this works technically. Architecture, data flow, key patterns, integration points. This is the "HOW" — the technical explanation that saves the receiver from reverse-engineering the code. Should answer questions like: What's the high-level approach? What patterns or libraries does it use? How does data flow through it? What are the entry points?

### Optional Sections

**`## Decisions`**  
Key architectural or design decisions made in this area. Each decision should explain what was chosen and why. Use a list format — one decision per bullet. Include the reasoning, not just the choice.

**`## Warnings`**  
Gotchas, known issues, fragile areas, things that will break if touched carelessly. This is tribal knowledge — the stuff a developer would tell you verbally but never write down. Use a list format — one warning per bullet. Be specific about what can go wrong.

### Section Rules

- Sections must appear in the order listed above: Business Context → Technical Context → Decisions → Warnings
- Required sections must be present and non-empty (at least one paragraph)
- Optional sections can be omitted entirely — do not include empty sections
- No additional H2 sections are allowed (extension ignores unknown sections)
- Content under each section can use any markdown: paragraphs, lists, inline code, code blocks, links
- No H1 headings in the body — H1 is reserved for the extension to render the title

---

## 5. Index File

The index file is the master manifest of all nodes. The extension reads this first.

- **Location:** `.handoff/output/index.json`
- **Format:** JSON (the index is structured data, not a document — JSON is appropriate here)

### Index Schema

```json
{
  "schema_version": 1,
  "project_name": "string",
  "generated_at": "ISO 8601 datetime",
  "nodes": [
    {
      "id": "string",
      "title": "string",
      "depth": "core | supporting | peripheral",
      "dependencies": ["string"],
      "parent": "string (optional — id of parent node; absent means root-level)",
      "file": "nodes/{id}.md"
    }
  ]
}
```

### Reserved Root Nodes

Two node IDs are reserved and always expected to be present in toolkit-generated output:

| ID | Depth | Parent |
|----|-------|--------|
| `project-overview` | `core` | none (always root-level) |
| `technical-overview` | `core` | none (always root-level) |

These nodes are pinned at the top of the sidebar tree. They must never have a `parent` field set.

### Index Rules

- Every node in `nodes/` must have a corresponding entry in the index
- Every entry in the index must have a corresponding file in `nodes/`
- Nodes are ordered: `core` first, then `supporting`, then `peripheral`
- Within each depth level, order is determined by the toolkit (typically by logical dependency)
- If a node entry has a `parent` field, it must reference the `id` of another entry in the same index; a missing reference is a warning (the node is rendered at root level), not an error

---

## 6. Depth Levels

The `depth` field classifies how central a node is to understanding the project.

| Depth | Meaning | Receiver Guidance |
|-------|---------|-------------------|
| `core` | Essential to understanding the project. The receiver should read these first. | Read all core nodes before touching the codebase. These cover the architecture, main features, and critical business logic. |
| `supporting` | Important but not critical for initial understanding. | Read these after core nodes, or when you encounter the relevant code area. |
| `peripheral` | Nice to know. Utilities, configs, minor features. | Reference these as needed. Skim or skip on first pass. |

### Guidelines for the Toolkit

- A typical project has 2–5 core nodes, 3–8 supporting nodes, and 0–5 peripheral nodes
- If everything is marked `core`, nothing is — be selective
- Authentication, data model, and deployment are almost always `core`
- Utility functions, dev tooling, and CI/CD configs are usually `peripheral`

---

## 7. Validation Rules

These rules define what makes a node valid. The toolkit should validate before writing. The extension should validate before rendering.

### Frontmatter Validation

1. `id` is present, matches the filename, and conforms to the pattern `^[a-z0-9]+(-[a-z0-9]+)*$`
2. `title` is present and non-empty
3. `depth` is one of: `core`, `supporting`, `peripheral`
4. `schema_version` equals `1`
5. `code_refs` is present and contains at least one item
6. Each `code_ref` has a non-empty `file` and a non-empty `note`
7. If `dependencies` is present, each value is a non-empty string
8. If `line` is present in a `code_ref`, it is a positive integer
9. If `end_line` is present, `line` must also be present and `end_line >= line`
10. If `parent` is present, it must be a non-empty string matching `^[a-z0-9]+(-[a-z0-9]+)*$`, must not equal the node's own `id`, must not create a circular reference chain, and must not be set on the reserved root ids `project-overview` or `technical-overview`

### Body Validation

1. `## Business Context` section exists and contains at least one non-empty paragraph
2. `## Technical Context` section exists and contains at least one non-empty paragraph
3. If `## Decisions` is present, it contains at least one list item
4. If `## Warnings` is present, it contains at least one list item
5. No H1 headings exist in the body
6. Sections appear in order: Business Context → Technical Context → Decisions → Warnings

### Index Validation

1. `schema_version` equals `1`
2. `project_name` is non-empty
3. Every node entry has `id`, `title`, `depth`, and `file`
4. Every `file` value points to an existing file in `nodes/`
5. No duplicate `id` values
6. Every `.md` file in `nodes/` has a corresponding index entry
7. If a node entry has a `parent` field, the referenced `id` must exist elsewhere in the index (missing reference → warning; node renders at root level)
8. Reserved root node ids (`project-overview`, `technical-overview`) must not have a `parent` field set

---

## 8. Example Nodes

### Example 1: Core Node — Authentication

**File:** `.handoff/output/nodes/authentication.md`

```markdown
---
id: authentication
title: Authentication & Session Management
depth: core
schema_version: 1
parent: modules
code_refs:
  - file: src/auth/index.ts
    line: 1
    note: Auth module entry point — exports middleware and helpers
  - file: src/auth/jwt.ts
    line: 23
    end_line: 45
    note: Token generation and verification logic
  - file: src/auth/middleware.ts
    line: 12
    note: Express middleware that validates JWT on protected routes
  - file: src/config/auth.config.ts
    line: 1
    note: Token expiry, issuer, and secret configuration
dependencies:
  - user-management
  - database
tags:
  - security
  - middleware
generated_at: 2026-05-23T14:30:00Z
---

## Business Context

Authentication exists because the platform serves both free and paid users with different access levels. The client specifically requested JWT-based auth rather than session cookies because the frontend is a React SPA that also powers a mobile app through a shared API.

The login flow supports email/password only — no OAuth. This was a deliberate scope decision by the client who wanted to avoid third-party auth dependencies for their initial launch. OAuth (Google, GitHub) is on their post-launch roadmap.

Token expiry is set to 7 days. The client's user research showed that their target audience (small business owners) found frequent re-logins frustrating enough to churn. The 7-day window was a compromise between security and retention.

## Technical Context

The auth system is a standard JWT implementation with three layers: token generation (`jwt.ts`), request validation middleware (`middleware.ts`), and a thin wrapper that ties them together (`index.ts`).

Tokens are signed with HS256 using a secret from environment variables. The payload contains `userId`, `email`, and `role` (either `free` or `paid`). There is no refresh token — when the token expires, the user logs in again. This was a simplification for MVP.

The middleware attaches the decoded user object to `req.user` on every authenticated request. Routes that need auth use `requireAuth()` middleware. Routes that need paid-tier access use `requirePaid()`, which is a wrapper that checks `req.user.role`.

Password hashing uses bcrypt with 12 salt rounds. Passwords are never logged or returned in API responses.

## Decisions

- **JWT over sessions:** Client requirement — SPA + mobile app share the same API, and stateless auth simplifies the architecture. Sessions would require sticky sessions or a session store.
- **No refresh tokens in MVP:** Reduced complexity. The 7-day expiry means users rarely hit expiration in practice. Refresh tokens are the first thing to add if the client moves to shorter expiry windows.
- **HS256 over RS256:** Single-service architecture — no need for public key verification. If the system moves to microservices, switch to RS256 so services can verify tokens without sharing the secret.
- **12 bcrypt rounds:** Balances security with login response time. At 12 rounds, hashing takes ~250ms on the production server, which is acceptable for a login endpoint.

## Warnings

- **The JWT secret is in `.env` and has no rotation mechanism.** If it leaks, every active token is compromised and there's no way to invalidate them short of changing the secret (which logs out every user). This is a known gap — add a token blacklist or switch to short-lived tokens + refresh tokens before scaling.
- **No rate limiting on the login endpoint.** The client was told about this and accepted the risk for MVP. Add rate limiting before any public launch or marketing push.
- **The `requirePaid()` middleware trusts the role in the JWT.** If a user upgrades from free to paid, their old token still says `free` until it expires or they log out and back in. This causes support tickets — the workaround is to tell users to log out and log in after upgrading.
```

### Example 2: Supporting Node — API Error Handling

**File:** `.handoff/output/nodes/api-error-handling.md`

```markdown
---
id: api-error-handling
title: API Error Handling & Response Format
depth: supporting
schema_version: 1
code_refs:
  - file: src/middleware/error-handler.ts
    line: 1
    note: Global Express error handler — catches all unhandled errors
  - file: src/utils/app-error.ts
    line: 1
    note: Custom error class with status code and error type
  - file: src/utils/response.ts
    line: 8
    end_line: 22
    note: Standard response envelope — all API responses use this format
dependencies:
  - authentication
tags:
  - api
  - middleware
generated_at: 2026-05-23T14:35:00Z
---

## Business Context

Consistent error responses were a requirement from the frontend team. The React app has a global error interceptor in Axios that parses error responses and shows user-friendly messages. If the API returns errors in different shapes, the frontend error handling breaks and users see raw error text or generic "something went wrong" messages.

The client also uses the API error responses in their internal monitoring. They pipe 5xx errors to Slack via a webhook, so the error format needed to be predictable enough for their alerting to parse.

## Technical Context

Every API response follows the same envelope:

```json
{
  "success": true | false,
  "data": {} | null,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {}
  } | null
}
```

Errors are thrown as `AppError` instances anywhere in the codebase. The global error handler in `error-handler.ts` catches them and formats the response. Unknown errors (not `AppError` instances) are logged and returned as 500 with a generic message — the real error never leaks to the client.

Error types are a fixed enum: `VALIDATION_ERROR`, `AUTH_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `RATE_LIMITED`, `INTERNAL`. The frontend maps these to user-facing messages.

## Decisions

- **Envelope pattern over HTTP-status-only:** The frontend team preferred parsing a consistent body over relying on HTTP status codes alone. The `success` boolean makes conditional logic simpler on the client side.
- **Error type enum over free-text codes:** Keeps the contract between frontend and backend tight. Adding a new error type is a deliberate decision, not an accident.

## Warnings

- **The `details` field in errors is untyped.** Different error types put different shapes in `details` (validation errors put field-level errors, auth errors put nothing). The frontend handles this with defensive checks, but it is fragile. Consider typing `details` per error type if the API grows.
```

### Example 3: Peripheral Node — Development Environment

**File:** `.handoff/output/nodes/dev-environment.md`

```markdown
---
id: dev-environment
title: Development Environment & Local Setup
depth: peripheral
schema_version: 1
code_refs:
  - file: docker-compose.yml
    line: 1
    note: Local dev stack — app, database, and Redis
  - file: .env.example
    line: 1
    note: Template for required environment variables
  - file: scripts/seed.ts
    line: 1
    note: Database seed script — creates test users and sample data
tags:
  - devops
  - setup
generated_at: 2026-05-23T14:40:00Z
---

## Business Context

The development setup was designed so a new developer can go from clone to running app in under 5 minutes. The client has a rotating roster of contractors and wanted to minimize onboarding friction. Docker handles all service dependencies so nobody needs to install Postgres or Redis locally.

## Technical Context

The local stack runs through Docker Compose with three services: the Node app (with hot reload via nodemon), PostgreSQL 15, and Redis 7. The app service mounts the source directory, so changes reflect immediately without rebuilding the container.

Setup is: copy `.env.example` to `.env`, run `docker-compose up`, then `npm run seed` in a separate terminal to populate test data. The seed script creates 3 test users (admin, paid, free) with known passwords documented in `.env.example`.

## Warnings

- **The seed script is destructive.** It drops and recreates all tables before seeding. Never run it against anything other than the local database. There is no confirmation prompt — this has bitten people before.
- **Docker Compose uses port 5432 for Postgres.** If you have a local Postgres running, there will be a port conflict. Either stop local Postgres or change the port mapping in `docker-compose.yml`.
```

---

## 9. Example Index File

**File:** `.handoff/output/index.json`

```json
{
  "schema_version": 1,
  "project_name": "ClientPortal",
  "generated_at": "2026-05-23T14:45:00Z",
  "nodes": [
    {
      "id": "project-overview",
      "title": "Project Overview",
      "depth": "core",
      "dependencies": [],
      "file": "nodes/project-overview.md"
    },
    {
      "id": "technical-overview",
      "title": "Technical Overview",
      "depth": "core",
      "dependencies": [],
      "file": "nodes/technical-overview.md"
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
      "title": "Authentication & Session Management",
      "depth": "core",
      "dependencies": ["user-management", "database"],
      "parent": "modules",
      "file": "nodes/authentication.md"
    },
    {
      "id": "api-error-handling",
      "title": "API Error Handling & Response Format",
      "depth": "supporting",
      "dependencies": ["authentication"],
      "parent": "modules",
      "file": "nodes/api-error-handling.md"
    },
    {
      "id": "dev-environment",
      "title": "Development Environment & Local Setup",
      "depth": "peripheral",
      "dependencies": [],
      "file": "nodes/dev-environment.md"
    }
  ]
}
```

---

## 10. Schema Evolution

When the schema needs to change:

1. **Additive changes** (new optional fields, new optional sections): Increment `schema_version`. Old nodes remain valid — the extension ignores fields it does not recognize.
2. **Breaking changes** (removing fields, changing types, renaming sections): Major version bump. The extension must handle both old and new versions during a transition period.
3. **The `schema_version` field is mandatory** precisely for this reason. It lets the extension know which rules to apply.

### Migration Path

When a breaking change happens, the toolkit should include a migration skill that can read old-format nodes and rewrite them in the new format. The extension should display a warning for nodes with an outdated `schema_version` but still attempt to render them.

---

*End of Specification*
