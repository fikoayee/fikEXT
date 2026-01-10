(() => {
  const config = window.FIKEXT_STEAM_CONST;
  if (!config) return;

  const ROOT_SELECTOR = '.inventory_page_right';
  const FLOAT_SELECTOR = '.floatBar .floatToolTip .floatDropTarget';
  const TECH_FLOAT_SELECTOR = '.floatBar .floatTechnical';
  const chipConfig = config.CHIP;
  const LISTING_CONFIG = Object.freeze({
    sellerPriceInput: '#market_sell_currency_input',
    selectedItems:
      '.inventory_page_left .item.selectedSell, .inventory_page_left .item.activeInfo.selectedSell',
    buttons: Object.freeze([
      '#market_sell_dialog_accept',
      '.marketActionQuickSell',
      '.marketActionInstantSell',
      '#quicksellbtn',
      '#instantsellbtn',
    ]),
  });

  let lastFloatValue = null;
  let cachedGroups = [];
  let tradesLoaded = false;

  function ensureChip() {
    let chip = document.getElementById(chipConfig.id);
    if (!chip) {
      chip = document.createElement('section');
      chip.id = chipConfig.id;
      Object.assign(chip.style, chipConfig.theme.container);
      document.body.appendChild(chip);
    }
    return chip;
  }

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
    const chip = ensureChip();
    const hasGroup = Boolean(group);
    const primaryValue = hasGroup ? group.priceText ?? '?' : chipConfig.labels.notFound;
    const subtitle = hasGroup
      ? `${group.name ?? chipConfig.labels.notFound}${group?.wear ? ` · ${group.wear}` : ''}`
      : chipConfig.labels.notFoundSubtitle;
    const qtyValue = hasGroup
      ? `${chipConfig.labels.qty} ${group.qty ?? '?'}`
      : chipConfig.labels.notFoundQty;

    chip.innerHTML = `
      <span style="${inlineStyle(chipConfig.theme.title)}">
        ${chipConfig.labels.title}
      </span>
      <strong style="${inlineStyle(chipConfig.theme.value)}">
        ${primaryValue}
      </strong>
      <div style="display:flex; flex-direction:column; gap:0.05rem; font-size:0.74rem; color:#94a3b8;">
        <span>${subtitle}</span>
        <span style="${inlineStyle(chipConfig.theme.qty)}">
          ${qtyValue}
        </span>
      </div>
      <div style="display:flex; flex-direction:column; gap:0.25rem;">
        <button type="button" data-fikext-action="summary" style="${inlineStyle(chipConfig.theme.button)}">
          ${chipConfig.labels.summary}
        </button>
        <button type="button" data-fikext-action="clear" style="${inlineStyle(chipConfig.theme.buttonDanger)}">
          ${chipConfig.labels.clearData}
        </button>
      </div>
    `;

    chip.querySelector('[data-fikext-action="summary"]')?.addEventListener('click', handleSummaryClick);
    chip.querySelector('[data-fikext-action="clear"]')?.addEventListener('click', handleClearDataClick);
  }

  async function logListingHistory() {
    if (!window.FIKEXT_LISTINGS_STORAGE?.loadListings) {
      console.warn('[FIKEXT] Listings storage API unavailable');
      return null;
    }
    try {
      const history = (await window.FIKEXT_LISTINGS_STORAGE.loadListings()) || {
        storedAt: null,
        entries: [],
      };
      const entries = history.entries || [];
      const storedAtDisplay = history.storedAt
        ? new Date(history.storedAt).toISOString()
        : 'n/a';
      console.log(
        `[FIKEXT] Listing history (${entries.length} entries, storedAt: ${storedAtDisplay})`,
      );
      if (entries.length) {
        console.table(
          entries.map((entry, index) => ({
            index: index + 1,
            listedAt: entry.listedAtDisplay ?? entry.listedAt,
            name: entry.name,
            price: entry.price,
            qty: entry.qty,
            floats: Array.isArray(entry.floats) ? entry.floats.join(', ') : '',
            source: entry.source,
          })),
        );
      }
      return history;
    } catch (error) {
      console.warn('[FIKEXT] Failed to load listing history', error);
      return null;
    }
  }

  async function handleSummaryClick(event) {
    event?.preventDefault?.();
    await logListingHistory();
  }

  async function handleClearDataClick(event) {
    event?.preventDefault?.();
    if (!window.FIKEXT_LISTINGS_STORAGE?.clearListings) {
      console.warn('[FIKEXT] Listings storage API unavailable');
      return;
    }
    const shouldClear =
      typeof window.confirm === 'function'
        ? window.confirm('Clear tracked listings history?')
        : true;
    if (!shouldClear) return;
    try {
      await window.FIKEXT_LISTINGS_STORAGE.clearListings();
      console.log('[FIKEXT] Listing history cleared');
      await logListingHistory();
    } catch (error) {
      console.warn('[FIKEXT] Failed to clear listing history', error);
    }
  }

  function removePriceChip() {
    const chip = document.getElementById(chipConfig.id);
    if (chip) chip.remove();
  }

  function logMatchedItemDetails(currentFloat, group, floats) {
    const sampleFloats = floats?.slice(0, 5) ?? [];
    console.log('[FIKEXT] Matched inventory item details:', {
      float: currentFloat,
      item: group?.name ?? chipConfig.labels.notFound,
      wear: group?.wear ?? 'N/A',
      price: group?.priceText ?? '?',
      quantity: group?.qty ?? '?',
      floatsSample: sampleFloats,
      floatsCount: floats?.length ?? 0,
    });
  }

  function compareWithCache(currentFloat) {
    if (!tradesLoaded) return;

    if (!cachedGroups?.length) {
      renderPriceChip(null);
      console.log(`[FIKEXT] Float ${currentFloat} not found (no cached trades available)`);
      return;
    }

    for (const group of cachedGroups) {
      const floats = (group.floatValues || parseFloats(group.floatsText)).filter((value) =>
        Number.isFinite(value),
      );
      if (floats.some((value) => Math.abs(value - currentFloat) < 1e-12)) {
        console.log(
          `[FIKEXT] Float ${currentFloat} matches cached trade: ${group.name} (${group.wear})`,
        );
        logMatchedItemDetails(currentFloat, group, floats);
        renderPriceChip(group);
        return;
      }
    }

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
    if (!window.FIKEXT_TRADES_STORAGE?.loadTrades) {
      tradesLoaded = true;
      cachedGroups = [];
      console.log('[FIKEXT] Trades storage API unavailable');
      handleChange();
      return;
    }
    const cached = await window.FIKEXT_TRADES_STORAGE.loadTrades();
    tradesLoaded = true;
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
      if (lastFloatValue !== null) {
        compareWithCache(lastFloatValue);
      }
    }
  }

  function parseNumber(text) {
    if (!text) return null;
    const normalized = text.replace(/[^0-9.,-]/g, '').replace(',', '.');
    const value = parseFloat(normalized);
    return Number.isFinite(value) ? value : null;
  }

  function formatFloatDisplay(value) {
    if (!Number.isFinite(value)) return '?';
    let text = value.toFixed(6);
    text = text.replace(/0+$/, '');
    if (text.endsWith('.')) text = text.slice(0, -1);
    return text || '0';
  }

  function formatExactFloat(value) {
    if (!Number.isFinite(value)) return '?';
    let text = value.toFixed(15);
    text = text.replace(/0+$/, '');
    if (text.endsWith('.')) text = text.slice(0, -1);
    return text || '0';
  }

  function formatPriceDisplay(raw) {
    if (!raw) return '?';
    return raw.trim();
  }

  function extractListingPrice() {
    const input = document.querySelector(LISTING_CONFIG.sellerPriceInput);
    return input?.value ?? '';
  }

  function getEconomyInfo(itemEl) {
    if (!itemEl) return null;
    const economyId = itemEl.dataset?.economyItem || itemEl.getAttribute('data-economy-item') || null;
    const appId =
      itemEl.dataset?.appid ||
      itemEl.getAttribute('data-appid') ||
      itemEl.dataset?.appId ||
      itemEl.dataset?.applicationId ||
      null;
    const contextId =
      itemEl.dataset?.contextid ||
      itemEl.getAttribute('data-contextid') ||
      itemEl.dataset?.contextId ||
      null;
    const assetId =
      itemEl.dataset?.assetid ||
      itemEl.getAttribute('data-assetid') ||
      itemEl.dataset?.assetId ||
      itemEl.dataset?.itemId ||
      null;
    return { economyId, appId, contextId, assetId };
  }

  function pullNameFromDescriptor(descriptor) {
    if (!descriptor) return null;
    if (typeof descriptor === 'string') return descriptor.trim() || null;
    const nameCandidates = [
      descriptor.market_hash_name,
      descriptor.market_name,
      descriptor.name,
      descriptor.marketHashName,
      descriptor.marketName,
      descriptor.full_name,
    ];
    for (const candidate of nameCandidates) {
      if (candidate && String(candidate).trim()) {
        return String(candidate).trim();
      }
    }
    return null;
  }

  function resolveInventoryDescriptor(info) {
    if (!info) return null;
    const inventory = window.g_ActiveInventory;
    if (!inventory) return null;

    const candidateKeys = [info.economyId, info.assetId].filter(Boolean);
    for (const key of candidateKeys) {
      const direct =
        inventory.m_rgInventory?.[key] ||
        inventory.m_rgAssets?.[key] ||
        inventory.m_rgItems?.[key];
      if (direct?.description) return direct.description;
      if (direct) return direct;
    }

    if (info.appId && info.contextId && info.assetId) {
      const sources = [inventory.m_rgAssets, inventory.m_rgInventory, inventory.m_rgItems];
      for (const source of sources) {
        const described =
          source?.[info.appId]?.[info.contextId]?.[info.assetId] ??
          source?.[String(info.appId)]?.[String(info.contextId)]?.[String(info.assetId)];
        if (described?.description) return described.description;
        if (described) return described;
      }
    }

    if (info.assetId) {
      if (typeof inventory.GetInventoryItemByItemId === 'function') {
        const byMethod = inventory.GetInventoryItemByItemId(info.assetId);
        if (byMethod?.description) return byMethod.description;
        if (byMethod) return byMethod;
      }

      const fallback = Object.values(inventory.m_rgInventory || {}).find(
        (entry) =>
          entry &&
          (String(entry.assetid) === String(info.assetId) ||
            String(entry.id) === String(info.assetId) ||
            String(entry.itemid) === String(info.assetId)),
      );
      if (fallback?.description) return fallback.description;
      if (fallback) return fallback;
    }

    return null;
  }

  function extractActiveInventoryName() {
    const active = window.g_ActiveInventory?.selectedItem;
    if (!active) return null;
    return pullNameFromDescriptor(active.description || active);
  }

  function extractItemName(itemEl) {
    if (!itemEl) return null;
    const datasetCandidates = [
      itemEl.dataset?.marketHashName,
      itemEl.dataset?.hashName,
      itemEl.dataset?.itemName,
      itemEl.dataset?.marketName,
      itemEl.dataset?.name,
    ];
    for (const value of datasetCandidates) {
      if (value && value.trim()) return value.trim();
    }

    const descriptor = resolveInventoryDescriptor(getEconomyInfo(itemEl));
    const descriptorName = pullNameFromDescriptor(descriptor);
    if (descriptorName) return descriptorName;

    const attrCandidates = [
      'data-market-hash-name',
      'data-market-name',
      'data-item-name',
      'data-name',
      'data-economy-name',
    ];
    for (const attr of attrCandidates) {
      const value = itemEl.getAttribute(attr);
      if (value && value.trim()) return value.trim();
    }

    const economyDescriptionRaw =
      itemEl.getAttribute('data-economy-item-description') || itemEl.dataset?.economyItemDescription;
    if (economyDescriptionRaw) {
      try {
        const parsed = JSON.parse(economyDescriptionRaw);
        const parsedName = pullNameFromDescriptor(parsed);
        if (parsedName) return parsedName;
      } catch {
        /* ignore */
      }
    }

    const linkName = itemEl.querySelector('[data-market-name]')?.getAttribute('data-market-name');
    if (linkName && linkName.trim()) return linkName.trim();

    const inlineNode = itemEl.querySelector(
      '.item_name, .market_listing_item_name_block, .name, .title, .hover_item_name',
    );
    if (inlineNode?.textContent?.trim()) return inlineNode.textContent.trim();

    const meta = itemEl.querySelector('csfloat-inventory-item-holder-metadata');
    const metaName =
      meta?.shadowRoot
        ?.querySelector('[data-market-name], .item-name, .item_name, .name, .title')
        ?.textContent?.trim() ?? '';
    if (metaName) return metaName;

    const hoverName =
      extractActiveInventoryName() ||
      document.querySelector('#iteminfo1_item_name, .hover_item_name, .item_desc_content .item_name')?.textContent ||
      '';
    return hoverName.trim() || null;
  }

  function extractFloatFromItemElement(itemEl) {
    if (!itemEl) return null;
    const floatIndicator = itemEl.querySelector('.floatIndicator');
    const floatFromBadge = parseNumber(floatIndicator?.textContent ?? '');
    if (Number.isFinite(floatFromBadge)) return floatFromBadge;

    const meta = itemEl.querySelector('csfloat-inventory-item-holder-metadata');
    if (meta?.shadowRoot) {
      const shadowFloat = parseNumber(meta.shadowRoot.querySelector('.float')?.textContent ?? '');
      if (Number.isFinite(shadowFloat)) return shadowFloat;
    }

    const dataFloat = parseNumber(itemEl.getAttribute('data-float'));
    if (Number.isFinite(dataFloat)) return dataFloat;
    return null;
  }

  function extractPriceFromItemElement(itemEl) {
    if (!itemEl) return null;
    const priceNode = itemEl.querySelector('.priceIndicator, .p-price');
    const text = priceNode?.textContent?.trim();
    return text && text.length ? text : null;
  }

  function getSelectedItems() {
    return Array.from(document.querySelectorAll(LISTING_CONFIG.selectedItems));
  }

  function collectListingEntries() {
    const selectedItems = getSelectedItems();
    const dialogPrice = extractListingPrice();
    if (!selectedItems.length) {
      return [
        {
          float: extractFloat() ?? lastFloatValue,
          price: dialogPrice || '?',
          name:
            extractActiveInventoryName() ||
            document.querySelector('#iteminfo1_item_name, .hover_item_name')?.textContent?.trim() ||
            null,
        },
      ];
    }

    return selectedItems.map((itemEl) => ({
      float: extractFloatFromItemElement(itemEl) ?? extractFloat() ?? lastFloatValue,
      price: dialogPrice || extractPriceFromItemElement(itemEl) || '?',
      name: extractItemName(itemEl),
    }));
  }

  function formatHistoryDate(timestamp) {
    const date = new Date(timestamp);
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`;
  }

  async function persistListingHistory(entries, source) {
    if (!entries?.length || !window.FIKEXT_LISTINGS_STORAGE?.appendListing) return;
    const timestamp = Date.now();
    const floats = entries
      .map((entry) => (Number.isFinite(entry.float) ? Number(entry.float) : null))
      .filter((value) => value !== null);
    const uniqueNames = Array.from(
      new Set(entries.map((entry) => entry.name).filter((name) => Boolean(name?.trim()))),
    );
    const record = {
      listedAt: timestamp,
      listedAtDisplay: formatHistoryDate(timestamp),
      price: formatPriceDisplay(entries[0]?.price ?? '?'),
      qty: entries.length,
      floats,
      name: uniqueNames[0] ?? chipConfig.labels.notFound,
      names: uniqueNames,
      source,
    };

    try {
      await window.FIKEXT_LISTINGS_STORAGE.appendListing(record);
    } catch (error) {
      console.warn('[FIKEXT] Failed to persist listing history', error, record);
    }
  }

  function logListingAttempt(source = 'button') {
    const entries = collectListingEntries();
    entries.forEach((entry, index) => {
      const friendlyFloatDisplay = formatFloatDisplay(entry.float);
      const exactFloatDisplay = formatExactFloat(entry.float);
      const priceDisplay = formatPriceDisplay(entry.price);
      const nameDisplay = entry.name?.trim() || chipConfig.labels.notFound;
      const suffix = entries.length > 1 ? ` #${index + 1}` : '';
      console.log(
        `[FIKEXT] listing "${nameDisplay}" for PRICE: ${priceDisplay} FLOAT: ${friendlyFloatDisplay} (raw: ${exactFloatDisplay}) (source: ${source}${suffix})`,
      );
    });
    persistListingHistory(entries, source);
  }

  function attachListingButtons() {
    if (!document.body) return;
    LISTING_CONFIG.buttons.forEach((selector) => {
      document.querySelectorAll(selector).forEach((button) => {
        if (!button || button.dataset.fikextListingTracker === 'true') return;
        button.dataset.fikextListingTracker = 'true';
        button.addEventListener(
          'click',
          () => {
            logListingAttempt(selector);
          },
          true,
        );
      });
    });
  }

  function initListingTracker() {
    attachListingButtons();
    const observer = new MutationObserver(() => attachListingButtons());
    observer.observe(document.body, { childList: true, subtree: true });
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

  function bootstrap() {
    waitForContainer();
    initListingTracker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
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
