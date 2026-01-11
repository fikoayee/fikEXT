(() => {

  const TRADES_STORAGE_KEY = "fikext_trades_cache";
  const LISTINGS_STORAGE_KEY = "fikext_listings_history";
  const LISTINGS_MAX_ENTRIES = 2000;

  let chromeStorageAvailable = Boolean(chrome?.storage?.local);

  function markChromeStorageUnavailable(error) {
    if (!error) return;
    const message = String(error.message || error).toLowerCase();
    if (message.includes('extension context invalidated')) {
      chromeStorageAvailable = false;
      return true;
    }
    return false;
  }

  async function writeStorage(key, payload) {
    try {
      if (chromeStorageAvailable && chrome?.storage?.local) {
        await chrome.storage.local.set({ [key]: payload });
        return;
      }

      localStorage.setItem(key, JSON.stringify(payload));
    } catch (error) {
      if (markChromeStorageUnavailable(error)) {
        try {
          localStorage.setItem(key, JSON.stringify(payload));
          return;
        } catch (fallbackError) {
          console.warn(`[FIKEXT] Failed local fallback persist for ${key}`, fallbackError);
          throw fallbackError;
        }
      }
      console.warn(`[FIKEXT] Failed to persist data for ${key}`, error);
      throw error;
    }
  }

  async function removeStorage(key) {
    try {
      if (chromeStorageAvailable && chrome?.storage?.local) {
        await chrome.storage.local.remove(key);
        return;
      }

      localStorage.removeItem(key);
    } catch (error) {
      if (markChromeStorageUnavailable(error)) {
        try {
          localStorage.removeItem(key);
          return;
        } catch (fallbackError) {
          console.warn(`[FIKEXT] Failed local fallback removal for ${key}`, fallbackError);
          throw fallbackError;
        }
      }
      console.warn(`[FIKEXT] Failed to remove data for ${key}`, error);
      throw error;
    }
  }

  async function readStorage(key) {
    try {
      if (chromeStorageAvailable && chrome?.storage?.local) {
        const result = await chrome.storage.local.get(key);
        return result[key] || null;
      }
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      if (markChromeStorageUnavailable(error)) {
        try {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        } catch (fallbackError) {
          console.warn(`[FIKEXT] Failed local fallback read for ${key}`, fallbackError);
          return null;
        }
      }
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

  async function saveListings(entries) {
    const safeEntries = Array.isArray(entries) ? entries : [];
    const payload = {
      storedAt: Date.now(),
      entries: safeEntries.slice(0, LISTINGS_MAX_ENTRIES),
    };
    await writeStorage(LISTINGS_STORAGE_KEY, payload);
    return payload;
  }

  async function appendListing(record) {
    if (!record) return null;
    const existing = (await readStorage(LISTINGS_STORAGE_KEY)) || { entries: [] };
    const nextEntries = [record, ...(existing.entries || [])];
    return saveListings(nextEntries);
  }

  async function loadListings() {
    return (await readStorage(LISTINGS_STORAGE_KEY)) || { storedAt: null, entries: [] };
  }

  async function clearListings() {
    await removeStorage(LISTINGS_STORAGE_KEY);
    return { storedAt: null, entries: [] };
  }

  window.FIKEXT_TRADES_STORAGE = Object.freeze({
    saveTrades,
    loadTrades,
  });

  window.FIKEXT_LISTINGS_STORAGE = Object.freeze({
    appendListing,
    loadListings,
    saveListings,
    clearListings,
  });
})();
