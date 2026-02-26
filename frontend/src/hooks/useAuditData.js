// =============================================
// useAuditData - Custom Hook
// Fetches real data from backend every 30 seconds
// =============================================
import { useState, useEffect, useCallback } from 'react';
import { getLatestAudit, getLiveStats } from '@/services/api';

export const useAuditData = (host = '127.0.0.1') => {
  const [auditData, setAuditData] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [audit, stats] = await Promise.all([
        getLatestAudit(),
        getLiveStats(host),
      ]);
      setAuditData(audit);
      setLiveStats(stats);
    } catch (err) {
      setError('Backend connection failed. Make sure FastAPI is running on port 8000.');
    } finally {
      setLoading(false);
    }
  }, [host]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { auditData, liveStats, loading, error, refetch: fetchData };
};