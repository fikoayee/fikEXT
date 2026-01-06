(() => {
  if (window.FIKEXT_TRADES_STORAGE) return;

  const STORAGE_KEY = "fikext_trades_cache";

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

  window.FIKEXT_TRADES_STORAGE = Object.freeze({
    saveTrades,
    loadTrades,
  });
})();
