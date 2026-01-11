import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { handleCallback } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      // Hybrid flow returns params in Hash, Code flow in Query
      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove leading #

      const code = queryParams.get("code") || hashParams.get("code");
      const state = queryParams.get("state") || hashParams.get("state");

      // Note: In Hybrid flow, id_token is also present here, but we will rely on
      // the back-channel token exchange using 'code' for security and simplicity.

      console.info(
        "[Auth][Phase:Callback-UI] Detected OIDC callback in URL. Checking parameters."
      );

      if (code && state) {
        console.debug(
          `[Auth][Phase:Callback-UI] Found code (length: ${code.length}) and state: ${state}`
        );
        try {
          await handleCallback(code, state);
          console.info(
            "[Auth][Phase:Callback-UI] Context callback executed. Redirecting to Application Root."
          );
          navigate("/", { replace: true });
        } catch (err) {
          console.error(
            "[Auth][Phase:Callback-UI] FATAL: handleCallback failed within UI component.",
            err
          );
          navigate("/", { replace: true });
        }
      } else {
        console.warn(
          "[Auth][Phase:Callback-UI] MISSING code or state in URL. Unauthorized access or user cancel?"
        );
        navigate("/", { replace: true });
      }
    };

    processCallback();
  }, [searchParams, handleCallback, navigate]);

  return (
    <div
      style={{
        display: "flex",
        height: "80vh",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div
        className="spinner"
        style={{
          width: "40px",
          height: "40px",
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #3498db",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      ></div>
      <div style={{ fontSize: "1.2rem", color: "#666" }}>Authenticating...</div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
