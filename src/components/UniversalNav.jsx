import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const allNavItems = {
  owner: [
    { id: 'home', label: 'Home', href: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'lobby', label: 'Lobby', href: '/admin/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'staff', label: 'Staff', href: '/admin/staff', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'services', label: 'Services', href: '/admin/services', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    { id: 'reports', label: 'Reports', href: '/admin/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'settings', label: 'Settings', href: '/admin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ],
  admin: [
    { id: 'home', label: 'Home', href: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'lobby', label: 'Lobby', href: '/admin/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'staff', label: 'Staff', href: '/admin/staff', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'services', label: 'Services', href: '/admin/services', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    { id: 'reports', label: 'Reports', href: '/admin/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ],
  cashier: [
    { id: 'home', label: 'Home', href: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'lobby', label: 'Lobby', href: '/admin/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'reports', label: 'Reports', href: '/admin/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ],
  technician: [
    { id: 'home', label: 'Home', href: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'lobby', label: 'Schedule', href: '/admin/lobby', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ],
  customer: [
    { id: 'home', label: 'Home', href: '/portal?tab=home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'book', label: 'Book', href: '/booking', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'appointments', label: 'Appts', href: '/portal?tab=appointments', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: 'profile', label: 'Profile', href: '/portal?tab=profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'rewards', label: 'Rewards', href: '/portal?tab=loyalty', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ],
};

function renderIcon(iconPath) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
    </svg>
  );
}

function isActive(pathname, search, href) {
  if (href === '/admin' || href === '/portal') {
    return pathname === href && !search;
  }
  if (href.includes('?')) {
    const basePath = href.split('?')[0];
    if (pathname !== basePath && pathname !== basePath + '/') return false;
    const params = new URLSearchParams(href.split('?')[1]);
    const currentParams = new URLSearchParams(search);
    for (const [key, value] of params) {
      if (currentParams.get(key) !== value) return false;
    }
    return true;
  }
  return pathname.startsWith(href);
}

export default function UniversalNav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const role = user.role || 'customer';
  const navItems = allNavItems[role] || allNavItems.customer;
  const isStaff = user.is_staff || false;

  const displayName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';
  const initials = (user?.full_name || user?.email || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => {
    logout();
    navigate(isStaff ? '/admin' : '/');
  };

  const sidebarBg = isStaff ? '#0a0a0a' : '#1a1a1a';
  const textColor = 'text-offwhite';
  const accentColor = 'text-gold';
  const hoverBg = 'hover:bg-offwhite/5';
  const activeBg = 'bg-gold/10';
  const borderColor = isStaff ? 'rgba(197, 160, 89, 0.1)' : 'rgba(255, 255, 255, 0.05)';

  return (
    <>
      <div className="hidden lg:flex w-20 flex-shrink-0 flex-col z-50 fixed left-0 top-0 h-screen" style={{ backgroundColor: sidebarBg, borderRight: `1px solid ${borderColor}` }}>
        <div className="py-4 px-4 border-b" style={{ borderColor }}>
            <img src="/NC.jpg" alt="Nail Couture" className="h-10 w-10 rounded-full mx-auto" />
          </div>

        <div className="flex-1 py-4">
          <nav className="flex flex-col gap-1 px-3">
            {navItems.map((item) => {
              const active = isActive(location.pathname, location.search, item.href);
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={`relative flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-all ${
                    active
                      ? `${accentColor} ${activeBg}`
                      : `${textColor}/40 hover:${textColor}/80 ${hoverBg}`
                  }`}
                >
                  <div className="w-6 h-6">{renderIcon(item.icon)}</div>
                  <span className="text-[10px] font-medium tracking-wide text-center leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t flex-shrink-0" style={{ borderColor }}>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
              <span className="text-gold text-xs font-heading">{initials || '?'}</span>
            </div>
            <div className="text-center w-full">
              <div className="text-offwhite/80 text-[10px] font-medium truncate w-full">{displayName}</div>
              <div className="text-offwhite/40 text-[8px] uppercase tracking-wider">{role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-offwhite/40 hover:text-red-400 text-[9px] mt-1 py-1 px-2 rounded transition-colors hover:bg-red-400/10"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50" style={{ backgroundColor: sidebarBg }}>
        <nav className="flex items-center justify-around px-1 py-2" style={{ borderTop: `1px solid ${borderColor}` }}>
          {navItems.map((item) => {
            const active = isActive(location.pathname, location.search, item.href);
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all flex-1 max-w-[75px] ${
                  active ? accentColor : `${textColor}/40`
                }`}
              >
                <div className="w-5 h-5">{renderIcon(item.icon)}</div>
                <span className="text-[8px] font-medium tracking-wide text-center">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 flex-1 max-w-[60px] text-offwhite/40 hover:text-red-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-[8px] font-medium">Logout</span>
          </button>
        </nav>
      </div>
    </>
  );
}