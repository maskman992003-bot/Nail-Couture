import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import { CUSTOMER_ONLINE_BOOKING } from '../constants/featureFlags';

const navItemsByRole = {
  super_admin: [
    { id: 'home', label: 'Home', href: '/superadmin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'schedule', label: 'Schedule', href: '/superadmin/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'lobby', label: 'Lobby', href: '/superadmin/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'bookings', label: 'Bookings', href: '/superadmin/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'staff', label: 'Staff', href: '/superadmin/staff', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'stock', label: 'Stock', href: '/superadmin/stock', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'services', label: 'Services', href: '/superadmin/services', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: 'reports', label: 'Reports', href: '/superadmin/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ],
  owner: [
    { id: 'home', label: 'Home', href: '/superadmin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'lobby', label: 'Lobby', href: '/superadmin/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'bookings', label: 'Bookings', href: '/superadmin/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'staff', label: 'Staff', href: '/superadmin/staff', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'stock', label: 'Stock', href: '/superadmin/stock', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'services', label: 'Services', href: '/superadmin/services', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: 'reports', label: 'Reports', href: '/superadmin/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ],
  partner: [
    { id: 'home', label: 'Home', href: '/superadmin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'lobby', label: 'Lobby', href: '/superadmin/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'bookings', label: 'Bookings', href: '/superadmin/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'staff', label: 'Staff', href: '/superadmin/staff', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'stock', label: 'Stock', href: '/superadmin/stock', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'services', label: 'Services', href: '/superadmin/services', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: 'reports', label: 'Reports', href: '/superadmin/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ],
  admin: [
    { id: 'home', label: 'Home', href: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'lobby', label: 'Lobby', href: '/admin/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'schedule', label: 'Schedule', href: '/admin/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'bookings', label: 'Bookings', href: '/admin/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'services', label: 'Services', href: '/admin/services', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  ],
  cashier: [
    { id: 'home', label: 'Home', href: '/cashier', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'lobby', label: 'Lobby', href: '/cashier/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'schedule', label: 'Schedule', href: '/technician/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'checkout', label: 'Checkout', href: '/cashier/checkout', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  ],
  technician: [
    { id: 'home', label: 'Home', href: '/technician', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'schedule', label: 'My Schedule', href: '/technician/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ],
  customer: [
    { id: 'home', label: 'Home', href: '/portal', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'book', label: 'Book', href: '/customer/book', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'loyalty', label: 'Rewards', href: '/customer/loyalty', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'history', label: 'History', href: '/customer/history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ],
};

function renderIcon(iconPath) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userPhone = user?.phone;

  const fetchNotifications = useCallback(async () => {
    if (!userPhone) return;
    try {
      const { data, error } = await supabase.rpc('get_my_notifications', { p_phone: userPhone });
      if (error) return;
      setNotifications(data || []);
    } catch { }
  }, [userPhone]);

  useEffect(() => {
    if (!userPhone) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [userPhone, fetchNotifications]);

  useEffect(() => {
    if (!showUserMenu) return;
    const closeMenu = (e) => {
      if (!e.target.closest('.user-menu')) setShowUserMenu(false);
    };
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [showUserMenu]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (unreadCount === 0 || !user?.phone) return;
    try {
      await supabase.rpc('mark_my_notifications_read', { p_phone: user.phone });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch { }
  };

  const markOneRead = async (id) => {
    if (!user?.phone) return;
    try {
      await supabase.rpc('mark_notification_read', { p_phone: user.phone, p_notif_id: id });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch { }
  };

   if (!user) return null;

   const sessionRole = user.role || 'customer';
   let navItems = navItemsByRole[sessionRole] || navItemsByRole.customer;
   
   // Filter out booking item when online booking is disabled, 
   // but allow ONLY super_admin to always see it for testing/system management
   // EXCEPTION: Even if viewing superadmin route, if actual user role is owner, hide bookings tab
   const isActualOwner = user.role === 'owner';
   const shouldHideBooking = !CUSTOMER_ONLINE_BOOKING && sessionRole !== 'super_admin' && !isActualOwner;
   
   // DEBUG: Log the decision making process
   console.log('Sidebar DEBUG: user.role=', user.role, 'sessionRoute-based role=', sessionRole, 
               'isActualOwner=', isActualOwner, 'CUSTOMER_ONLINE_BOOKING=', CUSTOMER_ONLINE_BOOKING);
   console.log('Sidebar DEBUG: Should hide booking?', shouldHideBooking);
   
   if (shouldHideBooking) {
     navItems = navItems.filter(item => item.id !== 'book');
     console.log('Sidebar DEBUG: Filtering out book item. Remaining items:', navItems.map(i => i.id));
   } else {
     console.log('Sidebar DEBUG: NOT filtering out book items');
   }
  const displayName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';
  const initials = (user?.full_name || user?.email || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarBg = '#0a0a0a';
  const borderColor = 'rgba(197, 160, 89, 0.1)';

  return (
    <>
      {/* Unified Sidebar - hidden on mobile, w-20 on tablet, w-64 on desktop */}
      <aside
        className="fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 hidden md:flex md:w-20 lg:w-64"
        style={{ backgroundColor: sidebarBg, borderRight: `1px solid ${borderColor}` }}
      >
        {/* Logo */}
        <div className="py-4 px-4 lg:px-6 border-b flex-shrink-0 flex justify-center lg:justify-start" style={{ borderColor }}>
          <img src="/NC.jpg" alt="Nail Couture" className="h-8 w-8 lg:h-10 lg:w-10 rounded-full" />
        </div>

        {/* Nav Items */}
        <div className="flex-1 py-4 overflow-hidden">
          <nav className="flex flex-col gap-1 px-0 lg:px-4 overflow-y-auto scrollbar-none">
            {navItems.map((item) => {
              const active = isActive(location.pathname, location.search, item.href);
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={`relative flex items-center gap-3 px-0 lg:px-3 py-3 transition-all md:justify-center lg:justify-start ${
                    active
                      ? 'text-gold bg-gold/10 md:mx-1 lg:mx-0 rounded-xl lg:rounded-xl'
                      : 'text-offwhite/40 hover:text-offwhite/80 hover:bg-offwhite/5 md:mx-1 lg:mx-0 rounded-xl lg:rounded-xl'
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {renderIcon(item.icon)}
                  </div>
                  <span className="text-sm font-medium tracking-wide hidden lg:inline whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Menu */}
        <div className="p-4 border-t flex-shrink-0 flex justify-center lg:justify-start" style={{ borderColor }}>
          <div className="relative user-menu w-full md:flex md:justify-center lg:block">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity w-full md:justify-center lg:justify-start"
            >
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-gold text-xs lg:text-sm font-heading">{initials || '?'}</span>
              </div>
              <div className="text-left min-w-0 hidden lg:block">
                <div className="text-offwhite/80 text-sm font-medium truncate">{displayName}</div>
              </div>
            </button>

            {showUserMenu && (
              <div
                className="absolute bottom-16 left-4 md:left-full md:right-auto lg:left-4 md:ml-2 z-50 w-48 rounded-xl bg-[#121214] border border-zinc-800/80 shadow-2xl origin-bottom-left transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { navigate(user?.is_staff ? '/superadmin/settings' : '/customer/profile'); setShowUserMenu(false); }}
                  className="w-full px-4 py-3 text-left text-offwhite/80 hover:text-gold hover:bg-gold/10 transition-colors text-sm flex items-center gap-2 border-b"
                  style={{ borderColor: 'rgba(197,160,89,0.15)' }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button
                  onClick={() => { setNotifPanelOpen(true); setShowUserMenu(false); }}
                  className="w-full px-4 py-3 text-left text-offwhite/80 hover:text-gold hover:bg-gold/10 transition-colors text-sm flex items-center gap-2 border-b"
                  style={{ borderColor: 'rgba(197,160,89,0.15)' }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-auto min-w-[16px] h-4 flex items-center justify-center rounded-full text-[8px] font-bold text-charcoal" style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setShowLogoutConfirm(true); setShowUserMenu(false); }}
                  className="w-full px-4 py-3 text-left text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 shadow-2xl" style={{ backgroundColor: sidebarBg }}>
        <nav className="flex items-center justify-around px-1 py-2" style={{ borderTop: `1px solid ${borderColor}` }}>
          {navItems.map((item) => {
            const active = isActive(location.pathname, location.search, item.href);
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all flex-1 max-w-[72px] ${active ? 'text-gold' : 'text-offwhite/40'}`}
              >
                <div className="w-5 h-5">{renderIcon(item.icon)}</div>
                <span className="text-[8px] font-medium tracking-wide text-center">{item.label}</span>
              </Link>
            );
          })}
          <div className="relative flex flex-col items-center flex-1 max-w-[60px] user-menu">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 text-offwhite/40 hover:text-gold hover:bg-offwhite/5 transition-colors rounded-lg mx-1 w-full"
            >
              <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-[10px] text-gold font-heading">{initials || '?'}</span>
              </div>
              <span className="text-[8px] font-medium truncate max-w-[50px]">{displayName}</span>
            </button>

            {showUserMenu && (
              <div
                className="absolute bottom-full right-0 mb-2 w-44 rounded-xl border overflow-hidden shadow-2xl z-50"
                style={{ backgroundColor: '#141414', borderColor: 'rgba(197,160,89,0.4)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { navigate(user?.is_staff ? '/superadmin/settings' : '/customer/profile'); setShowUserMenu(false); }}
                  className="w-full px-4 py-3 text-left text-offwhite/80 hover:text-gold hover:bg-gold/10 transition-colors text-xs flex items-center gap-2 border-b"
                  style={{ borderColor: 'rgba(197,160,89,0.15)' }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button
                  onClick={() => { setNotifPanelOpen(true); setShowUserMenu(false); }}
                  className="w-full px-4 py-3 text-left text-offwhite/80 hover:text-gold hover:bg-gold/10 transition-colors text-xs flex items-center gap-2 border-b"
                  style={{ borderColor: 'rgba(197,160,89,0.15)' }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-auto min-w-[16px] h-4 flex items-center justify-center rounded-full text-[8px] font-bold text-charcoal" style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setShowLogoutConfirm(true); setShowUserMenu(false); }}
                  className="w-full px-4 py-3 text-left text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs flex items-center gap-2"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
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

      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-[200]" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-sm rounded-2xl p-8 border" style={{ backgroundColor: '#141414', borderColor: 'rgba(197,160,89,0.3)' }}>
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
                onClick={() => { setShowLogoutConfirm(false); handleLogout(); }}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm font-medium"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}