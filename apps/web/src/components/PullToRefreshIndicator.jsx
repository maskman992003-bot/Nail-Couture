export default function PullToRefreshIndicator({ pullDistance, isRefreshing, pullProgress }) {
  if (pullDistance <= 0 && !isRefreshing) return null

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[45] pointer-events-none"
      style={{ top: `calc(0.75rem + env(safe-area-inset-top, 0px) + ${pullDistance}px)` }}
      aria-hidden="true"
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-gold/50 bg-gold/10"
        style={{ opacity: 0.35 + pullProgress * 0.65 }}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-gold ${isRefreshing ? 'animate-spin' : ''}`}
          style={isRefreshing ? undefined : { transform: `rotate(${pullProgress * 180}deg)` }}
        >
          {isRefreshing ? (
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          ) : (
            <path d="M12 5v14M5 12l7 7 7-7" />
          )}
        </svg>
      </div>
    </div>
  )
}
