import { useEffect, useRef, useState } from 'react'

const DEFAULT_THRESHOLD = 72
const MAX_PULL_DISTANCE = 96

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)

const isAtScrollTop = () => typeof window !== 'undefined' && window.scrollY <= 0

const isIgnoredTarget = (target) =>
  Boolean(target?.closest?.('[data-drag-handle], [data-no-pull-refresh], button, a, input, select, textarea'))

export default function usePullToRefresh({ onRefresh, disabled = false, threshold = DEFAULT_THRESHOLD } = {}) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pullingRef = useRef(false)
  const startYRef = useRef(0)
  const pullDistanceRef = useRef(0)
  const isRefreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh
  isRefreshingRef.current = isRefreshing

  useEffect(() => {
    if (!isTouchDevice() || disabled) return undefined

    const resetPull = () => {
      pullingRef.current = false
      pullDistanceRef.current = 0
      setPullDistance(0)
    }

    const onTouchStart = (event) => {
      if (isRefreshingRef.current) return
      if (event.touches.length !== 1) return
      if (!isAtScrollTop()) return
      if (isIgnoredTarget(event.target)) return

      pullingRef.current = true
      startYRef.current = event.touches[0].clientY
      pullDistanceRef.current = 0
      setPullDistance(0)
    }

    const onTouchMove = (event) => {
      if (!pullingRef.current || isRefreshingRef.current) return
      if (!isAtScrollTop()) {
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
  }, [disabled, threshold])

  const pullProgress = Math.min(pullDistance / threshold, 1)

  return { pullDistance, isRefreshing, pullProgress }
}
