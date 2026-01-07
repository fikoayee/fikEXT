(() => {
  const config = window.FIKEXT_STEAM_CONST;
  if (!config) return;

  const ROOT_SELECTOR = '.inventory_page_right';
  const FLOAT_SELECTOR = '.floatBar .floatToolTip .floatDropTarget';
  const TECH_FLOAT_SELECTOR = '.floatBar .floatTechnical';
  const chipConfig = config.CHIP;

  let lastFloatValue = null;
  let cachedGroups = [];
  let lastMatchedGroup = null;
  const pendingSales = new Map();
  let lastSalePriceValue = null;
  let saleContextExpiry = null;
  const SALE_CONTEXT_TTL = 10000;

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

  let summaryButton = null;
  let clearButton = null;
  let chipInfoBlock = null;
  let chipActions = null;
  const summaryState = { entry: null };

  function ensureChip() {
    let chip = document.getElementById(chipConfig.id);
    if (!chip) {
      chip = document.createElement('section');
      chip.id = chipConfig.id;
      Object.assign(chip.style, chipConfig.theme.container);

      chipInfoBlock = document.createElement('div');
      chip.appendChild(chipInfoBlock);

      chipActions = document.createElement('div');
      Object.assign(chipActions.style, chipConfig.theme.actions);
      summaryButton = document.createElement('button');
      summaryButton.type = 'button';
      Object.assign(summaryButton.style, chipConfig.theme.button);
      summaryButton.textContent = chipConfig.labels.summary;
      summaryButton.addEventListener('click', () => {
        if (!summaryState.entry) return;
        downloadSummary(summaryState.entry);
      });

      clearButton = document.createElement('button');
      clearButton.type = 'button';
      Object.assign(clearButton.style, chipConfig.theme.clearButton);
      clearButton.textContent = chipConfig.labels.clear;
      clearButton.addEventListener('click', async () => {
        if (!window.FIKEXT_TRADES_STORAGE?.clearSaleEntries) return;
        const shouldClear = window.confirm(chipConfig.labels.clearConfirm);
        if (!shouldClear) return;
        await window.FIKEXT_TRADES_STORAGE.clearSaleEntries();
        console.log('[FIKEXT] Cleared persisted sale entries');
        logPersistedSalesSummary();
      });

      chipActions.appendChild(summaryButton);
      chipActions.appendChild(clearButton);
      chip.appendChild(chipActions);
      document.body.appendChild(chip);
    }
    return chip;
  }

  function renderPriceChip(group) {
    const chip = ensureChip();
    if (!chipInfoBlock) {
      chipInfoBlock = document.createElement('div');
      chip.insertBefore(chipInfoBlock, chipActions || null);
    }
    chipInfoBlock.innerHTML = `
      <span style="${inlineStyle(chipConfig.theme.title)}">
        ${chipConfig.labels.title}
      </span>
      <strong style="${inlineStyle(chipConfig.theme.value)}">
        ${group?.priceText ?? '?'}
      </strong>
      <div style="display:flex; flex-direction:column; gap:0.05rem; font-size:0.74rem; color:#94a3b8;">
        <span>${group?.name ?? chipConfig.labels.notFound}${group?.wear ? ` · ${group.wear}` : ''}</span>
        <span style="${inlineStyle(chipConfig.theme.qty)}">
          ${group ? `${chipConfig.labels.qty} ${group.qty ?? '?'}` : chipConfig.labels.notFound}
        </span>
      </div>
    `;

    if (group) {
      summaryState.entry = {
        item: group.name,
        wear: group.wear,
        avgPrice: group.priceText,
        qty: group.qty,
        floats: group.floatsText || group.floatValues?.map((value) => value.toFixed(12)).join(', ') || null,
        float: lastFloatValue,
        timestamp: new Date().toISOString(),
        salePrice: lastSalePriceValue,
      };
      summaryButton.disabled = false;
      summaryButton.textContent = chipConfig.labels.summary;
      Object.assign(summaryButton.style, chipConfig.theme.button);
    } else {
      summaryState.entry = null;
      summaryButton.disabled = false;
      summaryButton.textContent = chipConfig.labels.summary;
      Object.assign(summaryButton.style, chipConfig.theme.button);
    }
  }

  function removePriceChip() {
    const chip = document.getElementById(chipConfig.id);
    if (chip) chip.remove();
    summaryState.entry = null;
    summaryButton = null;
    clearButton = null;
    chipInfoBlock = null;
    chipActions = null;
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
        lastMatchedGroup = group;
        recordPendingSale(currentFloat, group);
        renderPriceChip(group);
        return;
      }
    }

    lastMatchedGroup = null;
    renderPriceChip(null);
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
      lastMatchedGroup = null;
      removePriceChip();
      lastSalePriceValue = null;
      saleContextExpiry = null;
      cleanupPendingSales();
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

  setupSaleLogging();
  logPersistedSalesSummary();

  function inlineStyle(styleObj = {}) {
    return Object.entries(styleObj)
      .map(([key, value]) => `${camelToKebab(key)}:${value}`)
      .join(';');
  }

  function camelToKebab(input) {
    return input.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  function setupSaleLogging() {
    document.addEventListener('click', (event) => {
      const acceptButton = event.target.closest('#market_sell_dialog_accept');
      if (acceptButton) {
        setTimeout(logSaleAttempt, 0);
        return;
      }

      const confirmButton = event.target.closest('#market_sell_dialog_ok');
      if (confirmButton) {
        setTimeout(logSaleAttempt, 0);
      }
    }, true);
  }

  function logSaleAttempt() {
    const salePrice = getSalePrice();
    const entries = pendingSales.size
      ? Array.from(pendingSales.values()).filter((entry) => entry && !entry.logged)
      : [buildEntry(lastMatchedGroup, lastFloatValue)];

    entries
      .filter((entry) => entry)
      .forEach((entry) => {
        logSaleEntry(entry, salePrice);
        entry.logged = true;
      });

    if (salePrice) {
      lastSalePriceValue = salePrice;
      saleContextExpiry = Date.now() + SALE_CONTEXT_TTL;
    } else if (lastSalePriceValue) {
      saleContextExpiry = Date.now() + SALE_CONTEXT_TTL;
    }

    cleanupPendingSales();
  }

  function getSalePrice() {
    const modal = document.querySelector('#market_sell_dialog');
    if (!modal) return null;
    const receiveInput = modal.querySelector('#market_sell_currency_input');
    const summaryAmount = modal.querySelector('#market_sell_dialog_total_youreceive_amount');
    return receiveInput?.value?.trim() || summaryAmount?.textContent?.trim() || null;
  }

  function getActiveItemName() {
    const nameEl =
      document.querySelector('.inventory_page_right h1 .customName') ||
      document.querySelector('.inventory_page_right h1 span');
    return nameEl?.textContent?.trim() || null;
  }

  function recordPendingSale(floatValue, group) {
    const key = Number.isFinite(floatValue) ? floatValue.toFixed(12) : `unknown-${Date.now()}`;
    let entry = pendingSales.get(key);
    if (!entry) {
      entry = buildEntry(group, floatValue);
      if (!entry) return;
      pendingSales.set(key, entry);
    } else if (group) {
      const updated = buildEntry(group, floatValue);
      if (updated) Object.assign(entry, updated);
    }

    entry.logged = false;

    if (canUseSaleContext() && !entry.logged) {
      logSaleEntry(entry, lastSalePriceValue);
      entry.logged = true;
      cleanupPendingSales();
    }
  }

  function buildEntry(group, floatValue) {
    const itemName = group?.name || getActiveItemName();
    if (!itemName && floatValue == null) return null;
    return {
      item: itemName,
      wear: group?.wear || null,
      float: floatValue ?? lastFloatValue,
      avgPrice: group?.priceText || null,
      qty: group?.qty ?? null,
      logged: false,
    };
  }

  function logSaleEntry(entry, salePrice) {
    if (entry && salePrice) {
      entry.salePrice = salePrice;
      if (summaryState.entry && summaryState.entry.float === entry.float) {
        summaryState.entry.salePrice = salePrice;
      }
    }

    const payload = {
      item: entry.item,
      wear: entry.wear,
      float: entry.float,
      avgPrice: entry.avgPrice,
      qty: entry.qty,
      salePrice: salePrice ?? null,
      loggedAt: new Date().toISOString(),
    };

    console.log('[FIKEXT] Sale attempt', payload);
    persistSaleRecord(payload);
  }

  function cleanupPendingSales() {
    for (const [key, entry] of pendingSales.entries()) {
      if (!entry || entry.logged) {
        pendingSales.delete(key);
      }
    }
  }

  function canUseSaleContext() {
    if (!lastSalePriceValue || !saleContextExpiry) return false;
    return Date.now() <= saleContextExpiry;
  }

  function downloadSummary(entry) {
    if (!entry) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      source: 'inventory-summary',
      entry,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const safeName = entry.item ? entry.item.replace(/[\\/:*?"<>|]/g, '_') : 'summary';
    link.download = `fikext-summary-${safeName}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }

  async function logPersistedSalesSummary() {
    if (!window.FIKEXT_TRADES_STORAGE?.loadSaleEntries) return;
    try {
      const stored = await window.FIKEXT_TRADES_STORAGE.loadSaleEntries();
      const count = stored?.entries?.length ?? 0;
      if (count) {
        const updatedAt = stored.updatedAt ? new Date(stored.updatedAt).toISOString() : 'unknown';
        console.log(`[FIKEXT] Loaded ${count} persisted sale entries (updatedAt: ${updatedAt})`, stored.entries);
      } else {
        console.log('[FIKEXT] No persisted sale entries found');
      }
    } catch (error) {
      console.warn('[FIKEXT] Failed to read persisted sale entries', error);
    }
  }

  function persistSaleRecord(record) {
    if (!record || !window.FIKEXT_TRADES_STORAGE?.appendSaleEntry) return;
    window.FIKEXT_TRADES_STORAGE.appendSaleEntry(record).catch((error) => {
      console.warn('[FIKEXT] Failed to append sale entry', error);
    });
  }
})();
