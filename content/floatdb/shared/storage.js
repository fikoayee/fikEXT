(() => {
  if (window.FIKEXT_TRADES_STORAGE && window.FIKEXT_LISTINGS_STORAGE) return;

  const TRADES_STORAGE_KEY = "fikext_trades_cache";
  const LISTINGS_STORAGE_KEY = "fikext_listings_history";
  const LISTINGS_MAX_ENTRIES = 2000;

  async function writeStorage(key, payload) {
    try {
      if (chrome?.storage?.local) {
        await chrome.storage.local.set({ [key]: payload });
      } else {
        localStorage.setItem(key, JSON.stringify(payload));
      }
    } catch (error) {
      console.warn(`[FIKEXT] Failed to persist data for ${key}`, error);
      throw error;
    }
  }

  async function readStorage(key) {
    try {
      if (chrome?.storage?.local) {
        const result = await chrome.storage.local.get(key);
        return result[key] || null;
      }
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn(`[FIKEXT] Failed to read data for ${key}`, error);
      return null;
    }
  }

  async function saveTrades(entries) {
    const payload = {
      storedAt: Date.now(),
      entries,
    };
    await writeStorage(TRADES_STORAGE_KEY, payload);
  }

  async function loadTrades() {
    return readStorage(TRADES_STORAGE_KEY);
  }

  async function appendListing(record) {
    if (!record) return null;
    const existing = (await readStorage(LISTINGS_STORAGE_KEY)) || { entries: [] };
    const nextEntries = [record, ...(existing.entries || [])].slice(0, LISTINGS_MAX_ENTRIES);
    const payload = {
      storedAt: Date.now(),
      entries: nextEntries,
    };
    await writeStorage(LISTINGS_STORAGE_KEY, payload);
    return payload;
  }

  async function loadListings() {
    return (await readStorage(LISTINGS_STORAGE_KEY)) || { storedAt: null, entries: [] };
  }

  window.FIKEXT_TRADES_STORAGE ??= Object.freeze({
    saveTrades,
    loadTrades,
  });

  window.FIKEXT_LISTINGS_STORAGE ??= Object.freeze({
    appendListing,
    loadListings,
  });
})();
