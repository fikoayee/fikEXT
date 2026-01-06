(() => {
  if (window.FIKEXT_TRADES_CONST) return;

  const PRIORITY = "important";
  const WEARS = Object.freeze([
    { label: "Factory New", min: 0.0, max: 0.07 },
    { label: "Minimal Wear", min: 0.07, max: 0.15 },
    { label: "Field-Tested", min: 0.15, max: 0.38 },
    { label: "Well-Worn", min: 0.38, max: 0.45 },
    { label: "Battle-Scarred", min: 0.45, max: 1.0 },
  ]);

  window.FIKEXT_TRADES_CONST = Object.freeze({
    PRIORITY,
    WEARS,
    SELECTORS: Object.freeze({
      cards: "app-profile-trade-row, app-trade-row, div.trade-card, div.trade-row, div.header.lite-card",
      root: "app-profile-trade-row, app-trade-row, div.trade-card, div.trade-row",
      namePrefix: ".name .prefix",
      nameSuffix: ".name .suffix",
      price: ".name .price",
      float: ".details .float",
      status: ".actions .status .text span, .actions .status .text",
      time: ".actions .time",
    }),
    STATUSES: Object.freeze({
      SUCCESSFUL: "Successful",
    }),
    UI: Object.freeze({
      floatingId: "fikext-trade-scraper",
      theme: Object.freeze({
        container: {
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "160px",
          padding: "9px 9px 10px",
          background: "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.94))",
          borderRadius: "8px",
          boxShadow: "0 25px 60px rgba(15, 23, 42, 0.45)",
          border: "1px solid rgba(148, 163, 184, 0.35)",
          color: "#f8fafc",
          fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
          zIndex: 2147483647,
          backdropFilter: "blur(18px)",
          boxSizing: "border-box",
        },
        input: {
          width: "100%",
          padding: "0.55rem 0.85rem",
          borderRadius: "6px",
          border: "1px solid rgba(148, 163, 184, 0.45)",
          background: "rgba(15, 23, 42, 0.65)",
          color: "#f8fafc",
          marginBottom: "0.65rem",
          outline: "none",
          fontSize: "0.78rem",
          transition: "border 120ms ease, box-shadow 120ms ease, background 120ms ease",
          boxSizing: "border-box",
        },
        inputFocus: {
          border: "1px solid rgba(99, 102, 241, 0.9)",
          boxShadow: "0 0 0 2px rgba(99, 102, 241, 0.25)",
          background: "rgba(15, 23, 42, 0.85)",
        },
        button: {
          width: "100%",
          border: "none",
          borderRadius: "8px",
          padding: "0.45rem 0.45rem",
          background: "linear-gradient(135deg, #7c3aed, #ec4899)",
          color: "white",
          fontWeight: "600",
          cursor: "pointer",
          fontSize: "0.74rem",
          letterSpacing: "0.02em",
          boxShadow: "0 15px 35px rgba(236, 72, 153, 0.35)",
          transition: "transform 150ms ease, box-shadow 150ms ease",
          boxSizing: "border-box",
        },
        buttonHover: {
          transform: "translateY(-1px)",
          boxShadow: "0 18px 35px rgba(124, 58, 237, 0.45)",
        },
      }),
    }),
    MESSAGES: Object.freeze({
      palette: Object.freeze({
        info: "#cbd5f5",
        success: "#4ade80",
        error: "#f87171",
      }),
    }),
    FILE: Object.freeze({
      path: "logs/trades.json",
    }),
  });
})();
