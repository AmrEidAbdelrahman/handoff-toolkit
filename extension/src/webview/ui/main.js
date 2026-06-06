import mermaid from 'mermaid';
import { parseSnippetLabel, matchRefByFileAndLine, isIdentifier } from '../refMatch';
import { activeIndex } from '../scrollSync';

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

  /** @type {{codeRefs: any[], activeRef: number, diagrams: {caption:string,def:string}[], activeDiagram: number}} */
  let state = { codeRefs: [], activeRef: 0, diagrams: [], activeDiagram: 0 };

  // Scroll guard: prevents the hl.scrollIntoView triggering the doc scroll listener.
  let ignoreDocScroll = false;

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

  // Pull mermaid blocks out of a section's HTML.  Attaches a stable data-diagram-index
  // attribute to a thin caption anchor left in the HTML so scroll-sync can locate it.
  function extractDiagrams(html, fallbackCaption, diagramOffset) {
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
      const idx = diagramOffset + diagrams.length;
      // Leave a thin inline anchor chip so the scroll listener can track which
      // diagram is in view.  It carries no visible content in the doc pane —
      // the real render is in the diagrams pane.
      const anchor = el('div', {
        class: 'diagram-anchor',
        'data-diagram-index': idx,
        html: `<span class="diagram-anchor-label">↗ Diagram: ${caption || 'diagram ' + (idx + 1)}</span>`,
      });
      pre.replaceWith(anchor);
      diagrams.push({ caption, def: (code.textContent || '').trim() });
    });
    return { diagrams, cleanedHtml: tmp.innerHTML };
  }

  // ── F2: collapse snippet fenced blocks into clickable chips ──────────────────
  // Walks the rendered HTML for bold labels followed by a <pre> code block and,
  // when the label parses to a known (file, startLine) ref, replaces the entire
  // label+pre with a small chip that fires requestRef on click.  Falls back
  // silently (leaves the content intact) on any mismatch.
  function collapseSnippets(scope) {
    // Bold labels render as <strong> containing either plain text or a link.
    scope.querySelectorAll('strong').forEach((strong) => {
      // Flatten the textContent (handles both plain and <a>-wrapped forms).
      const text = (strong.textContent || '').trim();
      const parsed = parseSnippetLabel(text);
      if (!parsed) return;

      const ref = matchRefByFileAndLine(state.codeRefs, parsed.file, parsed.startLine);
      if (!ref) return;

      // The <pre> block to collapse should be the next sibling element of the
      // <strong>'s parent paragraph (or the strong itself if it's block-level).
      const labelEl = strong.closest('p') || strong;
      const pre = labelEl.nextElementSibling;
      if (!pre || pre.tagName !== 'PRE') return;

      const lineLabel = `:${ref.line}${ref.endLine && ref.endLine !== ref.line ? '–' + ref.endLine : ''}`;
      const chip = el('div', {
        class: 'snippet-chip',
        'data-ref-index': ref.index,
        title: ref.note || ref.file,
        onclick: () => showRefInline(ref.index),
      },
        el('span', { class: 'chip-icon' }, '{ }'),
        el('span', { class: 'chip-file' }, basename(ref.file) + lineLabel),
        el('span', { class: 'chip-note' }, ref.note || ''),
      );

      labelEl.replaceWith(chip);
      pre.remove();
    });
  }

  // ── F1: symbol navigation wiring ─────────────────────────────────────────────
  // Walks <code> elements in the technical section.  For each:
  //   1. If it matches a code ref (file path or basename), wire it as a ref chip.
  //   2. Else if it looks like a code identifier, wire it for symbol lookup.
  function wireInlineMentions(scope) {
    scope.querySelectorAll('code').forEach((c) => {
      const text = (c.textContent || '').trim();

      // Already replaced by collapseSnippets (chip) — skip.
      if (c.closest('.snippet-chip')) return;

      // File-path ref match (existing behaviour, preserved).
      const refMatch = state.codeRefs.find((r) => r.file === text || basename(r.file) === text);
      if (refMatch) {
        c.classList.add('inline-mention');
        c.addEventListener('click', () => showRefInline(refMatch.index));
        return;
      }

      // F1: identifier → symbol lookup via language server.
      if (isIdentifier(text)) {
        c.classList.add('inline-symbol');
        c.addEventListener('click', () => {
          vscode.postMessage({ type: 'gotoSymbol', symbol: text });
        });
      }
    });
  }

  // Show a ref using the pre-resolved data already in state (synchronous).
  function showRefInline(index) {
    const ref = state.codeRefs[index];
    if (!ref) return;
    setActiveTab(index);
    renderCodeFromRef(ref);
    // Also tell the host so it can handle explicit tab clicks that need a
    // fresh resolution (e.g. after a file change since panel was opened).
    vscode.postMessage({ type: 'requestCodeRef', refIndex: index });
  }

  // ── Doc pane ───────────────────────────────────────────────────────────────

  function renderNode(msg) {
    state = { codeRefs: msg.codeRefs || [], activeRef: 0, diagrams: [], activeDiagram: 0 };
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
      const { diagrams, cleanedHtml } = extractDiagrams(
        section.html,
        diagramsSection ? '' : section.headingText,
        allDiagrams.length,
      );
      allDiagrams.push(...diagrams);
      // The dedicated Diagrams section contributes diagrams but its prose (if any)
      // is skipped so diagrams don't appear twice.
      if (diagramsSection) continue;
      if (cleanedHtml.trim() === '') continue;
      const body = el('div', { class: 'sec-body', html: cleanedHtml });
      const sec = el('section', { class: 'section ' + sectionClass(section) },
        el('h2', { class: 'sec-heading' }, section.headingText || section.kind),
        body,
      );
      docEl.appendChild(sec);
      if (section.kind === 'technical') {
        collapseSnippets(body);
        wireInlineMentions(body);
      }
    }

    state.diagrams = allDiagrams;
    renderCodeRefList();

    const hasCode = state.codeRefs.length > 0;
    const hasDiagrams = allDiagrams.length > 0;
    applyRightLayout(hasCode, hasDiagrams);
    renderCodeTabs();
    renderDiagrams(allDiagrams);

    // Show first ref immediately using pre-resolved data.
    if (state.codeRefs.length > 0) renderCodeFromRef(state.codeRefs[0]);
  }

  function renderCodeRefList() {
    if (!state.codeRefs.length) return;
    const list = el('div', { class: 'coderef-list' }, el('h3', null, 'Code references'));
    state.codeRefs.forEach((ref) => {
      const lineLabel = ref.line ? `:${ref.line}${ref.endLine && ref.endLine !== ref.line ? '-' + ref.endLine : ''}` : '';
      list.appendChild(el('div', { class: 'coderef', onclick: () => showRefInline(ref.index) },
        el('span', { class: 'coderef-file' }, basename(ref.file) + lineLabel),
        el('span', { class: 'coderef-note' }, ref.note || ''),
      ));
    });
    docEl.appendChild(list);
  }

  // ── Diagrams pane ────────────────────────────────────────────────────────────

  function renderDiagrams(diagrams) {
    clear(diagramsEl);
    if (!diagrams.length) return;
    diagramsEl.appendChild(el('div', { class: 'pane-title' }, 'Diagrams'));
    diagrams.forEach((d, i) => {
      const block = el('div', { class: 'diagram-block', 'data-diagram-index': i });
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

  function setActiveDiagram(index) {
    if (index < 0 || index >= state.diagrams.length) return;
    state.activeDiagram = index;
    diagramsEl.querySelectorAll('.diagram-block').forEach((b) => {
      b.classList.toggle('active', Number(b.getAttribute('data-diagram-index')) === index);
    });
    // Scroll the diagram into view within the diagrams pane (contained scroll).
    const target = diagramsEl.querySelector(`.diagram-block[data-diagram-index="${index}"]`);
    if (target) {
      diagramsEl.scrollTop = target.offsetTop - diagramsEl.clientHeight / 3;
    }
  }

  // ── F3: scroll-sync ───────────────────────────────────────────────────────────

  function collectAnchorOffsets(selector, container) {
    const offsets = [];
    container.querySelectorAll(selector).forEach((anchor) => {
      offsets.push(anchor.offsetTop);
    });
    return offsets;
  }

  docEl.addEventListener('scroll', () => {
    if (ignoreDocScroll) return;

    // Code ref scroll-sync: find snippet chips and coderef list items in doc order.
    if (state.codeRefs.length > 1) {
      const chips = docEl.querySelectorAll('.snippet-chip[data-ref-index]');
      const chipOffsets = [];
      chips.forEach((c) => chipOffsets.push(c.offsetTop));
      if (chipOffsets.length > 0) {
        const idx = activeIndex(chipOffsets, docEl.scrollTop, docEl.clientHeight);
        const chip = chips[idx];
        if (chip) {
          const refIdx = Number(chip.getAttribute('data-ref-index'));
          if (refIdx !== state.activeRef) {
            setActiveTab(refIdx);
            renderCodeFromRef(state.codeRefs[refIdx]);
          }
        }
      }
    }

    // Diagram scroll-sync: anchor chips placed in the doc by extractDiagrams.
    if (state.diagrams.length > 1) {
      const anchors = docEl.querySelectorAll('.diagram-anchor[data-diagram-index]');
      const anchorOffsets = [];
      anchors.forEach((a) => anchorOffsets.push(a.offsetTop));
      if (anchorOffsets.length > 0) {
        const idx = activeIndex(anchorOffsets, docEl.scrollTop, docEl.clientHeight);
        if (idx !== state.activeDiagram) setActiveDiagram(idx);
      }
    }
  });

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
        onclick: () => showRefInline(ref.index),
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

  // Render code using the pre-resolved data carried in the ref itself.
  function renderCodeFromRef(ref) {
    const body = document.getElementById('code-body');
    if (!body) return;
    clear(body);
    if (ref.status === 'file-not-found') {
      body.appendChild(el('div', { class: 'code-error' }, `File not found: ${ref.file}`));
      return;
    }
    if (ref.status === 'range-out-of-bounds') {
      body.appendChild(el('div', { class: 'code-error' }, `Referenced line range is beyond the end of ${ref.file}.`));
      return;
    }
    if (!ref.html) {
      body.appendChild(el('div', { class: 'empty' }, 'Loading…'));
      return;
    }
    const wrap = el('div', { class: 'code-html', html: ref.html });
    if (ref.startLine) wrap.style.setProperty('--start-line', String(ref.startLine - 1));
    body.appendChild(wrap);
    // Contained scroll: only moves within the code pane, cannot trigger docEl scroll.
    const hl = wrap.querySelector('.hl-line');
    if (hl) {
      const codeBody = body;
      codeBody.scrollTop = hl.offsetTop - codeBody.clientHeight / 2;
    }
  }

  // renderCode handles the showCode message (explicit tab click refreshed from host).
  function renderCode(msg) {
    setActiveTab(msg.refIndex);
    // Merge the freshly-resolved data back into state so subsequent inline renders are current.
    const ref = state.codeRefs[msg.refIndex];
    if (ref) {
      ref.status = msg.status;
      ref.html = msg.html;
      ref.startLine = msg.startLine;
    }
    renderCodeFromRef(ref || msg);
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
