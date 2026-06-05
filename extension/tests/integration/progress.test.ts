import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { ReadState } from '../../src/state/readState';

// US3 — Progress: read tracking, badge math, persistence, stale-id pruning.
// Uses a real ExtensionContext-like memento backed by a Map (workspaceState semantics).
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

function ctx(memento: vscode.Memento): vscode.ExtensionContext {
  return { workspaceState: memento } as unknown as vscode.ExtensionContext;
}

describe('US3: progress and persistence', () => {
  it('marks read and computes progress over live ids', async () => {
    const mem = new MemMemento();
    const rs = new ReadState(ctx(mem));
    const live = new Set(['a', 'b', 'c', 'd']);
    assert.equal(rs.progress(live).read, 0);
    await rs.markRead('a');
    await rs.markRead('b');
    const p = rs.progress(live);
    assert.equal(p.read, 2);
    assert.equal(p.total, 4);
    assert.equal(p.fraction, 0.5);
  });

  it('persists across re-instantiation (reopen simulation)', async () => {
    const mem = new MemMemento();
    const rs1 = new ReadState(ctx(mem));
    await rs1.markRead('a');
    const rs2 = new ReadState(ctx(mem));
    assert.equal(rs2.isRead('a'), true);
  });

  it('prunes stale ids so progress never exceeds 100%', async () => {
    const mem = new MemMemento();
    const rs = new ReadState(ctx(mem));
    await rs.markAll(['a', 'b', 'removed']);
    const live = new Set(['a', 'b']);
    await rs.prune(live);
    const p = rs.progress(live);
    assert.equal(p.read, 2);
    assert.equal(p.total, 2);
    assert.ok(p.fraction <= 1);
  });

  it('reset clears all read state', async () => {
    const mem = new MemMemento();
    const rs = new ReadState(ctx(mem));
    await rs.markAll(['a', 'b']);
    await rs.reset();
    assert.equal(rs.isRead('a'), false);
  });
});
