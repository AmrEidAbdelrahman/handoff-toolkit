// Locate .handoff/output/ in the (single-root) workspace and watch for it
// appearing/disappearing or changing.

import * as vscode from 'vscode';

export interface HandoffLocation {
  /** Folder URI of `.handoff/output`. */
  outputDir: vscode.Uri;
  /** URI of `.handoff/output/index.json`. */
  indexFile: vscode.Uri;
}

export function locateHandoff(): HandoffLocation | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return undefined;
  // Single-root scope (multi-root is out of MVP scope): use the first folder.
  const root = folders[0].uri;
  const outputDir = vscode.Uri.joinPath(root, '.handoff', 'output');
  const indexFile = vscode.Uri.joinPath(outputDir, 'index.json');
  return { outputDir, indexFile };
}

/** Returns true if `.handoff/output/index.json` is readable. */
export async function handoffExists(loc: HandoffLocation): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(loc.indexFile);
    return true;
  } catch {
    return false;
  }
}

/**
 * Watch the handover output for changes. Fires `onChange` on any create/change/delete
 * under `.handoff/output/`. Caller debounces/reloads as needed.
 */
export function watchHandoff(onChange: () => void): vscode.Disposable {
  const watcher = vscode.workspace.createFileSystemWatcher('**/.handoff/output/**');
  watcher.onDidCreate(onChange);
  watcher.onDidChange(onChange);
  watcher.onDidDelete(onChange);
  return watcher;
}
