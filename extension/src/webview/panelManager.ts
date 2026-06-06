// Owns the single `handoff.reader` editor webview (doc | code split). Strict CSP,
// retains context, routes typed messages. Rendering data is computed by the caller;
// this class only transports it and emits user intents.

import * as vscode from 'vscode';
import { Section, ValidationIssue } from '../handoff/types';

export const READER_VIEW_TYPE = 'handoff.reader';

export interface NodePosition {
  depth: string;
  depthIndex: number;
  depthTotal: number;
  index: number;
  total: number;
}

export interface CodeRefView {
  index: number;
  file: string;
  line?: number;
  endLine?: number;
  note: string;
  // Pre-resolved at showNode time so the scroll path is synchronous client-side.
  status: 'ok' | 'file-not-found' | 'range-out-of-bounds';
  html?: string;
  startLine?: number;
}

export interface NodePayload {
  id: string;
  title: string;
  depth: string;
  position: NodePosition;
  sections: Section[];
  codeRefs: CodeRefView[];
  issues: ValidationIssue[];
}

export interface CodePayload {
  refIndex: number;
  file: string;
  note: string;
  status: 'ok' | 'file-not-found' | 'range-out-of-bounds';
  html?: string;
  startLine?: number;
}

export interface ReaderEvents {
  onReady: () => void;
  onRequestCodeRef: (refIndex: number) => void;
  onNavigate: (direction: 'next' | 'previous') => void;
  onOpenInEditor: (refIndex: number) => void;
  onGotoSymbol: (symbol: string) => void;
}

export class ReaderPanel {
  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly events: ReaderEvents,
  ) {}

  isOpen(): boolean {
    return this.panel !== undefined;
  }

  reveal(): void {
    this.panel?.reveal(vscode.ViewColumn.One, false);
  }

  /** Create the panel if needed and reveal it. */
  ensure(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One, false);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      READER_VIEW_TYPE,
      'Handover',
      vscode.ViewColumn.One,
      this.webviewOptions(),
    );
    this.adopt(panel);
  }

  /** Re-attach to a panel restored by the serializer. */
  adopt(panel: vscode.WebviewPanel): void {
    this.panel = panel;
    panel.webview.options = this.webviewOptions();
    panel.webview.html = this.html(panel.webview);
    panel.onDidDispose(() => {
      this.panel = undefined;
    });
    panel.webview.onDidReceiveMessage((msg) => this.route(msg));
  }

  private webviewOptions(): vscode.WebviewPanelOptions & vscode.WebviewOptions {
    return {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'ui')],
    };
  }

  private route(msg: { type?: string; refIndex?: number; direction?: 'next' | 'previous'; symbol?: string }): void {
    switch (msg.type) {
      case 'ready':
        this.events.onReady();
        break;
      case 'requestCodeRef':
      case 'inlineMention':
        if (typeof msg.refIndex === 'number') this.events.onRequestCodeRef(msg.refIndex);
        break;
      case 'navigate':
        if (msg.direction) this.events.onNavigate(msg.direction);
        break;
      case 'openInEditor':
        if (typeof msg.refIndex === 'number') this.events.onOpenInEditor(msg.refIndex);
        break;
      case 'gotoSymbol':
        if (typeof msg.symbol === 'string' && msg.symbol) this.events.onGotoSymbol(msg.symbol);
        break;
    }
  }

  showNode(payload: NodePayload): void {
    this.post({ type: 'showNode', ...payload });
  }

  showCode(payload: CodePayload): void {
    this.post({ type: 'showCode', ...payload });
  }

  setError(message: string): void {
    this.post({ type: 'setError', message });
  }

  private post(msg: object): void {
    void this.panel?.webview.postMessage(msg);
  }

  private uri(webview: vscode.Webview, ...parts: string[]): vscode.Uri {
    return webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'ui', ...parts));
  }

  private html(webview: vscode.Webview): string {
    const nonce = makeNonce();
    const scriptUri = this.uri(webview, 'main.js');
    const styleUri = this.uri(webview, 'styles.css');
    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} https: data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>Handover</title>
</head>
<body>
  <div id="app">
    <section id="doc" class="pane doc-pane"><div class="empty">Select a section from the Handoff sidebar.</div></section>
    <div id="split-main" class="splitter splitter-v" title="Drag to resize"></div>
    <div id="right" class="right-col">
      <section id="code" class="pane code-pane"></section>
      <div id="split-right" class="splitter splitter-h" title="Drag to resize"></div>
      <section id="diagrams" class="pane diagrams-pane"></section>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function makeNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}
