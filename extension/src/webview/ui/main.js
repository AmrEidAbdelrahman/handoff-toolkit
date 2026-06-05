import mermaid from 'mermaid';

(function () {
  'use strict';
  const vscode = acquireVsCodeApi();
  const docEl = document.getElementById('doc');
  const codeEl = document.getElementById('code');
  const diagramsEl = document.getElementById('diagrams');
  const rightEl = document.getElementById('right');
  const appEl = document.getElementById('app');
  const splitMain = document.getElementById('split-main');
  const splitRight = document.getElementById('split-right');

  function mermaidTheme() {
    const cls = document.body.className || '';
    return cls.includes('vscode-dark') || cls.includes('vscode-high-contrast') ? 'dark' : 'default';
  }
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: mermaidTheme() });
  let diagramSeq = 0;

  /** @type {{codeRefs: any[], activeRef: number}} */
  let state = { codeRefs: [], activeRef: 0 };

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (v !== undefined && v !== null) node.setAttribute(k, String(v));
      }
    }
    for (const c of children) {
      if (c == null) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function basename(p) {
    return p.split('/').pop() || p;
  }

  function sectionClass(section) {
    if (section.kind && section.kind !== 'other') return 'sec-' + section.kind;
    const h = (section.headingText || '').toLowerCase();
    if (/decision/.test(h)) return 'sec-decisions';
    if (/consequence|warning|gotcha|risk|caveat/.test(h)) return 'sec-warnings';
    if (/business|context|summary|purpose|overview|outcome/.test(h)) return 'sec-business';
    if (/diagram|architecture/.test(h)) return 'sec-technical';
    return 'sec-other';
  }

  function isDiagramsHeading(text) {
    return /^diagrams?$/i.test((text || '').trim());
  }

  // Pull mermaid blocks out of a section's HTML. Returns the collected diagrams
  // (each with a caption from the nearest preceding heading) and the HTML with the
  // mermaid blocks removed so the doc pane keeps only prose.
  function extractDiagrams(html, fallbackCaption) {
    const tmp = el('div');
    tmp.innerHTML = html;
    const diagrams = [];
    tmp.querySelectorAll('code.language-mermaid').forEach((code) => {
      const pre = code.closest('pre') || code;
      let caption = fallbackCaption || '';
      let prev = pre.previousElementSibling;
      while (prev) {
        if (/^H[1-6]$/.test(prev.tagName)) {
          caption = prev.textContent.trim();
          break;
        }
        prev = prev.previousElementSibling;
      }
      diagrams.push({ caption, def: (code.textContent || '').trim() });
      pre.remove();
    });
    return { diagrams, cleanedHtml: tmp.innerHTML };
  }

  // ── Doc pane ───────────────────────────────────────────────────────────────

  function renderNode(msg) {
    state = { codeRefs: msg.codeRefs || [], activeRef: 0 };
    clear(docEl);

    const pos = msg.position || {};
    const breadcrumb = el('div', { class: 'breadcrumb' },
      el('span', { class: 'depth-badge depth-' + (msg.depth || '') }, msg.depth || ''),
      el('span', { class: 'crumb-pos' }, ` · ${pos.depthIndex || 0} of ${pos.depthTotal || 0}`),
    );
    const nav = el('div', { class: 'nav-row' },
      el('button', { class: 'nav-btn', onclick: () => vscode.postMessage({ type: 'navigate', direction: 'previous' }) }, '← Previous'),
      el('button', { class: 'nav-btn', onclick: () => vscode.postMessage({ type: 'navigate', direction: 'next' }) }, 'Next →'),
    );
    docEl.appendChild(el('div', { class: 'doc-header' }, breadcrumb, nav));
    docEl.appendChild(el('h1', { class: 'doc-title' }, msg.title || msg.id));

    for (const issue of msg.issues || []) {
      docEl.appendChild(el('div', { class: 'banner banner-' + issue.severity },
        el('strong', null, issue.severity === 'error' ? 'Error: ' : 'Warning: '),
        issue.message,
      ));
    }

    const allDiagrams = [];
    for (const section of msg.sections || []) {
      const diagramsSection = isDiagramsHeading(section.headingText);
      const { diagrams, cleanedHtml } = extractDiagrams(section.html, diagramsSection ? '' : section.headingText);
      allDiagrams.push(...diagrams);
      // The dedicated Diagrams section is shown in the diagrams pane, not in docs.
      if (diagramsSection) continue;
      if (cleanedHtml.trim() === '') continue;
      const body = el('div', { class: 'sec-body', html: cleanedHtml });
      const sec = el('section', { class: 'section ' + sectionClass(section) },
        el('h2', { class: 'sec-heading' }, section.headingText || section.kind),
        body,
      );
      docEl.appendChild(sec);
      if (section.kind === 'technical') wireInlineMentions(body);
    }

    renderCodeRefList();

    const hasCode = state.codeRefs.length > 0;
    const hasDiagrams = allDiagrams.length > 0;
    applyRightLayout(hasCode, hasDiagrams);
    renderCodeTabs();
    renderDiagrams(allDiagrams);
  }

  function renderCodeRefList() {
    if (!state.codeRefs.length) return;
    const list = el('div', { class: 'coderef-list' }, el('h3', null, 'Code references'));
    state.codeRefs.forEach((ref) => {
      const lineLabel = ref.line ? `:${ref.line}${ref.endLine && ref.endLine !== ref.line ? '-' + ref.endLine : ''}` : '';
      list.appendChild(el('div', { class: 'coderef', onclick: () => requestRef(ref.index) },
        el('span', { class: 'coderef-file' }, basename(ref.file) + lineLabel),
        el('span', { class: 'coderef-note' }, ref.note || ''),
      ));
    });
    docEl.appendChild(list);
  }

  function wireInlineMentions(scope) {
    scope.querySelectorAll('code').forEach((c) => {
      const text = (c.textContent || '').trim();
      const match = state.codeRefs.find((r) => r.file === text || basename(r.file) === text);
      if (match) {
        c.classList.add('inline-mention');
        c.addEventListener('click', () => requestRef(match.index));
      }
    });
  }

  // ── Diagrams pane ────────────────────────────────────────────────────────────

  function renderDiagrams(diagrams) {
    clear(diagramsEl);
    if (!diagrams.length) return;
    diagramsEl.appendChild(el('div', { class: 'pane-title' }, 'Diagrams'));
    diagrams.forEach((d) => {
      const block = el('div', { class: 'diagram-block' });
      if (d.caption) block.appendChild(el('div', { class: 'diagram-caption' }, d.caption));
      const container = el('div', { class: 'mermaid-diagram' });
      block.appendChild(container);
      diagramsEl.appendChild(block);
      const id = 'mmd-' + ++diagramSeq;
      mermaid
        .render(id, d.def)
        .then(({ svg }) => { container.innerHTML = svg; })
        .catch((err) => {
          container.className = 'mermaid-error';
          container.textContent = 'Diagram failed to render: ' + (err && err.message ? err.message : String(err));
        });
    });
  }

  // ── Code pane ────────────────────────────────────────────────────────────────

  function renderCodeTabs() {
    clear(codeEl);
    if (!state.codeRefs.length) return;
    const tabs = el('div', { class: 'code-tabs' });
    state.codeRefs.forEach((ref) => {
      tabs.appendChild(el('div', {
        class: 'code-tab' + (ref.index === state.activeRef ? ' active' : ''),
        'data-ref': ref.index,
        title: ref.note || ref.file,
        onclick: () => requestRef(ref.index),
      }, basename(ref.file)));
    });
    codeEl.appendChild(tabs);
    codeEl.appendChild(el('div', { class: 'code-body', id: 'code-body' }, el('div', { class: 'empty' }, 'Loading…')));
  }

  function setActiveTab(index) {
    state.activeRef = index;
    codeEl.querySelectorAll('.code-tab').forEach((t) => {
      t.classList.toggle('active', Number(t.getAttribute('data-ref')) === index);
    });
  }

  function renderCode(msg) {
    setActiveTab(msg.refIndex);
    const body = document.getElementById('code-body');
    if (!body) return;
    clear(body);
    if (msg.status === 'file-not-found') {
      body.appendChild(el('div', { class: 'code-error' }, `File not found: ${msg.file}`));
      return;
    }
    if (msg.status === 'range-out-of-bounds') {
      body.appendChild(el('div', { class: 'code-error' }, `Referenced line range is beyond the end of ${msg.file}.`));
      return;
    }
    const wrap = el('div', { class: 'code-html', html: msg.html || '' });
    if (msg.startLine) wrap.style.setProperty('--start-line', String(msg.startLine - 1));
    body.appendChild(wrap);
    const hl = wrap.querySelector('.hl-line');
    if (hl) hl.scrollIntoView({ block: 'center' });
  }

  function requestRef(index) {
    vscode.postMessage({ type: 'requestCodeRef', refIndex: index });
  }

  function showError(message) {
    clear(docEl);
    docEl.appendChild(el('div', { class: 'banner banner-error' }, message));
    clear(codeEl);
    clear(diagramsEl);
    applyRightLayout(false, false);
  }

  // ── Layout: which right-hand panes are visible + persisted sizes ──────────────

  function applyRightLayout(hasCode, hasDiagrams) {
    const showRight = hasCode || hasDiagrams;
    appEl.classList.toggle('no-right', !showRight);
    splitMain.style.display = showRight ? '' : 'none';
    rightEl.style.display = showRight ? '' : 'none';

    codeEl.style.display = hasCode ? '' : 'none';
    diagramsEl.style.display = hasDiagrams ? '' : 'none';
    splitRight.style.display = hasCode && hasDiagrams ? '' : 'none';

    // When only one right pane is present, it fills the column.
    codeEl.classList.toggle('solo', hasCode && !hasDiagrams);
    diagramsEl.classList.toggle('solo', hasDiagrams && !hasCode);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  const saved = vscode.getState() || {};
  if (saved.docBasis) appEl.style.setProperty('--doc-basis', saved.docBasis);
  if (saved.codeBasis) appEl.style.setProperty('--code-basis', saved.codeBasis);

  function persist() {
    vscode.setState({
      docBasis: appEl.style.getPropertyValue('--doc-basis') || undefined,
      codeBasis: appEl.style.getPropertyValue('--code-basis') || undefined,
    });
  }

  function makeDraggable(handle, onMove) {
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      handle.classList.add('dragging');
      const move = (ev) => onMove(ev);
      const up = () => {
        handle.classList.remove('dragging');
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
        persist();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
  }

  makeDraggable(splitMain, (ev) => {
    const rect = appEl.getBoundingClientRect();
    const px = clamp(ev.clientX - rect.left, 240, rect.width - 240);
    appEl.style.setProperty('--doc-basis', px + 'px');
  });

  makeDraggable(splitRight, (ev) => {
    const rect = rightEl.getBoundingClientRect();
    const px = clamp(ev.clientY - rect.top, 80, rect.height - 80);
    appEl.style.setProperty('--code-basis', px + 'px');
  });

  // ── Message loop ─────────────────────────────────────────────────────────────

  window.addEventListener('message', (e) => {
    const msg = e.data;
    switch (msg.type) {
      case 'showNode': renderNode(msg); break;
      case 'showCode': renderCode(msg); break;
      case 'setError': showError(msg.message); break;
    }
  });

  vscode.postMessage({ type: 'ready' });
})();
