(() => {
  const ROOT_SELECTOR = '.inventory_page_right';
  const FLOAT_SELECTOR = '.floatBar .floatToolTip .floatDropTarget';
  const TECH_FLOAT_SELECTOR = '.floatBar .floatTechnical';

  let lastFloatValue = null;

  function extractFloat() {
    const container = document.querySelector(ROOT_SELECTOR);
    if (!container) return null;

    const technicalNode = container.querySelector(TECH_FLOAT_SELECTOR);
    if (technicalNode) {
      const match = technicalNode.textContent?.match(/Float Value:\s*([0-9.,]+)/i);
      if (match && match[1]) {
        const detailed = parseFloat(match[1].replace(/,/g, '.'));
        if (Number.isFinite(detailed)) {
          return detailed;
        }
      }
    }

    const floatNode = container.querySelector(FLOAT_SELECTOR);
    if (!floatNode) return null;

    const text = floatNode.textContent?.trim();
    if (!text) return null;

    const normalized = text.replace(/,/g, '.');
    const value = parseFloat(normalized);
    return Number.isFinite(value) ? value : null;
  }

  function handleChange() {
    const currentFloat = extractFloat();
    if (currentFloat === null) return;

    if (currentFloat !== lastFloatValue) {
      lastFloatValue = currentFloat;
      console.log(`[FIKEXT] Item changed it's float: ${currentFloat}`);
    }
  }

  function initObserver() {
    const container = document.querySelector(ROOT_SELECTOR);
    if (!container) return null;

    const observer = new MutationObserver(() => handleChange());
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    handleChange();
    return observer;
  }

  function waitForContainer() {
    const existing = document.querySelector(ROOT_SELECTOR);
    if (existing) {
      initObserver();
      return;
    }

    const bodyObserver = new MutationObserver(() => {
      if (document.querySelector(ROOT_SELECTOR)) {
        initObserver();
        bodyObserver.disconnect();
      }
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForContainer);
  } else {
    waitForContainer();
  }
})();
