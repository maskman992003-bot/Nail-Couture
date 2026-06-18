import { featureFlags } from '../../constants/featureFlags';
import { useAppTheme } from '../../hooks/useAppTheme.js';
import Services from '../Services';
import BookingWizard from '../BookingWizard';
import Lookbook from '../Lookbook';
import WellnessToolsPromo from './WellnessToolsPromo';
import CustomerTestimonials from './CustomerTestimonials';

export default function ClassicHomePage({ onScrollToBooking, onScrollToLookbook }) {
  const { theme, isDark } = useAppTheme();
  const bookingEnabled = featureFlags.customer.onlineBooking || featureFlags.customer.onlineCalendarBooking;
  const bookingCtaLabel = bookingEnabled ? 'BOOK NOW' : 'SALON INFO';
  const dark = isDark || theme === 'dark';

  const scrollToBooking = onScrollToBooking ?? (() => {
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' });
  });

  const scrollToLookbook = onScrollToLookbook ?? (() => {
    document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' });
  });

  return (
    <>
      <section className={`min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center relative z-10 px-4 sm:px-6 ${dark ? 'bg-charcoal' : 'bg-cream'}`}>
        <div className={`absolute inset-0 bg-gradient-to-b ${dark ? 'from-charcoal via-charcoal/95 to-charcoal' : 'from-cream via-cream/95 to-cream'}`} />
        <div className="text-center z-10 max-w-4xl mx-auto">
          <div className={`inline-flex items-center justify-center gap-2 mb-8 rounded-full border border-gold/20 px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-gold font-semibold ${dark ? 'bg-white/5' : 'bg-gold/5'}`}>
            <span className="h-2.5 w-2.5 rounded-full bg-gold shadow-lg shadow-gold/30" />
            FLAWLESS MEDICAL-GRADE STERILIZATION
          </div>
          <h1 className={`font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-5 sm:mb-7 tracking-wide ${dark ? 'text-offwhite' : 'text-charcoal'}`}>
            Luxury Press-On Nails
            <span className="block text-gold mt-3">Custom Nail Art, Expertly Tailored.</span>
          </h1>
          <p className={`text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${dark ? 'text-offwhite/70' : 'text-charcoal/70'}`}>
            Discover custom nail art and luxury press-on nails crafted with Russian manicure precision.
            Medical-grade sterilization, non-toxic products, and artisans trained in the finest traditions of nail couture.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={scrollToLookbook}
              className={`group flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] transition duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] animate-fade-in ${dark ? 'border-white/10 bg-white/5 text-offwhite hover:border-gold hover:bg-gold/10 hover:text-gold' : 'border-charcoal/20 bg-charcoal/5 text-charcoal hover:border-gold hover:bg-gold/10 hover:text-gold'}`}
            >
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-gold transition duration-200 ease-out group-hover:-translate-y-1 ${dark ? 'border-white/10 bg-white/5 group-hover:border-gold group-hover:bg-gold/10' : 'border-charcoal/20 bg-charcoal/5 group-hover:border-gold group-hover:bg-gold/10'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                  <path d="M6 4h12v16H6z" />
                  <path d="M6 8h12" />
                  <path d="M9 12h6" />
                </svg>
              </span>
              LOOKBOOK
            </button>

            <button
              type="button"
              onClick={scrollToBooking}
              className={`group flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] transition duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] animate-fade-in ${dark ? 'border-white/10 bg-white/5 text-offwhite hover:border-gold hover:bg-gold/10 hover:text-gold' : 'border-charcoal/20 bg-charcoal/5 text-charcoal hover:border-gold hover:bg-gold/10 hover:text-gold'}`}
            >
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-gold transition duration-200 ease-out group-hover:-translate-y-1 ${dark ? 'border-white/10 bg-white/5 group-hover:border-gold group-hover:bg-gold/10' : 'border-charcoal/20 bg-charcoal/5 group-hover:border-gold group-hover:bg-gold/10'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 8v4l3 2" />
                </svg>
              </span>
              {bookingCtaLabel}
            </button>
          </div>
        </div>
      </section>
      <Lookbook />
      <WellnessToolsPromo />
      <CustomerTestimonials />
      <Services embedded />
      {bookingEnabled && <BookingWizard />}
    </>
  );
}
