import { useEffect, useState } from 'react';
import { getAvailableRefreshments } from '@nail-couture/shared/services/inventoryService.js';

export function useAvailableRefreshments() {
  const [refreshments, setRefreshments] = useState<{ item_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAvailableRefreshments()
      .then(setRefreshments)
      .catch(() => setRefreshments([]))
      .finally(() => setLoading(false));
  }, []);

  return { refreshments, loading };
}
