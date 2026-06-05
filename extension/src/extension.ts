// Activation + orchestration. Wires detection → load → tree + reader webview,
// read state, and navigation. Read-only over .handoff/output/.

import * as vscode from 'vscode';
import { ParsedNode } from './handoff/types';
import { ReadState } from './state/readState';
import { HandoffTreeProvider } from './tree/handoffTreeProvider';
import {
  HandoffLocation,
  handoffExists,
  locateHandoff,
  watchHandoff,
} from './workspace/detector';
import { resolveCodeRef } from './workspace/codeResolver';
import { Handover, loadHandover } from './workspace/outputRepository';
import { clearHighlightCache, highlight, warmUp } from './webview/highlighter';
import {
  CodePayload,
  NodePayload,
  ReaderPanel,
  READER_VIEW_TYPE,
} from './webview/panelManager';

let handover: Handover | undefined;
let location: HandoffLocation | undefined;
let currentId: string | undefined;
let extContext: vscode.ExtensionContext | undefined;

const CURRENT_KEY = 'handoff.currentId';

function setCurrent(id: string | undefined): void {
  currentId = id;
  void extContext?.workspaceState.update(CURRENT_KEY, id);
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  extContext = context;
  currentId = context.workspaceState.get<string>(CURRENT_KEY);
  const readState = new ReadState(context);
  const tree = new HandoffTreeProvider(readState);
  const treeView = vscode.window.createTreeView('handoff.nav', { treeDataProvider: tree });
  context.subscriptions.push(treeView);

  const panel = new ReaderPanel(context, {
    onReady: () => {
      if (currentId) void showNode(currentId, panel, tree, treeView, readState, false);
    },
    onRequestCodeRef: (refIndex) => void showCode(refIndex, panel),
    onNavigate: (direction) => void navigate(direction, panel, tree, treeView, readState),
    onOpenInEditor: (refIndex) => void openInEditor(refIndex),
  });

  async function reload(): Promise<void> {
    location = locateHandoff();
    if (!location || !(await handoffExists(location))) {
      handover = undefined;
      tree.setRoots([]);
      treeView.badge = undefined;
      return;
    }
    const result = await loadHandover(location);
    if (!result.ok) {
      handover = undefined;
      tree.setRoots([]);
      treeView.badge = undefined;
      const msg = result.issues.map((i) => i.message).join(' ');
      vscode.window.showErrorMessage(`Handoff: could not load handover. ${msg}`);
      if (panel.isOpen()) panel.setError(`Could not load the handover. ${msg}`);
      return;
    }
    handover = result.handover;
    await readState.prune(new Set(handover.nodeById.keys()));
    clearHighlightCache();
    tree.setRoots(handover.tree);
    updateBadge(treeView, readState);

    // Surface top-level (index) issues without blocking.
    const errs = handover.issues.filter((i) => i.severity === 'error');
    if (errs.length) {
      vscode.window.showWarningMessage(`Handoff: ${errs.length} issue(s) in the handover. ${errs[0].message}`);
    }
    if (currentId && !handover.nodeById.has(currentId)) setCurrent(undefined);

    // Re-render the current node if the reader is already open (e.g. restored by the
    // serializer after a window reload, or after a watch-triggered reload).
    if (panel.isOpen() && currentId) {
      await showNode(currentId, panel, tree, treeView, readState, true);
    }
  }

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('handoff.refresh', () => void reload()),
    vscode.commands.registerCommand('handoff.open', async () => {
      panel.ensure();
      const first = currentId ?? handover?.order[0]?.id;
      if (first) await showNode(first, panel, tree, treeView, readState, true);
    }),
    vscode.commands.registerCommand('handoff.openNode', async (id: string) => {
      panel.ensure();
      await showNode(id, panel, tree, treeView, readState, true);
    }),
    vscode.commands.registerCommand('handoff.next', () =>
      navigate('next', panel, tree, treeView, readState),
    ),
    vscode.commands.registerCommand('handoff.previous', () =>
      navigate('previous', panel, tree, treeView, readState),
    ),
    vscode.commands.registerCommand('handoff.markAllRead', async () => {
      if (!handover) return;
      await readState.markAll([...handover.nodeById.keys()]);
      tree.refresh();
      updateBadge(treeView, readState);
    }),
    vscode.commands.registerCommand('handoff.markAllUnread', async () => {
      await readState.reset();
      tree.refresh();
      updateBadge(treeView, readState);
    }),
  );

  // Restore a serialized reader panel after window reload.
  vscode.window.registerWebviewPanelSerializer(READER_VIEW_TYPE, {
    async deserializeWebviewPanel(restored: vscode.WebviewPanel) {
      panel.adopt(restored);
    },
  });

  // Refresh highlighting on theme change (cache is theme-keyed but clear to be safe).
  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme(() => clearHighlightCache()),
  );

  context.subscriptions.push(watchHandoff(() => void reload()));

  warmUp();
  await reload();
}

