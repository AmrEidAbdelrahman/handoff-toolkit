# Research: Dual-Tree Output (Business + Technical)

## Decision 1: Backward compatibility for `technical-overview`

**Decision**: Remove `technical-overview` from `PINNED_IDS` in `tree.ts` and from `RESERVED_ROOT_IDS` in `validation.ts`. Any existing handoff output that contains a `technical-overview` node will render as a regular depth-group node instead of a pinned root — no errors, no migration needed.

**Rationale**: The pinned behavior was the only special treatment. Removing `technical-overview` from the two constant arrays is a one-line change per file. Existing `technical-overview` nodes fall into the `core` depth group (their `depth` field was always `core`), so they remain visible and navigable.

**Alternatives considered**: Keeping `technical-overview` as a pinned root and adding `business` as a second pinned root — rejected because it creates three pinned roots (project-overview, technical-overview, business), which is cluttered and doesn't match the new dual-tree model where `business` and `technical` are peers.

---

## Decision 2: Depth of `business` and `technical` branch nodes

**Decision**: Assign `depth: "core"` to both `business` and `technical` parent nodes. Their first-level children (domains and technical branches like `services`, `api`) get `depth: "supporting"`. Leaf nodes get `depth: "supporting"` or `depth: "peripheral"` based on how essential they are.

**Rationale**: `business` and `technical` are the two primary entry points — they're as important as `project-overview` and should appear in the `Core` group. This ensures they appear at the top of the depth-group section immediately after the pinned `project-overview`. First-level children in `Supporting` keeps the depth hierarchy meaningful.

**Alternatives considered**: `depth: "supporting"` for both branches — would push them below any standalone core nodes, which is wrong for the primary navigation branches.

---

## Decision 3: Giver confirmation interaction model

**Decision**: In `handoff-start/SKILL.md`, Step 2.4 (detect) and Step 2.5 (present + confirm) are sequential interactive steps. After detection, Claude presents both proposed trees as ASCII trees in a single message, then waits for the giver's response before proceeding. Adjustments are processed inline (Claude re-renders the updated tree) until the giver says "looks good" or equivalent. The confirmed tree is then written to `session.json` as `proposed_business_tree` and `proposed_technical_tree`.

**Rationale**: The SKILL.md runs in an interactive Claude session. A multi-turn confirmation is natural and already how other interactive handoff steps work (e.g., the giver answering questions about each module). Single-message presentation keeps it scannable; the giver doesn't need to navigate multiple tool outputs.

**Alternatives considered**: Generating a draft tree file and asking the giver to edit it directly — rejected because it requires file editing outside the conversation, which breaks the flow and doesn't work in all Claude environments.

---

## Decision 4: Business domain inference heuristics

**Decision**: Business domains are inferred from a priority-ordered signal list:
1. **Top-level folders** that aren't infrastructure (`src/`, `lib/`, `test/`, `dist/`, `node_modules/`, `config/`): `auth/`, `billing/`, `notifications/` → domains.
2. **Route group prefixes** in route files: `/api/users`, `/api/billing` → User Management, Billing.
3. **Model/schema file names**: `user.model.ts`, `invoice.schema.ts` → User, Invoice/Billing.
4. **Service file names**: `payment.service.ts`, `email.service.ts` → Payment/Billing, Notifications.

Signals are combined to produce a deduplicated domain list with inferred display names. If no signals are found (e.g., a utility library), the toolkit falls back to a single `general` business domain and notes this to the giver.

**Rationale**: These four signals cover the dominant patterns in Express/NestJS (routes), Rails (folders), Django (apps), and React (pages/features). Combining signals reduces false negatives. The fallback prevents a hard failure on unusual project structures.

**Alternatives considered**: Purely LLM-based domain inference from reading all source files — too slow and non-deterministic; rejected in favor of fast heuristics supplemented by giver confirmation.

---

## Decision 5: Technical structure inference

**Decision**: Technical branches are detected by scanning for these stack-specific directories and file patterns:
- `services/` or `*.service.ts` → `services` branch
- `routes/`, `controllers/`, `api/`, `endpoints/` → `api` branch
- `models/`, `schemas/`, `migrations/` → `data-model` branch
- `components/`, `pages/`, `views/` → `ui` branch (frontend only)
- `Dockerfile`, `docker-compose.yml`, `k8s/`, `terraform/`, `ci/`, `.github/workflows/` → `infrastructure` branch
- `lib/`, `utils/`, `helpers/` → `shared` branch (if substantial)

Only branches with at least one detected node are included.

**Rationale**: These patterns are stable across the most common stacks (Express, NestJS, Rails, Django, React, Vue). Threshold of "at least one detected node" prevents empty branches.

**Alternatives considered**: Fixed technical branch list regardless of project structure — rejected because a React project doesn't have `services/` but does have `components/`, and a backend API doesn't have `components/`. The structure should match what's actually there.

---

## Decision 6: Generation order (business first, then technical)

**Decision**: After the giver confirms both trees, the toolkit generates in this order:
1. Business branch nodes (root → leaves), prompting the giver for WHY context at each leaf.
2. Technical branch nodes (root → leaves), drafted from code, giver reviews/supplements.
3. `project-overview` last (it can reference both trees once they're written).

**Rationale**: Business context is the hardest to extract from code and the most time-sensitive — the giver's memory of decisions is freshest at the start. Technical nodes are largely code-drivable so they can be drafted by the toolkit without heavy giver input.

**Alternatives considered**: Interleaved generation (business node → matching technical node → next business node) — rejected because it fragments the giver's mental context. Staying in one tree at a time is less cognitively demanding.

---

## Decision 7: Cross-reference population

**Decision**: The toolkit auto-populates `dependencies` in both directions:
- When writing a business leaf node, the toolkit lists the technical node IDs that implement it (inferred from name matching during Step 2.4 detection) in `dependencies`.
- When writing a technical leaf node, the toolkit lists the matching business node ID in `dependencies`.

The giver can add/remove cross-references during the review step. The extension's existing dependency renderer already displays these as clickable links — no extension changes needed for cross-reference rendering.

**Rationale**: Automatic cross-reference population from the confirmed tree map ensures bidirectional linking without requiring the giver to manually enter IDs. The toolkit already has the mapping from Step 2.4 (it knows `payment-service` implements `billing/subscription-model`).

**Alternatives considered**: Leaving cross-references entirely to the giver — rejected because manual entry is error-prone and the toolkit already has the information.
