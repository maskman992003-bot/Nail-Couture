import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useState, useEffect, useCallback } from 'react';

const navItemsByRole = {
  super_admin: [
    { id: 'home', label: 'Home', href: '/superadmin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'lobby', label: 'Lobby', href: '/superadmin/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'staff', label: 'Staff', href: '/superadmin/staff', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'bookings', label: 'Bookings', href: '/superadmin/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'reports', label: 'Reports', href: '/superadmin/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'stock', label: 'Stock', href: '/superadmin/stock', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'settings', label: 'Settings', href: '/superadmin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ],
  owner: [
    { id: 'home', label: 'Home', href: '/superadmin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'lobby', label: 'Lobby', href: '/superadmin/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'staff', label: 'Staff', href: '/superadmin/staff', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'bookings', label: 'Bookings', href: '/superadmin/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'reports', label: 'Reports', href: '/superadmin/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'stock', label: 'Stock', href: '/superadmin/stock', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'settings', label: 'Settings', href: '/superadmin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ],
  partner: [
    { id: 'home', label: 'Home', href: '/superadmin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'lobby', label: 'Lobby', href: '/superadmin/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'staff', label: 'Staff', href: '/superadmin/staff', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'bookings', label: 'Bookings', href: '/superadmin/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'reports', label: 'Reports', href: '/superadmin/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'stock', label: 'Stock', href: '/superadmin/stock', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'settings', label: 'Settings', href: '/superadmin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ],
  admin: [
    { id: 'home', label: 'Home', href: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'lobby', label: 'Lobby', href: '/admin/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'staff', label: 'Staff', href: '/admin/staff', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'bookings', label: 'Bookings', href: '/admin/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'reports', label: 'Reports', href: '/admin/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'stock', label: 'Stock', href: '/admin/stock', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  ],
  cashier: [
    { id: 'home', label: 'Home', href: '/cashier', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'checkout', label: 'Checkout', href: '/cashier/checkout', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { id: 'reports', label: 'Reports', href: '/cashier/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ],
  technician: [
    { id: 'home', label: 'Home', href: '/technician', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'schedule', label: 'My Schedule', href: '/technician/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'profile', label: 'Profile', href: '/technician/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ],
  customer: [
    { id: 'home', label: 'Home', href: '/portal', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'book', label: 'Book', href: '/customer/book', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'loyalty', label: 'Rewards', href: '/customer/loyalty', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'history', label: 'History', href: '/customer/history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'profile', label: 'Profile', href: '/customer/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
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
  return pathname === href || pathname === href + '/';
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, message, is_read, created_at')
        .eq('target_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
    try {
      await supabase.from('notifications').update({ is_read: true }).in('id', ids);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  const markOneRead = async (id) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  if (!user) return null;

  const sessionRole = user.role || 'customer';
  const navItems = navItemsByRole[sessionRole] || navItemsByRole.customer;
  const displayName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';
  const initials = (user?.full_name || user?.email || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarBg = '#0a0a0a';
  const borderColor = 'rgba(197, 160, 89, 0.1)';

  return (
    <div>
      <div
        className="w-20 h-screen flex-shrink-0 hidden lg:flex flex-col z-50"
        style={{ backgroundColor: sidebarBg, borderRight: `1px solid ${borderColor}` }}
      >
        <div className="py-4 px-4 border-b flex-shrink-0 flex justify-center" style={{ borderColor }}>
          <img src="/NC.jpg" alt="Nail Couture" className="h-10 w-10 rounded-full" />
        </div>

        <div className="flex-1 py-4 overflow-hidden">
          <nav className="flex flex-col gap-1 px-3 overflow-y-auto scrollbar-none">
            {navItems.map((item) => {
              const active = isActive(location.pathname, location.search, item.href);
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={`relative flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-all ${
                    active
                      ? 'text-gold bg-gold/10'
                      : 'text-offwhite/40 hover:text-offwhite/80 hover:bg-offwhite/5'
                  }`}
                >
                  <div className="w-6 h-6">{renderIcon(item.icon)}</div>
                  <span className="text-[10px] font-medium tracking-wide text-center leading-tight">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setNotifPanelOpen(true)}
              className="relative flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-all text-offwhite/40 hover:text-offwhite/80 hover:bg-offwhite/5"
            >
              <div className="w-6 h-6 relative">
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[8px] font-bold text-charcoal"
                    style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)', boxShadow: '0 0 6px rgba(197,160,89,0.6)' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-wide text-center leading-tight">Notifications</span>
            </button>
          </nav>
        </div>

        <div className="p-3 border-t flex-shrink-0" style={{ borderColor }}>
          <Link to="/portal" className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
              <span className="text-gold text-xs font-heading">{initials || '?'}</span>
            </div>
            <div className="text-center w-full">
              <div className="text-offwhite/80 text-[10px] font-medium truncate w-full">{displayName}</div>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-offwhite/40 hover:text-red-400 text-[9px] mt-1 py-1 px-2 rounded transition-colors hover:bg-red-400/10"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 shadow-2xl" style={{ backgroundColor: sidebarBg }}>
        <nav className="flex items-center justify-around px-1 py-2" style={{ borderTop: `1px solid ${borderColor}` }}>
          {navItems.map((item) => {
            const active = isActive(location.pathname, location.search, item.href);
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all flex-1 max-w-[75px] ${
                  active ? 'text-gold' : 'text-offwhite/40'
                }`}
              >
                <div className="w-5 h-5">{renderIcon(item.icon)}</div>
                <span className="text-[8px] font-medium tracking-wide text-center">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setNotifPanelOpen(true)}
            className="relative flex flex-col items-center gap-0.5 px-2 py-1.5 flex-1 max-w-[60px] text-offwhite/40 hover:text-gold"
          >
            <div className="w-5 h-5 relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[12px] h-[12px] flex items-center justify-center rounded-full text-[7px] font-bold text-charcoal"
                  style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[8px] font-medium">Notifications</span>
          </button>
          <Link
            to="/portal"
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 flex-1 max-w-[60px] text-offwhite/40 hover:text-gold"
          >
            <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center">
              <span className="text-[10px] text-gold font-heading">{initials || '?'}</span>
            </div>
            <span className="text-[8px] font-medium truncate max-w-[50px]">{displayName}</span>
          </Link>
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

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {notifPanelOpen ? (
        <div className="fixed inset-0 z-[200]" onClick={() => setNotifPanelOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto shadow-2xl"
            style={{ backgroundColor: '#111', borderLeft: '1px solid rgba(197,160,89,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(197,160,89,0.15)', backgroundColor: '#111' }}>
              <div>
                <h2 className="font-heading text-2xl text-gold">Notifications</h2>
                {unreadCount > 0 && <p className="text-offwhite/40 text-xs mt-1">{unreadCount} unread</p>}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="px-3 py-1.5 text-xs text-gold border border-gold/40 rounded-xl hover:bg-gold/10 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setNotifPanelOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-offwhite/40 hover:text-offwhite hover:bg-white/5 transition-colors text-xl"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-10 h-10 mx-auto text-offwhite/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <p className="text-offwhite/40 text-sm">No notifications yet</p>
                </div>
              ) : notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => { if (!notif.is_read) markOneRead(notif.id); }}
                  className="rounded-xl p-4 border transition-all cursor-pointer"
                  style={{
                    backgroundColor: notif.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(197,160,89,0.06)',
                    borderColor: notif.is_read ? 'rgba(255,255,255,0.06)' : 'rgba(197,160,89,0.3)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-gold" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-offwhite font-heading text-sm mb-1">{notif.title}</div>
                      <div className="text-offwhite/60 text-xs mb-2">{notif.message}</div>
                      <div className="text-offwhite/30 text-[10px]">
                        {new Date(notif.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at{' '}
                        {new Date(notif.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}