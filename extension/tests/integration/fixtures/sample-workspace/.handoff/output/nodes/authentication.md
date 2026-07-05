---
id: authentication
title: Authentication
depth: core
schema_version: 1
parent: services
code_refs:
  - file: src/auth/index.ts
    line: 1
    note: Auth module entry point
  - file: src/auth/jwt.ts
    line: 3
    end_line: 6
    note: Token signing and verification
  - file: src/auth/missing.ts
    line: 1
    note: Intentionally missing file (exercises not-found state)
dependencies:
  - error-handling
tags:
  - security
---

## Business Context

Authentication gates the paid tier. Email/password only for the MVP.

## Technical Context

A small JWT implementation. The signing logic lives in `src/auth/jwt.ts` and the
public surface is `src/auth/index.ts`.

## Decisions

- JWT over sessions because the API is shared by web and mobile clients.

## Warnings

- The signing secret has no rotation mechanism.
