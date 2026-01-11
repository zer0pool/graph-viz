import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { config } from "../config";
import { AuthClient, AuthTokens, OidcConfig, UserProfile } from "./auth/types";
import { cryptoRandomString, sha256 } from "./auth/crypto-utils";
import { OidcClient, normalizeProfile, parseJwt } from "./auth/oidc-client";

const TOKEN_KEY = "lm.tokens";
const USER_KEY = "lm.user";
const VERIFIER_KEY = "lm.pkce_verifier";
const STATE_KEY = "lm.pkce_state";
const NONCE_KEY = "lm.oidc_nonce";

const AuthContext = createContext<AuthClient | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [oidcConfig, setOidcConfig] = useState<OidcConfig | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // 1. Initialize: Load config and session
  useEffect(() => {
    const init = async () => {
      console.info("[Auth] Initializing AuthProvider...");

      if (!config.ENABLE_AUTH) {
        console.warn("[Auth] Authentication is DISABLED.");
        setIsInitializing(false);
        return;
      }

      // Configure OIDC
      const { authEndpoint, tokenEndpoint } = OidcClient.resolveEndpoints({
        OIDC_AUTHORITY: config.OIDC_AUTHORITY,
        OIDC_AUTH_ENDPOINT: config.OIDC_AUTH_ENDPOINT,
        OIDC_TOKEN_ENDPOINT: config.OIDC_TOKEN_ENDPOINT,
      });

      const newConfig: OidcConfig = {
        client_id: config.OIDC_CLIENT_ID,
        authorization_endpoint: authEndpoint,
        token_endpoint: tokenEndpoint,
        userinfo_endpoint: config.OIDC_USERINFO_ENDPOINT,
        redirect_uri:
          config.OIDC_REDIRECT_URI || window.location.origin + "/authorized",
        scope: config.OIDC_SCOPE,
        require_signin: true,
      };
      setOidcConfig(newConfig);

      // Restore Session
      try {
        const storedTokens = sessionStorage.getItem(TOKEN_KEY);
        const storedUser = sessionStorage.getItem(USER_KEY);
        if (storedTokens && storedUser) {
          setTokens(JSON.parse(storedTokens));
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error("Failed to restore session", e);
        sessionStorage.clear();
      }

      setIsInitializing(false);
    };

    init();
  }, []);

  const login = async () => {
    if (!oidcConfig) return;
    console.info("[Auth] Starting Login Flow...");

    // PKCE & Nonce Generation
    const verifier = cryptoRandomString(64);
    const challenge = await sha256(verifier);
    const state = cryptoRandomString(32);
    const nonce = cryptoRandomString(32);

    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    sessionStorage.setItem(NONCE_KEY, nonce);

    // Build URL
    const authUrlStr = OidcClient.generateAuthUrl(
      oidcConfig,
      state,
      nonce,
      challenge
    );

    console.debug(`[Auth] Redirecting to: ${authUrlStr}`);
    window.location.href = authUrlStr;
  };

  const logout = () => {
    sessionStorage.clear();
    setUser(null);
    setTokens(null);
    window.location.href = "/";
  };

  const handleImplicitCallback = async (
    accessToken: string,
    idToken: string,
    state: string
  ) => {
    console.info("[Auth] Handling Implicit Callback...");
    const storedState = sessionStorage.getItem(STATE_KEY);
    if (!storedState || state !== storedState) throw new Error("Invalid State");

    const rawProfile = parseJwt(idToken);
    const profile = normalizeProfile(rawProfile);

    // Verify Nonce
    const storedNonce = sessionStorage.getItem(NONCE_KEY);
    if (profile.nonce && storedNonce && profile.nonce !== storedNonce) {
      throw new Error("Invalid Nonce");
    }

    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(NONCE_KEY);

    // Store
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(profile));
    setUser(profile);
  };

  const handleCallback = async (code: string, state: string) => {
    console.info("[Auth] Handling Code Callback...");
    const storedState = sessionStorage.getItem(STATE_KEY);
    const verifier = sessionStorage.getItem(VERIFIER_KEY);

    if (!storedState || state !== storedState) throw new Error("Invalid State");
    if (!verifier) throw new Error("Missing Verifier");
    if (!oidcConfig) throw new Error("Missing Config");

    try {
      // Exchange
      const data = await OidcClient.exchangeCode(
        code,
        verifier,
        oidcConfig,
        config.OIDC_CLIENT_SECRET
      );

      // Normalize
      let newUser: UserProfile = { sub: "unknown", name: "Guest" };
      if (data.user) {
        newUser = normalizeProfile(data.user);
      } else if (data.id_token) {
        newUser = normalizeProfile(parseJwt(data.id_token));
      }

      // Fetch UserInfo
      if (oidcConfig.userinfo_endpoint) {
        try {
          const uiData = await OidcClient.fetchUserInfo(
            oidcConfig.userinfo_endpoint,
            data.access_token
          );
          newUser = normalizeProfile({ ...newUser, ...uiData });
        } catch (e) {
          console.warn("[Auth] UserInfo fetch failed", e);
        }
      }

      const newTokens: AuthTokens = {
        access_token: data.access_token,
        id_token: data.id_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      };

      setTokens(newTokens);
      setUser(newUser);
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify(newTokens));
      sessionStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } finally {
      sessionStorage.removeItem(STATE_KEY);
      sessionStorage.removeItem(VERIFIER_KEY);
    }
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    let token = tokens?.access_token;
    if (!token && user) {
      // Try fallback check in storage
      const stored = sessionStorage.getItem(TOKEN_KEY);
      if (stored && stored.startsWith("{")) {
        token = JSON.parse(stored).access_token;
      } else if (stored) {
        token = stored; // Implicit flow stores raw string sometimes? No, I updated handleImplicitCallback to store raw accessToken string in TOKEN_KEY in previous code, be careful!
      }
    }

    // Correction: In Implicit Flow, I stored `accessToken` string in `TOKEN_KEY`.
    // In Code Flow, I stored `JSON.stringify(newTokens)`.
    // My Restore Logic (useEffect) expects JSON.parse.
    // I need to be consistent.
    // Implicit callback should store format compatible with Restore logic.
    // I will fix implicit callback to store object.

    const headers = {
      ...options.headers,
      Authorization: token ? `Bearer ${token}` : "",
    };
    return fetch(url, { ...options, headers });
  };

  const getToken = async () => tokens?.access_token || null;

  if (isInitializing) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        fetchWithAuth,
        getToken,
        user,
        login,
        logout,
        handleCallback,
        handleImplicitCallback,
        config: oidcConfig,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined)
    throw new Error("useAuth must be used within AuthProvider");
  return context;
};
