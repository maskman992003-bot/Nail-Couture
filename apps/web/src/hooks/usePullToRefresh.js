import { useEffect, useRef, useState } from 'react';

const DEFAULT_THRESHOLD = 72;
const MAX_PULL_DISTANCE = 96;
const STUCK_GESTURE_MS = 500;

const IGNORE_SELECTOR = [
  '[data-sidebar-nav]',
  '[data-no-pull-refresh]',
  '[data-no-pull-refresh-scroll]',
  '[role="dialog"]',
  '[data-drag-handle]',
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'label',
].join(', ');

const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches
    || 'ontouchstart' in window
    || navigator.maxTouchPoints > 0
    || /NailCoutureFlutter/i.test(navigator.userAgent)
  );
};

const isIgnoredTarget = (target) => Boolean(target?.closest?.(IGNORE_SELECTOR));

const isScrollable = (element) => {
  if (!element || element === document.body || element === document.documentElement) {
    return false;
  }
  if (element.closest?.('[data-no-pull-refresh-scroll]')) {
    return false;
  }
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') {
    return false;
  }
  return element.scrollHeight > element.clientHeight + 1;
};

const getScrollableAncestors = (target) => {
  const ancestors = [];
  let node = target?.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    if (node.closest?.('[role="dialog"], [data-no-pull-refresh], [data-sidebar-nav]')) {
      break;
    }
    if (isScrollable(node)) {
      ancestors.push(node);
    }
    node = node.parentElement;
  }
  return ancestors;
};

const getDocumentScrollTop = () => {
  const scrollingElement = document.scrollingElement || document.documentElement;
  return Math.max(
    window.scrollY || 0,
    scrollingElement?.scrollTop || 0,
    document.body?.scrollTop || 0,
  );
};

const isAtScrollTop = (target) => {
  if (typeof window === 'undefined') return false;
  if (isIgnoredTarget(target)) return false;
  if (getDocumentScrollTop() > 0) return false;
  return getScrollableAncestors(target).every((el) => el.scrollTop <= 0);
};

/**
 * Pull-to-refresh for touch devices. Listeners are passive only (no preventDefault)
 * so taps and sidebar navigation are never blocked.
 */
export default function usePullToRefresh({ onRefresh, disabled = false, threshold = DEFAULT_THRESHOLD } = {}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullingRef = useRef(false);
  const startYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const touchTargetRef = useRef(null);
  const isRefreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const stuckTimerRef = useRef(null);
  onRefreshRef.current = onRefresh;
  isRefreshingRef.current = isRefreshing;

  useEffect(() => {
    if (!isTouchDevice() || disabled) return undefined;

    const clearStuckTimer = () => {
      if (stuckTimerRef.current) {
        clearTimeout(stuckTimerRef.current);
        stuckTimerRef.current = null;
      }
    };

    const resetPull = () => {
      pullingRef.current = false;
      touchTargetRef.current = null;
      pullDistanceRef.current = 0;
      setPullDistance(0);
      clearStuckTimer();
    };

    const armStuckReset = () => {
      clearStuckTimer();
      stuckTimerRef.current = setTimeout(resetPull, STUCK_GESTURE_MS);
    };

    const onTouchStart = (event) => {
      if (isRefreshingRef.current) return;
      if (event.touches.length !== 1) return;
      if (isIgnoredTarget(event.target)) return;
      if (!isAtScrollTop(event.target)) return;

      pullingRef.current = true;
      touchTargetRef.current = event.target;
      startYRef.current = event.touches[0].clientY;
      pullDistanceRef.current = 0;
      setPullDistance(0);
      armStuckReset();
    };

    const onTouchMove = (event) => {
      if (!pullingRef.current || isRefreshingRef.current) return;
      if (isIgnoredTarget(event.target)) {
        resetPull();
        return;
      }
      if (!isAtScrollTop(touchTargetRef.current || event.target)) {
        resetPull();
        return;
      }

      const delta = event.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      armStuckReset();
      const distance = Math.min(delta * 0.45, MAX_PULL_DISTANCE);
      pullDistanceRef.current = distance;
      setPullDistance(distance);
    };

    const onTouchEnd = async () => {
      clearStuckTimer();
      if (!pullingRef.current || isRefreshingRef.current) {
        resetPull();
        return;
      }
      pullingRef.current = false;
      touchTargetRef.current = null;

      const distance = pullDistanceRef.current;
      if (distance >= threshold && onRefreshRef.current) {
        setIsRefreshing(true);
        pullDistanceRef.current = threshold;
        setPullDistance(threshold);
        try {
          await onRefreshRef.current();
        } finally {
          setIsRefreshing(false);
          pullDistanceRef.current = 0;
          setPullDistance(0);
        }
        return;
      }

      resetPull();
    };

    const onVisibilityReset = () => {
      if (document.visibilityState !== 'visible') resetPull();
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityReset);

    return () => {
      clearStuckTimer();
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      document.removeEventListener('visibilitychange', onVisibilityReset);
      resetPull();
    };
  }, [disabled, threshold]);

  const pullProgress = Math.min(pullDistance / threshold, 1);

  return { pullDistance, isRefreshing, pullProgress };
}
