import { OidcConfig, UserProfile, AuthTokens, OidcProvider } from "./types";
import { config as envConfig } from "../../config";

// --- Helpers ---
export function parseJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to parse JWT", e);
    return null;
  }
}

export function normalizeProfile(claims: any): UserProfile {
  if (!claims) return { sub: "unknown", name: "Guest" };
  return {
    sub: claims.sub,
    name:
      claims.name ||
      claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
      claims.given_name ||
      claims.unique_name ||
      claims.upn,
    email:
      claims.email ||
      claims[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
      ] ||
      claims.upn,
    preferred_username:
      claims.preferred_username || claims.upn || claims.unique_name,
    department:
      claims.department ||
      claims[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/department"
      ],
    title:
      claims.jobTitle ||
      claims.title ||
      claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/title"],
    ...claims, // Include original claims
  };
}

// --- Base Provider ---
export class BaseOidcProvider implements OidcProvider {
  resolveEndpoints(config: any): {
    authEndpoint: string;
    tokenEndpoint: string;
  } {
    // Standard OIDC Discovery defaults
    return {
      authEndpoint:
        config.OIDC_AUTH_ENDPOINT ||
        `${config.OIDC_AUTHORITY}/protocol/openid-connect/auth`,
      tokenEndpoint:
        config.OIDC_TOKEN_ENDPOINT ||
        `${config.OIDC_AUTHORITY}/protocol/openid-connect/token`,
    };
  }

  generateAuthUrl(
    config: OidcConfig,
    state: string,
    nonce: string,
    challenge: string
  ): string {
    const authUrl = new URL(config.authorization_endpoint);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", config.client_id);
    authUrl.searchParams.set("redirect_uri", config.redirect_uri);
    authUrl.searchParams.set("scope", config.scope);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("nonce", nonce);
    return authUrl.toString();
  }

  async exchangeCode(
    code: string,
    verifier: string,
    oidcConfig: OidcConfig,
    clientSecret?: string
  ): Promise<any> {
    const formData = new URLSearchParams();
    formData.append("code", code);
    formData.append("code_verifier", verifier);
    formData.append(
      "redirect_uri",
      oidcConfig.redirect_uri || window.location.origin
    );
    formData.append("client_id", oidcConfig.client_id);
    formData.append("grant_type", "authorization_code");

    if (clientSecret) {
      formData.append("client_secret", clientSecret);
    }

    const resp = await fetch(oidcConfig.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Exchange failed: ${resp.status} - ${errText}`);
    }
    return await resp.json();
  }

  async fetchUserInfo(endpoint: string, accessToken: string): Promise<any> {
    const resp = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) {
      throw new Error(`UserInfo fetch failed: ${resp.status}`);
    }
    return await resp.json();
  }

  parseJwt(token: string) {
    return parseJwt(token);
  }
  normalizeProfile(claims: any) {
    return normalizeProfile(claims);
  }
}

// --- ADFS Provider ---
export class AdfsProvider extends BaseOidcProvider {
  resolveEndpoints(config: any): {
    authEndpoint: string;
    tokenEndpoint: string;
  } {
    let { OIDC_AUTH_ENDPOINT, OIDC_TOKEN_ENDPOINT, OIDC_AUTHORITY } = config;

    if (!OIDC_AUTH_ENDPOINT) {
      OIDC_AUTH_ENDPOINT = OIDC_AUTHORITY.toLowerCase().includes("adfs")
        ? `${OIDC_AUTHORITY}/oauth2/authorize`
        : super.resolveEndpoints(config).authEndpoint;
    }
    if (!OIDC_TOKEN_ENDPOINT) {
      OIDC_TOKEN_ENDPOINT = OIDC_AUTHORITY.toLowerCase().includes("adfs")
        ? `${OIDC_AUTHORITY}/oauth2/token`
        : super.resolveEndpoints(config).tokenEndpoint;
    }
    return {
      authEndpoint: OIDC_AUTH_ENDPOINT,
      tokenEndpoint: OIDC_TOKEN_ENDPOINT,
    };
  }

  generateAuthUrl(
    config: OidcConfig,
    state: string,
    nonce: string,
    challenge: string
  ): string {
    const url = super.generateAuthUrl(config, state, nonce, challenge);
    const authUrl = new URL(url);

    // ADFS Specific Params
    if (envConfig.OIDC_RESOURCE) {
      authUrl.searchParams.set("resource", envConfig.OIDC_RESOURCE);
    }
    if (envConfig.OIDC_RESPONSE_MODE) {
      authUrl.searchParams.set("response_mode", envConfig.OIDC_RESPONSE_MODE);
    } else if (envConfig.OIDC_RESPONSE_TYPE?.includes("token")) {
      // If implicit/hybrid, prefer fragment
      authUrl.searchParams.set("response_mode", "fragment");
    }
    // Check for manual ResponseType override (e.g. "id_token token")
    if (envConfig.OIDC_RESPONSE_TYPE) {
      authUrl.searchParams.set("response_type", envConfig.OIDC_RESPONSE_TYPE);
    }

    return authUrl.toString();
  }
}

// --- Google Provider (Stub) ---
export class GoogleProvider extends BaseOidcProvider {
  resolveEndpoints(config: any) {
    return {
      authEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
    };
  }

  generateAuthUrl(
    config: OidcConfig,
    state: string,
    nonce: string,
    challenge: string
  ): string {
    const url = super.generateAuthUrl(config, state, nonce, challenge);
    const authUrl = new URL(url);
    authUrl.searchParams.set("prompt", "select_account");
    authUrl.searchParams.set("access_type", "offline");
    return authUrl.toString();
  }
}

// Legacy Compat: Export an INSTANCE to avoid breaking AuthContext (which expects a singleton-like usage)
export const OidcClient = new AdfsProvider();
