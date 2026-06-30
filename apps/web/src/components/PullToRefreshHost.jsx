import usePullToRefresh from '../hooks/usePullToRefresh';
import { usePullToRefreshContext } from '../contexts/PullToRefreshContext';
import PullToRefreshIndicator from './PullToRefreshIndicator';

export default function PullToRefreshHost() {
  const { runRefresh, blocked } = usePullToRefreshContext();

  const { pullDistance, isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: runRefresh,
    disabled: blocked,
  });

  return (
    <PullToRefreshIndicator
      pullDistance={pullDistance}
      isRefreshing={isRefreshing}
      pullProgress={pullProgress}
    />
  );
}
