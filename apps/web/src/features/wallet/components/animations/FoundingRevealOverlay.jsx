import { formatFoundingBadge } from '@nail-couture/shared/constants/loyaltyProgram.js';
import WaxSealBadge from '../WaxSealBadge';

export default function FoundingRevealOverlay({ open, foundingType, foundingSpot, onDismiss }) {
  if (!open) return null;

  const badge = formatFoundingBadge(foundingType, foundingSpot);

  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-8 bg-black/85 text-center">
      <p className="text-offwhite/50 text-xs uppercase tracking-[0.25em] mb-6">Founding Member</p>
      <WaxSealBadge foundingType={foundingType} foundingSpot={foundingSpot} size={120} />
      <h2 className="font-heading text-3xl text-gold mt-6">{badge}</h2>
      <p className="text-offwhite/70 max-w-sm mt-3 leading-relaxed">
        Your numbered wax seal is now permanently stamped on your profile.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-8 px-8 py-3 rounded-xl border border-gold text-gold bg-gold/15 hover:bg-gold/25 transition-colors font-medium"
      >
        Enter The Wallet
      </button>
    </div>
  );
}
