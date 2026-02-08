import { useState, useEffect, useCallback } from "react";
import { config } from '../../api/config';
import { getRecentlyVisited } from "./useTracker";
import { VisitHistoryItem } from '../../ui/VisitHistoryCard';

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
      type: item.type,
      meta: formatDistance(item.timestamp)
    }));
    setRecentHistory(localData);
  }, []);

  const fetchTopVisited = useCallback(async () => {
    setLoadingTop(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/v1/analytics/top-visited`);
      
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
      
      const mappedData: VisitHistoryItem[] = (data.items || []).map((item: TopVisitedResponseItem) => {
        // Infer type for remote data since backend doesn't provide it yet
        let type = "other";
        const normalizedPath = item.path.endsWith("/") ? item.path.slice(0, -1) : item.path;
        
        if (normalizedPath === "/jobs") type = "jobs_landing";
        else if (normalizedPath.startsWith("/jobs/")) type = "job";
        else if (normalizedPath === "/tables") type = "tables_landing";
        else if (normalizedPath.startsWith("/tables/")) type = "table";
        else if (normalizedPath === "/users") type = "users_landing";
        else if (normalizedPath.startsWith("/users/")) type = "user";
        else if (normalizedPath === "/projects") type = "projects_landing";
        else if (normalizedPath.startsWith("/projects/")) type = "project";
        else if (normalizedPath.startsWith("/lineage/")) type = "lineage";
        else if (normalizedPath === "/audit") type = "audit";
        else if (normalizedPath === "/settings") type = "settings";
        else if (normalizedPath === "/") type = "dashboard";

        return {
          path: item.path,
          title: item.title,
          type: type,
          meta: `${item.count} times`
        };
      });
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
