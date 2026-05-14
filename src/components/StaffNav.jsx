import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  {
    id: 'home',
    label: 'Home',
    href: '/admin',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'lobby',
    label: 'Lobby',
    href: '/admin/lobby',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'staff',
    label: 'Staff',
    href: '/admin/staff',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'services',
    label: 'Services',
    href: '/admin/services',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/admin/reports',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/admin/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function isActive(pathname, href) {
  if (href === '/admin') {
    return pathname === '/admin';
  }
  return pathname.startsWith(href);
}

export default function StaffNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user?.is_staff) {
    return null;
  }

  const displayName = user?.full_name || user?.email || 'Staff';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <div className="hidden lg:flex fixed left-0 top-0 h-screen w-20 flex-col border-r border-gold/10 z-50" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="flex-1 py-6">
          <nav className="flex flex-col gap-1 px-3">
            {navItems.map((item) => {
              const active = isActive(location.pathname, item.href);
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={`relative flex flex-col items-center gap-1 px-3 py-3 rounded-xl transition-all ${
                    active
                      ? 'text-gold bg-gold/10'
                      : 'text-offwhite/40 hover:text-offwhite/80 hover:bg-offwhite/5'
                  }`}
                >
                  <div className="w-6 h-6">{item.icon}</div>
                  <span className="text-[10px] font-medium tracking-wide">{item.label.toUpperCase()}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-3 border-t border-gold/10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
              <span className="text-gold text-xs font-heading">{initials || '?'}</span>
            </div>
            <div className="text-center">
              <div className="text-offwhite/80 text-[10px] font-medium truncate w-full">{displayName}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50" style={{ backgroundColor: '#0a0a0a' }}>
        <nav className="flex items-center justify-around px-2 py-2 border-t border-gold/10">
          {navItems.map((item) => {
            const active = isActive(location.pathname, item.href);
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all flex-1 max-w-[70px] ${
                  active
                    ? 'text-gold'
                    : 'text-offwhite/40 hover:text-offwhite/80'
                }`}
              >
                <div className="w-5 h-5">{item.icon}</div>
                <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}