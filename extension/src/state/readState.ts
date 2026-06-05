// Per-node read/unread tracking persisted in workspaceState. No backend, no globalState.

import * as vscode from 'vscode';

const KEY = 'handoff.readNodeIds';

export class ReadState {
  private read: Set<string>;

  constructor(private readonly context: vscode.ExtensionContext) {
    const stored = context.workspaceState.get<string[]>(KEY, []);
    this.read = new Set(stored);
  }

  isRead(id: string): boolean {
    return this.read.has(id);
  }

  async markRead(id: string): Promise<boolean> {
    if (this.read.has(id)) return false;
    this.read.add(id);
    await this.persist();
    return true;
  }

  async markAll(ids: string[]): Promise<void> {
    for (const id of ids) this.read.add(id);
    await this.persist();
  }

  async reset(): Promise<void> {
    this.read.clear();
    await this.persist();
  }

  /** Prune ids no longer present in the current handover (avoids >100% progress). */
  async prune(liveIds: ReadonlySet<string>): Promise<void> {
    let changed = false;
    for (const id of [...this.read]) {
      if (!liveIds.has(id)) {
        this.read.delete(id);
        changed = true;
      }
    }
    if (changed) await this.persist();
  }

  /** Progress computed over only live ids. */
  progress(liveIds: ReadonlySet<string>): { read: number; total: number; fraction: number } {
    let read = 0;
    for (const id of liveIds) if (this.read.has(id)) read++;
    const total = liveIds.size;
    return { read, total, fraction: total === 0 ? 0 : read / total };
  }

  private async persist(): Promise<void> {
    await this.context.workspaceState.update(KEY, [...this.read]);
  }
}
