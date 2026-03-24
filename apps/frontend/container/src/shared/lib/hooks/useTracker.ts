import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { config } from "../../api/config";
import { useAuth } from "../../../app/providers/AuthProvider";

const RECENT_VISITED_KEY = "frontend_recent_visited";

export interface RecentVisit {
  path: string;
  title: string;
  type: string;
  timestamp: number;
}

export const useTracker = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const visitorId = user?.user_id ?? null;

    // 1. Track Recently Visited (Local)
    const updateRecentVisited = () => {
      const raw = localStorage.getItem(RECENT_VISITED_KEY);
      let history: RecentVisit[] = raw ? JSON.parse(raw) : [];

      // Deduplicate: remove if already exists
      history = history.filter((item) => item.path !== pathname);

      // Detect Page Type
      let type = "other";
      const normalizedPath = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

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

      // Add to front
      const title = pathname.split("/").filter(Boolean).pop() || "Dashboard";
      history.unshift({
        path: pathname,
        title: title,
        type: type,
        timestamp: Date.now(),
      });

      // Limit to 10
      if (history.length > 10) {
        history = history.slice(0, 10);
      }

      localStorage.setItem(RECENT_VISITED_KEY, JSON.stringify(history));
    };

    if (pathname !== "/" && !pathname.includes("login")) {
      updateRecentVisited();
    }

    // 3. Send to Backend (Remote Analytics)
    const trackRemote = async () => {
      try {
        const payload = {
          event_type: "page_view",
          visitor_id: visitorId,
          path: pathname,
          title: pathname.split("/").pop() || "home",
          timestamp: new Date().toISOString(),
        };
        await fetch(`${config.BASE_URL}/lineage-manager/api/v1/analytics/track`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        console.warn("[Tracker] Failed to send analytics", e);
      }
    };

    if (pathname !== "/" && !pathname.includes("login")) {
      trackRemote();
    }
  }, [pathname, user]);
};

export const getRecentlyVisited = (): RecentVisit[] => {
  const raw = localStorage.getItem(RECENT_VISITED_KEY);
  return raw ? JSON.parse(raw) : [];
};
