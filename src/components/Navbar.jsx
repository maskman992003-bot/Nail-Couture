import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar({ currentPage, onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname === '/checkout';

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
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

  const handleLogoClick = () => {
    if (currentPage === 'portal') navigate('/');
    else onNavigate('home');
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/');
  };

  const handleHomeClick = () => {
    setMobileMenuOpen(false);
    navigate('/');
  };

  const firstName = user?.full_name ? user.full_name.split(' ')[0] : '';

  return (
    <nav className="sticky top-0 z-50 bg-charcoal border-b border-gold/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="cursor-pointer flex-shrink-0" onClick={handleLogoClick}>
              <img src="/NC.jpg" alt="Nail Couture" className="h-16 sm:h-20 md:h-24 w-auto" />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-gold font-heading text-sm">Hi, {firstName}</span>

                  {user.is_staff && !isAdminPage && (
                    <Link to="/admin" className="px-4 py-2 border border-gold/50 text-gold/80 hover:bg-gold hover:text-charcoal transition-all text-sm tracking-wider">
                      Dashboard
                    </Link>
                  )}
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
                  <a href="/login" className="px-4 py-2 bg-gold text-charcoal hover:bg-gold/90 transition-all text-sm tracking-wider font-medium">
                    Login
                  </a>
                  {!user?.is_staff && (
                    <button
                      onClick={() => scrollToSection('book')}
                      className="px-6 py-2 border border-gold text-gold hover:bg-gold hover:text-charcoal transition-all text-sm tracking-wider"
                    >
                      BOOK
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <button className="md:hidden p-2 text-offwhite" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
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
                  <button onClick={handleHomeClick} className="py-3 text-offwhite/80 hover:text-gold text-left px-2 text-sm tracking-wider">HOME</button>
                  <Link to="/" onClick={() => setMobileMenuOpen(false)} className="py-3 text-offwhite/80 hover:text-gold text-left px-2 text-sm tracking-wider">SERVICES</Link>
                  <Link to="/" onClick={() => setMobileMenuOpen(false)} className="py-3 text-offwhite/80 hover:text-gold text-left px-2 text-sm tracking-wider">LOOKBOOK</Link>
                </>
              ) : user && user.is_staff ? (
                <button onClick={() => { setMobileMenuOpen(false); navigate('/admin'); }} className="py-3 text-offwhite/80 hover:text-gold text-left px-2 text-sm tracking-wider">ADMIN DASHBOARD</button>
              ) : (
                <>
                  <button onClick={() => scrollToSection('services')} className="py-3 text-offwhite/80 hover:text-gold text-left px-2 text-sm tracking-wider">SERVICES</button>
                  <button onClick={() => scrollToSection('gallery')} className="py-3 text-offwhite/80 hover:text-gold text-left px-2 text-sm tracking-wider">LOOKBOOK</button>
                  <button onClick={() => { setMobileMenuOpen(false); onNavigate('about'); }} className="py-3 text-offwhite/80 hover:text-gold text-left px-2 text-sm tracking-wider">ABOUT</button>
                  <button onClick={() => scrollToSection('book')} className="py-3 text-offwhite/80 hover:text-gold text-left px-2 text-sm tracking-wider border-t border-gold/10 mt-2 pt-2">BOOK APPOINTMENT</button>
                </>
              )}

              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gold/10">
                {user ? (
                  <>
                    {!user.is_staff && currentPage !== 'portal' && (
                      <Link to="/portal" onClick={() => setMobileMenuOpen(false)} className="py-3 text-charcoal bg-gold text-center px-2 text-sm tracking-wider font-medium">MY PORTAL</Link>
                    )}
                    {user.is_staff && isAdminPage && (
                      <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="py-3 text-offwhite/80 hover:text-gold text-left px-2 text-sm tracking-wider">BACK TO ADMIN</Link>
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
        <div className="fixed inset-0 flex items-center justify-center z-[200]" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-sm rounded-2xl p-8 border mx-4" style={{ backgroundColor: '#141414', borderColor: 'rgba(197,160,89,0.3)' }}>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-offwhite mb-2">Log Out?</h3>
              <p className="text-offwhite/50 text-sm">Are you sure you want to log out of your account?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 bg-offwhite/10 text-offwhite rounded-xl hover:bg-offwhite/20 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); logout(); navigate('/login'); }}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm font-medium"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}