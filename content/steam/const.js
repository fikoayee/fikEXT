(() => {
  if (window.FIKEXT_STEAM_CONST) return;

  const CHIP_ID = "fikext-float-chip";

  const theme = Object.freeze({
    container: Object.freeze({
      position: "fixed",
      bottom: "24px",
      right: "24px",
      padding: "0.45rem 0.75rem",
      borderRadius: "10px",
      fontSize: "0.78rem",
      fontWeight: "600",
      background: "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.94))",
      border: "1px solid rgba(148, 163, 184, 0.35)",
      color: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      gap: "0.35rem",
      boxShadow: "0 25px 60px rgba(15, 23, 42, 0.45)",
      fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
      zIndex: 2147483647,
      backdropFilter: "blur(12px)",
      minWidth: "180px",
      boxSizing: "border-box",
      pointerEvents: "auto",
    }),
    title: Object.freeze({
      fontSize: "0.72rem",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "#cbd5f5",
    }),
    value: Object.freeze({
      fontSize: "1rem",
      color: "#f9fafb",
    }),
    meta: Object.freeze({
      fontSize: "0.74rem",
      color: "#94a3b8",
    }),
    qty: Object.freeze({
      color: "#cbd5f5",
      fontSize: "0.82rem",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    }),
    button: Object.freeze({
      marginTop: "0.25rem",
      padding: "0.4rem 0.75rem",
      borderRadius: "999px",
      fontSize: "0.72rem",
      fontWeight: "600",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      border: "1px solid rgba(255,255,255,0.2)",
      background: "linear-gradient(120deg, #ec4899, #a855f7)",
      color: "#fff",
      cursor: "pointer",
      transition: "transform 160ms ease, opacity 160ms ease",
    }),
    clearButton: Object.freeze({
      padding: "0.35rem 0.65rem",
      borderRadius: "999px",
      fontSize: "0.7rem",
      fontWeight: "600",
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      border: "1px solid rgba(248,250,252,0.25)",
      background: "transparent",
      color: "#f8fafc",
      cursor: "pointer",
      transition: "transform 160ms ease, opacity 160ms ease",
    }),
    actions: Object.freeze({
      display: "flex",
      flexWrap: "wrap",
      gap: "0.4rem",
      marginTop: "0.25rem",
    }),
    buttonDisabled: Object.freeze({
      opacity: "0.4",
      cursor: "not-allowed",
      background: "linear-gradient(120deg, #475569, #334155)",
    }),
  });

  window.FIKEXT_STEAM_CONST = Object.freeze({
    CHIP: Object.freeze({
      id: CHIP_ID,
      labels: Object.freeze({
        title: "Avg Price",
        qty: "QTY:",
        summary: "Summary",
        clear: "Clear Data",
        clearConfirm: "Clear all stored sale entries?",
        notFound: "NOT FOUND",
      }),
      messages: Object.freeze({
        noMatch: "No cached trade found for this float.",
      }),
      theme,
    }),
  });
})();
