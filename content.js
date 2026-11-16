// Rewrites the years in visible text: text nodes (including the tab title and
// shadow DOM) and tooltips. Form controls are never touched: input values live
// in properties, not text nodes, and the elements whose text can end up in a
// submitted value (textarea, select/option, editable regions) are skipped
// explicitly. Every change is remembered so "Off" restores the page.
(() => {
  'use strict';

  // Firefox calls the extension API `browser`, Chromium calls it `chrome`.
  const ext = globalThis.browser ?? chrome;

  const SKIP =
    'script, style, noscript, template, textarea, select, option, datalist, code, pre, kbd, samp';

  // Elements that flow inside a line of text. Anything else ends the context
  // of the text around it.
  const INLINE = new Set(
    'A ABBR B BDI BDO CITE DATA DEL DFN EM FONT I INS MARK NOBR Q S SMALL SPAN STRONG SUB SUP TIME U VAR'.split(
      ' ',
    ),
  );
  const CONTEXT_LIMIT = 80; // characters of surrounding text to read on each side
  const BARE_NUMBER = /(?<!\d)(?:1\d{3}|20\d{2})(?!\d)/;
  const OBSERVE = {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['title'],
  };

  const pageLanguage = document.documentElement.lang;
  const convert = Year12000.createConverter([...navigator.languages, pageLanguage], pageLanguage);

  const tracked = new Map(); // text node -> { original, converted, count }
  const tooltips = new Map(); // element -> { original, converted, count }
  let roots = new WeakSet(); // the document and every shadow root being watched
  const upgrading = new Map(); // custom elements not defined yet -> checks so far
  let upgradeTimer = null;
  let enabled = false;
  let reportTimer = null;

  // --- Context ---------------------------------------------------------------

  const originalText = (node) => tracked.get(node)?.original ?? node.nodeValue;

  // The text next to `node` on the same line of the same block, as the page
  // wrote it. It lets "<b>in</b> 2026" and "<span>Nov 16,</span> 2026" be read
  // as a whole.
  function inlineContext(node, forward) {
    let text = '';
    const visit = (current) => {
      if (current.nodeType === Node.TEXT_NODE) {
        const piece = originalText(current);
        text = forward ? text + piece : piece + text;
        return text.length < CONTEXT_LIMIT;
      }
      if (current.nodeType !== Node.ELEMENT_NODE) return true;
      if (!INLINE.has(current.nodeName)) return false;
      let child = forward ? current.firstChild : current.lastChild;
      for (; child; child = forward ? child.nextSibling : child.previousSibling) {
        if (!visit(child)) return false;
      }
      return true;
    };

    let current = node;
    for (;;) {
      let sibling = forward ? current.nextSibling : current.previousSibling;
      while (!sibling) {
        current = current.parentNode;
        if (!current || current.nodeType !== Node.ELEMENT_NODE || !INLINE.has(current.nodeName)) {
          return text;
        }
        sibling = forward ? current.nextSibling : current.previousSibling;
      }
      current = sibling;
      if (!visit(current)) return text;
    }
  }

  // What the header of a table cell's column or row says: 'date', 'quantity' or null.
  function tableContext(parent) {
    const cell = parent.closest('td');
    const table = cell?.closest('table');
    if (!table) return null;
    const column = table.tHead?.rows[0]?.cells[cell.cellIndex] ?? table.rows[0]?.cells[cell.cellIndex];
    const row = cell.parentElement.cells[0];
    for (const header of [column, row]) {
      if (!header || header === cell || header.nodeName !== 'TH') continue;
      const kind = Year12000.classifyHeader(header.textContent);
      if (kind) return kind;
    }
    return null;
  }

  function contextFor(node, parent, text) {
    if (!BARE_NUMBER.test(text)) return {}; // full dates need no context
    const kind = parent.closest('time') ? 'date' : tableContext(parent);
    return {
      dateContext: kind === 'date',
      quantityContext: kind === 'quantity',
      before: inlineContext(node, false),
      after: inlineContext(node, true),
    };
  }

  // --- Conversion ------------------------------------------------------------

  const isProtected = (element) => element.isContentEditable || element.closest(SKIP) !== null;

  function processNode(node) {
    const text = node.nodeValue;
    const entry = tracked.get(node);
    if (entry) {
      if (entry.converted === text) return; // our own edit, nothing new
      tracked.delete(node); // the page rewrote it: start over
    }
    if (!/\d{4}/.test(text)) return;

    const parent = node.parentElement;
    if (!parent || isProtected(parent)) return;

    const result = convert(text, contextFor(node, parent, text));
    if (!result.count) return;
    tracked.set(node, { original: text, converted: result.text, count: result.count });
    node.nodeValue = result.text;
  }

  function processTooltip(element) {
    const text = element.getAttribute('title');
    const entry = tooltips.get(element);
    if (entry) {
      if (entry.converted === text) return;
      tooltips.delete(element);
    }
    if (text === null || !/\d{4}/.test(text) || isProtected(element)) return;

    const result = convert(text);
    if (!result.count) return;
    tooltips.set(element, { original: text, converted: result.text, count: result.count });
    element.setAttribute('title', result.text);
  }

  // --- Shadow DOM ------------------------------------------------------------

  function shadowRootOf(element) {
    try {
      // Content scripts may also read closed shadow roots: through a function
      // in Chromium, through a property in Firefox.
      return (
        ext.dom?.openOrClosedShadowRoot?.(element) ?? element.openOrClosedShadowRoot ?? element.shadowRoot
      );
    } catch {
      return element.shadowRoot;
    }
  }

  // A custom element whose code has not loaded yet gets its shadow root later,
  // without any DOM mutation to announce it: check back for a while.
  function awaitUpgrade(element) {
    upgrading.set(element, 0);
    upgradeTimer ??= setInterval(() => {
      for (const [host, checks] of upgrading) {
        const shadow = host.isConnected ? shadowRootOf(host) : null;
        if (shadow) watch(shadow);
        if (shadow || !host.isConnected || host.matches(':defined') || checks >= 60) {
          upgrading.delete(host);
        } else {
          upgrading.set(host, checks + 1);
        }
      }
      if (!upgrading.size) {
        clearInterval(upgradeTimer);
        upgradeTimer = null;
      }
      scheduleReport();
    }, 1000);
  }

  function processElement(element) {
    if (element.hasAttribute('title')) processTooltip(element);
    const shadow = shadowRootOf(element);
    if (shadow) watch(shadow);
    else if (element.localName.includes('-') && !element.matches(':defined')) awaitUpgrade(element);
  }

  function processTree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      processNode(root);
      return;
    }
    if (root.nodeType === Node.ELEMENT_NODE) processElement(root);
    else if (root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.TEXT_NODE) processNode(node);
      else processElement(node);
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') processNode(mutation.target);
      else if (mutation.type === 'attributes') processTooltip(mutation.target);
      else mutation.addedNodes.forEach(processTree);
    }
    scheduleReport();
  });

  // Converts a document or shadow root and keeps it converted.
  function watch(root) {
    if (roots.has(root)) return;
    roots.add(root);
    observer.observe(root, OBSERVE);
    processTree(root);
  }

  // --- On / Off --------------------------------------------------------------

  function enable() {
    if (enabled || !document.documentElement) return;
    enabled = true;
    watch(document.documentElement);
    report();
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    observer.disconnect();
    roots = new WeakSet();
    clearInterval(upgradeTimer);
    upgradeTimer = null;
    upgrading.clear();
    for (const [node, entry] of tracked) {
      if (node.nodeValue === entry.converted) node.nodeValue = entry.original;
    }
    for (const [element, entry] of tooltips) {
      if (element.getAttribute('title') === entry.converted) element.setAttribute('title', entry.original);
    }
    tracked.clear();
    tooltips.clear();
    report();
  }

  // --- Counter ---------------------------------------------------------------

  function report() {
    let count = 0;
    for (const map of [tracked, tooltips]) {
      for (const [node, entry] of map) {
        if (node.isConnected) count += entry.count;
        else map.delete(node);
      }
    }
    try {
      // Only the popup listens; when it is closed this rejects, which is fine.
      ext.runtime.sendMessage({ type: 'year12000:count', count }).catch(() => {});
    } catch {
      // The extension was reloaded or removed: this script is orphaned.
      observer.disconnect();
      clearInterval(upgradeTimer);
    }
  }

  function scheduleReport() {
    clearTimeout(reportTimer);
    reportTimer = setTimeout(report, 150);
  }

  ext.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'year12000:report') return;
    sendResponse({ ok: true });
    report();
  });

  ext.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.enabled) return;
    if (changes.enabled.newValue === false) disable();
    else enable();
  });

  ext.storage.local.get({ enabled: true }).then((settings) => {
    if (settings.enabled) enable();
  });
})();
