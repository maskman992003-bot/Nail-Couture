import { useEffect, useRef, useState } from 'react'

const DEFAULT_THRESHOLD = 72
const MAX_PULL_DISTANCE = 96
const SCROLL_TOP_TOLERANCE = 8

const isTouchDevice = () => {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /NailCoutureFlutter/i.test(navigator.userAgent)
  )
}

const isScrollable = (element) => {
  if (!element || element === document.body || element === document.documentElement) {
    return false
  }
  if (element.closest?.('[data-no-pull-refresh-scroll]')) {
    return false
  }
  const style = window.getComputedStyle(element)
  const overflowY = style.overflowY
  if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') {
    return false
  }
  return element.scrollHeight > element.clientHeight + 1
}

const getScrollableAncestors = (target) => {
  const ancestors = []
  let node = target?.parentElement
  while (node && node !== document.body && node !== document.documentElement) {
    if (node.closest?.('[role="dialog"], [data-no-pull-refresh]')) {
      break
    }
    if (isScrollable(node)) {
      ancestors.push(node)
    }
    node = node.parentElement
  }
  return ancestors
}

const getDocumentScrollTop = () => {
  const scrollingElement = document.scrollingElement || document.documentElement
  return Math.max(
    window.scrollY || 0,
    scrollingElement?.scrollTop || 0,
    document.body?.scrollTop || 0,
    document.documentElement?.scrollTop || 0,
  )
}

const isScrolledToTop = (element) => (element?.scrollTop ?? 0) <= SCROLL_TOP_TOLERANCE

const isAtScrollTop = (target) => {
  if (typeof window === 'undefined') return false
  if (target?.closest?.('[role="dialog"], [data-no-pull-refresh]')) return false

  const scrollableAncestors = getScrollableAncestors(target)
  if (scrollableAncestors.length > 0) {
    if (!scrollableAncestors.every(isScrolledToTop)) {
      return false
    }
  }

  return getDocumentScrollTop() <= SCROLL_TOP_TOLERANCE
}

const isIgnoredTarget = (target) =>
  Boolean(target?.closest?.(
    '[data-drag-handle], [data-no-pull-refresh], button, a, input, select, textarea, [contenteditable="true"]',
  ))

export default function usePullToRefresh({
  onRefresh,
  blocked = false,
  threshold = DEFAULT_THRESHOLD,
} = {}) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pullingRef = useRef(false)
  const startYRef = useRef(0)
  const pullDistanceRef = useRef(0)
  const touchTargetRef = useRef(null)
  const isRefreshingRef = useRef(false)
  const blockedRef = useRef(blocked)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh
  isRefreshingRef.current = isRefreshing
  blockedRef.current = blocked

  useEffect(() => {
    if (!isTouchDevice()) return undefined

    const resetPull = () => {
      pullingRef.current = false
      touchTargetRef.current = null
      pullDistanceRef.current = 0
      setPullDistance(0)
    }

    const onTouchStart = (event) => {
      if (isRefreshingRef.current || blockedRef.current) return
      if (event.touches.length !== 1) return
      if (!isAtScrollTop(event.target)) return
      if (isIgnoredTarget(event.target)) return

      pullingRef.current = true
      touchTargetRef.current = event.target
      startYRef.current = event.touches[0].clientY
      pullDistanceRef.current = 0
      setPullDistance(0)
    }

    const onTouchMove = (event) => {
      if (!pullingRef.current || isRefreshingRef.current || blockedRef.current) return
      if (!isAtScrollTop(touchTargetRef.current || event.target)) {
        resetPull()
        return
      }

      const delta = event.touches[0].clientY - startYRef.current
      if (delta <= 0) {
        pullDistanceRef.current = 0
        setPullDistance(0)
        return
      }

      event.preventDefault()
      const distance = Math.min(delta * 0.45, MAX_PULL_DISTANCE)
      pullDistanceRef.current = distance
      setPullDistance(distance)
    }

    const onTouchEnd = async () => {
      if (!pullingRef.current || isRefreshingRef.current) return
      pullingRef.current = false
      touchTargetRef.current = null

      const distance = pullDistanceRef.current
      if (distance >= threshold && onRefreshRef.current) {
        setIsRefreshing(true)
        pullDistanceRef.current = threshold
        setPullDistance(threshold)
        try {
          await onRefreshRef.current()
        } finally {
          setIsRefreshing(false)
          pullDistanceRef.current = 0
          setPullDistance(0)
        }
        return
      }

      resetPull()
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [threshold])

  const pullProgress = Math.min(pullDistance / threshold, 1)

  return { pullDistance, isRefreshing, pullProgress }
}
