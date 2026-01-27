import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { config } from "../config";

const VISITOR_ID_KEY = "admin_console_visitor_id";
const RECENT_VISITED_KEY = "admin_console_recent_visited";

export interface RecentVisit {
  path: string;
  title: string;
  timestamp: number;
}

export const useTracker = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // 1. Get or Create Visitor ID
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        visitorId = crypto.randomUUID();
      } else {
        visitorId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      }
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }

    // 2. Track Recently Visited (Local)
    const updateRecentVisited = () => {
      const raw = localStorage.getItem(RECENT_VISITED_KEY);
      let history: RecentVisit[] = raw ? JSON.parse(raw) : [];

      // Deduplicate: remove if already exists
      history = history.filter((item) => item.path !== pathname);

      // Add to front
      const title = pathname.split("/").pop() || "home";
      history.unshift({
        path: pathname,
        title: title,
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
        await fetch(`${config.BACKEND_HOST}/api/v1/analytics/track`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_type: "page_view",
            visitor_id: visitorId,
            path: pathname,
            title: pathname.split("/").pop() || "home",
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (e) {
        console.warn("[Tracker] Failed to send analytics", e);
      }
    };

    if (pathname !== "/" && !pathname.includes("login")) {
      trackRemote();
    }
  }, [pathname]);
};

export const getRecentlyVisited = (): RecentVisit[] => {
  const raw = localStorage.getItem(RECENT_VISITED_KEY);
  return raw ? JSON.parse(raw) : [];
};
