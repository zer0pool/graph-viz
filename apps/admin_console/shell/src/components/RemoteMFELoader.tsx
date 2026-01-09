import React, { Suspense, ReactNode, lazy } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

interface RemoteMFELoaderProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: (error: Error, retry: () => void) => ReactNode;
}

const defaultLoadingFallback = (
  <div style={{ padding: "20px", textAlign: "center" }}>
    <p>Loading component...</p>
  </div>
);

const defaultErrorFallback = (error: Error, retry: () => void) => {
  const isRemoteLoadError =
    error.message.includes("Loading script failed") ||
    error.message.includes("ScriptExternalLoadError") ||
    error.name === "ScriptExternalLoadError";

  return (
    <div
      style={{
        padding: "40px",
        textAlign: "center",
        backgroundColor: "#fff3cd",
        border: "1px solid #ffc107",
        borderRadius: "4px",
        margin: "20px",
      }}
    >
      <h2 style={{ color: "#856404" }}>
        {isRemoteLoadError ? "Module Unavailable" : "Error Loading Component"}
      </h2>
      <p style={{ color: "#856404" }}>
        {isRemoteLoadError
          ? "The remote module is currently unavailable. Please ensure the service is running."
          : error.message}
      </p>
      <button
        onClick={retry}
        style={{
          padding: "10px 20px",
          backgroundColor: "#ffc107",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
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
