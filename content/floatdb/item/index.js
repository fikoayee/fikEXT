(() => {
  const config = window.FIKEXT_CONST;
  if (!config) return;

  const CARD_MARK = 'data-fikext-card-processed';
  const PRIORITY = config.STYLES.priority || 'important';

  function parsePercentage(textContent) {
    if (!textContent) return null;
    const normalized = textContent.replace(/[^0-9.,-]/g, '').replace(',', '.');
    const value = parseFloat(normalized);
    return Number.isFinite(value) ? value : null;
  }

  function highlightCard(card, chip, percent) {
    card.setAttribute(CARD_MARK, String(percent));
    card.style.setProperty('background', config.COLORS.cardAlertBackground, PRIORITY);
    card.style.setProperty('border', `2px solid ${config.COLORS.cardAlertBorder}`, PRIORITY);
    card.style.setProperty('boxShadow', config.COLORS.cardAlertShadow, PRIORITY);
    chip.style.setProperty('background', config.COLORS.chipBackground, PRIORITY);
    chip.style.setProperty('color', config.COLORS.chipText, PRIORITY);
    chip.style.setProperty('padding', '2px 8px', PRIORITY);
    chip.style.setProperty('border-radius', '10px', PRIORITY);
    chip.style.setProperty('border', `2px solid ${config.COLORS.chipBorder}`, PRIORITY);
    chip.style.setProperty('font-weight', config.TYPOGRAPHY.chipFontWeight, PRIORITY);
    chip.style.setProperty('font-size', config.TYPOGRAPHY.chipFontSize, PRIORITY);
    chip.style.setProperty('display', 'inline-flex', PRIORITY);
    chip.style.setProperty('align-items', 'center', PRIORITY);
    chip.style.setProperty('gap', '4px', PRIORITY);
  }

  function resetCard(card, chip) {
    card.removeAttribute(CARD_MARK);
    config.CLEANUP.cardProps.forEach((prop) => card.style.removeProperty(prop));
    config.CLEANUP.chipProps.forEach((prop) => chip.style.removeProperty(prop));
  }

  function processCard(card) {
    const chip = card.querySelector(config.SELECTORS.chip);
    if (!chip) return;

    const percent = parsePercentage(chip.textContent);
    if (percent === null) return;

    if (percent <= config.ROI_THRESHOLD) {
      highlightCard(card, chip, percent);
    } else if (card.hasAttribute(CARD_MARK)) {
      resetCard(card, chip);
    }
  }

  function scanCards() {
    document.querySelectorAll(config.SELECTORS.card).forEach(processCard);
  }

  const observer = new MutationObserver(() => scanCards());
  observer.observe(document.body, { childList: true, subtree: true });

  const intervalId = window.setInterval(scanCards, 1500);

  window.addEventListener(
    'beforeunload',
    () => {
      observer.disconnect();
      window.clearInterval(intervalId);
    },
    { once: true },
  );

  scanCards();
})();
