import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
} from "react";

export interface AuthClient {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  getToken: () => Promise<string | null>;
  user: string | null;
}

interface AuthContextType extends AuthClient {
  login: (username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<string | null>(null);

  const login = (username: string) => setUser(username);
  const logout = () => setUser(null);

  const authClient = useMemo<AuthClient>(() => {
    return {
      user,
      getToken: async () => {
        // In a real app, this would return the OIDC token
        return user ? "mock-token-" + user : null;
      },
      fetchWithAuth: async (url: string, options: RequestInit = {}) => {
        const token = user ? "mock-token-" + user : null;
        const headers = new Headers(options.headers);
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        return fetch(url, { ...options, headers });
      },
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ ...authClient, login, logout }}>
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
