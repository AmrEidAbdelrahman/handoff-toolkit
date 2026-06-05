// Resolve a CodeRef to live workspace source. Read-only; never embeds code from nodes.

import * as vscode from 'vscode';
import { CodeRef, CodeRefResolution } from '../handoff/types';

const decoder = new TextDecoder('utf-8');

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx', mjs: 'javascript', cjs: 'javascript',
  json: 'json', py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin',
  c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', cs: 'csharp', php: 'php', swift: 'swift',
  sh: 'bash', bash: 'bash', zsh: 'bash', yml: 'yaml', yaml: 'yaml', toml: 'toml',
  md: 'markdown', html: 'html', css: 'css', scss: 'scss', sql: 'sql', xml: 'xml',
};

function languageFor(file: string): string {
  const ext = file.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_LANG[ext] ?? 'text';
}

export async function resolveCodeRef(
  workspaceRoot: vscode.Uri,
  ref: CodeRef,
): Promise<CodeRefResolution> {
  const uri = vscode.Uri.joinPath(workspaceRoot, ...ref.file.split('/'));
  let text: string;
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    text = decoder.decode(bytes);
  } catch {
    return { status: 'file-not-found', file: ref.file };
  }

  const lineCount = text.split(/\r?\n/).length;
  const languageId = languageFor(ref.file);

  if (ref.line !== undefined) {
    if (ref.line > lineCount) {
      return { status: 'range-out-of-bounds', file: ref.file, languageId, text };
    }
    const end = ref.endLine ?? ref.line;
    return {
      status: 'ok',
      file: ref.file,
      languageId,
      text,
      highlightStart: ref.line,
      highlightEnd: Math.min(end, lineCount),
    };
  }

  return { status: 'ok', file: ref.file, languageId, text };
}
