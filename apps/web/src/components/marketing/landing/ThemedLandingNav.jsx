import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { scrollToLandingHash } from '../../../themes/themeUtils.js';
import ThemeToggleButton from '../../ThemeToggleButton.jsx';
import ThemedLogo from './ThemedLogo.jsx';

export default function ThemedLandingNav({ themeConfig, onVipClick }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navLinks = themeConfig.landing?.navLinks ?? [];
  const isBoutique = themeConfig.landing?.layout === 'boutique';
  const authHref = user ? getHomePath(user.role) : '/login';
  const authLabel = user ? (user.is_staff ? 'Dashboard' : 'My Account') : 'Login';

  const handleNav = (href) => {
    setOpen(false);
    if (href.startsWith('#')) {
      scrollToLandingHash(href);
    }
  };

  const vipAction = (e) => {
    e?.preventDefault();
    if (onVipClick) onVipClick();
    else scrollToLandingHash('#contact');
  };

  return (
    <header
      id="top"
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        borderColor: themeConfig.borderColor,
        backgroundColor: `${themeConfig.backgroundColor}f2`,
      }}
    >
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${isBoutique ? 'max-w-7xl' : 'max-w-[1200px]'}`}>
        <div className={`hidden lg:flex items-center gap-4 py-3 ${isBoutique ? 'justify-between' : 'lg:grid lg:grid-cols-[200px_1fr_220px]'}`}>
          <Link to="/" className="shrink-0" onClick={() => scrollToLandingHash('#home')}>
            <ThemedLogo themeConfig={themeConfig} className={isBoutique ? '' : 'items-start'} />
          </Link>

          <nav className={`flex items-center ${isBoutique ? 'gap-7' : 'justify-center gap-6 xl:gap-8'}`}>
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="landing-nav-link"
                onClick={(e) => { e.preventDefault(); handleNav(link.href); }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0 justify-self-end">
            <ThemeToggleButton size="sm" />
            {isBoutique && (
              <Link to={authHref} className="landing-btn-outline landing-btn-nav shrink-0">
                {authLabel}
              </Link>
            )}
            <button type="button" onClick={vipAction} className="landing-btn-primary shrink-0">
              Join Our VIP Founding List
            </button>
          </div>
        </div>

        <div className="flex lg:hidden items-center justify-between py-3 gap-3">
          <Link to="/" onClick={() => scrollToLandingHash('#home')}>
            <ThemedLogo themeConfig={themeConfig} withText={false} />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggleButton size="sm" />
            <button
            type="button"
            className="landing-btn-primary !px-3 !py-2 text-[9px]"
            onClick={vipAction}
          >
            VIP List
          </button>
          <button
            type="button"
            aria-label="Toggle menu"
            className="p-2 landing-nav-link"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="block w-5 h-0.5 mb-1" style={{ backgroundColor: themeConfig.textPrimary }} />
            <span className="block w-5 h-0.5 mb-1" style={{ backgroundColor: themeConfig.textPrimary }} />
            <span className="block w-5 h-0.5" style={{ backgroundColor: themeConfig.textPrimary }} />
          </button>
          </div>
        </div>

        {open && (
          <nav className="lg:hidden pb-4 flex flex-col gap-3 border-t pt-3" style={{ borderColor: themeConfig.borderLight }}>
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="landing-nav-link py-1"
                onClick={(e) => { e.preventDefault(); handleNav(link.href); }}
              >
                {link.label}
              </a>
            ))}
            {isBoutique && (
              <Link
                to={authHref}
                className="landing-btn-outline landing-btn-nav text-center mt-1"
                onClick={() => setOpen(false)}
              >
                {authLabel}
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
