(() => {
  const config = window.FIKEXT_STEAM_CONST;
  if (!config) return;

  const ROOT_SELECTOR = '.inventory_page_right';
  const FLOAT_SELECTOR = '.floatBar .floatToolTip .floatDropTarget';
  const TECH_FLOAT_SELECTOR = '.floatBar .floatTechnical';
  const chipConfig = config.CHIP;

  let lastFloatValue = null;
  let cachedGroups = [];

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

  function renderPriceChip(group) {
    let chip = document.getElementById(chipConfig.id);
    if (!chip) {
      chip = document.createElement('section');
      chip.id = chipConfig.id;
      Object.assign(chip.style, chipConfig.theme.container);
      document.body.appendChild(chip);
    }

    chip.innerHTML = `
      <span style="${inlineStyle(chipConfig.theme.title)}">
        ${chipConfig.labels.title}
      </span>
      <strong style="${inlineStyle(chipConfig.theme.value)}">
        ${group.priceText ?? '?'}
      </strong>
      <div style="display:flex; flex-direction:column; gap:0.05rem; font-size:0.74rem; color:#94a3b8;">
        <span>${group.name}${group.wear ? ` · ${group.wear}` : ''}</span>
        <span style="${inlineStyle(chipConfig.theme.qty)}">
          ${chipConfig.labels.qty} ${group.qty ?? '?'}
        </span>
      </div>
    `;
  }

  function removePriceChip() {
    const chip = document.getElementById(chipConfig.id);
    if (chip) chip.remove();
  }

  function compareWithCache(currentFloat) {
    if (!cachedGroups?.length) return;

    for (const group of cachedGroups) {
      const floats = (group.floatValues || parseFloats(group.floatsText)).filter((value) =>
        Number.isFinite(value),
      );
      if (floats.some((value) => Math.abs(value - currentFloat) < 1e-12)) {
        console.log(
          `[FIKEXT] Float ${currentFloat} matches cached trade: ${group.name} (${group.wear})`,
        );
        renderPriceChip(group);
        return;
      }
    }

    removePriceChip();
    console.log(`[FIKEXT] Float ${currentFloat} not found in cached trades`);
  }

  function parseFloats(text) {
    if (!text) return [];
    return text
      .split(',')
      .map((part) => parseFloat(part.trim().replace(/,/g, '.')))
      .filter((value) => Number.isFinite(value));
  }

  function handleChange() {
    const currentFloat = extractFloat();
    if (currentFloat === null) return;

    if (currentFloat !== lastFloatValue) {
      lastFloatValue = currentFloat;
      console.log(`[FIKEXT] Item changed it's float: ${currentFloat}`);
      compareWithCache(currentFloat);
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

  async function logCachedTrades() {
    if (!window.FIKEXT_TRADES_STORAGE?.loadTrades) return;
    const cached = await window.FIKEXT_TRADES_STORAGE.loadTrades();
    if (cached) {
      cachedGroups = cached.entries || [];
      console.log(
        `[FIKEXT] Loaded ${cachedGroups.length} cached trades (storedAt: ${new Date(
          cached.storedAt,
        ).toISOString()})`,
        cachedGroups,
      );
      if (lastFloatValue !== null) {
        compareWithCache(lastFloatValue);
      } else {
        handleChange();
      }
    } else {
      cachedGroups = [];
      console.log('[FIKEXT] No cached trades found');
      removePriceChip();
    }
  }

  function waitForContainer() {
    const existing = document.querySelector(ROOT_SELECTOR);
    if (existing) {
      initObserver();
      logCachedTrades();
      return;
    }

    const bodyObserver = new MutationObserver(() => {
      if (document.querySelector(ROOT_SELECTOR)) {
        initObserver();
        logCachedTrades();
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

  function inlineStyle(styleObj = {}) {
    return Object.entries(styleObj)
      .map(([key, value]) => `${camelToKebab(key)}:${value}`)
      .join(';');
  }

  function camelToKebab(input) {
    return input.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
})();
