import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { buildTree, TreeInput } from '../../src/handoff/tree';
import { HandoffTreeProvider } from '../../src/tree/handoffTreeProvider';
import { ReadState } from '../../src/state/readState';

class MemMemento implements vscode.Memento {
  private store = new Map<string, unknown>();
  keys(): readonly string[] {
    return [...this.store.keys()];
  }
  get<T>(key: string, def?: T): T {
    return (this.store.has(key) ? this.store.get(key) : def) as T;
  }
  async update(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }
}

function ctx(): vscode.ExtensionContext {
  return { workspaceState: new MemMemento() } as unknown as vscode.ExtensionContext;
}

// getParent is required by VS Code for treeView.reveal() — without it, the
// bidirectional selection sync (Prev/Next reveals the sidebar) silently no-ops.
describe('US3: tree reveal support', () => {
  it('provides getParent so reveal() can locate nested and grouped nodes', () => {
    const provider = new HandoffTreeProvider(new ReadState(ctx()));
    const inputs: TreeInput[] = [
      { id: 'auth', title: 'Auth', depth: 'core' },
      { id: 'jwt', title: 'JWT', depth: 'core', parent: 'auth' },
    ];
    const roots = buildTree(inputs);
    provider.setRoots(roots);

    const auth = provider.findNode('auth')!;
    const jwt = provider.findNode('jwt')!;
    const group = provider.getParent(auth)!;

    assert.equal(group.kind, 'group'); // auth's parent is its depth group
    assert.equal(provider.getParent(jwt)!.id, 'auth'); // jwt's parent is auth
    assert.equal(provider.getParent(group), undefined); // group is a root
  });
});
