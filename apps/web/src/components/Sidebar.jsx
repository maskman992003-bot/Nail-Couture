import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../hooks/useAppTheme.js';
import BrandLogo from './BrandLogo.jsx';
import WaxSealBadge from '../features/wallet/components/WaxSealBadge';
import { supabase } from '../lib/supabase';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getNavItemsForRole } from '@nail-couture/shared/navigation/navItems.js';
import { featureFlags } from '@nail-couture/shared/constants/featureFlags.js';
import { getNotificationWebPath } from '@nail-couture/shared/constants/notificationRoutes.js';
import { useNotifications } from '@nail-couture/shared/hooks/useNotifications.js';
import NotificationBell from '@nail-couture/shared/components/NotificationBell.jsx';
import NotificationPanel from '@nail-couture/shared/components/NotificationPanel.jsx';
import { getSettingsPath } from '@nail-couture/shared/utils/routes';
import { fetchPendingAssignmentCount } from '@nail-couture/shared/utils/technicianQueue';
import { modalBtnPrimary, modalBtnSecondary } from './AppModal';
import { OPEN_NOTIFICATIONS_EVENT } from '../utils/notificationPanel.js';

const ACTIVE_NAV_GRADIENT_FALLBACK = 'linear-gradient(135deg, rgba(197, 160, 89, 0.22), rgba(240, 215, 140, 0.12))';

function getNavLinkClasses(isActive) {
  const base =
    'flex w-full min-h-[44px] shrink-0 items-center gap-3 overflow-hidden rounded-full px-3 py-2 transition-colors duration-200 touch-manipulation lg:justify-start lg:gap-3 lg:px-4 lg:py-2.5';
  if (isActive) {
    return `${base} text-gold-strong font-medium`;
  }
  return `${base} text-secondary hover:text-primary hover:bg-primary/5`;
}

function getMobileNavLinkClasses(isActive) {
  const base =
    'flex min-h-[34px] min-w-[42px] shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-full px-2 py-1 transition-colors duration-200';
  if (isActive) {
    return `${base} text-gold-strong font-medium`;
  }
  return `${base} text-secondary hover:text-primary hover:bg-primary/5`;
}

function NavIcon({ iconPath, showBadge, badgeCount, compact = false, accentGradient }) {
  return (
    <span className={`relative flex shrink-0 items-center justify-center ${compact ? 'size-5' : 'size-8'}`}>
      {renderIcon(iconPath, compact)}
      {showBadge ? (
        <span
          className={`pointer-events-none absolute top-0 right-0 flex items-center justify-center rounded-full font-bold text-charcoal ${
            compact ? 'min-w-[12px] h-3 text-[6px] px-0.5' : 'min-w-[16px] h-4 text-[8px] px-1'
          }`}
          style={{ background: accentGradient }}
        >
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      ) : null}
    </span>
  );
}

function renderIcon(iconPath, compact = false) {
  return (
    <svg className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
    </svg>
  );
}

function getNavLinkStyle(isActive, accentGradient) {
  if (!isActive) return undefined;
  return {
    background: accentGradient || ACTIVE_NAV_GRADIENT_FALLBACK,
  };
}

