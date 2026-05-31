import { useState, useEffect, useCallback } from 'react';
import { getAvailableRefreshments } from '../services/inventoryService';

export function useAvailableRefreshments() {
  const [refreshments, setRefreshments] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRefreshments(await getAvailableRefreshments());
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error(err);
      setRefreshments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { refreshments, loading, reload };
}
