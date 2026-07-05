---
id: billing
title: Billing
depth: supporting
schema_version: 1
parent: business
dependencies:
  - authentication
  - api-summary
---

## Business Context

Billing domain — covers subscription model and API access tiers. Authentication gates the paid tier; see authentication node for the implementation.

## Technical Context

Implemented by the authentication service (for access gating) and api-summary for the API contract. See those nodes for implementation details.

## Decisions

- Email/password only for the MVP — no OAuth until paid tier is proven.

## Warnings

- The signing secret has no rotation mechanism — changing it invalidates all active sessions.
