import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { config } from "../config";
import { AuthClient, UserProfile } from "./auth/types";

const AuthContext = createContext<AuthClient | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // 1. Initialize: Check authentication status via BFF /me endpoint
  useEffect(() => {
    const init = async () => {
      console.info("[Auth] Initializing AuthProvider (BFF)...");

      if (!config.ENABLE_AUTH) {
        console.warn("[Auth] Authentication is DISABLED.");
        setIsInitializing(false);
        return;
      }

      try {
        const res = await fetch(`${config.API_BASE_URL}/api/v1/auth/me`);
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          console.info("[Auth] Session active:", userData.sub);
        } else {
          console.info("[Auth] No active session found.");
        }
      } catch (e) {
        console.error("[Auth] Failed to check session", e);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  const login = useCallback(async () => {
    console.info("[Auth] Redirecting to BFF Login Flow...");
    window.location.href = `${config.API_BASE_URL}/api/v1/auth/login`;
  }, []);

  const logout = useCallback(async () => {
    console.info("[Auth] Logging out (BFF)...");
    try {
      await fetch(`${config.API_BASE_URL}/api/v1/auth/logout`, { method: "POST" });
    } catch (e) {
      console.error("[Auth] Logout cleanup failed", e);
    } finally {
      setUser(null);
      window.location.href = config.BASE_URL || "/";
    }
  }, []);

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      // In BFF mode, cookies are handled automatically by the browser.
      // credentials: 'same-origin' is default for fetch, which works for our MFE setup.
      return fetch(url, options);
    },
    [],
  );

  const getToken = useCallback(
    async () => null, // Tokens are hidden in BFF mode
    [],
  );

  const value = React.useMemo(
    () => ({
      fetchWithAuth,
      getToken,
      user,
      login,
      logout,
      handleCallback: async () => {}, // Deprecated in BFF
      handleImplicitCallback: async () => {}, // Deprecated in BFF
      config: null, // Minimal config exposed to frontend
      isAuthenticated: !!user && !user.is_anonymous,
    }),
    [user, login, logout, fetchWithAuth, getToken],
  );

  if (isInitializing) {
    return <div className="p-10 text-center">Loading Authentication...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined)
    throw new Error("useAuth must be used within AuthProvider");
  return context;
};
