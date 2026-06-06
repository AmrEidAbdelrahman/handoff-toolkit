---
id: api-summary
title: API Summary
depth: supporting
schema_version: 1
doc_type: api_summary
code_refs:
  - file: src/auth/index.ts
    line: 3
    end_line: 8
    note: "POST /auth/login — signs a JWT token for the given user ID"
  - file: src/auth/jwt.ts
    line: 9
    end_line: 13
    note: "GET /auth/verify — verifies a JWT token and returns the user ID"
---

## Overview

The SampleApp authentication API provides token-based access control for all
protected resources. Clients obtain a signed JWT on login and present it as a
Bearer token on subsequent requests. This API was generated from source-code
route detection (no OpenAPI contract file is present).

## Endpoints / Operations

### Auth Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /auth/login | Sign a JWT for the given user ID | None |
| GET | /auth/verify | Verify a Bearer token and return the user ID | Required |

**POST /auth/login** — Creates and returns a signed JWT for the provided user ID.
- Request body: `{ userId: string }`
- Response: `{ token: string }`
- Code ref: `src/auth/index.ts:createAuth.sign` (navigable in VS Code reader)

**GET /auth/verify** — Validates a Bearer token using HMAC-SHA256 verification.
- Request header: `Authorization: Bearer <token>`
- Response: `{ valid: boolean }`
- Code ref: `src/auth/jwt.ts:verify` (navigable in VS Code reader)

## Authentication

Callers authenticate using a Bearer token in the `Authorization` header.
Tokens are signed with HMAC-SHA256 using a server-side secret configured via
the `JWT_SECRET` environment variable. There is no token refresh endpoint —
clients must re-authenticate when a token expires.
