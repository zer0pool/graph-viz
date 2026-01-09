export interface AuthClient {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  getToken: () => Promise<string | null>;
  user: string | null;
}
