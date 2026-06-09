import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getNavItemsForRole } from '@nail-couture/shared/navigation/navItems.js';
import { featureFlags } from '@nail-couture/shared/constants/featureFlags.js';
import { getNotificationWebPath } from '@nail-couture/shared/constants/notificationRoutes.js';
import { useNotifications } from '@nail-couture/shared/hooks/useNotifications.js';
import NotificationBell from '@nail-couture/shared/components/NotificationBell.jsx';
import NotificationPanel from '@nail-couture/shared/components/NotificationPanel.jsx';
import { getSettingsPath } from '@nail-couture/shared/utils/routes';
import { fetchPendingAssignmentCount } from '@nail-couture/shared/utils/technicianQueue';
import { modalBtnPrimary, modalBtnSecondary } from './AppModal';

function renderIcon(iconPath) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
    </svg>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDesktopUserMenu, setShowDesktopUserMenu] = useState(false);
  const [showMobileUserMenu, setShowMobileUserMenu] = useState(false);
  const [pendingAssignments, setPendingAssignments] = useState(0);
  const [checkoutQueueCount, setCheckoutQueueCount] = useState(0);

  const userPhone = user?.phone;
  const isTechnician = user?.role === 'technician';
  const isCashier = user?.role === 'cashier';
  const navRef = useRef(null);
  const bottomNavRef = useRef(null);
  const SCROLL_KEY = `sidebar_scroll_${user?.role || 'guest'}`;
  const BOTTOM_SCROLL_KEY = `bottom_nav_scroll_${user?.role || 'guest'}`;

  // Fixes Mobile Jitter: Memoize nav items to keep the DOM stable during route changes
  const navItems = useMemo(() => {
    if (!user) return [];
    return getNavItemsForRole(user.role);
  }, [user?.role]);

  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved && navRef.current) {
      navRef.current.scrollTop = parseInt(saved, 10);
    }
  }, [SCROLL_KEY]);

  const handleNavScroll = useCallback(() => {
    if (navRef.current) {
      sessionStorage.setItem(SCROLL_KEY, navRef.current.scrollTop);
    }
  }, [SCROLL_KEY]);

  const handleBottomNavScroll = useCallback((e) => {
    if (e.currentTarget) {
      sessionStorage.setItem(BOTTOM_SCROLL_KEY, e.currentTarget.scrollLeft.toString());
    }
  }, [BOTTOM_SCROLL_KEY]);

  const {
    notifications,
    unreadCount,
    bellRing,
    markAllRead,
    markOneRead,
    deleteOne,
    deleteAll,
  } = useNotifications({
    userPhone,
    userId: user?.id,
    enabled: Boolean(userPhone),
    localAlerts: featureFlags.global.notifications,
  });

  const refreshPendingAssignments = useCallback(async () => {
    if (!isTechnician || !user?.id || !userPhone) return;
    const count = await fetchPendingAssignmentCount(user.id, userPhone);
    setPendingAssignments(count);
  }, [isTechnician, user?.id, userPhone]);

  const refreshCheckoutQueue = useCallback(async () => {
    if (!isCashier || !userPhone) return;
    try {
      const { data, error } = await supabase.rpc('get_appointments', {
        caller_phone: userPhone,
        status_filter: 'ready_for_checkout',
      });
      if (!error) setCheckoutQueueCount((data || []).length);
    } catch { /* ignore */ }
  }, [isCashier, userPhone]);

  useEffect(() => {
    if (!isTechnician || !user?.id || !userPhone) {
      setPendingAssignments(0);
      return;
    }

    refreshPendingAssignments();

    const channel = supabase
      .channel('sidebar-technician-assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        refreshPendingAssignments();
      })
      .subscribe();

    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshPendingAssignments();
      }
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [isTechnician, user?.id, userPhone, refreshPendingAssignments]);

  useEffect(() => {
    if (!isCashier || !userPhone) {
      setCheckoutQueueCount(0);
      return;
    }

    refreshCheckoutQueue();

    const channel = supabase
      .channel('sidebar-cashier-checkout')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        refreshCheckoutQueue();
      })
      .subscribe();

    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshCheckoutQueue();
      }
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [isCashier, userPhone, refreshCheckoutQueue]);

  useEffect(() => {
    if (!showDesktopUserMenu) return;
    const closeMenu = (e) => {
      if (!e.target.closest('.desktop-user-menu')) setShowDesktopUserMenu(false);
    };
    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, [showDesktopUserMenu]);

  useEffect(() => {
    if (!showMobileUserMenu) return;
    const closeMenu = (e) => {
      if (!e.target.closest('.mobile-user-menu')) setShowMobileUserMenu(false);
    };
    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, [showMobileUserMenu]);

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) markOneRead(notif.id);
    const path = getNotificationWebPath(notif.type, user?.role);
    if (path) {
      setNotifPanelOpen(false);
      navigate(path);
    }
  };

  const settingsPath = getSettingsPath(user?.role);
  const displayName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';
  const initials = (user?.full_name || user?.email || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarBg = theme === 'dark' ? '#0a0a0a' : '#fdf8f0';
  const borderColor = theme === 'dark' ? 'rgba(197, 160, 89, 0.1)' : 'rgba(197, 160, 89, 0.2)';

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
          <nav ref={navRef} onScroll={handleNavScroll} className="flex flex-col gap-1 px-0 lg:px-4 overflow-y-auto scrollbar-none h-full">
            {navItems.map((item) => {
              const showAssignmentBadge = isTechnician && item.id === 'home' && pendingAssignments > 0;
              const showCheckoutBadge = isCashier && item.id === 'checkout' && checkoutQueueCount > 0;
              const badgeCount = showCheckoutBadge ? checkoutQueueCount : pendingAssignments;
              const showBadge = showAssignmentBadge || showCheckoutBadge;
              return (
                <NavLink
                  key={item.id}
                  to={item.href}
                  className={({ isActive }) => `relative flex items-center gap-3 px-0 lg:px-3 py-3 transition-all md:justify-center lg:justify-start ${
                    isActive
                      ? 'text-gold bg-gold/10 md:mx-1 lg:mx-0 rounded-xl lg:rounded-xl'
                      : `${theme === 'dark' ? 'text-offwhite/50 hover:text-offwhite/90 hover:bg-offwhite/5' : 'text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5'} md:mx-1 lg:mx-0 rounded-xl lg:rounded-xl`
                  }`}
                >
                  <div className="relative w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {renderIcon(item.icon)}
                    {showBadge && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[8px] font-bold text-charcoal px-1" style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)' }}>
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium tracking-wide hidden lg:inline whitespace-nowrap">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Menu */}
        <div className="p-4 border-t flex-shrink-0 flex justify-center lg:justify-start gap-2" style={{ borderColor }}>
          <NotificationBell
            unreadCount={unreadCount}
            ring={bellRing}
            theme={theme}
            onClick={() => setNotifPanelOpen(true)}
            className="hover:bg-gold/10"
          />
          <div className="relative desktop-user-menu w-full md:flex md:justify-center lg:block flex-1 min-w-0">
            <button
              onClick={() => { setShowDesktopUserMenu((v) => !v); }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity w-full md:justify-center lg:justify-start cursor-pointer"
            >
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-gold text-xs lg:text-sm font-heading">{initials || '?'}</span>
              </div>
              <div className="text-left min-w-0 hidden lg:block">
                <div className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-offwhite/80' : 'text-charcoal/80'}`}>{displayName}</div>
              </div>
            </button>

            {showDesktopUserMenu && (
              <div
                className={`absolute bottom-16 left-4 md:left-full md:right-auto lg:left-4 md:ml-2 z-[9999] w-48 rounded-xl border shadow-2xl origin-bottom-left transition-all ${theme === 'dark' ? 'bg-[#121214] border-zinc-800/80' : 'bg-white border-gold/20'}`}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { navigate(settingsPath); setShowDesktopUserMenu(false); }}
                  className={`w-full px-4 py-3 text-left hover:text-gold hover:bg-gold/10 transition-colors text-sm flex items-center gap-2 border-b ${theme === 'dark' ? 'text-offwhite/90' : 'text-charcoal'}`}
                  style={{ borderColor: 'rgba(197,160,89,0.15)' }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    toggleTheme(); 
                    setShowDesktopUserMenu(false); 
                  }}
                  className={`w-full px-4 py-3 text-left hover:text-gold hover:bg-gold/10 transition-colors text-xs flex items-center gap-2 border-b ${theme === 'dark' ? 'text-offwhite/90' : 'text-charcoal'}`}
                  style={{ borderColor: 'rgba(197,160,89,0.15)' }}
                >
                  {theme === 'dark' ? (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  onClick={() => { setNotifPanelOpen(true); setShowDesktopUserMenu(false); }}
                  className={`w-full px-4 py-3 text-left hover:text-gold hover:bg-gold/10 transition-colors text-sm flex items-center gap-2 border-b ${theme === 'dark' ? 'text-offwhite/90' : 'text-charcoal'}`}
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
                  onClick={() => { setShowLogoutConfirm(true); setShowDesktopUserMenu(false); }}
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
        <nav className="flex items-center justify-between px-1 py-2 w-full" style={{ borderTop: `1px solid ${borderColor}` }}>
          <div ref={(el) => { if (el) { bottomNavRef.current = el; const saved = sessionStorage.getItem(BOTTOM_SCROLL_KEY); if (saved && !el.dataset.bsr) { el.dataset.bsr = '1'; el.style.scrollBehavior = 'auto'; el.scrollLeft = parseInt(saved, 10); } } }} onScroll={handleBottomNavScroll} className="flex-1 min-w-0 flex items-center overflow-x-auto scrollbar-none">
            {navItems.map((item) => {
              const showAssignmentBadge = isTechnician && item.id === 'home' && pendingAssignments > 0;
              const showCheckoutBadge = isCashier && item.id === 'checkout' && checkoutQueueCount > 0;
              const badgeCount = showCheckoutBadge ? checkoutQueueCount : pendingAssignments;
              const showBadge = showAssignmentBadge || showCheckoutBadge;
              return (
                <NavLink
                  key={item.id}
                  to={item.href}
                  className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all flex-shrink-0 w-[72px] ${isActive ? 'text-gold' : theme === 'dark' ? 'text-offwhite/55' : 'text-charcoal/75'}`}
                >
                  <div className="relative w-5 h-5">
                    {renderIcon(item.icon)}
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full text-[7px] font-bold text-charcoal px-0.5" style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)' }}>
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] font-medium tracking-wide text-center">{item.label}</span>
                </NavLink>
              );
            })}
            {/* Structural Layout Guard: Ensures scroll engine never shrinks container size */}
            <div className="w-4 h-full flex-shrink-0" aria-hidden="true" />
          </div>
          
          <div className="relative flex items-center gap-1 w-[72px] mobile-user-menu flex-shrink-0 border-l border-gold/10 pl-1">
            <NotificationBell
              unreadCount={unreadCount}
              ring={bellRing}
              theme={theme}
              size="sm"
              onClick={() => setNotifPanelOpen(true)}
            />
            <button
              onClick={(e) => { 
                e.stopPropagation();
                setShowMobileUserMenu((v) => !v); 
              }}
              className={`flex flex-col items-center gap-0.5 px-1 py-1.5 transition-colors rounded-lg w-full ${theme === 'dark' ? 'text-offwhite/55 hover:text-gold hover:bg-offwhite/5' : 'text-charcoal/75 hover:text-gold hover:bg-charcoal/5'}`}
            >
              <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-[10px] text-gold font-heading">{initials || '?'}</span>
              </div>
              <span className={`text-[8px] font-medium truncate max-w-[50px] ${theme === 'dark' ? 'text-offwhite/55' : 'text-charcoal/75'}`}>{displayName}</span>
            </button>

            {showMobileUserMenu && (
              <div
                className={`absolute bottom-[60px] right-2 w-44 rounded-xl border overflow-hidden shadow-2xl z-[9999] ${theme === 'dark' ? 'bg-[#141414]' : 'bg-white'}`}
                style={{ borderColor: theme === 'dark' ? 'rgba(197,160,89,0.4)' : 'rgba(197,160,89,0.3)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { navigate(settingsPath); setShowMobileUserMenu(false); }}
                  className={`w-full px-4 py-3 text-left hover:text-gold hover:bg-gold/10 transition-colors text-xs flex items-center gap-2 border-b ${theme === 'dark' ? 'text-offwhite/90' : 'text-charcoal'}`}
                  style={{ borderColor: 'rgba(197,160,89,0.15)' }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    toggleTheme(); 
                    setShowMobileUserMenu(false); 
                  }}
                  className={`w-full px-4 py-3 text-left hover:text-gold hover:bg-gold/10 transition-colors text-xs flex items-center gap-2 border-b ${theme === 'dark' ? 'text-offwhite/80' : 'text-charcoal/80'}`}
                  style={{ borderColor: 'rgba(197,160,89,0.15)' }}
                >
                  {theme === 'dark' ? (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  onClick={() => { setNotifPanelOpen(true); setShowMobileUserMenu(false); }}
                  className={`w-full px-4 py-3 text-left hover:text-gold hover:bg-gold/10 transition-colors text-xs flex items-center gap-2 border-b ${theme === 'dark' ? 'text-offwhite/90' : 'text-charcoal'}`}
                  style={{ borderColor: 'rgba(197,160,89,0.15)' }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Notifications
                </button>
                <button
                  onClick={() => { setShowLogoutConfirm(true); setShowMobileUserMenu(false); }}
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
        <NotificationPanel
          open={notifPanelOpen}
          onClose={() => setNotifPanelOpen(false)}
          notifications={notifications}
          unreadCount={unreadCount}
          theme={theme}
          onMarkAllRead={markAllRead}
          onMarkOneRead={markOneRead}
          onDeleteOne={deleteOne}
          onDeleteAll={deleteAll}
          onNotificationPress={handleNotificationClick}
        />
      ) : null}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-sm flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border shadow-2xl ${theme === 'dark' ? 'bg-[#141414] border-gold/20' : 'bg-white border-gold/30'}`} style={{ borderColor: theme === 'dark' ? 'rgba(197,160,89,0.3)' : 'rgba(197,160,89,0.4)' }}>
            <div className="text-center mb-6 p-6">
              <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className={`font-heading text-xl mb-2 ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>Log Out?</h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'}`}>Are you sure you want to log out of your account?</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className={modalBtnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setShowLogoutConfirm(false); handleLogout(); }}
                className={modalBtnPrimary}
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
