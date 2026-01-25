import React, { useEffect, useRef, useState } from "react";
import { loadRemote } from "./loadRemote";
import { useAuth } from "../app/AuthContext";
import { AuthClient } from "../app/auth/types";
import "../styles/mfe/RemoteMount.css";

type Props = {
  scope: string;
  module: string;
  url: string;
  mountProps?: any;
  visible: boolean;
};

export const RemoteMount: React.FC<Props> = ({
  scope,
  module,
  url,
  mountProps,
  visible,
}) => {
  console.log(
    `[Shell:RemoteMount] Rendering component for scope: ${scope}, visible: ${visible}`,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<null | (() => void)>(null);
  const mountedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth(); // Get full auth client

  // 🔹 Stabilize authClient reference for MFE
  // MFEs don't need a re-mount if the auth object reference changes slightly (e.g. from context re-calc)
  // but they might need the latest one. We'll pass the stable one and update refs if needed,
  // but for now, the main goal is preventing re-mount.
  const authRef = useRef<AuthClient>(auth);
  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

  // 🔹 mount: 단 한 번만
  useEffect(() => {
    let cancelled = false;
    let didCleanup = false;

    (async () => {
      try {
        console.log(
          `[Shell:RemoteMount] Starting load for scope: ${scope}, url: ${url}`,
        );
        const container = await loadRemote(scope, url);
        if (cancelled) return;

        console.log(
          `[Shell:RemoteMount] Container loaded for ${scope}. Getting module: ${module}`,
        );
        const factory = await container.get(module);
        const moduleExports = factory();

        console.log(
          `[Shell:RemoteMount] Module exports for ${module}:`,
          Object.keys(moduleExports),
        );

        // Support named 'mount', default 'mount', or default export as function
        const mount =
          moduleExports.mount ||
          moduleExports.default?.mount ||
          moduleExports.default;

        if (typeof mount !== "function") {
          throw new Error(
            `Module ${module} does not export a 'mount' function. Exports: ${Object.keys(
              moduleExports,
            ).join(", ")}`,
          );
        }

        cleanupRef.current = mount(containerRef.current!, {
          ...(mountProps ?? {}),
          initialSelection: mountProps,
          eventTarget: containerRef.current,
          auth: authRef.current, // Inject Auth Client
        });
        mountedRef.current = true;
        console.log(`[Shell:RemoteMount] Mount successful for ${scope}`);
      } catch (err) {
        console.error(
          `[Shell:RemoteMount] Error loading/mounting ${scope}:`,
          err,
        );
        console.error(
          `[Shell:RemoteMount] Stack trace:`,
          err instanceof Error ? err.stack : "No stack trace",
        );
        setError(
          `Failed to load module: ${scope}. Details: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    })();

    return () => {
      cancelled = true;
      if (didCleanup) return;
      didCleanup = true;

      console.log(`[Shell:RemoteMount] Cleaning up for ${scope}`);
      try {
        if (cleanupRef.current) {
          cleanupRef.current();
        }
      } catch (e) {
        console.warn(
          `[Shell:RemoteMount] Error during cleanup for ${scope}:`,
          e,
        );
      } finally {
        cleanupRef.current = null;
        mountedRef.current = false;
      }
    };
  }, [scope, url, module]); // Removed authClient from deps to prevent re-mounts

  // 🔹 props 변경 (지금은 noop, 이후 확장)
  useEffect(() => {
    if (!mountedRef.current) return;
    if (!mountProps) return;

    // MFE로 selection 변경 이벤트 전달
    const event = new CustomEvent("mfe:selection", {
      detail: { ...mountProps }, // ⭐ 반드시 detail 로 감싸기
    });

    containerRef.current?.dispatchEvent(event);
  }, [mountProps]);

  if (error) {
    return (
      <div
        className={`remote-mount-error ${
          visible ? "remote-mount-visible-flex" : "remote-mount-hidden"
        }`}
      >
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`remote-mount-container ${
        visible ? "remote-mount-visible-block" : "remote-mount-hidden"
      }`}
    />
  );
};
