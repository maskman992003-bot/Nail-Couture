import { useId, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import {
  LOYALTY_PROGRAM_TERMS_FOOTER,
  LOYALTY_PROGRAM_TERMS_SECTIONS,
  LOYALTY_PROGRAM_TERMS_SUMMARY_LABEL,
  LOYALTY_PROGRAM_TERMS_TITLE,
} from '@nail-couture/shared/constants/loyaltyProgramTerms.js';
import { useTheme } from '../../../contexts/ThemeContext';

const VARIANT_STYLES = {
  wallet: {
    card: 'p-6',
    stack: 'space-y-4',
    summaryLabel: 'text-xs uppercase tracking-widest',
    docTitle: 'text-sm font-heading text-gold mb-4',
    sectionTitle: 'text-sm font-medium text-gold',
    body: 'text-sm leading-relaxed',
  },
  compact: {
    card: 'p-4',
    stack: 'space-y-2.5',
    summaryLabel: 'text-[10px] uppercase tracking-widest',
    docTitle: 'text-xs font-heading text-gold mb-3',
    sectionTitle: 'text-xs font-medium text-gold',
    body: 'text-xs leading-snug',
  },
};

function renderBody(body, bodyClass, mutedClass, mutedStyle) {
  return body.split('\n\n').map((paragraph) => (
    <p key={paragraph.slice(0, 24)} className={`${bodyClass} ${mutedClass}`} style={mutedStyle}>
      {paragraph}
    </p>
  ));
}

export default function LoyaltyTermsSummary({
  defaultOpen = false,
  variant = 'wallet',
  showDocTitle = true,
  summaryLabel = LOYALTY_PROGRAM_TERMS_SUMMARY_LABEL,
  surface = 'app',
}) {
  const { themeConfig, isDark } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.wallet;

  const useThemedLanding = surface === 'landing';
  const useDarkCard = surface === 'wallet' || (surface === 'app' && isDark);
  const mutedClass = useThemedLanding ? '' : (useDarkCard ? 'text-offwhite/55' : 'text-charcoal/55');
  const mutedStyle = useThemedLanding ? { color: themeConfig.textMuted } : undefined;
  const borderStyle = useThemedLanding
    ? undefined
    : {
        borderColor: 'rgba(197,160,89,0.25)',
        backgroundColor: useDarkCard ? '#111' : '#fff',
      };

  return (
    <div
      className={`rounded-2xl border ${styles.card}${useThemedLanding ? ' landing-card' : ''}`}
      style={borderStyle}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className={`${styles.summaryLabel} ${mutedClass}`} style={mutedStyle}>{summaryLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gold transition-transform duration-300 ease-in-out ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            key="loyalty-terms-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={`pt-4 ${styles.stack}`}>
              {showDocTitle ? (
                <h3 className={styles.docTitle}>{LOYALTY_PROGRAM_TERMS_TITLE}</h3>
              ) : null}
              {LOYALTY_PROGRAM_TERMS_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h4 className={`${styles.sectionTitle} mb-1`}>{section.title}</h4>
                  <div className="space-y-2">
                    {renderBody(section.body, styles.body, mutedClass, mutedStyle)}
                  </div>
                </div>
              ))}
              <p
                className={`${styles.body} ${mutedClass} pt-2 border-t${useThemedLanding ? '' : ' border-gold/15'}`}
                style={{
                  ...mutedStyle,
                  ...(useThemedLanding ? { borderColor: themeConfig.borderLight } : undefined),
                }}
              >
                {LOYALTY_PROGRAM_TERMS_FOOTER}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
