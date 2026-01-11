import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import { config } from "../config";

// --- PKCE Utilities ---
function cryptoRandomString(length = 64): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((v) => charset[v % charset.length])
    .join("");
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// --- Interfaces ---
export interface OidcConfig {
  client_id: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  redirect_uri: string;
  scope: string;
  require_signin: boolean;
}

export interface AuthTokens {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_at: number;
}

export interface UserProfile {
  sub: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

export interface AuthClient {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  getToken: () => Promise<string | null>;
  user: UserProfile | null;
  config: OidcConfig | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthClient {
  login: () => Promise<void>;
  logout: () => void;
  handleCallback: (code: string, state: string) => Promise<void>;
}

const TOKEN_KEY = "lm.tokens";
const USER_KEY = "lm.user";
const VERIFIER_KEY = "lm.pkce_verifier";
const STATE_KEY = "lm.pkce_state";
const NONCE_KEY = "lm.oidc_nonce";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [oidcConfig, setOidcConfig] = useState<OidcConfig | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // 1. Initialize: Load config and session
  // 1. Initialize: Load config and session
  useEffect(() => {
    const init = async () => {
      console.info(
        "[Auth][Phase:Initialization] Starting AuthProvider initialization..."
      );

      // 1. Check if Auth is disabled
      if (!config.ENABLE_AUTH) {
        console.warn("[Auth] Authentication is DISABLED via config.");
        setOidcConfig({
          client_id: "disabled",
          authorization_endpoint: "",
          token_endpoint: "",
          redirect_uri: "",
          scope: "",
          require_signin: false,
        });
        setIsInitializing(false);
        return;
      }

      try {
        let cfg: OidcConfig;

        // 2. Check for Standalone Config (Environment Variables)
        if (config.OIDC_CLIENT_ID) {
          console.info("[Auth] Using Standalone/Local OIDC Configuration.");
          cfg = {
            client_id: config.OIDC_CLIENT_ID,
            authorization_endpoint: `${config.OIDC_AUTHORITY}/protocol/openid-connect/auth`,
            token_endpoint: `${config.OIDC_AUTHORITY}/protocol/openid-connect/token`,
            userinfo_endpoint:
              config.OIDC_USERINFO_ENDPOINT ||
              `${config.OIDC_AUTHORITY}/protocol/openid-connect/userinfo`,
            redirect_uri: config.OIDC_REDIRECT_URI,
            scope: config.OIDC_SCOPE,
            require_signin: true,
          };
        } else {
          // 3. Fallback to Backend Fetch
          const configUrl = `${config.API_BASE_URL}/api/v1/auth/config`;
          console.debug(
            `[Auth][Phase:Initialization] Fetching OIDC config from: ${configUrl}`
          );
          const resp = await fetch(configUrl);
          if (!resp.ok) {
            console.error(
              `[Auth][Phase:Initialization] FAILED to fetch auth config. Status: ${resp.status}`
            );
            // Don't throw fatal error, just fail auth initialization
            // throw new Error(`Failed to fetch auth config: ${resp.status}`);
            return;
          }
          cfg = await resp.json();
        }

        setOidcConfig(cfg);
        console.info("[Auth][Phase:Initialization] OIDC Config ready:", {
          auth_endpoint: cfg.authorization_endpoint,
          redirect_uri: cfg.redirect_uri,
        });

        // Restore Session
        console.debug(
          "[Auth][Phase:Initialization] Checking sessionStorage for existing session..."
        );
        const storedTokens = sessionStorage.getItem(TOKEN_KEY);
        const storedUser = sessionStorage.getItem(USER_KEY);

        if (storedTokens && storedUser) {
          const parsedTokens: AuthTokens = JSON.parse(storedTokens);
          const now = Date.now();
          const remains = Math.floor((parsedTokens.expires_at - now) / 1000);

          if (remains > 10) {
            setTokens(parsedTokens);
            const userProfile = JSON.parse(storedUser);
            setUser(userProfile);
            console.info(
              `[Auth][Phase:Initialization] Session RESTORED. User: ${userProfile.sub}, Expires in: ${remains}s`
            );
          } else {
            console.warn(
              `[Auth][Phase:Initialization] Session EXPIRED (${remains}s remaining), clearing storage.`
            );
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(USER_KEY);
          }
        } else {
          console.debug(
            "[Auth][Phase:Initialization] No existing session found."
          );
        }
      } catch (err) {
        console.error(
          "[Auth][Phase:Initialization] FATAL Error during initialization:",
          err
        );
      } finally {
        setIsInitializing(false);
        console.debug(
          "[Auth][Phase:Initialization] Initialization cycle finished."
        );
      }
    };
    init();
  }, []);

