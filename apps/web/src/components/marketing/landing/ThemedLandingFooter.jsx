import { useState } from 'react';
import { Mail, MapPin, Phone, Sparkles } from 'lucide-react';
import { joinVipFoundingList } from '@nail-couture/shared/utils/vipFoundingListService.js';
import { getSupabaseErrorMessage } from '@nail-couture/shared/utils/supabaseErrors.js';
import { useAppTheme } from '../../../hooks/useAppTheme.js';
import { LANDING_CONTACT, LANDING_SOCIAL_LINKS } from '../../../themes/landingContent.js';
import { SocialIcon } from '../../SocialIcons.jsx';
import LocationMapModal from '../../LocationMapModal.jsx';
import ThemedLogo from './ThemedLogo.jsx';

export default function ThemedLandingFooter() {
  const { themeConfig } = useAppTheme();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const isBoutique = themeConfig.landing?.layout === 'boutique';
  const contact = LANDING_CONTACT;

  const handleVipSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError('');

    const { data, error: submitError, available } = await joinVipFoundingList(trimmed);

    setSubmitting(false);

    if (!available) {
      setError('Signups are not available yet. Please try again later.');
      return;
    }
    if (submitError) {
      setError(getSupabaseErrorMessage(submitError, 'Unable to join the list. Please try again.'));
      return;
    }
    if (!data?.success) {
      setError('Unable to join the list. Please try again.');
      return;
    }

    setSubmitted(true);
    setEmail('');
  };

  return (
    <footer id="contact">
      <div
        className="border-y landing-section !py-8 lg:!py-10"
        style={{
          borderColor: themeConfig.borderColor,
          backgroundColor: isBoutique ? 'var(--landing-accent-soft)' : themeConfig.backgroundColor,
        }}
      >
        <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${isBoutique ? 'max-w-7xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6' : 'max-w-[1000px] flex flex-col lg:flex-row items-center gap-6 lg:gap-10'}`}>
          <div className={`flex items-center gap-3 shrink-0 ${isBoutique ? 'items-start' : 'text-center lg:text-left'}`}>
            {isBoutique ? (
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${themeConfig.accentColor}26` }}
              >
                <Mail className="h-5 w-5" style={{ color: themeConfig.accentColor }} strokeWidth={1.5} />
              </span>
            ) : (
              <Sparkles className="h-5 w-5 shrink-0" style={{ color: themeConfig.accentColor }} strokeWidth={1.5} />
            )}
            <div>
              <h3 className={`landing-heading ${isBoutique ? 'text-xl uppercase tracking-[0.1em]' : 'text-[11px] sm:text-xs uppercase tracking-[0.16em] font-semibold'}`}>
                Be the First to Experience Nail Couture
              </h3>
              {isBoutique && (
                <p className="mt-1 text-xs leading-relaxed" style={{ color: themeConfig.textSecondary }}>
                  Join our VIP Founding List for exclusive offers, early access, and grand opening options.
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleVipSubmit} className={`flex flex-col w-full gap-2 ${isBoutique ? 'max-w-md lg:w-auto' : 'max-w-xl lg:max-w-none lg:flex-1'}`}>
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                  if (submitted) setSubmitted(false);
                }}
                placeholder="Enter your email"
                aria-label="Email address"
                aria-invalid={error ? 'true' : 'false'}
                disabled={submitting}
                className="landing-input"
              />
              <button type="submit" className="landing-btn-primary w-full sm:w-auto shrink-0 h-11" disabled={submitting}>
                {submitting ? 'Joining…' : submitted ? 'Thank You!' : (
                  <>
                    <span className="sm:hidden">Join VIP List</span>
                    <span className="hidden sm:inline">Join Our VIP Founding List</span>
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="w-full text-xs text-red-500" role="alert">{error}</p>
            )}
          </form>
        </div>
      </div>

      <div className={`mx-auto grid grid-cols-1 gap-8 sm:gap-10 px-4 sm:px-6 py-10 lg:py-12 ${isBoutique ? 'max-w-7xl md:grid-cols-4' : 'max-w-[1200px] md:grid-cols-2 lg:grid-cols-4'}`}>
        <div>
          <ThemedLogo className="items-start" />
          <p className="landing-heading mt-3 text-sm italic" style={{ color: themeConfig.accentColor }}>
            Beauty &middot; Care &middot; Affection
          </p>
        </div>

        <div className="space-y-3 text-xs" style={{ color: themeConfig.textSecondary }}>
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: themeConfig.accentColor }} />
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="text-left transition-opacity hover:opacity-80 underline-offset-2 hover:underline cursor-pointer"
              aria-label="View location on map"
            >
              {contact.address[0]}
              <br />
              {contact.address[1]}
            </button>
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0" style={{ color: themeConfig.accentColor }} />
            <a
              href={`tel:${contact.phoneTel}`}
              className="transition-opacity hover:opacity-80 underline-offset-2 hover:underline"
            >
              {contact.phone}
            </a>
          </p>
        </div>

        <div className="flex flex-col justify-start gap-2">
          <span className="landing-heading text-sm font-extrabold uppercase tracking-[0.16em]">{contact.openingLabel}</span>
          <div className="space-y-1 text-xs" style={{ color: themeConfig.textSecondary }}>
            {contact.hours.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-left">Follow Us</p>
          <div className="mt-3 flex gap-3">
            {LANDING_SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-85"
                style={{ backgroundColor: themeConfig.accentColor, color: '#fff' }}
              >
                <SocialIcon label={link.label} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: themeConfig.borderColor }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8" style={{ color: themeConfig.textMuted }}>
          <p>&copy; {new Date().getFullYear()} Nail Couture. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" style={{ color: 'inherit' }}>Privacy Policy</a>
            <a href="#" style={{ color: 'inherit' }}>Terms of Service</a>
          </div>
        </div>
      </div>

      <LocationMapModal open={mapOpen} onClose={() => setMapOpen(false)} />
    </footer>
  );
}
