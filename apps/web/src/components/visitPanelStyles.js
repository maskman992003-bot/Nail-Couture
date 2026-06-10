export function getVisitPanelStyles(tone = 'admin', theme = 'dark') {
  const isCheckout = tone === 'checkout';
  const isDark = theme === 'dark';

  if (isCheckout) {
    return {
      mutedClass: 'text-offwhite/60',
      textClass: 'text-offwhite',
      accentClass: 'text-gold',
      cardClass: 'bg-offwhite/5 border-offwhite/10',
      badgeClass: 'bg-offwhite/10 border-offwhite/20 text-offwhite/70',
      lineClass: 'bg-offwhite/15',
      labelClass: 'text-offwhite/50',
      sectionBorder: 'border-offwhite/10',
    };
  }

  if (isDark) {
    return {
      mutedClass: 'text-offwhite/50',
      textClass: 'text-offwhite',
      accentClass: 'text-gold',
      cardClass: 'bg-gold/5 border-gold/20',
      badgeClass: 'bg-gold/10 border-gold/30 text-offwhite/80',
      lineClass: 'bg-gold/20',
      labelClass: 'text-gold/80',
      sectionBorder: 'border-gold/10',
    };
  }

  return {
    mutedClass: 'text-secondary',
    textClass: 'text-primary',
    accentClass: 'text-gold-strong',
    cardClass: 'bg-primary/30 border-light/60',
    badgeClass: 'bg-secondary border-light text-secondary',
    lineClass: 'bg-light',
    labelClass: 'text-secondary',
    sectionBorder: 'border-light',
  };
}
