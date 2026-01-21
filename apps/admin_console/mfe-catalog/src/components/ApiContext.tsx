import React, { createContext, useContext, ReactNode } from "react";
import { ApiClient } from "../services/api";
import { AuthClient } from "../types/auth";

const ApiContext = createContext<ApiClient | undefined>(undefined);

interface ApiProviderProps {
  auth: AuthClient;
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ auth, children }) => {
  // Memoize API client based on auth
  const apiClient = React.useMemo(() => new ApiClient(auth), [auth]);

  return (
    <ApiContext.Provider value={apiClient}>{children}</ApiContext.Provider>
  );
};

export const useApiClient = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApiClient must be used within an ApiProvider");
  }
  return context;
};
