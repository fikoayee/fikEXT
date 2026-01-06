(() => {
  const config = window.FIKEXT_TRADES_CONST;
  if (!config) return;

  const state = {
    isScraping: false,
    messageTimeout: null,
  };

  function $(root, selector) {
    return root.querySelector(selector);
  }

  function normalizeNumber(text = "") {
    const cleaned = text.replace(/[^0-9.,-]/g, "").replace(",", ".");
    const value = parseFloat(cleaned);
    return Number.isFinite(value) ? value : null;
  }

  function extractText(element) {
    return element ? element.textContent.trim() : "";
  }

  function extractSuffixText(root) {
    const suffixEl = $(root, config.SELECTORS.nameSuffix);
    if (!suffixEl) return "";
    const clone = suffixEl.cloneNode(true);
    clone.querySelectorAll("span").forEach((span) => span.remove());
    return clone.textContent.trim();
  }

  function formatFloat(value) {
    if (!Number.isFinite(value)) return "";
    let text = value.toFixed(12);
    text = text.replace(/0+$/, "");
    if (text.endsWith(".")) text = text.slice(0, -1);
    return text || "0";
  }

  function determineWear(floatValue) {
    if (!Number.isFinite(floatValue)) return null;
    const range = (config.WEARS || []).find((wear) => floatValue >= wear.min && floatValue < wear.max);
    return range ? range.label : null;
  }

  function resolveScope(element) {
    if (!element) return null;
    if (element.matches(config.SELECTORS.root)) return element;
    return element.closest(config.SELECTORS.root) || element;
  }

  function readCardData(card) {
    const scope = resolveScope(card) || card;
    const prefix = extractText($(scope, config.SELECTORS.namePrefix));
    const suffix = extractSuffixText(scope);
    const price = extractText($(scope, config.SELECTORS.price));
    const floatValue = normalizeNumber(extractText($(scope, config.SELECTORS.float)));
    const status = extractText($(scope, config.SELECTORS.status));
    const time = extractText($(scope, config.SELECTORS.time));
    const wear = determineWear(floatValue);

    return {
      element: scope,
      name: [prefix, suffix].filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
      price,
      floatValue,
      status,
      time,
      wear,
    };
  }

  function findReferenceIndex(trades, referenceFloat) {
    if (!Number.isFinite(referenceFloat)) return -1;
    return trades.findIndex((trade) => Math.abs(trade.floatValue - referenceFloat) < 1e-12);
  }

  function parsePrice(priceText) {
    if (!priceText) return { currency: "PLN", amount: null };
    const normalized = priceText.replace(/[()]/g, " ").trim();
    const match = normalized.match(/([A-Za-z]{3})?\s*([\d.,]+)/);
    const currency = match?.[1]?.toUpperCase() || "PLN";
    const amount = match?.[2] ? parseFloat(match[2].replace(",", ".")) : null;
    return { currency, amount: Number.isFinite(amount) ? amount : null };
  }

  function formatPrice(amount) {
    if (!Number.isFinite(amount)) return "";
    return amount.toFixed(2).replace(".", ",");
  }

  function groupTrades(trades) {
    const map = new Map();
    trades.forEach((trade) => {
      const wearLabel = trade.wear || "Unknown";
      const key = `${trade.name}__${wearLabel}`;
      if (!map.has(key)) {
        map.set(key, {
          name: trade.name,
          wear: wearLabel,
          floats: [],
          prices: [],
          qty: 0,
        });
      }
      const bucket = map.get(key);
      bucket.qty += 1;
      if (Number.isFinite(trade.floatValue)) bucket.floats.push(trade.floatValue);
      const priceInfo = parsePrice(trade.price);
      if (priceInfo.amount !== null) bucket.prices.push(priceInfo);
    });

    return Array.from(map.values()).map((bucket) => {
      const avgPrice =
        bucket.prices.length > 0
          ? bucket.prices.reduce((sum, entry) => sum + entry.amount, 0) / bucket.prices.length
          : null;
      return {
        name: bucket.name,
        wear: bucket.wear,
        floatsText: bucket.floats.map(formatFloat).join(", "),
        priceText: formatPrice(avgPrice),
        qty: bucket.qty,
      };
    });
  }

  function escapeCsv(value) {
    if (value == null) return "";
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function downloadCsv(grouped) {
    if (!grouped.length) return;
    const header = ["NAME", "WEAR", "PRICE", "QTY"];
    const lines = [header];
    grouped.forEach((item) => {
      lines.push([item.name, item.floatsText, item.priceText, item.qty]);
    });
    const csv = lines.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, `fikext-trades-${Date.now()}.csv`);
  }

  function downloadResults(entries) {
    if (!entries.length) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      total: entries.length,
      entries,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    triggerDownload(blob, `fikext-trades-${Date.now()}.json`);
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function showMessage(container, text, type = "info") {
    let messageEl = container.querySelector(".fikext-message");
    if (!messageEl) {
      messageEl = document.createElement("p");
      messageEl.className = "fikext-message";
      messageEl.style.margin = "0.4rem 0 0";
      messageEl.style.fontSize = "0.78rem";
      messageEl.style.fontWeight = "500";
      messageEl.style.color = "#e2e8f0";
      container.appendChild(messageEl);
    }
    const palette = config.MESSAGES.palette;
    messageEl.textContent = text;
    messageEl.style.color = palette[type] || palette.info;
    clearTimeout(state.messageTimeout);
    state.messageTimeout = setTimeout(() => {
      messageEl.textContent = "";
    }, 5000);
  }

  function toggleUi(ui, disabled) {
    ui.button.disabled = disabled;
    ui.button.textContent = disabled ? "Scraping..." : "Scrape";
  }

  function createFloatingUi() {
    const { theme } = config.UI;
    const container = document.createElement("section");
    container.id = config.UI.floatingId;
    Object.assign(container.style, theme.container);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Reference float (e.g. 0.43345)";
    Object.assign(input.style, theme.input);
    input.addEventListener("focus", () => Object.assign(input.style, theme.inputFocus));
    input.addEventListener("blur", () => Object.assign(input.style, theme.input));

    const button = document.createElement("button");
    button.textContent = "Scrape";
    Object.assign(button.style, theme.button);
    button.addEventListener("mouseenter", () => Object.assign(button.style, theme.buttonHover));
    button.addEventListener("mouseleave", () => Object.assign(button.style, theme.button));

    container.append(input, button);
    document.body.appendChild(container);

    return { container, input, button };
  }

  function removeUi(ui) {
    if (!ui) return;
    ui.container.remove();
  }

  function scrapeTrades(ui) {
    if (state.isScraping) return;
    const referenceFloat = normalizeNumber(ui.input.value);
    if (ui.input.value.trim() && !Number.isFinite(referenceFloat)) {
      showMessage(ui.container, "Invalid float value", "error");
      return;
    }

    state.isScraping = true;
    toggleUi(ui, true);

    try {
      const cards = Array.from(document.querySelectorAll(config.SELECTORS.cards));
      if (!cards.length) {
        showMessage(ui.container, "No trades detected on page", "error");
        return;
      }

      const trades = cards
        .map(readCardData)
        .filter((trade) => trade.status.toLowerCase().includes(config.STATUSES.SUCCESSFUL.toLowerCase()));
      if (!trades.length) {
        showMessage(ui.container, "No successful trades found", "info");
        return;
      }

      const referenceIndex = findReferenceIndex(trades, referenceFloat);
      const relevantTrades = referenceIndex === -1 ? trades : trades.slice(0, referenceIndex);

      if (!relevantTrades.length) {
        showMessage(ui.container, referenceIndex === -1 ? "Reference float not found" : "No newer trades", "info");
        return;
      }

      const exportable = relevantTrades.map(({ name, price, floatValue, status, time, wear }) => ({
        name,
        price,
        float: floatValue,
        wear,
        status,
        time,
      }));

      const grouped = groupTrades(relevantTrades);

      downloadResults(exportable);
      downloadCsv(grouped);
      saveToStorage(grouped);
      showMessage(ui.container, `${exportable.length} trades exported`, "success");
    } finally {
      state.isScraping = false;
      toggleUi(ui, false);
    }
  }

  let currentUi = null;
  const TARGET_PATH = "/profile/trades";
  const TARGET_MODE = "purchased";
  const pageUtils = window.FIKEXT_PAGE_UTILS;
  const tradesStorage = window.FIKEXT_TRADES_STORAGE;

  function isTargetPage() {
    if (!pageUtils?.isPage) {
      console.warn("[FIKEXT] page utils unavailable");
      return false;
    }
    return pageUtils.isPage(TARGET_PATH, "mode", TARGET_MODE);
  }

  function mountUi() {
    if (isTargetPage()) {
      if (!currentUi) {
        currentUi = createFloatingUi();
        currentUi.button.addEventListener("click", () => scrapeTrades(currentUi));
      }
      currentUi.container.style.display = "block";
    } else if (currentUi) {
      removeUi(currentUi);
      currentUi = null;
    }
  }

  function scheduleMount() {
    setTimeout(mountUi, 0);
  }

  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    const result = originalPushState.apply(history, args);
    scheduleMount();
    return result;
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(history, args);
    scheduleMount();
    return result;
  };

  window.addEventListener("popstate", scheduleMount);
  window.addEventListener("hashchange", scheduleMount);

  let locationCheckInterval = window.setInterval(() => {
    mountUi();
  }, 750);

  window.addEventListener("beforeunload", () => {
    window.clearInterval(locationCheckInterval);
    locationCheckInterval = null;
  });

  mountUi();

  function saveToStorage(entries) {
    if (!tradesStorage?.saveTrades) return;
    tradesStorage.saveTrades(entries);
  }
})();