  const login = async () => {
    console.info("[Auth][Phase:LoginStart] Login process initiated.");
    if (!oidcConfig) {
      console.error(
        "[Auth][Phase:LoginStart] ABORT: OIDC config is not yet available."
      );
      return;
    }

    try {
      console.debug("[Auth][Phase:LoginStart] Generating PKCE parameters...");
      const verifier = cryptoRandomString(64);
      const challenge = await sha256(verifier);
      const state = cryptoRandomString(32);
      const nonce = cryptoRandomString(32); // Required for Hybrid Flow

      sessionStorage.setItem(VERIFIER_KEY, verifier);
      sessionStorage.setItem(STATE_KEY, state);
      sessionStorage.setItem(NONCE_KEY, nonce);
      console.debug(
        `[Auth][Phase:LoginStart] PKCE State: ${state}, Nonce generated.`
      );

      const authUrl = new URL(oidcConfig.authorization_endpoint);
      authUrl.searchParams.set("client_id", oidcConfig.client_id);
      authUrl.searchParams.set("redirect_uri", oidcConfig.redirect_uri);

      // ADFS Resource Support
      if (config.OIDC_RESOURCE) {
        authUrl.searchParams.set("resource", config.OIDC_RESOURCE);
      }

      // Use configured response type (default 'code', user may set 'code id_token')
      const rType = config.OIDC_RESPONSE_TYPE || "code";
      authUrl.searchParams.set("response_type", rType);

      // Determine Response Mode (ADFS defaults to form_post for hybrid, we need fragment)
      let responseMode = config.OIDC_RESPONSE_MODE;
      if (!responseMode) {
        // Smart default: if requesting tokens directly (hybrid), use fragment.
        if (rType.includes("token")) {
          responseMode = "fragment";
        } else {
          responseMode = "query";
        }
      }
      authUrl.searchParams.set("response_mode", responseMode);

      authUrl.searchParams.set("scope", oidcConfig.scope);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("nonce", nonce);
      authUrl.searchParams.set("code_challenge", challenge);
      authUrl.searchParams.set("code_challenge_method", "S256");

      console.info(
        `[Auth][Phase:LoginStart] REDIRECTING window to: ${authUrl.origin}`
      );
      window.location.assign(authUrl.toString());
    } catch (err) {
      console.error(
        "[Auth][Phase:LoginStart] ERROR during login redirection set up:",
        err
      );
    }
  };

