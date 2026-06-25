import AppModal, { modalBtnPrimary } from '../../AppModal';
import {
  MYSTERY_GIFT_TEASER_COPY,
  formatMysteryGiftCountdown,
} from '@nail-couture/shared/utils/mysteryGift';
import {
  MysteryGiftCelebrationSparkles,
  MysteryGiftCountdownBadge,
  MysteryGiftGiftIcon,
} from './MysteryGiftCelebration';

export default function MysteryGiftDetailModal({ open, status, onClose }) {
  const daysRemaining = status?.days_remaining ?? 0;
  const countdown = formatMysteryGiftCountdown(daysRemaining);

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={MYSTERY_GIFT_TEASER_COPY.modalTitle}
      scrollBody
      zIndex="z-[200]"
      panelClassName="nc-mystery-gift-modal-panel nc-shimmer-surface border-gold/40 bg-gradient-to-br from-gold/10 via-card to-card"
      panelOverlay={<MysteryGiftCelebrationSparkles variant="modal" />}
      headerExtra={(
        <div className="flex items-center gap-2 mt-3">
          <div className="nc-mystery-gift-icon flex items-center justify-center w-8 h-8 rounded-full bg-gold/20 border border-gold/35 text-gold-strong">
            <MysteryGiftGiftIcon className="w-4 h-4" />
          </div>
          <MysteryGiftCountdownBadge countdown={countdown} />
        </div>
      )}
      footer={
        <button type="button" onClick={onClose} className={modalBtnPrimary}>
          Got it
        </button>
      }
    >
      <div className="space-y-5 relative">
        <p className="text-secondary text-sm leading-relaxed">
          {MYSTERY_GIFT_TEASER_COPY.modalIntro}
        </p>

        <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-gold">How it works</p>
          <ul className="space-y-2">
            {MYSTERY_GIFT_TEASER_COPY.modalRules.map((rule) => (
              <li key={rule} className="flex gap-2 text-sm text-secondary leading-relaxed">
                <span className="text-gold shrink-0" aria-hidden>•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppModal>
  );
}
