import React, { createContext, useContext, ReactNode } from "react";
import { ApiClient } from "./api";
import { AuthClient } from "../types/auth";

import { config } from "../config/config";

const ApiContext = createContext<ApiClient | undefined>(undefined);

interface ApiProviderProps {
  auth: AuthClient;
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ auth, children }) => {
  // Memoize API client based on auth and API_BASE_URL
  const apiClient = React.useMemo(() => new ApiClient(auth, config.API_BASE_URL), [auth]);

  return <ApiContext.Provider value={apiClient}>{children}</ApiContext.Provider>;
};

export const useApiClient = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApiClient must be used within an ApiProvider");
  }
  return context;
};