  const handleCallback = async (code: string, state: string) => {
    console.info(
      "[Auth][Phase:Callback] OIDC redirect detected. Starting cleanup and token exchange."
    );

    const storedState = sessionStorage.getItem(STATE_KEY);
    const verifier = sessionStorage.getItem(VERIFIER_KEY);

    console.debug(
      `[Auth][Phase:Callback] State verification. Received: ${state}, Stored: ${storedState}`
    );
    if (!storedState || state !== storedState) {
      console.error(
        "[Auth][Phase:Callback] ERROR: State mismatch! Potential CSRF."
      );
      throw new Error("Invalid Auth State");
    }

    if (!verifier) {
      console.error(
        "[Auth][Phase:Callback] ERROR: PKCE verifier missing from sessionStorage."
      );
      throw new Error("Missing PKCE Verifier");
    }

    console.info("[Auth][Phase:Callback] Exchanging code for tokens...");
    try {
      const formData = new URLSearchParams();
      formData.append("code", code);
      formData.append("code_verifier", verifier);
      formData.append(
        "redirect_uri",
        oidcConfig?.redirect_uri || window.location.origin
      );
      formData.append("client_id", oidcConfig?.client_id || "");

      // ADFS Confidential Client Support
      if (config.OIDC_CLIENT_SECRET) {
        console.debug(
          "[Auth] Attaching Client Secret to token exchange request"
        );
        formData.append("client_secret", config.OIDC_CLIENT_SECRET);
      }

      let exchangeUrl = "";
      let method = "POST";

      // Select Exchange Target: Direct IDP or Backend Proxy
      if (config.OIDC_CLIENT_ID) {
        console.info("[Auth] Doing Direct Token Exchange with IDP.");
        // Direct exchange requires grant_type
        formData.append("grant_type", "authorization_code");
        if (oidcConfig?.token_endpoint) {
          exchangeUrl = oidcConfig.token_endpoint;
        } else {
          throw new Error("Token Endpoint missing in OIDC Config");
        }
      } else {
        console.info("[Auth] Doing Backend Proxy Token Exchange.");
        exchangeUrl = `${config.API_BASE_URL}/api/v1/auth/exchange`;
      }

      console.debug(
        `[Auth][Phase:Callback] Requesting exchange via: ${exchangeUrl}`
      );

      const resp = await fetch(exchangeUrl, {
        method: method,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error(
          `[Auth][Phase:Callback] ERROR: Exchange failed. Status: ${resp.status}, Body: ${errText}`
        );
        throw new Error("Exchange failed");
      }

      const data = await resp.json();
      console.info("[Auth][Phase:Callback] SUCCESS: Tokens received.");

      // Normalize token/user structure if IDP returns different format than backend
      // Backend returns { access_token, id_token, user: {...} }
      // Standard IDP might just return tokens. We heavily rely on ID Token for user info in frontend only mode.

      let newUser: UserProfile;
      if (data.user) {
        newUser = data.user;
      } else if (data.id_token) {
        // Decode ID Token (JWT) part 2 to get user profile
        const base64Url = data.id_token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          window
            .atob(base64)
            .split("")
            .map(function (c) {
              return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
        );
        newUser = JSON.parse(jsonPayload);
      } else {
        // Fallback if no user info found
        newUser = { sub: "unknown", name: "Guest" };
      }

      // Fetch UserInfo if endpoint is configured (Crucial for ADFS/Okta which return minimal ID Tokens)
      if (oidcConfig?.userinfo_endpoint) {
        try {
          console.info(
            `[Auth] Fetching user info from: ${oidcConfig.userinfo_endpoint}`
          );
          const uiResp = await fetch(oidcConfig.userinfo_endpoint, {
            headers: { Authorization: `Bearer ${data.access_token}` },
          });

          if (uiResp.ok) {
            const uiData = await uiResp.json();
            console.debug("[Auth] UserInfo received:", uiData);
            // Merge UserInfo into newUser (UserInfo takes precedence for profile fields)
            newUser = { ...newUser, ...uiData };
          } else {
            console.warn(`[Auth] UserInfo fetch failed: ${uiResp.status}`);
          }
        } catch (e) {
          console.error("[Auth] Error fetching UserInfo:", e);
        }
      }

      const newTokens: AuthTokens = {
        access_token: data.access_token,
        id_token: data.id_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      };

      console.debug("[Auth][Phase:Callback] User profile data:", newUser);

      setTokens(newTokens);
      setUser(newUser);

      sessionStorage.setItem(TOKEN_KEY, JSON.stringify(newTokens));
      sessionStorage.setItem(USER_KEY, JSON.stringify(newUser));
      console.info(
        `[Auth][Phase:Callback] Flow COMPLETE. Session active for user: ${newUser.sub}`
      );
    } catch (err) {
      console.error(
        "[Auth][Phase:Callback] FATAL Critical error during callback handling:",
        err
      );
      throw err;
    } finally {
      console.debug("[Auth][Phase:Callback] Removing PKCE temporary storage.");
      sessionStorage.removeItem(VERIFIER_KEY);
      sessionStorage.removeItem(STATE_KEY);
    }
  };

  const logout = () => {
    console.info("[Auth][Phase:Logout] User logging out.");
    setUser(null);
    setTokens(null);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    console.debug("[Auth][Phase:Logout] Local storage cleared.");
  };

  const authClient = useMemo<AuthClient>(() => {
    const isAuthenticated = !!tokens && tokens.expires_at > Date.now();
    return {
      user,
      config: oidcConfig,
      isAuthenticated,
      getToken: async () => tokens?.id_token || null,
      fetchWithAuth: async (url: string, options: RequestInit = {}) => {
        const headers = new Headers(options.headers);
        const method = options.method || "GET";

        if (tokens?.id_token) {
          console.debug(
            `[Auth][Fetch] Injecting ID Token into ${method} request to ${url}`
          );
          headers.set("Authorization", `Bearer ${tokens.id_token}`);

          try {
            const encoded = btoa(
              unescape(encodeURIComponent(JSON.stringify(user)))
            );
            headers.set("X-User", encoded);
            console.debug(
              `[Auth][Fetch] Attached X-User header for: ${user?.sub}`
            );
          } catch (e) {
            console.warn(
              "[Auth][Fetch] WARNING: Failed to encode X-User profile header",
              e
            );
          }
        } else {
          console.debug(
            `[Auth][Fetch] No active session. Fetching ${method} ${url} without authorization.`
          );
        }

        const start = performance.now();
        try {
          const response = await fetch(url, { ...options, headers });
          const lap = (performance.now() - start).toFixed(1);
          console.debug(
            `[Auth][Fetch] Response: ${response.status} (${lap}ms) from ${url}`
          );
          return response;
        } catch (fetchErr) {
          console.error(
            `[Auth][Fetch] Network Error during fetch to ${url}:`,
            fetchErr
          );
          throw fetchErr;
        }
      },
    };
  }, [user, tokens, oidcConfig]);

  if (isInitializing) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ opacity: 0.6 }}>Loading Identity System...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{ ...authClient, login, logout, handleCallback }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
