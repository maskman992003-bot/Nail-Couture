/** Pull-to-refresh disabled — document-level touch handlers blocked sidebar navigation. */
export default function usePullToRefresh() {
  return {
    pullDistance: 0,
    isRefreshing: false,
    pullProgress: 0,
  };
}
