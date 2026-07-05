# Data Model: Dual-Tree Output (Business + Technical)

## Schema Changes

### `IndexEntry` (extension/src/handoff/types.ts)

No new fields. `parent` and `dependencies` already exist from feature 009. `code_refs` is already optional.

The only behavioral change: `technical-overview` is removed from `PINNED_IDS` and `RESERVED_ROOT_IDS`.

### `PINNED_IDS` (extension/src/handoff/tree.ts)

```typescript
// Before (feature 009)
const PINNED_IDS = ['project-overview', 'technical-overview'];

// After (feature 010)
const PINNED_IDS = ['project-overview'];
```

### `RESERVED_ROOT_IDS` (extension/src/handoff/validation.ts)

```typescript
// Before (feature 009)
const RESERVED_ROOT_IDS = new Set(['project-overview', 'technical-overview']);

// After (feature 010)
const RESERVED_ROOT_IDS = new Set(['project-overview']);
```

---

## Node Templates

### Business Branch Root (`business`)

```markdown
---
id: business
title: Business
depth: core
schema_version: 1
dependencies: []
---

## Business Context

[Overview of the product's business model and what this branch covers.]

## Technical Context

See `technical` branch for implementation details.
```

### Business Domain Node (e.g., `billing`)

```markdown
---
id: billing
title: Billing
depth: supporting
schema_version: 1
parent: business
dependencies: [payment-service, billing-routes, stripe-webhooks]
---

## Business Context

[Why this domain exists, who requested it, what business rules govern it.]

## Technical Context

Implemented by: payment-service, billing-routes, stripe-webhooks. See those nodes for implementation details.

## Decisions

- [Decision and rationale]

## Warnings

- [Contractual constraints, time-sensitive rules, gotchas]
```

### Business Leaf Node (e.g., `subscription-model`)

```markdown
---
id: subscription-model
title: Subscription Model
depth: supporting
schema_version: 1
parent: billing
dependencies: [payment-service, billing-routes]
code_refs:
  - file: config/pricing.ts
    note: Pricing tier configuration
---

## Business Context

[Deep WHY: pricing strategy, tiers, what happens on upgrade/downgrade, client's monetization goals.]

## Technical Context

See payment-service for Stripe integration, billing-routes for API endpoints.

## Decisions

- [Why monthly-only at launch]
- [Why no annual billing yet]

## Warnings

- Refund window is 14 days per client contract — changing this breaks billing for existing subscribers.
```

### Technical Branch Root (`technical`)

```markdown
---
id: technical
title: Technical
depth: core
schema_version: 1
dependencies: []
---

## Business Context

See `business` branch for business domain context.

## Technical Context

[Overview of the technical architecture — stack, key patterns, entry points.]
```

### Technical Sub-Branch Node (e.g., `services`)

```markdown
---
id: services
title: Services
depth: supporting
schema_version: 1
parent: technical
dependencies: []
---

## Business Context

The services layer implements business domain logic. See `business` branch for domain context.

## Technical Context

[Overview of the services layer — patterns used, shared infrastructure, DI approach.]
```

### Technical Leaf Node (e.g., `payment-service`)

```markdown
---
id: payment-service
title: Payment Service
depth: supporting
schema_version: 1
parent: services
dependencies: [billing]
code_refs:
  - file: src/services/payment.service.ts
    note: Main service class
  - file: src/services/payment.service.ts
    symbol: PaymentService.charge
    note: Core charge method
---

## Business Context

Implements the billing subscription model. See `billing` for business rules and pricing strategy.

## Technical Context

[Deep HOW: class structure, Stripe webhook flow, idempotency keys, error handling.]

## Decisions

- Why Stripe Checkout over custom forms
- Why idempotency keys on charges

## Warnings

- Webhook signature verification isn't load-tested — duplicate webhook events are possible.
```

---

## `session.json` Extension

The toolkit writes the confirmed dual tree to `session.json` before generation begins:

```json
{
  "project_name": "...",
  "generated_at": "...",
  "proposed_business_tree": {
    "business": null,
    "billing": "business",
    "subscription-model": "billing",
    "pricing-rules": "billing",
    "user-management": "business",
    "registration-flow": "user-management"
  },
  "proposed_technical_tree": {
    "technical": null,
    "services": "technical",
    "payment-service": "services",
    "user-service": "services",
    "api": "technical",
    "billing-routes": "api",
    "auth-routes": "api"
  },
  "cross_references": {
    "billing": ["payment-service", "billing-routes"],
    "subscription-model": ["payment-service", "billing-routes"],
    "payment-service": ["billing"],
    "billing-routes": ["billing"]
  }
}
```

- `proposed_business_tree`: `{ node-id → parent-id | null }` for business nodes
- `proposed_technical_tree`: `{ node-id → parent-id | null }` for technical nodes
- `cross_references`: `{ node-id → [node-id, ...] }` — pre-computed bidirectional dependencies
