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
      pointerEvents: "none",
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
  });

  window.FIKEXT_STEAM_CONST = Object.freeze({
    CHIP: Object.freeze({
      id: CHIP_ID,
      labels: Object.freeze({
        title: "Avg Price",
        qty: "QTY:",
      }),
      theme,
    }),
  });
})();