export function deactivate(): void {
  handover = undefined;
  location = undefined;
  currentId = undefined;
  extContext = undefined;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function positionOf(node: ParsedNode): NodePayload['position'] {
  const order = handover!.order;
  const index = order.findIndex((n) => n.id === node.id);
  const sameDepth = order.filter((n) => n.depth === node.depth);
  const depthIndex = sameDepth.findIndex((n) => n.id === node.id);
  return {
    depth: node.depth,
    depthIndex: depthIndex + 1,
    depthTotal: sameDepth.length,
    index: index + 1,
    total: order.length,
  };
}

async function showNode(
  id: string,
  panel: ReaderPanel,
  tree: HandoffTreeProvider,
  treeView: vscode.TreeView<unknown>,
  readState: ReadState,
  reveal: boolean,
): Promise<void> {
  if (!handover) return;
  const node = handover.nodeById.get(id);
  if (!node) return;
  setCurrent(id);

  const payload: NodePayload = {
    id: node.id,
    title: node.title,
    depth: node.depth,
    position: positionOf(node),
    sections: node.sections,
    codeRefs: node.codeRefs.map((r, i) => ({
      index: i,
      file: r.file,
      line: r.line,
      endLine: r.endLine,
      note: r.note,
    })),
    issues: node.issues,
  };
  panel.showNode(payload);

  // Auto-load the first code ref.
  if (node.codeRefs.length > 0) await showCode(0, panel);

  // Mark read + reflect in the tree/badge.
  const changed = await readState.markRead(id);
  if (changed) {
    tree.refresh();
    updateBadge(treeView, readState);
  }

  if (reveal) {
    const tn = tree.findNode(id);
    if (tn) void treeView.reveal(tn, { select: true, focus: false });
  }
}

async function showCode(refIndex: number, panel: ReaderPanel): Promise<void> {
  if (!handover || !currentId) return;
  const node = handover.nodeById.get(currentId);
  const root = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!node || !root) return;
  const ref = node.codeRefs[refIndex];
  if (!ref) return;

  const resolution = await resolveCodeRef(root, ref);
  const base: CodePayload = {
    refIndex,
    file: ref.file,
    note: ref.note,
    status: resolution.status,
  };
  if (resolution.status === 'ok' && resolution.text !== undefined) {
    const { html, startLine } = await highlight(ref.file, {
      text: resolution.text,
      lang: resolution.languageId ?? 'text',
      highlightStart: resolution.highlightStart,
      highlightEnd: resolution.highlightEnd,
    });
    base.html = html;
    base.startLine = startLine;
  }
  panel.showCode(base);
}

async function navigate(
  direction: 'next' | 'previous',
  panel: ReaderPanel,
  tree: HandoffTreeProvider,
  treeView: vscode.TreeView<unknown>,
  readState: ReadState,
): Promise<void> {
  if (!handover) return;
  const order = handover.order;
  const idx = currentId ? order.findIndex((n) => n.id === currentId) : -1;
  const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
  if (nextIdx < 0 || nextIdx >= order.length) return;
  panel.ensure();
  await showNode(order[nextIdx].id, panel, tree, treeView, readState, true);
}

async function openInEditor(refIndex: number): Promise<void> {
  if (!handover || !currentId) return;
  const node = handover.nodeById.get(currentId);
  const root = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!node || !root) return;
  const ref = node.codeRefs[refIndex];
  if (!ref) return;
  const uri = vscode.Uri.joinPath(root, ...ref.file.split('/'));
  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    if (ref.line) {
      const pos = new vscode.Position(ref.line - 1, 0);
      editor.selection = new vscode.Selection(pos, pos);
      editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
    }
  } catch {
    /* non-fatal */
  }
}

function updateBadge(treeView: vscode.TreeView<unknown>, readState: ReadState): void {
  if (!handover) {
    treeView.badge = undefined;
    return;
  }
  const liveIds = new Set(handover.nodeById.keys());
  const { read, total } = readState.progress(liveIds);
  const unread = total - read;
  treeView.badge =
    unread > 0
      ? { value: unread, tooltip: `${read}/${total} sections read` }
      : { value: 0, tooltip: `All ${total} sections read` };
}
