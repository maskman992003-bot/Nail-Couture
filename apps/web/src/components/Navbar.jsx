import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { CUSTOMER_ONLINE_BOOKING } from '@nail-couture/shared/constants/featureFlags';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import { modalBtnPrimary, modalBtnSecondary } from './AppModal';

export default function Navbar({ currentPage, onNavigate }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const getHomeHref = () => {
    if (!user) return '/';
    if (user.is_staff) return getHomePath(user.role);
    return '/portal';
  };

  const handleLogoClick = () => {
    navigate(getHomeHref());
  };

  const handleHomeClick = () => {
    setMobileMenuOpen(false);
    navigate(getHomeHref());
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/');
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);

    if (id === 'contact') {
      if (currentPage !== 'about') {
        navigate('/about');
        onNavigate('about');
        setTimeout(() => {
          const element = document.getElementById('contact');
          if (element) element.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      } else {
        const element = document.getElementById('contact');
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (currentPage === 'portal') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } else if (currentPage !== 'home') {
      onNavigate('home');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const firstName = user?.full_name ? user.full_name.split(' ')[0] : '';

  return (
    <nav className={`sticky top-0 z-50 border-b border-gold/30 ${theme === 'dark' ? 'bg-charcoal' : 'bg-cream'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="cursor-pointer flex-shrink-0" onClick={handleLogoClick}>
              <div
                className="flex items-center justify-center rounded-full p-1"
                style={{ boxShadow: '0 0 0 1px rgba(197, 160, 89, 0.2)' }}
              >
                <img src="/NC.jpg" alt="Nail Couture" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-gold/30 bg-gold/10 hover:bg-gold/20 hover:border-gold/50 transition-all duration-300 hover:scale-110 active:scale-95"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-gold font-heading text-sm">Hi, {firstName}</span>
                  {!user.is_staff && (
                    <Link to="/portal" className="px-4 py-2 bg-gold text-charcoal hover:bg-gold/90 transition-all text-sm tracking-wider font-medium">
                      My Portal
                    </Link>
                  )}
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="px-4 py-2 border border-offwhite/30 text-offwhite/60 hover:border-offwhite hover:text-offwhite transition-all text-sm tracking-wider"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <a href="/login" className="px-5 py-2 rounded-full bg-gold text-charcoal hover:bg-gold/90 transition-all text-sm tracking-wider font-medium">
                    Login
                  </a>
                  {currentPage === 'home' ? (
                    CUSTOMER_ONLINE_BOOKING ? (
                      <button
                        onClick={() => scrollToSection('book')}
                        className="px-6 py-2 rounded-full border border-gold text-gold hover:bg-gold hover:text-charcoal transition-all text-sm tracking-wider"
                      >
                        BOOK
                      </button>
                    ) : (
                      <button
                        onClick={() => scrollToSection('contact')}
                        className="px-6 py-2 rounded-full border border-gold text-gold hover:bg-gold hover:text-charcoal transition-all text-sm tracking-wider"
                      >
                        CONTACT US
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => { navigate('/'); setMobileMenuOpen(false); onNavigate('home'); }}
                      className="px-6 py-2 rounded-full border border-gold text-gold hover:bg-gold hover:text-charcoal transition-all text-sm tracking-wider"
                    >
                      HOME
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 md:hidden">
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-gold/30 bg-gold/10 hover:bg-gold/20 hover:border-gold/50 transition-all duration-300 hover:scale-110 active:scale-95"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            
            <button className={`p-2 ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gold/10 mt-4 pt-4">
            {user && currentPage === 'portal' && (
              <div className="mb-4 pb-4 border-b border-gold/10">
                <span className="text-gold font-heading text-lg">Hi, {firstName}</span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {currentPage === 'portal' ? (
                <>
                  <button onClick={handleHomeClick} className={`py-3 hover:text-gold text-left px-2 text-sm tracking-wider ${theme === 'dark' ? 'text-offwhite/80' : 'text-charcoal/80'}`}>HOME</button>
                  <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`py-3 hover:text-gold text-left px-2 text-sm tracking-wider ${theme === 'dark' ? 'text-offwhite/80' : 'text-charcoal/80'}`}>LOOKBOOK</Link>
                </>
              ) : (
                user && user.is_staff ? (
                  <button onClick={() => { setMobileMenuOpen(false); navigate(getHomeHref()); }} className={`py-3 hover:text-gold text-left px-2 text-sm tracking-wider ${theme === 'dark' ? 'text-offwhite/80' : 'text-charcoal/80'}`}>STAFF HOME</button>
                ) : (
                  <>
                    <button onClick={() => scrollToSection('gallery')} className={`py-3 hover:text-gold text-left px-2 text-sm tracking-wider ${theme === 'dark' ? 'text-offwhite/80' : 'text-charcoal/80'}`}>LOOKBOOK</button>
                    <button onClick={() => { setMobileMenuOpen(false); onNavigate('about'); }} className={`py-3 hover:text-gold text-left px-2 text-sm tracking-wider ${theme === 'dark' ? 'text-offwhite/80' : 'text-charcoal/80'}`}>ABOUT</button>
                    {currentPage === 'home' ? (
                      CUSTOMER_ONLINE_BOOKING ? (
                        <button onClick={() => scrollToSection('book')} className="py-3 rounded-full bg-gold text-charcoal text-center px-4 text-sm tracking-wider font-medium border border-transparent hover:bg-gold/90 mt-2">BOOK APPOINTMENT</button>
                      ) : (
                        <button onClick={() => scrollToSection('contact')} className="py-3 rounded-full border border-gold text-gold text-center px-4 text-sm tracking-wider hover:bg-gold hover:text-charcoal mt-2">CONTACT US</button>
                      )
                    ) : (
                      <button onClick={() => { setMobileMenuOpen(false); navigate('/'); onNavigate('home'); }} className="py-3 rounded-full border border-gold text-gold text-center px-4 text-sm tracking-wider hover:bg-gold hover:text-charcoal mt-2">HOME</button>
                    )}
                  </>
                )
              )}

              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gold/10">
                {user ? (
                  <>
                    {!user.is_staff && currentPage !== 'portal' && (
                      <Link to="/portal" onClick={() => setMobileMenuOpen(false)} className="py-3 text-charcoal bg-gold text-center px-2 text-sm tracking-wider font-medium">MY PORTAL</Link>
                    )}
                    <button onClick={() => setShowLogoutConfirm(true)} className="py-3 text-red-400 hover:text-red-300 text-left px-2 text-sm tracking-wider">LOGOUT</button>
                  </>
                ) : (
                  <a href="/login" className="py-3 text-charcoal bg-gold text-center px-2 text-sm tracking-wider font-medium">LOGIN</a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-sm flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] bg-[#141414] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl" style={{ borderColor: 'rgba(197,160,89,0.3)' }}>
            <div className="p-4 sm:p-6 border-b border-gold/10 flex-1 overflow-y-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 013-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-offwhite mb-2">Log Out?</h3>
                <p className="text-offwhite/50 text-sm">Are you sure you want to log out of your account?</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className={modalBtnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLogoutConfirm(false); logout(); navigate('/login'); }}
                  className={modalBtnPrimary}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}