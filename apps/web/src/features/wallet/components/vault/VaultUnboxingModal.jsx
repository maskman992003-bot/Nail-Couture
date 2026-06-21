import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../../../../contexts/ThemeContext';

export default function VaultUnboxingModal({ open, onClose, redemptionCode, rewardLabel, reviewMode = false }) {
  const { theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1a1a1a' : '#fff';
  const mutedClass = theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60';
  const title = reviewMode ? 'Your reward code' : 'Unboxing';

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/75"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="rounded-2xl p-8 max-w-sm w-full text-center border"
            style={{ backgroundColor: cardBg, borderColor: 'rgba(197,160,89,0.35)' }}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mx-auto mb-6 w-full max-w-[280px]" style={{ minHeight: 220 }}>
              <motion.div
                className="absolute left-1/2 z-10 w-max max-w-full -translate-x-1/2 rounded-xl border border-gold/50 bg-gold/20 px-6 py-4 text-center shadow-md"
                initial={reviewMode ? false : { y: 72 }}
                animate={{ y: 0 }}
                transition={{ duration: reviewMode ? 0 : 0.5, ease: 'easeOut' }}
              >
                <h2 className="font-heading text-xl text-gold mb-1 whitespace-nowrap">{title}</h2>
                {rewardLabel ? (
                  <p className={`${mutedClass} text-sm`}>{rewardLabel}</p>
                ) : null}
              </motion.div>

              <div className="flex items-center justify-center pt-28 pb-2">
                <motion.div
                  initial={reviewMode ? false : { opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: reviewMode ? 0 : 0.35, duration: reviewMode ? 0 : 0.4 }}
                >
                  <QRCodeSVG value={redemptionCode} size={160} fgColor="#C5A059" bgColor="transparent" />
                </motion.div>
              </div>
            </div>

            <p className="text-xs tracking-widest text-gold/80 mb-2">{redemptionCode}</p>
            {reviewMode ? (
              <p className={`text-xs mb-6 ${mutedClass}`}>Show this code or QR at checkout.</p>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
