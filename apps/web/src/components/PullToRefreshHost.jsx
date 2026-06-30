import usePullToRefresh from '../hooks/usePullToRefresh';
import { usePullToRefreshContext } from '../contexts/PullToRefreshContext';
import PullToRefreshIndicator from './PullToRefreshIndicator';

export default function PullToRefreshHost() {
  const { runRefresh, disabled } = usePullToRefreshContext();

  const { pullDistance, isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: runRefresh,
    disabled,
  });

  return (
    <PullToRefreshIndicator
      pullDistance={pullDistance}
      isRefreshing={isRefreshing}
      pullProgress={pullProgress}
    />
  );
}