function isSidebarItemActive(pathname, item) {
  if (item.id === 'home') return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function UserMenuDropdown({
  theme,
  accentGradient,
  unreadCount,
  onNavigateSettings,
  onToggleTheme,
  onOpenNotifications,
  onLogout,
  textSize = 'text-sm',
}) {
  return (
    <>
      <button
        type="button"
        onClick={onNavigateSettings}
        className={`w-full px-4 py-3 text-left hover:text-gold hover:bg-gold/10 transition-colors ${textSize} flex items-center gap-2 border-b ${theme === 'dark' ? 'text-offwhite/90' : 'text-charcoal'}`}
        style={{ borderColor: 'rgba(197,160,89,0.15)' }}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </button>
      <button
        type="button"
        onClick={onToggleTheme}
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
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
      <button
        type="button"
        onClick={onOpenNotifications}
        className={`w-full px-4 py-3 text-left hover:text-gold hover:bg-gold/10 transition-colors ${textSize} flex items-center gap-2 border-b ${theme === 'dark' ? 'text-offwhite/90' : 'text-charcoal'}`}
        style={{ borderColor: 'rgba(197,160,89,0.15)' }}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        Notifications
        {unreadCount > 0 && (
          <span className="ml-auto min-w-[16px] h-4 flex items-center justify-center rounded-full text-[8px] font-bold text-charcoal" style={{ background: accentGradient }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onLogout}
        className={`w-full px-4 py-3 text-left text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors ${textSize} flex items-center gap-2`}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Logout
      </button>
    </>
  );
}

function computeUserMenuPosition(anchorEl) {
  if (!anchorEl) return null;
  const rect = anchorEl.getBoundingClientRect();
  const menuWidth = 192;
  const menuHeight = 200;
  const gap = 10;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobileNav = window.matchMedia('(max-width: 767px)').matches;
  const isLg = window.matchMedia('(min-width: 1024px)').matches;

  let top;
  let left;

  if (isMobileNav) {
    top = rect.top - gap;
    left = rect.right - menuWidth;
    return {
      top: Math.max(gap, top - menuHeight),
      left: Math.max(gap, Math.min(left, vw - menuWidth - gap)),
    };
  }

  if (isLg) {
    top = rect.top - gap - menuHeight;
    left = rect.left;
  } else {
    top = rect.top + rect.height / 2 - menuHeight / 2;
    left = rect.right + gap;
  }

  return {
    top: Math.max(gap, Math.min(top, vh - menuHeight - gap)),
    left: Math.max(gap, Math.min(left, vw - menuWidth - gap)),
  };
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, themeConfig, toggleTheme } = useAppTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const openFromExternal = () => setNotifPanelOpen(true);
    window.addEventListener(OPEN_NOTIFICATIONS_EVENT, openFromExternal);
    return () => window.removeEventListener(OPEN_NOTIFICATIONS_EVENT, openFromExternal);
  }, []);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userMenuSource, setUserMenuSource] = useState(null);
  const [userMenuPos, setUserMenuPos] = useState(null);
  const [pendingAssignments, setPendingAssignments] = useState(0);
  const [checkoutQueueCount, setCheckoutQueueCount] = useState(0);

  const userPhone = user?.phone;
  const isTechnician = user?.role === 'technician';
  const isCashier = user?.role === 'cashier';
  const navRef = useRef(null);
  const bottomNavRef = useRef(null);
  const desktopUserMenuRef = useRef(null);
  const mobileUserMenuRef = useRef(null);
  const userMenuAnchorRef = useRef(null);
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

  const closeUserMenu = useCallback(() => {
    userMenuAnchorRef.current = null;
    setUserMenuSource(null);
    setUserMenuPos(null);
    setShowUserMenu(false);
  }, []);

  const toggleUserMenu = useCallback((source) => {
    if (showUserMenu && userMenuSource === source) {
      closeUserMenu();
      return;
    }
    const anchorEl = source === 'desktop' ? desktopUserMenuRef.current : mobileUserMenuRef.current;
    userMenuAnchorRef.current = anchorEl;
    setUserMenuSource(source);
    setUserMenuPos(computeUserMenuPosition(anchorEl));
    setShowUserMenu(true);
    requestAnimationFrame(() => {
      if (userMenuAnchorRef.current) {
        setUserMenuPos(computeUserMenuPosition(userMenuAnchorRef.current));
      }
    });
  }, [showUserMenu, userMenuSource, closeUserMenu]);

  useEffect(() => {
    closeUserMenu();
    setNotifPanelOpen(false);
    setShowLogoutConfirm(false);
  }, [location.pathname, closeUserMenu]);

  const updateUserMenuPosition = useCallback(() => {
    if (!userMenuAnchorRef.current) return;
    setUserMenuPos(computeUserMenuPosition(userMenuAnchorRef.current));
  }, []);

  useEffect(() => {
    if (!showUserMenu) return undefined;

    updateUserMenuPosition();
    window.addEventListener('resize', updateUserMenuPosition);
    return () => window.removeEventListener('resize', updateUserMenuPosition);
  }, [showUserMenu, updateUserMenuPosition]);

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) markOneRead(notif.id);
    const path = getNotificationWebPath(notif.type, user?.role);
    if (path) {
      setNotifPanelOpen(false);
      navigate(path);
    }
  };

  const openNotifPanel = (e) => {
    e.stopPropagation();
    setNotifPanelOpen(true);
  };

  const settingsPath = getSettingsPath(user?.role);
  const displayName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';
  const initials = (user?.full_name || user?.email || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarBg = themeConfig.backgroundSecondary;
  const borderColor = themeConfig.borderColor;
  const accentGradient = themeConfig.accentGradient;
  const sidebarShadow = themeConfig.layout.sidebarShadow;

  const onNavClick = (item) => {
    closeUserMenu();
    if (isSidebarItemActive(location.pathname, item)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Unified Sidebar - hidden on mobile, w-20 on tablet, w-64 on desktop */}
      <aside
        data-sidebar-nav
        className="app-sidebar-desktop fixed z-[110] hidden lg:flex lg:w-64 flex-col transition-colors duration-300 rounded-3xl overflow-hidden"
        style={{
          backgroundColor: sidebarBg,
          border: `1px solid ${borderColor}`,
          boxShadow: sidebarShadow,
        }}
      >
        {/* Logo */}
        <div
          className="py-5 px-3 lg:px-5 flex-shrink-0 flex justify-center lg:justify-start border-b"
          style={{ borderColor }}
        >
          <BrandLogo className="h-8 w-8 lg:h-10 lg:w-10" framed />
        </div>

        {/* Nav Items */}
        <div className="flex-1 min-h-0 py-3">
          <nav
            ref={navRef}
            onScroll={handleNavScroll}
            className="flex h-full flex-col gap-2 overflow-y-auto overscroll-y-contain px-2 scrollbar-none lg:px-3"
            data-no-pull-refresh-scroll
          >
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {navItems.map((item) => {
                const showAssignmentBadge = isTechnician && item.id === 'home' && pendingAssignments > 0;
                const showCheckoutBadge = isCashier && item.id === 'checkout' && checkoutQueueCount > 0;
                const badgeCount = showCheckoutBadge ? checkoutQueueCount : pendingAssignments;
                const showBadge = showAssignmentBadge || showCheckoutBadge;
                return (
                  <li key={item.id} className="shrink-0">
                    <NavLink
                      to={item.href}
                      end={item.id === 'home'}
                      className={({ isActive }) => getNavLinkClasses(isActive)}
                      style={({ isActive }) => getNavLinkStyle(isActive, accentGradient)}
                      onClick={() => onNavClick(item)}
                    >
                      <NavIcon iconPath={item.icon} showBadge={showBadge} badgeCount={badgeCount} accentGradient={accentGradient} />
                      <span className="hidden text-sm font-medium tracking-wide whitespace-nowrap lg:inline">
                        {item.label}
                      </span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* User Menu */}
        <div className="p-3 lg:p-4 border-t flex-shrink-0 flex justify-center lg:justify-start" style={{ borderColor }}>
          <div className="relative desktop-user-menu w-full lg:flex lg:justify-center xl:block">
            <button
              type="button"
              ref={desktopUserMenuRef}
              onClick={() => toggleUserMenu('desktop')}
              className={`user-menu-trigger flex items-center hover:opacity-90 transition-opacity duration-200 w-full justify-center lg:justify-start cursor-pointer rounded-full p-1 hover:bg-offwhite/[0.04] ${
                showUserMenu && userMenuSource === 'desktop' ? 'bg-offwhite/[0.04]' : ''
              }`}
            >
              <div className="relative w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${themeConfig.accentColor}26`, boxShadow: `inset 0 0 0 1px ${themeConfig.borderColor}` }}>
                <span className="text-gold-strong text-xs lg:text-sm font-heading">{initials || '?'}</span>
                <div className="absolute -bottom-0.5 -left-0.5 z-20">
                  <WaxSealBadge
                    foundingType={user?.founding_type}
                    foundingSpot={user?.founding_spot}
                    pending={!user?.founding_spot}
                    size={14}
                  />
                </div>
                <NotificationBell
                  unreadCount={unreadCount}
                  ring={bellRing}
                  theme={theme}
                  size="sm"
                  overlay
                  className="absolute -bottom-0.5 -right-0.5 z-10"
                  onClick={openNotifPanel}
                />
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div
        data-sidebar-nav
        data-no-pull-refresh
        className="app-sidebar-mobile lg:hidden fixed z-[110]"
        style={{
          backgroundColor: sidebarBg,
          border: `1px solid ${borderColor}`,
          boxShadow: sidebarShadow,
        }}
      >
        <nav className="app-sidebar-mobile-nav flex items-center gap-1 px-1.5 py-1">
          <div
            ref={(el) => {
              if (el) {
                bottomNavRef.current = el;
                const saved = sessionStorage.getItem(BOTTOM_SCROLL_KEY);
                if (saved && !el.dataset.bsr) {
                  el.dataset.bsr = '1';
                  el.style.scrollBehavior = 'auto';
                  el.scrollLeft = parseInt(saved, 10);
                }
              }
            }}
            onScroll={handleBottomNavScroll}
            className="sidebar-bottom-nav-scroll flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain px-0.5 scrollbar-none"
            data-no-pull-refresh-scroll
          >
            <ul className="m-0 flex list-none gap-1 p-0">
              {navItems.map((item) => {
                const showAssignmentBadge = isTechnician && item.id === 'home' && pendingAssignments > 0;
                const showCheckoutBadge = isCashier && item.id === 'checkout' && checkoutQueueCount > 0;
                const badgeCount = showCheckoutBadge ? checkoutQueueCount : pendingAssignments;
                const showBadge = showAssignmentBadge || showCheckoutBadge;
                return (
                  <li key={item.id} className="shrink-0">
                    <NavLink
                      to={item.href}
                      end={item.id === 'home'}
                      className={({ isActive }) => getMobileNavLinkClasses(isActive)}
                      style={({ isActive }) => getNavLinkStyle(isActive, accentGradient)}
                      onClick={() => onNavClick(item)}
                    >
                      <NavIcon iconPath={item.icon} showBadge={showBadge} badgeCount={badgeCount} compact accentGradient={accentGradient} />
                      <span className="max-w-[52px] truncate text-center text-[7px] font-medium leading-none tracking-wide">
                        {item.label}
                      </span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
            {/* Structural Layout Guard: Ensures scroll engine never shrinks container size */}
            <div className="w-2 shrink-0" aria-hidden="true" />
          </div>

          <div className="relative flex shrink-0 flex-col items-center mobile-user-menu">
            <button
              type="button"
              ref={mobileUserMenuRef}
              onClick={(e) => {
                e.stopPropagation();
                toggleUserMenu('mobile');
              }}
              className={`user-menu-trigger flex flex-col items-center gap-0.5 rounded-full px-1.5 py-1 transition-colors duration-200 ${
                showUserMenu && userMenuSource === 'mobile'
                  ? 'text-gold font-medium'
                  : theme === 'dark'
                    ? 'text-offwhite/55 hover:text-offwhite/90 hover:bg-offwhite/[0.06]'
                    : 'text-charcoal/65 hover:text-charcoal hover:bg-charcoal/[0.05]'
              }`}
              style={
                showUserMenu && userMenuSource === 'mobile'
                  ? { background: accentGradient || ACTIVE_NAV_GRADIENT_FALLBACK }
                  : undefined
              }
            >
              <div
                className="relative flex h-6 w-6 items-center justify-center rounded-full"
                style={{
                  background: 'rgba(197, 160, 89, 0.15)',
                  boxShadow: 'inset 0 0 0 1px rgba(197, 160, 89, 0.25)',
                }}
              >
                <span className="text-[8px] text-gold font-heading">{initials || '?'}</span>
                <NotificationBell
                  unreadCount={unreadCount}
                  ring={bellRing}
                  theme={theme}
                  size="sm"
                  overlay
                  className="absolute -top-1 -right-1 z-10"
                  onClick={openNotifPanel}
                />
              </div>
              <span
                className={`max-w-[44px] truncate text-[7px] font-medium leading-none ${
                  showUserMenu && userMenuSource === 'mobile'
                    ? 'text-gold'
                    : theme === 'dark'
                      ? 'text-offwhite/55'
                      : 'text-charcoal/65'
                }`}
              >
                {displayName}
              </span>
            </button>
          </div>
        </nav>
      </div>

      {showUserMenu && userMenuPos &&
        createPortal(
          <div
            className={`user-menu-dropdown fixed z-[9999] w-48 rounded-xl border shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-[#121214] border-zinc-800/80' : 'bg-white border-gold/20'}`}
            style={{ top: userMenuPos.top, left: userMenuPos.left }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <UserMenuDropdown
              theme={theme}
              accentGradient={accentGradient}
              unreadCount={unreadCount}
              textSize={userMenuSource === 'mobile' ? 'text-xs' : 'text-sm'}
              onNavigateSettings={() => {
                closeUserMenu();
                navigate(settingsPath);
              }}
              onToggleTheme={() => {
                toggleTheme();
                closeUserMenu();
              }}
              onOpenNotifications={() => {
                setNotifPanelOpen(true);
                closeUserMenu();
              }}
              onLogout={() => {
                setShowLogoutConfirm(true);
                closeUserMenu();
              }}
            />
          </div>,
          document.body,
        )}

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
