import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../../../../contexts/ThemeContext';

export default function VaultUnboxingModal({ open, onClose, redemptionCode, rewardLabel }) {
  const { theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1a1a1a' : '#fff';

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
            <h2 className="font-heading text-xl text-gold mb-2">Unboxing</h2>
            {rewardLabel ? (
              <p className={theme === 'dark' ? 'text-offwhite/60 text-sm mb-6' : 'text-charcoal/60 text-sm mb-6'}>
                {rewardLabel}
              </p>
            ) : null}

            <div className="relative mx-auto mb-6 flex items-center justify-center" style={{ height: 180 }}>
              <motion.div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-10 rounded-lg bg-gold/40 border border-gold/50"
                initial={{ y: 0 }}
                animate={{ y: -72 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4 }}
              >
                <QRCodeSVG value={redemptionCode} size={160} fgColor="#C5A059" bgColor="transparent" />
              </motion.div>
            </div>

            <p className="text-xs tracking-widest text-gold/80 mb-6">{redemptionCode}</p>
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
