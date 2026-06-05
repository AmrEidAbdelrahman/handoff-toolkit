// Native TreeDataProvider for the Handoff sidebar. Renders the buildTree() model,
// shows read/unread icons, and fires handoff.openNode on selection.

import * as vscode from 'vscode';
import { TreeNode } from '../handoff/types';
import { ReadState } from '../state/readState';

export class HandoffTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChange = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  private roots: TreeNode[] = [];
  private parentOf = new Map<TreeNode, TreeNode>();

  constructor(private readonly readState: ReadState) {}

  setRoots(roots: TreeNode[]): void {
    this.roots = roots;
    this.parentOf = new Map();
    const index = (node: TreeNode) => {
      for (const child of node.children) {
        this.parentOf.set(child, node);
        index(child);
      }
    };
    roots.forEach(index);
    this.refresh();
  }

  /** Required by VS Code for treeView.reveal() to work (bidirectional selection sync). */
  getParent(element: TreeNode): TreeNode | undefined {
    return this.parentOf.get(element);
  }

  refresh(): void {
    this._onDidChange.fire(undefined);
  }

  getChildren(element?: TreeNode): TreeNode[] {
    return element ? element.children : this.roots;
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    const collapsible =
      node.children.length > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None;

    if (node.kind === 'group') {
      const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.Expanded);
      item.contextValue = 'handoff.group';
      item.iconPath = new vscode.ThemeIcon('layers');
      return item;
    }

    const item = new vscode.TreeItem(node.label, collapsible);
    item.id = node.id;
    item.contextValue = 'handoff.node';
    const read = this.readState.isRead(node.id);
    item.iconPath = new vscode.ThemeIcon(read ? 'circle-outline' : 'circle-filled');
    item.description = read ? undefined : '●';
    if (node.kind === 'pinned') {
      item.description = read ? 'overview' : '● overview';
    }
    item.command = { command: 'handoff.openNode', title: 'Open', arguments: [node.id] };
    item.tooltip = node.label;
    return item;
  }

  /** Find a TreeNode by id (for treeView.reveal). */
  findNode(id: string): TreeNode | undefined {
    const stack = [...this.roots];
    while (stack.length) {
      const n = stack.pop()!;
      if (n.id === id) return n;
      stack.push(...n.children);
    }
    return undefined;
  }
}
