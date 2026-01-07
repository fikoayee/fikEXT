(() => {
  if (window.FIKEXT_TRADES_STORAGE) return;

  const STORAGE_KEY = "fikext_trades_cache";
  const SALES_STORAGE_KEY = "fikext_sale_log";

  async function saveTrades(entries) {
    try {
      const payload = {
        storedAt: Date.now(),
        entries,
      };

      if (chrome?.storage?.local) {
        await chrome.storage.local.set({ [STORAGE_KEY]: payload });
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }
    } catch (error) {
      console.warn("[FIKEXT] Failed to persist trades", error);
    }
  }

  async function loadTrades() {
    try {
      if (chrome?.storage?.local) {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        return result[STORAGE_KEY] || null;
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("[FIKEXT] Failed to read trades", error);
      return null;
    }
  }

  async function loadSaleEntries() {
    try {
      if (chrome?.storage?.local) {
        const result = await chrome.storage.local.get(SALES_STORAGE_KEY);
        return result[SALES_STORAGE_KEY] || { entries: [], updatedAt: null };
      }
      const raw = localStorage.getItem(SALES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : { entries: [], updatedAt: null };
    } catch (error) {
      console.warn("[FIKEXT] Failed to read sale log", error);
      return { entries: [], updatedAt: null };
    }
  }

  async function appendSaleEntry(entry) {
    if (!entry) return;
    try {
      const existing = await loadSaleEntries();
      const payload = {
        updatedAt: Date.now(),
        entries: [...(existing.entries || []), entry],
      };

      if (chrome?.storage?.local) {
        await chrome.storage.local.set({ [SALES_STORAGE_KEY]: payload });
      } else {
        localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(payload));
      }
    } catch (error) {
      console.warn("[FIKEXT] Failed to persist sale log", error);
    }
  }

  async function clearSaleEntries() {
    try {
      if (chrome?.storage?.local) {
        await chrome.storage.local.remove(SALES_STORAGE_KEY);
      } else {
        localStorage.removeItem(SALES_STORAGE_KEY);
      }
    } catch (error) {
      console.warn("[FIKEXT] Failed to clear sale log", error);
    }
  }

  window.FIKEXT_TRADES_STORAGE = Object.freeze({
    saveTrades,
    loadTrades,
    loadSaleEntries,
    appendSaleEntry,
    clearSaleEntries,
  });
})();
