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
  preferred_username?: string;
  department?: string;
  title?: string;
  jobTitle?: string;
  roles?: string[];
  [key: string]: any;
}

export interface AuthClient {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  getToken: () => Promise<string | null>;
  user: UserProfile | null;
  login: () => Promise<void>;
  logout: () => void;
  handleCallback: (code: string, state: string) => Promise<void>;
  handleImplicitCallback: (accessToken: string, idToken: string, state: string) => Promise<void>;
  config: OidcConfig | null;
  isAuthenticated: boolean;
}

export interface OidcProvider {
  resolveEndpoints(envConfig: any): {
    authEndpoint: string;
    tokenEndpoint: string;
  };
  generateAuthUrl(config: OidcConfig, state: string, nonce: string, challenge: string): string;
  exchangeCode(
    code: string,
    verifier: string,
    config: OidcConfig,
    clientSecret?: string
  ): Promise<any>;
  fetchUserInfo(endpoint: string, accessToken: string): Promise<any>;
  normalizeProfile(claims: any): UserProfile;
  parseJwt(token: string): any;
}
