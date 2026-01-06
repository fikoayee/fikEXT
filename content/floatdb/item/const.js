(() => {
  if (window.FIKEXT_CONST) return;

  window.FIKEXT_CONST = Object.freeze({
    ROI_THRESHOLD: 70,
    SELECTORS: {
      card: 'mat-card.item-card, .item-card',
      chip: '.seller-details .betterfloat-steamlink span:first-child',
    },
    COLORS: Object.freeze({
      cardAlertBackground: 'rgba(169, 32, 248, 0.92)',
      cardAlertBorder: '#8747fdff',
      cardAlertShadow: '0 0 25px rgba(177, 62, 253, 0.7)',
      chipBackground: '#000000',
      chipText: '#fbff21ff',
      chipBorder: '#fbff21ff',
    }),
    TYPOGRAPHY: Object.freeze({
      chipFontSize: '1.15rem',
      chipFontWeight: '500',
    }),
    STYLES: Object.freeze({
      priority: 'important',
    }),
    CLEANUP: Object.freeze({
      cardProps: Object.freeze(['background', 'border', 'box-shadow']),
      chipProps: Object.freeze([
        'background',
        'color',
        'padding',
        'border-radius',
        'font-weight',
        'font-size',
        'display',
        'align-items',
        'gap',
      ]),
    }),
  });
})();
