import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar({ currentPage, onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const scrollToSection = (id) => {
    if (currentPage !== 'home') {
      onNavigate('home');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const firstName = user?.full_name ? user.full_name.split(' ')[0] : '';

  return (
    <nav className="sticky top-0 z-50 bg-charcoal border-b border-gold/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div 
            className="cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            <img 
              src="/NC.jpg" 
              alt="Nail Couture" 
              className="h-20 sm:h-24 w-auto"
            />
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => scrollToSection('services')}
                className="text-offwhite/80 hover:text-gold transition-colors text-sm tracking-wider"
              >
                SERVICES
              </button>
              <button 
                onClick={() => scrollToSection('gallery')}
                className="text-offwhite/80 hover:text-gold transition-colors text-sm tracking-wider"
              >
                LOOKBOOK
              </button>
              <button 
                onClick={() => onNavigate('about')}
                className="text-offwhite/80 hover:text-gold transition-colors text-sm tracking-wider"
              >
                ABOUT
              </button>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              {user ? (
                <>
                  <span className="text-gold font-heading text-sm hidden sm:block">
                    Hi, {firstName}
                  </span>
                  <Link 
                    to="/portal"
                    className="px-3 sm:px-4 py-2 bg-gold text-charcoal hover:bg-gold/90 transition-all text-xs sm:text-sm tracking-wider font-medium"
                  >
                    My Portal
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="px-3 sm:px-4 py-2 border border-offwhite/30 text-offwhite/60 hover:border-offwhite hover:text-offwhite transition-all text-xs sm:text-sm tracking-wider"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <a 
                    href="/login"
                    className="px-3 sm:px-4 py-2 bg-gold text-charcoal hover:bg-gold/90 transition-all text-xs sm:text-sm tracking-wider font-medium"
                  >
                    Login
                  </a>
                  <button 
                    onClick={() => scrollToSection('book')}
                    className="px-3 sm:px-6 py-2 border border-gold text-gold hover:bg-gold hover:text-charcoal transition-all text-xs sm:text-sm tracking-wider"
                  >
                    BOOK
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="md:hidden flex border-t border-gold/10 mt-4 -mb-4">
          {user ? (
            <>
              <Link 
                to="/portal"
                className="flex-1 py-3 text-charcoal bg-gold text-xs tracking-wider text-center font-medium hover:bg-gold/90"
              >
                MY PORTAL
              </Link>
              <button 
                onClick={handleLogout}
                className="flex-1 py-3 text-offwhite/60 text-xs tracking-wider text-center hover:text-offwhite border-r border-gold/10"
              >
                LOGOUT
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => scrollToSection('gallery')}
                className="flex-1 py-3 text-offwhite/60 hover:text-gold text-xs tracking-wider border-r border-gold/10"
              >
                LOOKBOOK
              </button>
              <button 
                onClick={() => onNavigate('about')}
                className="flex-1 py-3 text-offwhite/60 hover:text-gold text-xs tracking-wider border-r border-gold/10"
              >
                ABOUT
              </button>
              <a 
                href="/login"
                className="flex-1 py-3 text-offwhite/60 hover:text-gold text-xs tracking-wider text-center bg-gold/20"
              >
                LOGIN
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}