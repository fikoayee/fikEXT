(() => {
  if (window.FIKEXT_PAGE_UTILS) return;

  function isPage(targetPath, paramKey, paramValue) {
    try {
      const url = new URL(window.location.href);
      if (url.pathname !== targetPath) return false;
      if (!paramKey) return true;
      return url.searchParams.get(paramKey) === paramValue;
    } catch {
      return false;
    }
  }

  window.FIKEXT_PAGE_UTILS = Object.freeze({
    isPage,
  });
})();
