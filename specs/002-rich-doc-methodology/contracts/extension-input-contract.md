# Contract: Extension Input Requirements (Amendment for Feature 002)

**Version**: 2.0 | **Date**: 2026-05-29
**Amends**: `specs/001-handoff-platform/contracts/extension-input-contract.md` (v1.1)
**Consumer**: Handoff VS Code Extension
**Producer**: Handoff Toolkit (`.handoff/toolkit/`)

This document defines the additive changes to the extension input contract introduced by feature 002. All v1.1 rules remain in force. Only the additions and amendments are listed here.

---

## Sidebar Tree Contract (amended)

**New rule**: The sidebar tree MUST display a distinct icon for each `doc_type` value present in the index:

| `doc_type` | Icon | Label suffix |
|------------|------|--------------|
| `handover_node` (default) | existing node icon | (none) |
| `adr` | decision/scales icon | `[ADR]` |
| `runbook` | checklist/steps icon | `[Runbook]` |
| `onboarding_guide` | map/compass icon | `[Guide]` |
| `api_summary` | API/network icon | `[API]` |

If the `doc_type` value is absent or unrecognised, render with the default `handover_node` icon without error.

---

## Node Display Contract (amended)

**New rules** appended to v1.1:

**Type-aware rendering**: The extension MUST apply a layout template based on `node.docType`:

- `handover_node`: existing prose layout (Business Context → Technical Context → Decisions → Warnings → Diagrams)
- `adr`: structured card layout — Context / Decision / Consequences sections rendered with distinct visual style (border, background tint); `adr_status` shown as a badge (proposed/accepted/deprecated)
- `runbook`: numbered step list — each step in `## Steps` rendered with a large step number and a checkbox; checkbox state persisted in `workspaceState` under key `handoff.runbookProgress.<nodeId>`
- `onboarding_guide`: `## Reading Order` rendered as a numbered list of clickable node titles; clicking a title opens that node in the panel (replaces current content); `## Related Documents` rendered as clickable links
- `api_summary`: `## Endpoints / Operations` rendered in a two-column layout (operation name + description)

**Diagram rendering**: When a node has `diagramFormat: 'mermaid'` and a `## Diagrams` section:

1. The extension MUST render each diagram block as a visual SVG using the bundled Mermaid browser build (`mermaid.min.js`, loaded from extension assets, no network calls)
2. Diagram title (H3) MUST be rendered as a visible heading above the SVG
3. Diagram description MUST be rendered as a caption below the SVG
4. Raw Mermaid source MUST NOT be visible in the final render
5. **Fallback**: If Mermaid rendering fails for any reason, the raw source MUST be displayed in a `<pre>` code block — never silently hidden
6. The extension MUST NOT make any network calls to render diagrams

**Diagram navigation**:

After Mermaid renders an SVG, the extension injects click handlers:
1. Query all SVG text/label elements within each rendered diagram
2. For each element whose text content exactly matches a `code_refs[].id` value in the same node, inject a `data-id` attribute and attach a click handler
3. On click: look up the matching `code_refs` entry by `id`, then apply the standard Code Navigation Contract (open file at line, or resolve via SHA)
4. Elements with no matching `code_refs[].id` MUST render as non-interactive — no cursor change, no hover state, no error

---

## Commands Registered (amended)

Adds to the command table from v1.1:

| Command ID | Title | Behaviour |
|------------|-------|-----------|
| `handoff.markStepDone` | Mark Step Done | Toggles runbook step checkbox state in workspaceState |
| `handoff.resetRunbook` | Reset Runbook | Clears all step checkboxes for a runbook node |

---

## Bundled Assets (new)

The extension bundle MUST include:

| Asset | Location | Purpose |
|-------|----------|---------|
| `mermaid.min.js` | `dist/assets/mermaid.min.js` | Mermaid browser build for offline diagram rendering |

The webview Content Security Policy MUST allow inline script execution for Mermaid initialisation. This is consistent with standard VS Code extension practice.

The `mermaid` npm package (browser build) is injected into the WebviewPanel HTML. The webview calls `mermaid.initialize()` and `mermaid.run()` on page load. Diagram source blocks are placed in `<pre class="mermaid">` tags before Mermaid runs.

---

## Guarantee to Receiver (amended)

In addition to v1.1 guarantees, the extension MUST additionally ensure:

- A receiver can distinguish every document type visually within 2 seconds of opening it — without reading content
- Diagrams render as visual SVGs, never as raw source text, in a correctly produced and correctly installed handover
- Clicking a navigable diagram element navigates to the referenced file and line in a single interaction
- Runbook step progress persists across VS Code restarts (per workspace)
- Opening a node from the onboarding guide reading order replaces the panel content (no second panel opens)
