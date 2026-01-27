import { useState, useEffect, useCallback } from "react";
import { config } from "../config";
import { getRecentlyVisited } from "./useTracker";
import { VisitHistoryItem } from "../components/common/VisitHistoryCard";

interface TopVisitedResponseItem {
  path: string;
  title: string;
  count: number;
}

// Time formatting helper
const formatDistance = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
};

export const useAnalyticsData = () => {
  const [recentHistory, setRecentHistory] = useState<VisitHistoryItem[]>([]);
  const [topVisited, setTopVisited] = useState<VisitHistoryItem[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);

  const fetchRecentHistory = useCallback(() => {
    const localData = getRecentlyVisited().slice(0, 5).map(item => ({
      path: item.path,
      title: item.title,
      meta: formatDistance(item.timestamp)
    }));
    setRecentHistory(localData);
  }, []);

  const fetchTopVisited = useCallback(async () => {
    setLoadingTop(true);
    try {
      const response = await fetch(`${config.BACKEND_HOST}/api/v1/analytics/top-visited`);
      
      if (!response.ok) {
         // Silently fail for UI if analytics is down, but log warning
         console.warn(`[Analytics] Failed to fetch top visited: ${response.status}`);
         setTopVisited([]);
         return;
      }
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        // Backend returned HTML or empty string
        setTopVisited([]);
        return;
      }
      
      const mappedData: VisitHistoryItem[] = (data.items || []).map((item: TopVisitedResponseItem) => ({
        path: item.path,
        title: item.title,
        meta: `${item.count} times`
      }));
      setTopVisited(mappedData);
    } catch (e) {
      console.error("[Analytics] Error fetching top visited", e);
      setTopVisited([]);
    } finally {
      setLoadingTop(false);
    }
  }, []);

  const refresh = useCallback(() => {
    // Manually trigger refresh logic
    fetchRecentHistory();
    fetchTopVisited();
  }, [fetchRecentHistory, fetchTopVisited]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    recentHistory,
    topVisited,
    loadingTop,
    refresh
  };
};
