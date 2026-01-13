import React, { Suspense, ReactNode, lazy } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import "../styles/components/RemoteMFELoader.css";

interface RemoteMFELoaderProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: (error: Error, retry: () => void) => ReactNode;
}

const defaultLoadingFallback = (
  <div className="mfe-loader-loading">
    <p>Loading component...</p>
  </div>
);

const defaultErrorFallback = (error: Error, retry: () => void) => {
  const isRemoteLoadError =
    error.message.includes("Loading script failed") ||
    error.message.includes("ScriptExternalLoadError") ||
    error.name === "ScriptExternalLoadError";

  return (
    <div className="mfe-loader-error">
      <h2>
        {isRemoteLoadError ? "Module Unavailable" : "Error Loading Component"}
      </h2>
      <p>
        {isRemoteLoadError
          ? "The remote module is currently unavailable. Please ensure the service is running."
          : error.message}
      </p>
      <button className="mfe-loader-retry-btn" onClick={retry}>
        Retry
      </button>
    </div>
  );
};

export const RemoteMFELoader: React.FC<RemoteMFELoaderProps> = ({
  children,
  loadingFallback = defaultLoadingFallback,
  errorFallback = defaultErrorFallback,
}) => {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={loadingFallback}>{children}</Suspense>
    </ErrorBoundary>
  );
};
