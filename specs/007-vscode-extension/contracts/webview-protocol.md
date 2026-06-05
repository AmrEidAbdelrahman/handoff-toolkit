# Contract (Internal): Extension ↔ Webview Message Protocol

**Direction**: Bidirectional, between the extension host and the `handoff.reader` webview. All traffic is JSON messages over `webview.postMessage` / `acquireVsCodeApi().postMessage`. The webview never reads files or runs untrusted code; it only renders what the host sends and reports user intent back.

## Host → Webview

| `type` | Payload | Effect |
|--------|---------|--------|
| `showNode` | `{ id, title, depth, position: { index, total, depthIndex, depthTotal }, sections: Section[], codeRefs: CodeRefView[], issues: ValidationIssue[] }` | Render the doc pane: breadcrumb (`depth · depthIndex of depthTotal`), color-coded sections, code-ref list, any issue banners. Then request the first code ref. |
| `showCode` | `{ refIndex, file, note, status, languageId?, highlightedHtml?, highlightRange? }` | Render/replace the active code pane tab content; apply line highlight; or show non-fatal not-found / out-of-range state. |
| `setActiveTab` | `{ refIndex }` | Highlight the active code tab without re-fetching (already-loaded refs). |
| `setError` | `{ message }` | Show a top-level error state (e.g. bad index) in place of content. |

`Section` = `{ kind, html }` (kind ∈ business|technical|decisions|warnings). `CodeRefView` = `{ index, file, line?, endLine?, note }`.

## Webview → Host

| `type` | Payload | Effect |
|--------|---------|--------|
| `ready` | `{}` | Webview finished bootstrapping; host sends the initial `showNode`. |
| `requestCodeRef` | `{ refIndex }` | User clicked a code-ref tab or the ref list; host resolves it live and replies `showCode`. |
| `inlineMention` | `{ refIndex }` | User clicked an inline code mention mapped to a ref; same handling as `requestCodeRef`. |
| `navigate` | `{ direction: 'next' \| 'previous' }` | Host selects the adjacent node, calls `treeView.reveal()`, and sends the new `showNode` (bidirectional sync). |
| `openInEditor` | `{ refIndex }` | (Optional) open the referenced file in a real editor at the line — convenience, not core MVP. |

## Rules

- **Inline mention mapping** is computed host-side or webview-side against the node's `codeRefs`; the message carries only a `refIndex` so the webview never needs file paths to act.
- **Highlighting** is done host-side (Shiki); `highlightedHtml` is trusted-rendered HTML the webview injects. CSP uses a nonce; `localResourceRoots` is limited to the extension `ui/` assets; no remote content.
- **State retention**: the panel uses `retainContextWhenHidden` and a serializer, so re-sending full state is only required on first load or explicit refresh, not on every hide/show.
- **Idempotency**: `showNode` fully replaces doc-pane state; the webview holds no authoritative model beyond what the last `showNode`/`showCode` provided.
